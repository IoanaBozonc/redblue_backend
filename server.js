require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Ruta de test ca sa vedem ca serverul raspunde
app.get('/', (req, res) => {
  res.json({ message: 'YYEEEEEYY MERGEEE' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});