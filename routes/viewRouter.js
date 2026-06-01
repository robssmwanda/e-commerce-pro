const express = require('express');
const router = express.Router();

const viewController = require('../controllers/viewController');
const authController = require('./../controllers/authController');
const cartController = require('./../controllers/cartController');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
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
      console.log("🔥 PAGE SUCCESS : Tentative d'enregistrement de la commande...");
      
      // Récupération de l'utilisateur connecté
      const userId = req.user?._id || req.session?.userId;
      
      if (userId) {
         // 1. Trouver le panier actuel de l'utilisateur AVANT de le vider
         const cart = await Cart.findOne({ user: userId });
         
         if (cart && cart.items.length > 0) {
            
            // 2. Transférer TOUTES les données du panier (y compris l'image !) vers les items de la commande
            const orderItems = cart.items.map(item => ({
               productId: item.productId,
               name: item.name,
               price: item.price,
               quantity: item.quantity,
               image: item.image // 🔥 ICI : L'image présente dans le panier est sauvegardée
            }));

            // Calcul du montant total
            const total = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

            // Récupération facultative de l'ID de session Stripe depuis l'URL
            const stripeSessionId = req.query.session_id || '';

            // 3. Créer la commande en base de données avec les images
            await Order.create({
               user: userId,
               items: orderItems,
               total: total,
               stripeSessionId: stripeSessionId,
               status: 'paid'
            });
            console.log("✅ Commande enregistrée avec succès avec ses images !");

            // 4. Vider le panier maintenant que la commande est sécurisée
            cart.items = [];
            await cart.save();
            console.log("🧹 Panier vidé.");
         } else {
            console.log("⚠️ Panier déjà vide ou inexistant (Commande probablement déjà enregistrée).");
         }
      } else {
         console.log("❌ Impossible de créer la commande : Aucun utilisateur connecté trouvé.");
      }

   } catch (err) {
      console.error("❌ Erreur lors du traitement sur la page success :", err.message);
   }

   // Affichage de la page de succès e-commerce
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