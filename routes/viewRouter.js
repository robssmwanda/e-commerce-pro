const express = require('express');
const router = express.Router();

const viewController = require('../controllers/viewController');
const authController = require('./../controllers/authController');
const cartController = require('./../controllers/cartController');
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

router.get('/success', (req, res) => {

   console.log("SUCCESS ROUTE HIT");

   res.render('success', {
      title: 'Paiement reussie'
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