const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Le nom du produit est obligatoire"]
  },
  slug: String,
  order: {
    type: Number,
    default: 0
  },
  tagline: {
    type: String
  },
  price: {
    type: Number,
    required: [true, "Le prix est obligatoire"]
  },
  // AJOUT DU STOCK : indispensable pour la réduction automatique
  stock: {
    type: Number,
    required: [true, "La quantité en stock est obligatoire"],
    min: [0, "Le stock ne peut pas être inférieur à 0"],
    default: 0
  },
  imgUrl: {
    type: String,
    required: [true, "L'image du produit est obligatoire"]
  },
  imgBuyUrl: {
    type: String,
    required: [true, "L'image du produit est obligatoire"]
  },
  category: {
    type: String,
    enum: ['iphone', 'ipad', 'mac', 'accessoire'],
    default: 'iphone'
  },
  description: {
    type: String
  },
  storage: {
    type: String
  },
  color: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Votre middleware initial (sans next, parfaitement compatible Mongoose moderne)
productSchema.pre('save', function() {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
