const express = require('express');
const router = express.Router();
const {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
} = require('../controllers/propertiesController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rbac } = require('../middlewares/rbacMiddleware'); // Role-based access control

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: API for managing properties
 */

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties
 *     tags: [Properties]
 *     description: Fetch a list of properties with optional filters.
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter properties by title (case-insensitive).
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [house, apartment, shopAndOffice, pgAndGuestHouse, land]
 *         description: Filter properties by type.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [forSale, forRent, landsAndPlots]
 *         description: Filter properties by category.
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Filter properties with a minimum price.
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Filter properties with a maximum price.
 *     responses:
 *       200:
 *         description: List of all properties
 *       500:
 *         description: Server error
 */
router.get('/', getAllProperties);

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Property ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property data
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getPropertyById);

/**
 * @swagger
 * /properties:
 *   post:
 *     summary: Create a new property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Property data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - price
 *               - location
 *               - area
 *               - type
 *               - category
 *               - images
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Beautiful House for Sale"
 *               description:
 *                 type: string
 *                 example: "A 3-bedroom house in a prime location."
 *               price:
 *                 type: number
 *                 example: 500000
 *               location:
 *                 type: string
 *                 example: "New York, NY"
 *               area:
 *                 type: number
 *                 example: 1200
 *               type:
 *                 type: string
 *                 enum: [house, apartment, shopAndOffice, pgAndGuestHouse, land]
 *                 example: "house"
 *               category:
 *                 type: string
 *                 enum: [forSale, forRent, landsAndPlots]
 *                 example: "forSale"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "https://example.com/image1.jpg"
 *     responses:
 *       201:
 *         description: Property created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, rbac(['admin', 'seller','user']), createProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Update a property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Property ID
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Updated property data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated Property Title"
 *               description:
 *                 type: string
 *                 example: "Updated description for the property."
 *               price:
 *                 type: number
 *                 example: 550000
 *               location:
 *                 type: string
 *                 example: "Los Angeles, CA"
 *               area:
 *                 type: number
 *                 example: 1300
 *               type:
 *                 type: string
 *                 enum: [house, apartment, shopAndOffice, pgAndGuestHouse, land]
 *                 example: "apartment"
 *               category:
 *                 type: string
 *                 enum: [forSale, forRent, landsAndPlots]
 *                 example: "forRent"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "https://example.com/updated-image.jpg"
 *     responses:
 *       200:
 *         description: Property updated
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authMiddleware, rbac(['admin', 'seller']), updateProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete a property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Property ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Property deleted
 *       404:
 *         description: Property not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authMiddleware, rbac(['admin', 'seller']), deleteProperty);

module.exports = router;
