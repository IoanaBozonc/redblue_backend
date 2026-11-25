const mongoose = require('mongoose');
const crypto = require('crypto');

const gameSchema = new mongoose.Schema(
  {
    guid: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    code: {
      type: String,
      required: true,
      minlength: 9,
      maxlength: 9,
    },
    player1Name: {
      type: String,
      required: true,
      trim: true,
    },
    player1Score: {
      type: Number,
      default: 0,
    },
    player2Name: {
      type: String,
      default: null,
      trim: true,
    },
    player2Score: {
      type: Number,
      default: 0,
    },
    currentRound: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['waiting', 'ongoing', 'finished', 'abandoned'],
      default: 'waiting',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Game', gameSchema);