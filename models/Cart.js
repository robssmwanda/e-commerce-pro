const mongoose = require('mongoose')

const cartSchema = mongoose.Schema({
   user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true
   },

   items: [
     {
       produit: {
        type: mongoose.Schema.ObjectId,
        ref: 'Produit'
       },
       name: String,
       price: Number,
       image: String,

       quantity: {
         type: Number,
         default: 1
       }
     }
   ],
   
   createdAt: {
    type: Date,
    default: Date.now
   }
})

const Cart = mongoose.model('Cart', cartSchema)
module.exports = Cart