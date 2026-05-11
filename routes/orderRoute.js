const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const { protect } = require('../middlewares/authMiddlewares')

router.get('/orders', protect, orderController.getMyOrders)
router.get('/orders/:id', protect, orderController.getOrderDetails)

// 🔥 AJOUT ICI
router.get('/success', protect, orderController.createOrderAfterPayment)

module.exports = router