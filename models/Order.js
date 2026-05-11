const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      name: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ],
  stripeSessionId: String,

  total: {
    type: Number,
    required: true
  },

  // 🔥 AJOUT ICI
  status: {
    type: String,
    required: true,
    default: 'paid'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
})


const Order = mongoose.model('Order', orderSchema)
module.exports = Order