const express = require('express');
const router = express.Router();
const advertisementController = require('../controllers/advertisementController');
const authMiddleware = require('../middlewares/authMiddleware'); // Middleware for authentication
const { rbac } = require('../middlewares/rbacMiddleware'); // Middleware for RBAC

/**
 * @swagger
 * tags:
 *   name: Advertisements
 *   description: Advertisement management
 */

/**
 * @swagger
 * /advertisements:
 *   post:
 *     summary: Create a new advertisement
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - createdBy
 *               - heading
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 description: "The type of advertisement, either 'Vehicle' or 'Property'."
 *                 example: "Vehicle"
 *               createdBy:
 *                 type: string
 *                 description: "The ID of the user creating the advertisement."
 *                 example: "64b8e09d9f68ec1d33c44a17"
 *               heading:
 *                 type: string
 *                 description: "The heading of the advertisement."
 *                 example: "Affordable Family Car for Sale"
 *               description:
 *                 type: string
 *                 description: "A detailed description of the advertisement."
 *                 example: "A well-maintained family car, single owner, excellent mileage, and recently serviced."
 *     responses:
 *       201:
 *         description: Advertisement created successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */
router.post('/', authMiddleware, rbac(['admin', 'vendor', 'user']), advertisementController.createAdvertisement);

/**
 * @swagger
 * /advertisements:
 *   get:
 *     summary: Get all advertisements
 *     tags: [Advertisements]
 *     parameters:
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by advertisement type (e.g., "Vehicle" or "Property")
 *       - name: createdBy
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by user ID who created the advertisement
 *       - name: heading
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by heading (case-insensitive)
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *         description: Field to sort by (e.g., "type", "createdBy")
 *       - name: order
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sorting order (ascending or descending)
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *         description: Page number for pagination (default is 1)
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *         description: Number of results per page (default is 10)
 *     responses:
 *       200:
 *         description: List of advertisements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of matching advertisements
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Results per page
 *                 advertisements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Advertisement'
 *       500:
 *         description: Internal Server Error
 */
router.get('/', advertisementController.getAllAdvertisements);

/**
 * @swagger
 * /advertisements/{id}:
 *   get:
 *     summary: Get advertisement by ID
 *     tags: [Advertisements]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the advertisement
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Advertisement found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Advertisement'
 *       404:
 *         description: Advertisement not found
 *       500:
 *         description: Internal Server Error
 */
router.get('/:id', advertisementController.getAdvertisementById);

/**
 * @swagger
 * /advertisements/{id}:
 *   put:
 *     summary: Update advertisement by ID
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the advertisement
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: "The type of advertisement, either 'Vehicle' or 'Property'."
 *                 example: "Vehicle"
 *               createdBy:
 *                 type: string
 *                 description: "The ID of the user updating the advertisement."
 *                 example: "65b8e09d9f68ec1d33c44a17"
 *               heading:
 *                 type: string
 *                 description: "The heading of the advertisement."
 *                 example: "Affordable yacht for Sale"
 *               description:
 *                 type: string
 *                 description: "A detailed description of the advertisement."
 *                 example: "A well-maintained yacht, single owner, excellent mileage, and recently serviced."
 *     responses:
 *       200:
 *         description: Advertisement updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Advertisement not found
 *       500:
 *         description: Internal Server Error
 */
router.put('/:id', authMiddleware, rbac(['admin', 'vendor', 'user']), advertisementController.updateAdvertisement);

/**
 * @swagger
 * /advertisements/{id}:
 *   delete:
 *     summary: Delete advertisement by ID
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the advertisement
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Advertisement deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Advertisement not found
 *       500:
 *         description: Internal Server Error
 */
router.delete('/:id', authMiddleware, rbac(['admin']), advertisementController.deleteAdvertisement);

module.exports = router;
