const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Game = require('./models/Game');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Genereaza un cod random de exact 9 caractere
function generateNineCharCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Verifica sa nu existe alt joc activ cu acelasi cod
async function generateUniqueActiveCode() {
  let code;
  let exists = true;

  while (exists) {
    code = generateNineCharCode();
    const activeGame = await Game.findOne({
      code,
      status: { $in: ['waiting', 'ongoing'] },
    });
    exists = Boolean(activeGame);
  }

  return code;
}

app.get('/', (req, res) => {
  res.json({ message: 'Serverul RedBlue functioneaza!' });
});

// 1. Creare joc nou
app.post('/api/games', async (req, res) => {
  try {
    const { player1Name } = req.body;

    if (!player1Name || !player1Name.trim()) {
      return res.status(400).json({ message: 'Numele jucatorului 1 este obligatoriu.' });
    }

    const code = await generateUniqueActiveCode();

    const newGame = await Game.create({
      code,
      player1Name: player1Name.trim(),
      status: 'waiting',
      currentRound: 1,
      player1Score: 0,
      player2Score: 0,
    });

    return res.status(201).json(newGame);
  } catch (err) {
    return res.status(500).json({ message: 'Eroare la crearea jocului', error: err.message });
  }
});

// 2. Intrare intr-un joc existent
app.post('/api/games/join', async (req, res) => {
  try {
    const { code, player2Name } = req.body;

    if (!code || !player2Name || !player2Name.trim()) {
      return res.status(400).json({ success: false, message: 'Codul si numele jucatorului 2 sunt obligatorii.' });
    }

    const normalizedCode = code.trim().toUpperCase();

    const game = await Game.findOne({
      code: normalizedCode,
      status: { $in: ['waiting', 'ongoing'] },
    });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Jocul activ nu a fost gasit sau este deja finalizat.' });
    }

    if (game.player2Name) {
      return res.status(409).json({ success: false, message: 'Jocul are deja doi jucatori.' });
    }

    game.player2Name = player2Name.trim();
    game.status = 'ongoing';
    await game.save();

    return res.status(200).json({ success: true, game });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Eroare la intrarea in joc', error: err.message });
  }
});

// 3. Lista de jocuri (cu paginare si filtrare dupa status sau cod)
app.get('/api/games', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(req.query.pageSize, 10) || 10, 1);
    const { status, code } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (code) {
      filter.code = code.trim().toUpperCase();
    }

    const totalGames = await Game.countDocuments(filter);
    const games = await Game.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    return res.status(200).json({
      page,
      pageSize,
      totalGames,
      totalPages: Math.ceil(totalGames / pageSize),
      games,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Eroare la preluarea listei de jocuri', error: err.message });
  }
});

// 4. Detalii pentru un singur joc (dupa GUID)
app.get('/api/games/:guid', async (req, res) => {
  try {
    const game = await Game.findOne({ guid: req.params.guid });

    if (!game) {
      return res.status(404).json({ message: 'Jocul nu a fost gasit.' });
    }

    return res.status(200).json(game);
  } catch (err) {
    return res.status(500).json({ message: 'Eroare la preluarea detaliilor jocului', error: err.message });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Conectat la MongoDB');
    app.listen(PORT, () => {
      console.log(`Serverul ruleaza pe http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Eroare la conectarea cu MongoDB:', err.message);
  });