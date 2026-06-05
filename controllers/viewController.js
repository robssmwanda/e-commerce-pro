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

    console.log("=== DEBUG PANIER BRUT ===");
    console.log("Panier trouvé :", cart ? "Oui" : "Non");
    if (cart) console.log("Nombre d'items bruts :", cart.items.length);

    if (cart && cart.items.length > 0) {
      for (const item of cart.items) {
        console.log("Structure de l'item brut :", JSON.stringify(item));

        // Extraction de l'ID produit avec toutes les variantes possibles
        let targetProductId = null;
        if (item.produit) targetProductId = item.produit._id || item.produit;
        if (!targetProductId && item.productId) targetProductId = item.productId._id || item.productId;
        if (!targetProductId && item.product) targetProductId = item.product._id || item.product;

        console.log("ID Produit extrait :", targetProductId);

        let currentStock = 0;
        if (targetProductId) {
          try {
            const freshProduct = await Product.findById(targetProductId);
            if (freshProduct) {
              currentStock = freshProduct.stock;
            } else {
              console.log(`⚠️ Produit introuvable en BDD pour l'ID: ${targetProductId}`);
              currentStock = 2; // Valeur de secours par défaut si le produit a été recréé entre-temps
            }
          } catch (dbErr) {
            console.error("Erreur lors de la recherche du produit :", dbErr.message);
            currentStock = 2; // Sécurité en cas d'erreur de cast d'ID Mongoose
          }
        } else {
          currentStock = 2; // Sécurité si aucune clé d'ID n'a pu être lue
        }

        // 🔥 OBLIGATION D'AFFICHAGE : On pousse l'article dans tous les cas pour éviter le panier vide
        cartItems.push({
          _id: item._id,
          productId: targetProductId || item._id, // Fallback pour ne pas casser le script JS
          name: item.name || "iPhone",
          price: item.price || 0,
          image: item.image || "",
          quantity: item.quantity || 1,
          stock: currentStock
        });
      }
    }

    const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    console.log("=== CONTENU ENVOYÉ AU TEMPLATE ===");
    console.log("cartItems à afficher :", cartItems);

    res.status(200).render('cart', {
      title: 'Mon Panier - Apple (FR)',
      cart: cartItems,
      totalAmount,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
    });

  } catch (err) {
    console.error('Erreur getCart absolue :', err);
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
