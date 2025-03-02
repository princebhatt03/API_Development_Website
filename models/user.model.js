const mongoose = require('../db/db');

const userSchema = mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: String,
  password: String,
});

module.exports = mongoose.model('User', userSchema);
