const express = require("express");
const favoriteController = require("../controllers/favoriteController");

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FavoriteItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *           description: ID of the product
 *       required:
 *         - productId
 */

/**
 * @swagger
 * /favorites:
 *   post:
 *     summary: Add a product to favorites
 *     tags: [Favorites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FavoriteItem'
 *     responses:
 *       201:
 *         description: Product added to favorites
 *       500:
 *         description: Failed to add product
 */
router.post("/", favoriteController.addFavorite);

/**
 * @swagger
 * /favorites:
 *   get:
 *     summary: Get all favorite products
 *     tags: [Favorites]
 *     responses:
 *       200:
 *         description: List of favorite products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FavoriteItem'
 *       500:
 *         description: Failed to fetch favorites
 */
router.get("/", favoriteController.getFavorites);

module.exports = router;
