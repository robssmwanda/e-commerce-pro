// viewController.js
const Product = require('../models/Product')
const Cart = require('../models/Cart')

exports.getHome = (req, res) => {
   res.status(200).render('home', {
      title: 'Apple (FR) - iPhone',
      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
   });
}

exports.getIphone = async (req, res) => {
   try {
      const products = await Product.find().sort({order: 1})
       res.status(200).render('iPhone', {
         title: 'Apple (FR) - iPhone',
         products: products,
         successMsg: req.flash('success'),
         errorMsg: req.flash('error')
       })
   }catch(err) {
      res.status(500).render('iPhone', {
      title: 'Apple (FR) - iPhone',
      products: [],
      errorMsg: ['Erreur lors du chargement des produits']
    });
  }  
}

exports.getBuyPage = async (req, res) => {
   try {
      const product = await Product.findOne({ slug: req.params.slug });

      let cartItems = [];

      if (req.user && req.user.cart) {
         cartItems = req.user.cart.items;
      }

      res.render('buy', {
         product,
         cart: cartItems
      });

   } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
   }
};

exports.getSignupForm = (req, res) => {
  res.status(200).render('signup', {
     title: 'Apple (FR) - iPhone',
     formData: {},
     errors: {},
     successMsg: req.flash('success'),
     errorMsg: req.flash('error')
  });
}

exports.getLoginForm = (req, res) => {

   res.status(200).render('login', {
      title: 'Apple (FR) - iPhone',
      formData: {},
      error: {},
      successMsg: req.flash('success'),
      errorMsg: req.flash('error'),
      resetSuccess: req.query.resetSuccess === 'true'
   });

}

exports.manageAccount = async (req, res) => {

   try {

      res.status(200).render('account', {
         title: 'Apple (FR) - Account',
         user: req.user,
         successMsg: req.flash('success'),
         errorMsg: req.flash('error')
      })

   } catch(err) {

      console.log(err)

      res.status(500).send('Erreur serveur')
   }
}

exports.getCart = async (req, res) => {
  try {
    if (!req.user) {
      req.flash('error', 'Vous devez être connecté pour voir votre panier.');
      return res.redirect('/login');
    }

    const cart = await Cart.findOne({ user: req.user._id });
    const cartItems = [];

    if (cart && cart.items.length > 0) {
      for (const item of cart.items) {
        // 🔥 Détection universelle de l'ID du produit (gère toutes les variantes de votre historique de code)
        const targetProductId = item.produit || item.productId || item.product;

        if (targetProductId) {
          const freshProduct = await Product.findById(targetProductId);
          
          cartItems.push({
            _id: item._id,
            productId: targetProductId, // Assure la compatibilité avec le script de mise à jour
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
            // Récupération sécurisée du stock frais
            stock: freshProduct ? freshProduct.stock : 0 
          });
        }
      }
    }

    const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Logs de contrôle pour traquer la valeur lue en direct dans votre console Render
    console.log("=== VÉRIFICATION SÉCURISÉE DES STOCKS ===");
    cartItems.forEach(i => {
      console.log(`Article: ${i.name} | Quantité choisie: ${i.quantity} | Stock disponible BDD: ${i.stock}`);
    });

    res.status(200).render('cart', {
      title: 'Mon Panier - Apple (FR)',
      cart: cartItems,
      totalAmount,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
    });

  } catch (err) {
    console.error('Erreur getCart:', err);
    res.status(500).send('Erreur serveur lors du chargement du panier');
  }
};




exports.getProfilePage = async (req, res) => {

   try {

      res.render('profile', {
         title: 'Informations personnelles',
         user: req.user,
         successMsg: req.flash('success'),
         errorMsg: req.flash('error')
      })

   } catch(err) {

      console.log(err)

      res.redirect('/account')
   }
}

exports.getPasswordPage = async (req, res) => {

   try {

      res.render('password', {
         successPopup: req.query.success === 'true'
      })

   } catch(err) {

      console.log(err)

      res.status(500).send('Erreur serveur')
   }
}

exports.getForgotPasswordPage = async (req, res) => {

   try {

      res.status(200).render('forgot-password', {
         title: 'Mot de passe oublié',
         successPopup: req.query.success === 'true',
      });

   } catch(err) {

      console.log(err);

      res.status(500).send('Erreur serveur');
   }
}
exports.getResetPasswordPage = async (req, res) => {

   try {

      res.status(200).render('reset-password', {
         title: 'Réinitialiser le mot de passe',
         token: req.params.token,
         successPopup: false
      });

   } catch(err) {

      console.log(err);

      res.status(500).send('Erreur serveur');
   }
}
