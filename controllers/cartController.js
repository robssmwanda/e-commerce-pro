const Cart = require('../models/Cart')
const User = require('../models/User');
const Product = require('../models/Product'); // 🔥 SÉCURITÉ : Importation obligatoire pour vérifier le stock réel

exports.getCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Non connecté'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    res.json({
      status: 'success',
      cart: cart ? cart.items : []
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, name, price, image } = req.body;

    if (!productId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Product ID manquant'
      });
    }

    // 🔥 SÉCURITÉ SERVEUR : On récupère le stock réel du produit en base de données
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'fail',
        message: 'Produit introuvable'
      });
    }

    // Si le stock initial est déjà épuisé (0 ou moins)
    if (product.stock <= 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Désolé, ce produit est en rupture de stock.'
      });
    }

    const userId = req.user._id;
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: []
      });
    }

    const existingItem = cart.items.find(item => {
      if (!item.productId) return false;
      return item.productId.toString() === productId;
    });

    if (existingItem) {
      // 🔥 SÉCURITÉ : On vérifie si ajouter +1 dépasse le stock disponible en BDD
      if (existingItem.quantity + 1 > product.stock) {
        return res.status(400).json({
          status: 'fail',
          message: `Impossible d'ajouter plus d'articles. Stock maximum disponible : ${product.stock}`
        });
      }
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        productId,
        name,
        price: Number(price),
        image,
        quantity: 1
      });
    }

    await cart.save();

    const totalQty = cart.items.reduce((acc, item) => acc + item.quantity, 0);

    res.status(200).json({
      status: 'success',
      cart: cart.items,
      totalQty
    });

  } catch (err) {
    console.error('ADD TO CART ERROR:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erreur ajout panier'
    });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.json({ status: 'empty', total: 0 });
    }

    cart.items = cart.items.filter(
      item => item._id.toString() !== productId
    );

    await cart.save();

    const total = cart.items.reduce((acc, item) => {
      return acc + item.price * item.quantity;
    }, 0);

    res.json({
      status: 'success',
      total: total
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 'error' });
  }
};

exports.increaseQuantity = async (req, res) => {
  try {
    const productId = req.params.productId;
    const cart = await Cart.findOne({ user: req.user._id });

    // Trouver l'item ciblé dans le panier
    const item = cart.items.find(
      item => item._id.toString() === productId
    );

    if (item) {
      // 🔥 SÉCURITÉ : On va chercher le produit d'origine pour contrôler son stock
      const product = await Product.findById(item.productId);
      
      if (!product || item.quantity + 1 > product.stock) {
        console.log(`🚨 Blocage quantité panier : Limite de stock atteinte (${product ? product.stock : 0})`);
        // Redirige vers le panier avec un paramètre d'erreur pour notifier le client
        return res.redirect('/cart?error=stock_limit');
      }
      
      item.quantity += 1;
      await cart.save();
    }

    res.redirect('/cart');

  } catch (err) {
    console.log(err);
    res.status(500).send('Erreur');
  }
};

exports.decreaseQuantity = async (req, res) => {
  try {
    const productId = req.params.productId;
    const cart = await Cart.findOne({ user: req.user._id });

    const item = cart.items.find(
      item => item._id.toString() === productId
    );

    if (item) {
      item.quantity -= 1;

      if (item.quantity <= 0) {
        cart.items = cart.items.filter(
          item => item._id.toString() !== productId
        );
      }
    }

    await cart.save();

    const total = cart.items.reduce((acc, item) => {
      return acc + item.price * item.quantity;
    }, 0);

    res.json({
      status: 'success',
      total: total
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 'error' });
  }
};
