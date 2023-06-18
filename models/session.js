const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  _id: { type: String },
  expire: { type: Date },
  session: { type: Object },
});

module.exports = mongoose.model('Session', sessionSchema);
