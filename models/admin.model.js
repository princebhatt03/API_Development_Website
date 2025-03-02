const mongoose = require('../db/db');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  adminUserName: { type: String, required: true, unique: true },
  adminId: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

module.exports = mongoose.model('Admin', adminSchema);
