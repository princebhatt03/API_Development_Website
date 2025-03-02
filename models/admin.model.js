const mongoose = require('../db/db');

const adminSchema = mongoose.Schema({
  name: String,
  adminUserName: String,
  adminId: Number,
  email: String,
  password: String,
});

module.exports = mongoose.model('Admin', adminSchema);
