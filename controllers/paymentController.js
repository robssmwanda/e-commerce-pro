const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const Order = require('../models/Order')
const Cart = require('../models/Cart')
const User = require('../models/User') // 🔥 AJOUT ICI
const sendEmail = require('../utils/sendEmail')

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

    // 🔥 MODIFICATION ICI : On demande à Stripe d'inclure les données produit (expand)
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product']
    })

    // 🔥 MODIFICATION ICI : On extrait l'image du produit renvoyée par Stripe
    const items = lineItems.data.map(item => ({
      name: item.description,
      price: item.amount_total / 100,
      quantity: item.quantity,
      image: item.price?.product?.images?.[0] || '' // 👈 Capture l'URL de l'image
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

    console.log("✅ Commande enregistrée avec les images")

    const emailToSend = user?.email || session.customer_email

    if (emailToSend) {
      try {
        await sendEmail(
          emailToSend,
          "Commande confirmée",
          `
            <h2>Merci pour votre achat 🛒</h2>
            <p>Votre commande a été confirmée.</p>
            <p><strong>Total :</strong> ${total}$</p>
            <p>ID : ${order._id}</p>
          `
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
