const mongoose = require('../db/db');

const prodSchema = mongoose.Schema({
  name: String,
  image: String,
  category: String,
  description: String,
});

module.exports = mongoose.model('Products', prodSchema);
