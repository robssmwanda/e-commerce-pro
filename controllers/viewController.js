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

exports.getCartPage = async (req, res) => {
  try {

    if (!req.user) {
      return res.redirect('/sign-in');
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = { items: [] };
    }

    // 🔥 FIX : Extraction et transmission des messages Flash (Erreur de Stock) au template cart.ejs
    res.render('cart', {
      cart: cart.items,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error') 
    });

  } catch (err) {
    console.error("❌ CART PAGE ERROR:", err);
    res.status(500).send('Erreur serveur');
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
