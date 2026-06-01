const express = require('express')
const path = require('path')
const app = express()
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const mongoSanitize = require('express-mongo-sanitize')
const flash = require('connect-flash')
const MongoStore = require('connect-mongo')
const { protect } = require('./middlewares/authMiddlewares')
const cartMiddleware = require('./middlewares/cartMiddleware')
const viewRouter = require('./routes/viewRouter')
const cartRouter = require('./routes/cartRoute')
const orderRouter = require('./routes/orderRoute')
const session = require('express-session')
const User = require('./models/User');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');

// 1. Route Webhook Stripe (doit rester tout en haut)
app.post(
  '/webhook-stripe',
  express.raw({ type: 'application/json' }),
  require('./controllers/paymentController').webhookStripe
);

app.use(cookieParser());

// 2. Configuration du Limiter de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Trop de requetes depuis cette IP, ressayez plus tard.'
})

// 3. Configuration de la Session (Correction de NODE_ENV)
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret123', // 🔥 Conseil : utilisez une variable d'environnement
  resave: false,
  saveUninitialized: false, 
  store: MongoStore.create({
    mongoUrl: process.env.DB
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // ✅ FIX : Correction de NODE_EVEN en NODE_ENV
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ FIX : Correction de NODE_EVEN en NODE_ENV
    maxAge: 1000 * 60 * 60 * 24
  },
  proxy: process.env.NODE_ENV === 'production'
}));

app.use(flash())

// 4. Configuration de Helmet pour autoriser les images de Stripe et des CDN
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://stripe.com"],
        frameSrc: ["'self'", "https://stripe.com", "https://stripe.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://googleapis.com"],
        imgSrc: ["'self'", "data:", "https://*.stripe.com", "https://unsplash.com", "https://onrender.com"], // ✅ Autorise les images Stripe et votre propre site
        fontSrc: ["'self'", "https://gstatic.com"],
      },
    },
  })
);

app.use(mongoSanitize())

// 5. Middleware Utilisateur / Flash Messages
app.use(async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        req.user = null;
        res.locals.user = null;
      } else {
        req.user = user;
        res.locals.user = user;
      }
    } else {
      req.user = null;
      res.locals.user = null;
    }
    res.locals.successMsg = req.flash('success');
    res.locals.errorMsg = req.flash('error');
    next();
  } catch (err) {
    console.error("❌ MIDDLEWARE ERROR:", err);
    req.user = null;
    res.locals.user = null;
    next();
  }
});

// 6. Middlewares de parsing et fichiers statiques
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(expressLayouts);
app.set('layout', 'layouts/main'); 
app.use(express.static(path.join(__dirname, 'public')))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(cartMiddleware)

// 7. Routes et Application du Limiter
app.use('/login', limiter) // S'applique uniquement sur le POST/GET /login
app.use('/', viewRouter)
app.use('/', require('./routes/paymentRoute'))
app.use('/cart', cartRouter)
app.use('/', orderRouter)

module.exports = app
