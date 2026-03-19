const mongoose = require('mongoose');

const LeagueSchema = new mongoose.Schema({
    name: {type: String, required: true, unique: true},
    players: [String],
    year: Number,
    createdAt: {type: Date, default: Date.now},
    isArchived: { type: Boolean, default: false },
    champion: {type: String, default: null}
})

module.exports = mongoose.model('League', LeagueSchema, 'leagues');