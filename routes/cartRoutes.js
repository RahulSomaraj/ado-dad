const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware');
const {rbac} = require('../middlewares/rbacMiddleware');

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Cart management API
 */

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get cart for the logged-in user
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's cart fetched successfully.
 *       404:
 *         description: Cart not found.
 *       500:
 *         description: Server error.
 */
router.get(
  '/', 
  authMiddleware, 
  rbac(['user', 'admin']), 
  cartController.getCartByUserId
);

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: Add a product to the cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product, quantity]
 *             properties:
 *               product:
 *                 type: string
 *                 description: Product ID
 *               quantity:
 *                 type: number
 *                 description: Quantity of product to add
 *     responses:
 *       200:
 *         description: Product added to cart successfully.
 *       500:
 *         description: Server error.
 */
router.post(
  '/', 
  authMiddleware, 
  rbac(['user', 'admin']), 
  cartController.addToCart
);

/**
 * @swagger
 * /cart/{product}:
 *   delete:
 *     summary: Remove a product from the cart
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product
 *         required: true
 *         description: Product ID to remove
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product removed from cart successfully.
 *       404:
 *         description: Cart not found.
 *       500:
 *         description: Server error.
 */
router.delete(
  '/:product', 
  authMiddleware, 
  rbac(['user', 'admin']), 
  cartController.removeFromCart
);

module.exports = router;
