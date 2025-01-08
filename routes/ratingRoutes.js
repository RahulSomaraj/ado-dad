const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController'); // Path to controller
const authMiddleware = require('../middlewares/authMiddleware'); // Path to authMiddleware
const { rbac } = require('../middlewares/rbacMiddleware'); // Path to rbacMiddleware

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
 *                 example: "63a79bfb1234567890abcdef"
 *               product:
 *                 type: string
 *                 example: "63b1c1234567890abcdef123"
 *               rating:
 *                 type: integer
 *                 example: 4
 *               review:
 *                 type: string
 *                 example: "This product is excellent!"
 *     responses:
 *       201:
 *         description: Rating created successfully
 *       500:
 *         description: Internal Server Error
 */
router.post(
  '/',
  authMiddleware,
  rbac(['admin','user']), 
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
 *                 example: "I totally agree with this rating."
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
  rbac(['user']), // Users can comment
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
 *       - name: minRating
 *         in: query
 *         required: false
 *         description: Filter ratings with a minimum rating
 *         schema:
 *           type: integer
 *           example: 3
 *       - name: maxRating
 *         in: query
 *         required: false
 *         description: Filter ratings with a maximum rating
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: A list of ratings
 *       500:
 *         description: Internal Server Error
 */
router.get('/ratings/product/:productId',authMiddleware,rbac(['user']), ratingController.getRatingsByProduct);

// Swagger route for updating a rating
/**
 * @swagger
 * /ratings/{ratingId}:
 *   put:
 *     summary: Update a rating
 *     description: Update a specific rating
 *     tags: [Ratings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: ratingId
 *         in: path
 *         required: true
 *         description: The ID of the rating to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 example: 5
 *               review:
 *                 type: string
 *                 example: "Updated review for the product."
 *     responses:
 *       200:
 *         description: Rating updated successfully
 *       404:
 *         description: Rating not found
 *       500:
 *         description: Internal Server Error
 */
router.put(
  '/ratings/:ratingId',
  authMiddleware,
  rbac(['admin']),
  ratingController.updateRating
);

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
  rbac(['admin']),
  ratingController.deleteRating
);

module.exports = router;
