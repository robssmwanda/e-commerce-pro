const Order = require('../models/Order')
const Cart = require('../models/Cart')

exports.getMyOrders = async (req, res) => {
  try {
      const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
      res.render('orders', {
        title: 'Mes commandes',
        orders
      })
  }catch(err) {
    console.log(err);
    res.status(500).send('Erreur server')
  }
}

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).send('Commande introuvable');
    }

    res.render('orderDetails', {
      title: 'Detail commande', 
      order
    });

  } catch (err) {
    console.log(err);
    res.status(500).send('Erreur serveur');
  }
};


exports.createOrderAfterPayment = (req, res) => {
  console.log("✅ SUCCESS PAGE")

  res.render('success', {
    title: 'Paiement réussi'
  })
}