const express = require('express')
const path = require('path')
const app = express()
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
app.post(
  '/webhook-stripe',
  express.raw({ type: 'application/json' }),
  require('./controllers/paymentController').webhookStripe
);

app.use(cookieParser());


app.use(session({
  secret: 'secret123',
  resave: false,
  saveUninitialized: false, // 🔥 FIX
  store: MongoStore.create({
    mongoUrl: process.env.DB
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_EVEN === 'production',
    sameSite: process.env.NODE_EVEN === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24
  },
   proxy: process.env.NODE_ENV === 'production'
}));

app.use(flash())

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


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(expressLayouts);
app.set('layout', 'layouts/main'); 

app.use(express.static(path.join(__dirname, 'public')))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))


app.use(cartMiddleware)

app.use('/', viewRouter)
app.use('/', require('./routes/paymentRoute'))
app.use('/cart', cartRouter)
app.use('/', orderRouter)

module.exports = app