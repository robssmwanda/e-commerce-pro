const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const Order = require('../models/Order')
const Cart = require('../models/Cart')
const User = require('../models/User')
const sendEmail = require('../utils/sendEmail')

// ==========================================
// 🔥 TEMPLATE HTML DYNAMIQUE STYLE APPLE
// ==========================================
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
        
        <!-- En-tête -->
        <div style="background-color: #1d1d1f; padding: 30px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 500; letter-spacing: -0.5px;">Merci pour votre achat 🛒</h1>
          <p style="margin: 5px 0 0 0; color: #86868b; font-size: 14px;">Commande confirmée</p>
        </div>

        <!-- Contenu Principal -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #1d1d1f; line-height: 1.5; margin-top: 0;">
            Bonjour, <br>Votre commande a été validée avec succès. Vous trouverez ci-dessous votre récapitulatif d'achat détaillé.
          </p>

          <div style="background-color: #f5f5f7; border-radius: 8px; padding: 15px; margin-bottom: 25px; font-size: 14px; color: #515154;">
            <strong>Numéro de commande :</strong> <code style="color: #0066cc;">${orderId}</code>
          </div>

          <!-- Tableau des produits -->
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

          <!-- Prix Final -->
          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: right;">
            <span style="font-size: 16px; color: #86868b; margin-right: 15px;">Montant Total payé:</span>
            <span style="font-size: 24px; font-weight: 700; color: #1d1d1f;">${total}$</span>
          </div>

          <!-- Bouton d'action -->
          <div style="text-align: center; margin-top: 35px;">
            <a href="${process.env.CLIENT_URL || 'https://e-commerce-pro-b9ab.onrender.com'}/cart-page" 
               style="background-color: #0071e3; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 15px; font-weight: 500;">
               Retourner sur la boutique
            </a>
          </div>

        </div>

        <!-- Pied de page -->
        <div style="background-color: #f5f5f7; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; font-size: 12px; color: #86868b;">
          <p style="margin: 0;">© 2026 iTech Developer. Tous droits réservés.</p>
          <p style="margin: 5px 0 0 0;">Ceci est un e-mail automatique, merci de ne pas y répondre.</p>
        </div>

      </div>
    </div>
  `;
};

exports.checkoutStripe = async (req, res) => {
  try {
    const userId = req.session.userId
    const user = await User.findById(userId)

    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Vous devez être connecté.'
      })
    }

    const cart = await Cart.findOne({ user: userId })

    if (!cart || cart.items.length === 0) {
      return res.json({ status: 'empty' })
    }

    const line_items = cart.items.map(item => {
      let imageUrl = item.image;
      
      if (imageUrl && !imageUrl.startsWith('http')) {
        const baseUrl = process.env.CLIENT_URL || 'https://e-commerce-pro-b9ab.onrender.com';
        imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: imageUrl ? [imageUrl] : []
          },
          unit_amount: Math.round(Number(item.price) * 100)
        },
        quantity: item.quantity
      };
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`, 
      cancel_url: `${process.env.CLIENT_URL}/cart-page`,
      customer_email: user.email,
      metadata: {
        userId: userId.toString(),
        cartId: cart._id.toString()
      }
    })

    return res.json({ 
      status: 'success', 
      url: session.url 
    });

  } catch (err) {
    console.error("❌ CHECKOUT ERROR:", err)
    res.status(500).json({ status: 'error' })
  }
}

exports.webhookStripe = async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    console.log("🔥 EVENT:", event.type)

  } catch (err) {
    console.log('❌ Webhook error:', err.message)
    return res.status(400).send('Webhook Error')
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    const userId = session.metadata?.userId
    if (!userId) return res.json({ received: true })

    const user = await User.findById(userId)

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product']
    })

    const items = lineItems.data.map(item => ({
      name: item.description,
      price: item.amount_total / 100 / item.quantity, // Prix unitaire
      quantity: item.quantity,
      image: item.price?.product?.images?.[0] || ''
    }))

    const total = session.amount_total / 100

    const existingOrder = await Order.findOne({
      stripeSessionId: session.id
    })

    if (existingOrder) {
      return res.json({ received: true })
    }

    const order = await Order.create({
      user: userId,
      items,
      total,
      stripeSessionId: session.id,
      status: 'paid',
      email: session.customer_email
    })

    console.log("✅ Commande enregistrée")

    const emailToSend = user?.email || session.customer_email

    if (emailToSend) {
      try {
        // 🔥 MODIFICATION : On génère le HTML et on le passe à la fonction sendEmail
        const htmlContent = generateOrderEmailHTML(order._id, items, total);
        
        await sendEmail(
          emailToSend,
          "Commande confirmée",
          htmlContent // Envoi du code HTML stylisé
        )
        console.log("📧 Email envoyé à", emailToSend)
      } catch (err) {
        console.log("❌ Email échoué:", err.message)
      }
    }

    const cart = await Cart.findOne({ user: userId })
    if (cart) {
      cart.items = []
      await cart.save()
    }

    console.log("🧹 Panier vidé")
  }

  res.json({ received: true })
}
