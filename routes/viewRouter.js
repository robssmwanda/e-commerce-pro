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
router.get('/success', async (req, res) => {
   try {
      console.log("🔥 PAGE SUCCESS : Tentative d'enregistrement de la commande et validation des stocks...");
      
      const userId = req.user?._id || req.session?.userId;
      
      if (userId) {
         const cart = await Cart.findOne({ user: userId });
         
         if (cart && cart.items.length > 0) {
            
            // 1. SÉCURITÉ : On vérifie d'abord TOUS les produits en BDD avant de modifier quoi que ce soit
            for (const item of cart.items) {
               // Recherche du produit par son ID (adapté selon votre modèle de panier : item.productId ou item.product)
               const targetId = item.productId || item.product;
               const currentProduct = await Product.findById(targetId);

               // Si le produit n'existe plus ou si le stock en BDD est inférieur à la demande du panier
               if (!currentProduct || currentProduct.stock < item.quantity) {
                  console.log(`🚨 ÉCHEC SÉCURITÉ SERVEUR : Plus de stock pour ${item.name}. Stock disponible: ${currentProduct ? currentProduct.stock : 0}`);
                  return res.status(400).render('error', {
                     title: 'Erreur de stock',
                     message: `Désolé, le produit ${item.name} n'est plus disponible en quantité suffisante pour valider votre commande.`
                  });
               }
            }

            // 2. MISE À JOUR DU STOCK : Si la boucle précédente a validé tous les articles, on décrémente
            for (const item of cart.items) {
               const targetId = item.productId || item.product;
               await Product.findByIdAndUpdate(
                  targetId,
                  { $inc: { stock: -item.quantity } } // Décrémente proprement la quantité achetée en base de données
               );
               console.log(`📉 Stock mis à jour pour le produit : ${item.name}`);
            }
            
            // 3. TRANSFERT DES DONNÉES DU PANIER VERS LA COMMANDE
            const orderItems = cart.items.map(item => ({
               productId: item.productId || item.product,
               name: item.name,
               price: item.price,
               quantity: item.quantity,
               image: item.image
            }));

            // Calcul du montant total
            const total = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

            // Récupération facultative de l'ID de session Stripe depuis l'URL
            const stripeSessionId = req.query.session_id || '';

            // 4. CRÉATION DE LA COMMANDE
            await Order.create({
               user: userId,
               items: orderItems,
               total: total,
               stripeSessionId: stripeSessionId,
               status: 'paid'
            });
            console.log("✅ Commande enregistrée avec succès avec ses images et stocks décrémentés !");

            // 5. VIDER LE PANIER
            cart.items = [];
            await cart.save();
            console.log("🧹 Panier vidé.");
         } else {
            console.log("⚠️ Panier déjà vide ou inexistant (Commande probablement déjà enregistrée).");
         }
      } else {
         console.log("❌ Impossible de créer la commande : Aucun utilisateur connecté trouvé.");
         return res.status(401).send("Utilisateur non authentifié.");
      }

   } catch (err) {
      console.error("❌ Erreur lors du traitement sur la page success :", err.message);
      return res.status(500).send("Erreur interne du serveur lors de la validation.");
   }

   // Affichage de la vue succès e-commerce si toutes les étapes précédentes ont réussi
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
