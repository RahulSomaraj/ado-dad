const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const authMiddleware = require('../middlewares/authMiddleware');
const {rbac} = require('../middlewares/rbacMiddleware');

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: Favorite management endpoints
 */

/**
 * @swagger
 * /favorites:
 *   post:
 *     summary: Add an item to favorites
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - itemType
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: ID of the item to be favorited
 *               itemType:
 *                 type: string
 *                 enum: [product, service]
 *                 description: Type of the item
 *     responses:
 *       201:
 *         description: Item added to favorites successfully
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  authMiddleware,
  rbac(['user']), // Example: Only 'user' role can add favorites
  favoriteController.addFavorite
);

/**
 * @swagger
 * /favorites:
 *   get:
 *     summary: Get user's favorites
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's favorite items
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  authMiddleware,
  rbac(['user', 'admin']), // Users and admins can view favorites
  favoriteController.getUserFavorites
);

/**
 * @swagger
 * /favorites/{favoriteId}:
 *   delete:
 *     summary: Remove an item from favorites
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         description: ID of the favorite to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed from favorites successfully
 *       404:
 *         description: Favorite not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:favoriteId',
  authMiddleware,
  rbac(['user']), // Example: Only 'user' role can remove favorites
  favoriteController.removeFavorite
);

module.exports = router;
