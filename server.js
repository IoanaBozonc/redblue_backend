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

// Verifica sa nu existe alt joc ACTIV cu acelasi cod
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
  res.json({ message: 'RedBlue Backend mergeeeee!' });
});

// 1. Create new game
app.post('/api/games', async (req, res) => {
  try {
    const { player1Name } = req.body;

    if (!player1Name || !player1Name.trim()) {
      return res.status(400).json({ message: 'Player 1 name is required.' });
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
    return res.status(500).json({ message: 'Error creating game', error: err.message });
  }
});

// 2. Join game
app.post('/api/games/join', async (req, res) => {
  try {
    const { code, player2Name } = req.body;

    if (!code || !player2Name || !player2Name.trim()) {
      return res.status(400).json({ success: false, message: 'Code and player 2 name are required.' });
    }

    const normalizedCode = code.trim().toUpperCase();

    const game = await Game.findOne({
      code: normalizedCode,
      status: { $in: ['waiting', 'ongoing'] },
    });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Active game not found or already finalized.' });
    }

    if (game.player2Name) {
      return res.status(409).json({ success: false, message: 'Game already has two players.' });
    }

    game.player2Name = player2Name.trim();
    game.status = 'ongoing';
    await game.save();

    return res.status(200).json({ success: true, game });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error joining game', error: err.message });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });