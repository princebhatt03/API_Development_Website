const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productID: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// Create a Product model
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
