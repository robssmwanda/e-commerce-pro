const express = require('express');
const router = express.Router();

const viewController = require('../controllers/viewController');
const authController = require('./../controllers/authController');
const cartController = require('./../controllers/cartController');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product'); 
const upload = require('../utils/multer');
const sendEmail = require('../utils/sendEmail');

const {
   protect,
   redirectIfLoggedIn
} = require('./../middlewares/authMiddlewares');

// =========================================================================
// 🔥 GÉNÉRATEUR DE TEMPLATE EMAIL EXCLUSIF (STYLE APPLE)
// =========================================================================
const generateOrderEmailHTML = (orderId, items, total) => {
  const itemRows = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; vertical-align: middle;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: auto; border-radius: 6px; margin-right: 12px; vertical-align: middle;">` : ''}
        <span style="font-weight: 600; color: #1d1d1f; vertical-align: middle;">${item.name}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center; color: #86868b; font-weight: 500;">
        x${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #1d1d1f;">
        ${item.price * item.quantity}$
      </td>
    </tr>
  `).join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f7; padding: 40px 20px; min-height: 100%;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background-color: #1d1d1f; padding: 30px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 500; letter-spacing: -0.5px;">Merci pour votre achat 🛒</h1>
          <p style="margin: 5px 0 0 0; color: #86868b; font-size: 14px;">Commande confirmée</p>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #1d1d1f; line-height: 1.5; margin-top: 0;">
            Bonjour, <br>Votre commande a été validée avec succès. Vous trouverez ci-dessous votre récapitulatif d'achat détaillé.
          </p>
          <div style="background-color: #f5f5f7; border-radius: 8px; padding: 15px; margin-bottom: 25px; font-size: 14px; color: #515154;">
            <strong>Numéro de commande :</strong> <code style="color: #0066cc;">${orderId}</code>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #1d1d1f; color: #86868b; font-size: 12px; text-transform: uppercase;">Produit</th>
                <th style="text-align: center; padding: 12px; border-bottom: 2px solid #1d1d1f; color: #86868b; font-size: 12px; text-transform: uppercase;">Qté</th>
                <th style="text-align: right; padding: 12px; border-bottom: 2px solid #1d1d1f; color: #86868b; font-size: 12px; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: right;">
            <span style="font-size: 16px; color: #86868b; margin-right: 15px;">Montant Total payé:</span>
            <span style="font-size: 24px; font-weight: 700; color: #1d1d1f;">${total}$</span>
          </div>
          <div style="text-align: center; margin-top: 35px;">
            <a href="${process.env.CLIENT_URL || 'https://onrender.com'}/fr/iphone" 
               style="background-color: #0071e3; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 15px; font-weight: 500;">
               Retourner sur la boutique
            </a>
          </div>
        </div>
        <div style="background-color: #f5f5f7; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; font-size: 12px; color: #86868b;">
          <p style="margin: 0;">© 2026 iTech Developer. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  `;
};

// =========================================================================
// ROUTES DE BASE
// =========================================================================
router.get('/verify-email/:token', authController.verifyEmail);
router.get('/', viewController.getHome);
router.get('/fr/iphone/', viewController.getIphone);

router.get(
   '/buy/:slug',
   protect,
   viewController.getBuyPage
);

// =========================================================================
// SÉCURITÉ SERVEUR MAXIMALE & ENVOI EMAIL
// =========================================================================
router.get('/success', protect, async (req, res) => {
   try {
      console.log("🔥 PAGE SUCCESS : Enregistrement de la commande, validation des stocks et envoi de l'email...");
      
      const userId = req.user?._id;
      if (!userId) {
         console.log("❌ Impossible de créer la commande : Utilisateur non authentifié.");
         return res.status(401).send("Utilisateur non authentifié.");
      }

      const cart = await Cart.findOne({ user: userId });
      
      if (cart && cart.items.length > 0) {
         
         // 1. SÉCURITÉ CONTRE LA CONCURRENCE
         for (const item of cart.items) {
            // 🔥 CORRECTION : Ajout de item.productIdNew pour correspondre à vos logs réels
            const targetId = item.productIdNew || item.produit || item.productId || item.product || item._id;
            let currentProduct = null;

            if (targetId) {
               currentProduct = await Product.findById(targetId);
            }

            if (!currentProduct && item.name) {
               currentProduct = await Product.findOne({ name: item.name });
            }

            if (!currentProduct || currentProduct.stock < item.quantity) {
               console.log(`🚨 ÉCHEC SÉCURITÉ SERVEUR : Stock insuffisant pour ${item.name}.`);
               return res.status(400).render('error', {
                  title: 'Erreur de stock',
                  message: `Désolé, le produit ${item.name} n'est plus disponible en quantité suffisante pour valider votre commande.`
               });
            }

            item.realProductDbId = currentProduct._id;
         }

         // 2. MISE À JOUR DU STOCK
         for (const item of cart.items) {
            await Product.findByIdAndUpdate(
               item.realProductDbId,
               { $inc: { stock: -Number(item.quantity) } } 
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
         const order = await Order.create({
            user: userId,
            items: orderItems,
            total: total,
            stripeSessionId: stripeSessionId,
            status: 'paid'
         });
         console.log("✅ Commande enregistrée avec succès !");

         // 5. ENVOI DE L'EMAIL HTML AVANT DE VIDER LE PANIER
         const emailTarget = req.user.email;
         if (emailTarget) {
            try {
               const htmlContent = generateOrderEmailHTML(order._id, orderItems, total);
               await sendEmail(emailTarget, "Commande confirmée", htmlContent);
               console.log("📧 Superbe Email HTML envoyé avec succès à :", emailTarget);
            } catch (emailErr) {
               console.log("❌ Échec de l'envoi de l'email :", emailErr.message);
            }
         }

         // 6. VIDER LE PANIER
         cart.items = [];
         await cart.save();
         console.log("🧹 Panier utilisateur vidé.");
      } else {
         console.log("⚠️ Panier déjà vide (Commande probablement déjà traitée lors d'un rechargement).");
      }

      res.render('success', {
         title: 'Paiement réussi'
      });

   } catch (err) {
      console.error("❌ Erreur critique sur la page success :", err.message);
      return res.status(500).send("Erreur interne du serveur lors de la validation.");
   }
});

// =========================================================================
// GESTION DU COMPTE & FORMULAIRES
// =========================================================================
router.get('/check-email', (req, res) => {
   if (!req.session.email) {
      return res.redirect('/sign-up');
   }
   res.render('check-email', {
      email: req.session.email
   });
});

router.post('/cart/increase/:productId', protect, cartController.increaseQuantity);
router.post('/cart/decrease/:productId', protect, cartController.decreaseQuantity);

router.get('/account', protect, viewController.manageAccount);
router.post('/account/profile', protect, authController.updateProfile);
router.get('/account/profile', protect, viewController.getProfilePage);
router.get('/account/password', protect, viewController.getPasswordPage);

router.get('/forgot-password', viewController.getForgotPasswordPage);
