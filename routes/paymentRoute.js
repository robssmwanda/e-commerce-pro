const express = require('express');
const router = express.Router()
const paymentController = require('../controllers/paymentController')
const { protect } = require('../middlewares/authMiddlewares')

router.post('/create-checkout-session', protect, paymentController.checkoutStripe)

module.exports = router;