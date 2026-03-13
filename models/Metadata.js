const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
    label: String,
    staged: Boolean,
    subtitle: String,
    title: String,
    startDate: String,
    endDate: String,
    gameDate: String
});

const metadataSchema = new mongoose.Schema({
    year: Number,
    rounds: [roundSchema]
});

module.exports = mongoose.model('Metadata', metadataSchema, 'metadata');

