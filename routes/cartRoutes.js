const express = require('express');
const cartController = require('../controllers/cartController');
const authenticate = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Cart management APIs
 */

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: Add an item to the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID to add to the cart
 *               quantity:
 *                 type: integer
 *                 description: Quantity of the product
 *             required:
 *               - productId
 *               - quantity
 *     responses:
 *       200:
 *         description: Item added to cart.
 *       500:
 *         description: Error adding item to cart.
 */
router.post('/', authenticate,cartController.addToCart);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get the current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The current user's cart.
 *       404:
 *         description: Cart not found.
 *       500:
 *         description: Error fetching cart.
 */
router.get('/',authenticate, cartController.getCart);

/**
 * @swagger
 * /cart:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID to remove from the cart
 *             required:
 *               - productId
 *     responses:
 *       200:
 *         description: Item removed from cart.
 *       404:
 *         description: Cart not found.
 *       500:
 *         description: Error removing item from cart.
 */
router.delete('/',authenticate, cartController.removeFromCart);

module.exports = router;
