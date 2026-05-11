const express = require('express');
const router = express.Router()
const cartController = require('./../controllers/cartController')
const { protect } = require('../middlewares/authMiddlewares')


router.get('/', protect,  cartController.getCart)
router.post('/add', protect, cartController.addToCart)
router.post('/remove/:productId', protect, cartController.removeFromCart)
router.post('/increase/:productId', protect, cartController.increaseQuantity);
router.post('/decrease/:productId', protect, cartController.decreaseQuantity);

module.exports = router;