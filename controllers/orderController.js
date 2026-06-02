const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Product = require('../models/Product') // 1. On importe le modèle Product

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


exports.createOrderAfterPayment = async (req, res) => { // 2. Ajout de async
  try {
    console.log("✅ SUCCESS PAGE - Traitement de la commande et du stock");

    // 3. Récupérer le panier de l'utilisateur connecté
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart'); // Évite de valider un panier vide
    }

    // 4. Parcourir les articles du panier pour réduire le stock de chaque produit
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.product, // L'identifiant du produit
        { $inc: { stock: -item.quantity } } // Décrémente le stock de la quantité achetée
      );
    }

    // 5. [Optionnel] Créer le document Order dans la base de données ici
    /*
    await Order.create({
      user: req.user._id,
      items: cart.items,
      totalPrice: cart.totalPrice
    });
    */

    // 6. Vider le panier de l'utilisateur après l'achat réussi
    await Cart.findOneAndDelete({ user: req.user._id });

    // 7. Affichage de la vue succès
    res.render('success', {
      title: 'Paiement réussi'
    });

  } catch (err) {
    console.log("Erreur lors de la réduction de stock:", err);
    res.status(500).send('Erreur serveur lors de la validation de la commande');
  }
};
