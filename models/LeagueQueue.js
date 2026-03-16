const mongoose = require('mongoose');

const LeagueQueueSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    numberOfOwners: Number,
    players: [String],
    year: Number,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QueuedLeague', LeagueQueueSchema, 'queued-leagues')