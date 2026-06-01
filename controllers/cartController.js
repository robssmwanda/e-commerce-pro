const Cart = require('../models/Cart')
const User = require('../models/User');

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
      cart: cart ? cart.items : [] // 🔥 FIX
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

    // 🔥 AJOUT ICI
    const totalQty = cart.items.reduce((acc, item) => acc + item.quantity, 0);

    // 🔥 MODIFIE LA RÉPONSE
    res.status(200).json({
      status: 'success',
      cart: cart.items,
      totalQty   // 👈 IMPORTANT
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

    // 🔥 recalcul du total
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

    const item = cart.items.find(
      item => item._id.toString() === productId
    );

    if (item) {
      item.quantity += 1;
    }

    await cart.save();

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

    // 🔥 CALCUL TOTAL
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




