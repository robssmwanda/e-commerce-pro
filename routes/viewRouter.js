const express = require('express');
const router = express.Router();

const viewController = require('../controllers/viewController');
const authController = require('./../controllers/authController');
const cartController = require('./../controllers/cartController');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product'); // 🔥 SÉCURITÉ : Importation essentielle du modèle Product
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

// SÉCURITÉ SERVEUR MAXIMALE : Traitement de la commande, vérification et décrémentation des stocks
// =========================================================================
// SÉCURITÉ SERVEUR MAXIMALE : Traitement de la commande et décrémentation des stocks
// =========================================================================
router.get('/success', protect, async (req, res) => {
   try {
      console.log("🔥 PAGE SUCCESS : Enregistrement de la commande et validation des stocks...");
      
      const userId = req.user?._id;
      if (!userId) {
         console.log("❌ Impossible de créer la commande : Utilisateur non authentifié.");
         return res.status(401).send("Utilisateur non authentifié.");
      }

      const cart = await Cart.findOne({ user: userId });
      
      if (cart && cart.items.length > 0) {
         
         // 1. SÉCURITÉ CONTRE LA CONCURRENCE : On vérifie TOUS les stocks avant de modifier quoi que ce soit
         for (const item of cart.items) {
            // Détection universelle de l'ID produit
            const targetId = item.produit || item.productId || item.product;
            let currentProduct = null;

            if (targetId) {
               currentProduct = await Product.findById(targetId);
            }

            // Secours par le nom du produit
            if (!currentProduct && item.name) {
               currentProduct = await Product.findOne({ name: item.name });
            }

            // Si le produit n'existe plus ou si le stock en BDD est insuffisant
            if (!currentProduct || currentProduct.stock < item.quantity) {
               console.log(`🚨 ÉCHEC SÉCURITÉ SERVEUR : Stock insuffisant pour ${item.name}.`);
               return res.status(400).render('error', {
                  title: 'Erreur de stock',
                  message: `Désolé, le produit ${item.name} n'est plus disponible en quantité suffisante pour valider votre commande.`
               });
            }

            // On attache temporairement l'ID BDD trouvé à l'item du panier pour l'étape suivante
            item.realProductDbId = currentProduct._id;
         }

         // 2. MISE À JOUR DU STOCK : On décrémente le stock physique Int32 dans MongoDB
         for (const item of cart.items) {
            await Product.findByIdAndUpdate(
               item.realProductDbId,
               { $inc: { stock: -Number(item.quantity) } } // Décrémente proprement la quantité achetée
            );
            console.log(`📉 Stock mis à jour (-${item.quantity}) pour le produit : ${item.name}`);
         }
         
         // 3. PRÉPARATION DU TRANSFERT VERS LA COLLECTION ORDERS
         const orderItems = cart.items.map(item => ({
            productId: item.realProductDbId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image
         }));

         const total = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
         const stripeSessionId = req.query.session_id || '';

         // 4. CRÉATION DE LA COMMANDE EN BDD
         await Order.create({
            user: userId,
            items: orderItems,
            total: total,
            stripeSessionId: stripeSessionId,
            status: 'paid'
         });
         console.log("✅ Commande enregistrée avec succès !");

         // 5. VIDER LE PANIER
         cart.items = [];
         await cart.save();
         console.log("🧹 Panier utilisateur vidé.");
      } else {
         console.log("⚠️ Panier déjà vide (Commande probablement déjà traitée lors d'un rechargement).");
      }

      // Affichage de la page de confirmation de paiement Apple
      res.render('success', {
         title: 'Paiement réussi'
      });

   } catch (err) {
      console.error("❌ Erreur critique sur la page success :", err.message);
      return res.status(500).send("Erreur interne du serveur lors de la validation.");
   }
});


router.get('/check-email', (req, res) => {

   if (!req.session.email) {
      return res.redirect('/sign-up');
   }

   res.render('check-email', {
      email: req.session.email
   });

});

router.post(
   '/cart/increase/:productId',
   protect,
   cartController.increaseQuantity
);

router.post(
   '/cart/decrease/:productId',
   protect,
   cartController.decreaseQuantity
);

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

// 🔥 Remplacer viewController.getCartPage par viewController.getCart
router.get(
   '/cart-page',
   protect,
   viewController.getCart
);


router.post('/signup', authController.createUser);

router.post('/login', authController.login);

router.post('/logout', authController.logout);

module.exports = router;
