const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Product = require('../models/Product')

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


exports.createOrderAfterPayment = async (req, res) => {
  try {
    console.log("✅ SUCCESS PAGE - Traitement de la commande et du stock");

    // 1. Récupérer le panier et charger les détails des produits (populate)
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart');
    }

    // 2. DOUBLE SÉCURITÉ SERVEUR : Vérifier si les stocks sont suffisants avant de valider
    for (const item of cart.items) {
      const productObj = item.product;
      
      if (!productObj || productObj.stock < item.quantity) {
        console.log(`🚨 Tentative d'achat frauduleuse ou rupture de stock sur : ${productObj ? productObj.name : 'Produit inconnu'}`);
        // On bloque l'action et on informe l'utilisateur
        return res.status(400).send(`Désolé, le produit ${productObj ? productObj.name : ''} n'a plus assez de stock.`);
      }
    }

    // 3. Si tout est OK, on décrémente les stocks de manière sécurisée
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } }
      );
    }

    // 4. [Recommandé] Activer la création de la commande en base de données
    await Order.create({
      user: req.user._id,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      })),
      totalPrice: cart.totalPrice
    });

    // 5. Vider le panier de l'utilisateur après l'achat réussi
    await Cart.findOneAndDelete({ user: req.user._id });

    // 6. Affichage de la vue succès
    res.render('success', {
      title: 'Paiement réussi'
    });

  } catch (err) {
    console.log("Erreur lors de la réduction de stock:", err);
    res.status(500).send('Erreur serveur lors de la validation de la commande');
  }
};
