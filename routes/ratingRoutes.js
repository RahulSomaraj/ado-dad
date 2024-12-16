const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

/**
 * @swagger
 * tags:
 *   name: Ratings
 *   description: Rating and comments management
 */

/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: Add a rating for a product
 *     tags: [Ratings]
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
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating added successfully
 *       500:
 *         description: Error adding rating
 */
router.post('/', ratingController.addRating);

/**
 * @swagger
 * /ratings/product/{productId}:
 *   get:
 *     summary: Get all ratings for a product
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the product
 *     responses:
 *       200:
 *         description: List of ratings
 *       500:
 *         description: Error fetching ratings
 */
router.get('/product/:productId', ratingController.getRatingsByProduct);

/**
 * @swagger
 * /ratings/{ratingId}/comments:
 *   post:
 *     summary: Add a comment to a rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the rating
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
 *       500:
 *         description: Error adding comment
 */
router.post('/:ratingId/comments', ratingController.addComment);

/**
 * @swagger
 * /ratings/{ratingId}:
 *   get:
 *     summary: Get a rating with comments
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the rating
 *     responses:
 *       200:
 *         description: Rating details with comments
 *       500:
 *         description: Error fetching rating
 */
router.get('/:ratingId', ratingController.getRatingWithComments);

module.exports = router;
