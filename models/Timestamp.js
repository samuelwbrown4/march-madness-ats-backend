const mongoose = require('mongoose');

const timestampSchema = new mongoose.Schema({
    runType: String,
    runOnDate: Date,
    runForDate: Date,
    runForYear: Number
})

module.exports = mongoose.model('Timestamp' , timestampSchema , 'run-log')