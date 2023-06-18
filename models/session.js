const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({});

module.exports = mongoose.model('Session', sessionSchema);
