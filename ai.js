        return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/.test(value);

        const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required!'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Password is required!'],
        minlength: [8, 'Password must be at least 8 characters long'],
        validate: {
            // Use a standard function to access `this` (the document being saved)
            validator: function(el) {
                return el === this.passwordConfirm;
            },
            message: 'Passwords do not match!'
        }
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password!'],
        // This field is for validation only and won't be persisted to the DB
        // Can be excluded in queries if needed, though not saved anyway
    }
});

// Remove the passwordConfirm field before saving to the database
userSchema.pre('save', function(next) {
    if (this.passwordConfirm) {
        this.passwordConfirm = undefined;
    }
    next();
});


const { birthDay, birthMonth, birthYear } = req.body;

const errors = {};

// 1. Vérification présence
if (!birthDay || !birthMonth || !birthYear) {
  errors.dateOfBirth = "Date de naissance complète requise";
}

// 2. Conversion
const day = Number(birthDay);
const month = Number(birthMonth);
const year = Number(birthYear);

// 3. Vérifications simples
if (day < 1 || day > 31) {
  errors.dateOfBirth = "Jour invalide";
}

if (month < 1 || month > 12) {
  errors.dateOfBirth = "Mois invalide";
}

if (year < 1900 || year > new Date().getFullYear()) {
  errors.dateOfBirth = "Année invalide";
}

// ⚠️ 4. STOP si erreur
if (Object.keys(errors).length > 0) {
  return res.status(400).render('signup', {
    title: 'Créer un compte',
    errors,
    formData: req.body
  });
}

// 5. Création de la date (UTC propre)
const tempDate = new Date(Date.UTC(year, month - 1, day));

// 6. Vérification réelle (ex: 31 février)
if (
  tempDate.getUTCFullYear() !== year ||
  tempDate.getUTCMonth() !== month - 1 ||
  tempDate.getUTCDate() !== day
) {
  return res.status(400).render('signup', {
    title: 'Créer un compte',
    errors: { dateOfBirth: "Date invalide" },
    formData: req.body
  });
}

const dateOfBirth = tempDate;

// 7. CONTINUER (ex: sauvegarde)
const user = await User.create({
  ...req.body,
  dateOfBirth
});

res.redirect('/dashboard');


// Vérifier âge minimum (18 ans)
const today = new Date();

let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();

const monthDiff = today.getUTCMonth() - dateOfBirth.getUTCMonth();
const dayDiff = today.getUTCDate() - dateOfBirth.getUTCDate();

// Ajustement si anniversaire pas encore passé cette année
if (
  monthDiff < 0 ||
  (monthDiff === 0 && dayDiff < 0)
) {
  age--;
}

if (age < 18) {
  return res.status(400).render('signup', {
    errors: { dateOfBirth: "Vous devez avoir au moins 18 ans" },
    formData: req.body
  });
}

// authController.js
exports.login = async (req, res) => {
    const { email, password } = req.body;

    // 1) Vérifier si l'utilisateur existe
    const user = await User.findOne({ email }).select('+password'); 
    // .select('+password') est nécessaire si vous l'avez caché (select: false) dans le schéma

    if (!user) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // 2) Utiliser votre méthode pour comparer les mots de passe
    const isCorrect = await user.candidatePassword(password);

    if (!isCorrect) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // 3) Si tout est ok, générer un token ou connecter l'utilisateur
    res.status(200).json({ status: 'success', data: user });
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Vérifier si l'email et le mot de passe sont fournis
    if (!email || !password) {
      return res.status(400).render('login', {
        error: 'Veuillez fournir un email et un mot de passe',
        formData: req.body
      });
    }

    // 2️⃣ Trouver l'utilisateur et récupérer explicitement le mot de passe
    // (On ajoute .select('+password') car il est souvent caché par défaut dans le schéma)
    const user = await User.findOne({ email }).select('+password');

    // 3️⃣ Vérifier si l'utilisateur existe ET si le mot de passe correspond
    // On utilise TA méthode : user.candidatePassword(saisi, stocké)
    if (!user || !(await user.candidatePassword(password, user.password))) {
      return res.status(401).render('login', {
        error: 'Email ou mot de passe incorrect',
        formData: req.body
      });
    }

    // 4️⃣ Si tout est OK, générer le token JWT
    const token = signToken(user._id);

    // 5️⃣ Configurer et envoyer le cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    // 6️⃣ Cacher le mot de passe avant redirection (sécurité)
    user.password = undefined;

    // 7️⃣ Succès : Rediriger vers l'accueil ou le tableau de bord
    req.flash('success', 'Connexion réussie !');
    res.redirect('/');

  } catch (err) {
    console.log(err);
    res.status(500).render('login', {
      error: 'Une erreur est survenue lors de la connexion'
    });
  }
};


app.post('/logout', (req, res) => {
    // 1. Détruire la session
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/account'); // En cas d'erreur
        }
        // 2. Nettoyer le cookie de session
        res.clearCookie('connect.sid'); 
        // 3. Rediriger vers la page de connexion
        res.redirect('/login');
    });
});

<div class="product-grid">
  <% products.forEach(product => { %>
    
    <div class="product-card">
      
      <div class="product-image-container">
        <img src="<%= product.image %>" alt="<%= product.name %>">
      </div>

      <div class="color-selection">
        <% product.colors.forEach((color, index) => { %>
          <span class="dot <%= color %> <%= index === 0 ? 'active' : '' %>"></span>
        <% }) %>
      </div>

      <div class="product-info">
        <h3 class="product-name"><%= product.name %></h3>

        <p class="product-tagline">
          <%= product.tagline %>
        </p>

        <p class="product-price"><%= product.price %></p>

        <div class="product-actions">
          <button class="btn-blue">En savoir plus</button>
          <a href="#" class="link-buy">Acheter ></a>
        </div>
      </div>

    </div>

  <% }) %>
</div>

// controllers/orderController.js
const Cart = require('../models/Cart');
const Order = require('../models/Order');

exports.checkout = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.json({ status: 'empty' });
    }

    const total = cart.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const order = new Order({
      user: req.user._id,
      items: cart.items,
      total
    });

    await order.save();

    // 🔥 vider le panier après commande
    cart.items = [];
    await cart.save();

    res.json({ status: 'success' });

  } catch (err) {
    console.error(err);
    res.json({ status: 'error' });
  }
};

// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/checkout', orderController.checkout);

module.exports = router;

app.use('/', require('./routes/orderRoutes'));

// controllers/paymentController.js

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Cart = require('../models/Cart');

exports.checkoutStripe = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.json({ status: 'empty' });
    }

    const line_items = cart.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: [item.image]
        },
        unit_amount: item.price * 100 // ⚠️ en cents
      },
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',

      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cart'
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.json({ status: 'error' });
  }
};



const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Cart = require('../models/Cart');

exports.checkoutStripe = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.json({ status: 'empty' });
    }

    const line_items = cart.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: [item.image]
        },
        unit_amount: item.price * 100 // ⚠️ cents
      },
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,

      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cart'
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.json({ status: 'error' });
  }
};

if (event.type === 'checkout.session.completed') {
  const session = event.data.object;

  const userId = session.metadata.userId;

  // 🔥 récupérer panier AVANT suppression
  const cart = await Cart.findOne({ user: userId });

  if (!cart || cart.items.length === 0) {
    console.log("Panier vide, rien à enregistrer");
    return;
  }

  // 🔥 calcul total
  const total = cart.items.reduce((acc, item) => {
    return acc + item.price * item.quantity;
  }, 0);

  // 💾 créer commande
  await Order.create({
    user: userId,
    items: cart.items,
    total
  });

  console.log("Commande enregistrée ✅");

  // 🧹 vider panier
  await Cart.findOneAndUpdate(
    { user: userId },
    { items: [] }
  );

  console.log("Panier vidé ✅");
}



// utils/sendEmail.js
const nodemailer = require('nodemailer')

const sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  await transporter.sendMail({
    from: `"Apple Store Clone" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  })
}

module.exports = sendEmail

await Order.create({
  user: userId,
  items: cart.items,
  total,
  stripeSessionId: session.id,
  status: 'paid'
})

// 🔥 ENVOI EMAIL
const user = await User.findById(userId)

await sendEmail(
  user.email,
  "Confirmation de commande",
  `
    <h2>Merci pour votre achat 🛒</h2>
    <p>Votre commande a été confirmée.</p>
    <p>Total: ${total}$</p>
  `
)

// utils/generateInvoice.js
const PDFDocument = require('pdfkit')
const fs = require('fs')

const generateInvoice = (order, filePath) => {
  const doc = new PDFDocument()

  doc.pipe(fs.createWriteStream(filePath))

  doc.fontSize(20).text('Facture', { align: 'center' })

  doc.text(`Commande ID: ${order._id}`)
  doc.text(`Total: ${order.total}$`)
  doc.text(`Status: ${order.status}`)

  doc.moveDown()

  order.items.forEach(item => {
    doc.text(`${item.name} - ${item.quantity} x ${item.price}$`)
  })

  doc.end()
}

module.exports = generateInvoice


const generateInvoice = require('../utils/generateInvoice')

const filePath = `invoices/${session.id}.pdf`

generateInvoice(order, filePath)