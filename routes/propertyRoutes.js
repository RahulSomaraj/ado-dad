// routes.js

const express = require('express');
const propertiesController = require('../controllers/propertiesController');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Properties management
 */

/**
 * @swagger
 * /properties:
 *   get:
 *     summary: Retrieve all properties
 *     tags: [Properties]
 *     description: Get a list of all properties available.
 *     responses:
 *       200:
 *         description: A list of all properties.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/properties', propertiesController.getAllProperties);

/**
 * @swagger
 * /properties/sale:
 *   get:
 *     summary: Retrieve all properties for sale
 *     tags: [Properties]
 *     description: Get a list of properties that are for sale.
 *     responses:
 *       200:
 *         description: A list of properties for sale.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/properties/sale', propertiesController.getForSaleProperties);

/**
 * @swagger
 * /properties/rent:
 *   get:
 *     summary: Retrieve all properties for rent
 *     tags: [Properties]
 *     description: Get a list of properties available for rent.
 *     responses:
 *       200:
 *         description: A list of properties for rent.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/properties/rent', propertiesController.getForRentProperties);

/**
 * @swagger
 * /properties/{category}/{type}:
 *   get:
 *     summary: Retrieve properties by category and type
 *     tags: [Properties]
 *     description: Get properties based on a specific category (e.g., forSale, forRent) and type (e.g., houses, apartments).
 *     parameters:
 *       - name: category
 *         in: path
 *         required: true
 *         description: The category of the properties (e.g., forSale, forRent).
 *         schema:
 *           type: string
 *       - name: type
 *         in: path
 *         required: true
 *         description: The type of the properties (e.g., houses, apartments).
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of properties of the specified category and type.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: Category or type not found.
 */
router.get('/properties/:category/:type', propertiesController.getPropertiesByType);

/**
 * @swagger
 * /properties:
 *   post:
 *     summary: Post a new property
 *     tags: [Properties]
 *     description: Add a new property to a specified category and type.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 description: The category of the property (e.g., forSale, forRent).
 *               type:
 *                 type: string
 *                 description: The type of the property (e.g., houses, apartments).
 *               property:
 *                 type: object
 *                 description: The property details.
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   price:
 *                     type: number
 *                   location:
 *                     type: string
 *                   postedBy:
 *                     type: string
 *                   datePosted:
 *                     type: string
 *     responses:
 *       201:
 *         description: Property posted successfully.
 *       400:
 *         description: Invalid category or type.
 *       500:
 *         description: Error posting property.a
 */
router.post('/properties', propertiesController.postProperty);

module.exports = router;
