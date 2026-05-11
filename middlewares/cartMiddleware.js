const Cart = require('../models/Cart');

module.exports = async (req, res, next) => {
  try {
    if (!req.user) {
      res.locals.cart = [];
      res.locals.cartCount = 0;
      return next();
    }

    const cart = await Cart.findOne({ user: req.user._id });

    const items = cart ? cart.items : [];

    res.locals.cart = items;

    res.locals.cartCount = items.reduce((acc, item) => {
      return acc + (item.quantity || 1);
    }, 0);

    next();
  } catch (err) {
    console.error('Cart middleware error:', err);
    res.locals.cart = [];
    res.locals.cartCount = 0;
    next();
  }
};