const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const Order = require('../models/Order')
const Cart = require('../models/Cart')
const User = require('../models/User') // 🔥 AJOUT ICI
const sendEmail = require('../utils/sendEmail')

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

    const line_items = cart.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: [item.image]
        },
        unit_amount: Math.round(Number(item.price) * 100) // 🔥 sécurité
      },
      quantity: item.quantity
    }))

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,

      // 🔥 URL propre
      //success_url: `https://e-commerce-pro-b9ab.onrender.com/`,
      //success_url: 'http://localhost:3000/success.html?session_id={CHECKOUT_SESSION_ID}',
      //cancel_url: `https://e-commerce-pro-b9ab.onrender.com/`,

      //success_url: 'http://localhost:3000/success',
      // ✅ Les URLs s'adapteront toutes seules (en local comme sur Render)
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

  // 🔥 récupérer items depuis Stripe
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id)

  const items = lineItems.data.map(item => ({
    name: item.description,
    price: item.amount_total / 100,
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

  // 🔥 email sécurisé
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

  // vider panier (optionnel maintenant)
  const cart = await Cart.findOne({ user: userId })
  if (cart) {
    cart.items = []
    await cart.save()
  }

  console.log("🧹 Panier vidé")
}

  res.json({ received: true })
}