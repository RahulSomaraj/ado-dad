const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rbac } = require('../middlewares/rbacMiddleware');

/**
 * @swagger
 * tags:
 *   name: Banners
 *   description: Banner management APIs
 */

/**
 * @swagger
 * /banners:
 *   post:
 *     summary: Create a new banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - image
 *               - link
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the banner.
 *                 example: "Car for sale"
 *               image:
 *                 type: string
 *                 description: The URL of the banner image.
 *                 example: "https://example.com/banner.jpg"
 *               link:
 *                 type: string
 *                 description: The link associated with the banner.
 *                 example: "https://example.com"
 *     responses:
 *       201:
 *         description: Banner created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authMiddleware,
  rbac(['admin', 'vendor', 'user']),
  bannerController.createBanner
);

/**
 * @swagger
 * /banners:
 *   get:
 *     summary: Get all banners
 *     tags: [Banners]
 *     description: Retrieve a list of banners. Supports filtering by title.
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter banners by title (case-insensitive).
 *     responses:
 *       200:
 *         description: A list of banners
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Banner'
 *       500:
 *         description: Server error
 */
router.get('/', authMiddleware, bannerController.getBanners);

/**
 * @swagger
 * /banners/{id}:
 *   get:
 *     summary: Get a banner by ID
 *     tags: [Banners]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the banner
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Banner details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Banner'
 *       404:
 *         description: Banner not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authMiddleware, bannerController.getBannerById);

/**
 * @swagger
 * /banners/{id}:
 *   put:
 *     summary: Update a banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the banner
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated title of the banner.
 *               image:
 *                 type: string
 *                 description: Updated URL of the banner image.
 *               link:
 *                 type: string
 *                 description: Updated link associated with the banner.
 *     responses:
 *       200:
 *         description: Banner updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Banner not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authMiddleware, rbac(['admin']), bannerController.updateBanner);

/**
 * @swagger
 * /banners/{id}:
 *   delete:
 *     summary: Delete a banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the banner
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Banner deleted successfully
 *       404:
 *         description: Banner not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authMiddleware, rbac(['admin']), bannerController.deleteBanner);

module.exports = router;
