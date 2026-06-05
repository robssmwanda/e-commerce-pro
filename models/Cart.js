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
       produit: { // 🟢 On garde 'produit' ici pour que votre contrôleur et votre template cart.ejs fonctionnent
        type: mongoose.Schema.ObjectId,
        ref: 'Product' // 🔥 C'EST ICI QU'IL FAUT METTRE 'Product' (en anglais) !
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
