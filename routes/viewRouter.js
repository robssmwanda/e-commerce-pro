const express = require('express');
const router = express.Router();

const viewController = require('../controllers/viewController');
const authController = require('./../controllers/authController');
const cartController = require('./../controllers/cartController');
const Cart = require('../models/Cart');
const upload = require('../utils/multer')

const {
   protect,
   redirectIfLoggedIn
} = require('./../middlewares/authMiddlewares');


router.get('/verify-email/:token', authController.verifyEmail);

router.get('/', viewController.getHome);

router.get('/fr/iphone/', viewController.getIphone);

router.get(
   '/buy/:slug',
   protect,
   viewController.getBuyPage
);

// router.get('/success', (req, res) => {
//    console.log("SUCCESS ROUTE HIT");
//    res.render('success', {
//       title: 'Paiement reussie'
//    });
// });

router.get('/success', async (req, res) => {
   try {
      console.log("🔥 SUCCESS ROUTE HIT - Tentative de vidage du panier...");
      
      // 1. Récupérer l'identifiant de l'utilisateur connecté via sa session
      const userId = req.user?._id || req.session.userId;
      
      // 2. Si l'utilisateur est bien identifié, on vide son panier en base de données
      if (userId) {
         const cart = await Cart.findOne({ user: userId });
         if (cart) {
            cart.items = []; // On efface les articles
            await cart.save();
            console.log("🧹 Panier vidé avec succès en production !");
         }
      } else {
         console.log("⚠️ Impossible de vider le panier : Aucun userId trouvé dans la session.");
      }

   } catch (err) {
      console.error("❌ Erreur lors du vidage du panier sur la page success :", err.message);
   }

   // 3. On affiche la page de succès quoi qu'il arrive
   res.render('success', {
      title: 'Paiement réussi'
   });
});


router.get('/check-email', (req, res) => {

   if (!req.session.email) {
      return res.redirect('/sign-up');
   }

   res.render('check-email', {
      email: req.session.email
   });

});

router.get(
   '/account',
   protect,
   viewController.manageAccount
);

router.post(
   '/account/profile',
   protect,
   authController.updateProfile
);

router.get(
   '/account/profile',
   protect,
   viewController.getProfilePage
);

router.get(
   '/account/password',
   protect,
   viewController.getPasswordPage
);

router.get(
   '/forgot-password',
   viewController.getForgotPasswordPage
);

router.get(
   '/reset-password/:token',
   viewController.getResetPasswordPage
);

router.post(
   '/account/password',
   protect,
   authController.updatePassword
);

router.post(
   '/reset-password/:token',
   authController.resetPassword
);

router.post(
   '/forgot-password',
   authController.forgotPassword
);

router.post(
   '/resend-email',
   authController.resendVerificationEmail
);

router.post(
   '/update-profile-photo',
   protect,
   upload.single('profileImage'),
   authController.updateProfilePhoto,
);

router.get(
   '/sign-in',
   redirectIfLoggedIn,
   viewController.getLoginForm
);

router.get(
   '/sign-up',
   redirectIfLoggedIn,
   viewController.getSignupForm
);

router.get(
   '/cart-page',
   protect,
   viewController.getCartPage
);

router.post('/signup', authController.createUser);

router.post('/login', authController.login);

router.post('/logout', authController.logout);

module.exports = router;