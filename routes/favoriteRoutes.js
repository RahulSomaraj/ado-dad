const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rbac } = require('../middlewares/rbacMiddleware');

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
 *                 example: "abc123"
 *               itemType:
 *                 type: string
 *                 enum: [product, service]
 *                 description: Type of the item
 *                 example: "product"
 *     responses:
 *       201:
 *         description: Item added to favorites successfully
 *       400:
 *         description: Validation error
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
 *     parameters:
 *       - in: query
 *         name: itemId
 *         schema:
 *           type: string
 *         description: Filter favorites by itemId
 *       - in: query
 *         name: itemType
 *         schema:
 *           type: string
 *           enum: [product, service]
 *         description: Filter favorites by itemType
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
 *   get:
 *     summary: Get a specific favorite by ID
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         description: ID of the favorite to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favorite retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 favorite:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "605c72efb60e4f1efc9bd74c"
 *                     userId:
 *                       type: string
 *                       example: "user123"
 *                     itemId:
 *                       type: string
 *                       example: "abc123"
 *                     itemType:
 *                       type: string
 *                       example: "product"
 *                     createdAt:
 *                       type: string
 *                       example: "2025-01-07T10:00:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       example: "2025-01-07T10:10:00.000Z"
 *       404:
 *         description: Favorite not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:favoriteId',
  authMiddleware,
  rbac(['user', 'admin']), // Example: Only users and admins can view a specific favorite
  favoriteController.getFavoriteById
);

/**
 * @swagger
 * /favorites/{favoriteId}:
 *   put:
 *     summary: Update a favorite
 *     tags: [Favorites]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         description: ID of the favorite to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: Updated ID of the item to be favorited
 *                 example: "def456"
 *               itemType:
 *                 type: string
 *                 enum: [product, service]
 *                 description: Updated type of the item
 *                 example: "service"
 *     responses:
 *       200:
 *         description: Favorite updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Favorite not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:favoriteId',
  authMiddleware,
  rbac(['user']), // Example: Only 'user' role can update favorites
  favoriteController.updateFavorite
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
