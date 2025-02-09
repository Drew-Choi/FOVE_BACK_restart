const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: { type: String },
  products: [
    {
      productName: { type: String },
      productCode: { type: String },
      img: { type: String },
      price: { type: Number },
      size: { type: String },
      color: { type: String },
      quantity: { type: Number },
      unitSumPrice: { type: Number },
    },
  ],
  cartTotalPrice: { type: Number },
});

module.exports = mongoose.model('Cart', cartSchema);
