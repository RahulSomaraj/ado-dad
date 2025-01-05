const express = require('express');
const router = express.Router();
const advertisementController = require('../controllers/advertisementController');
const authMiddleware = require('../middlewares/authMiddleware'); // Middleware for authentication
const {rbac} = require('../middlewares/rbacMiddleware'); // Middleware for RBAC

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
 *               - heading
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [Vehicle, Property]
 *               heading:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Advertisement created successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */
router.post('/', authMiddleware,rbac(['admin','vendor', 'user']), advertisementController.createAdvertisement);

/**
 * @swagger
 * /advertisements:
 *   get:
 *     summary: Get all advertisements
 *     tags: [Advertisements]
 *     responses:
 *       200:
 *         description: List of advertisements
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
 *                 enum: [Vehicle, Property]
 *               heading:
 *                 type: string
 *               description:
 *                 type: string
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
router.put('/:id', authMiddleware, advertisementController.updateAdvertisement);

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
