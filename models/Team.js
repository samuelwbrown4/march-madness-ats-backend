const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
    owner: String,
    ownerTeam: String,
    spread: Number,
    finalScore: Number,
    opponent: String,
    opponentSpread: Number,
    opponentFinalScore: Number,
    isFavorite: Boolean,
    didWin: Boolean,
    didCover: Boolean,
    isFinal: Boolean,
    ownerUpdated: Boolean
}, { _id: false });

const teamSchema = new mongoose.Schema({
    name: String,
    seed: Number,
    region: Number,
    rounds: [roundSchema],
    leagueName: String,
    leagueId: String
});

module.exports = mongoose.model('Team', teamSchema, 'teams')