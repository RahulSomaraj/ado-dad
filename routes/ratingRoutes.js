const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController'); // Path to controller
const authMiddleware = require('../middlewares/authMiddleware'); // Path to authMiddleware
const {rbac} = require('../middlewares/rbacMiddleware'); // Path to rbacMiddleware

// Swagger route for creating a rating
/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Create a new rating
 *     description: Create a new rating for a product
 *     tags: [Ratings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               product:
 *                 type: string
 *               rating:
 *                 type: integer
 *               review:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating created successfully
 *       500:
 *         description: Internal Server Error
 */
router.post(
  '/ratings',
  authMiddleware,
  rbac('admin'), // Only admin users can create a rating
  ratingController.createRating
);

// Swagger route for adding a comment
/**
 * @swagger
 * /ratings/{ratingId}/comments:
 *   post:
 *     summary: Add a comment to a rating
 *     description: Add a comment to a specific rating
 *     tags: [Ratings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: ratingId
 *         in: path
 *         required: true
 *         description: The ID of the rating to add a comment to
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment added successfully
 *       404:
 *         description: Rating not found
 *       500:
 *         description: Internal Server Error
 */
router.post(
  '/ratings/:ratingId/comments',
  authMiddleware,
  rbac('user'), // Users can comment
  ratingController.addComment
);

// Swagger route for getting ratings of a product
/**
 * @swagger
 * /ratings/product/{productId}:
 *   get:
 *     summary: Get ratings for a product
 *     description: Retrieve all ratings for a specific product
 *     tags: [Ratings]
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         description: The product ID to get ratings for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of ratings
 *       500:
 *         description: Internal Server Error
 */
router.get('/ratings/product/:productId', ratingController.getRatingsByProduct);

// Swagger route for deleting a rating
/**
 * @swagger
 * /ratings/{ratingId}:
 *   delete:
 *     summary: Delete a rating
 *     description: Delete a specific rating by its ID
 *     tags: [Ratings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: ratingId
 *         in: path
 *         required: true
 *         description: The ID of the rating to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rating deleted successfully
 *       404:
 *         description: Rating not found
 *       500:
 *         description: Internal Server Error
 */
router.delete(
  '/ratings/:ratingId',
  authMiddleware,
  rbac('admin'),
  ratingController.deleteRating
);

module.exports = router;
