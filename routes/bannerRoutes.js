const express = require('express');
const bannerController = require('../controllers/bannerController');

const router = express.Router();

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Banner title
 *               image:
 *                 type: string
 *                 description: Banner image URL
 *               link:
 *                 type: string
 *                 description: Banner link URL
 *     responses:
 *       201:
 *         description: Banner created successfully.
 *       500:
 *         description: Error creating banner.
 */
router.post('/', bannerController.createBanner);

/**
 * @swagger
 * /banners:
 *   get:
 *     summary: Get all banners
 *     tags: [Banners]
 *     responses:
 *       200:
 *         description: List of all banners.
 *       500:
 *         description: Error fetching banners.
 */
router.get('/', bannerController.getBanners);

/**
 * @swagger
 * /banners/{id}:
 *   get:
 *     summary: Get a banner by ID
 *     tags: [Banners]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Banner ID
 *     responses:
 *       200:
 *         description: Banner details.
 *       404:
 *         description: Banner not found.
 *       500:
 *         description: Error fetching banner.
 */
router.get('/:id', bannerController.getBannerById);

/**
 * @swagger
 * /banners/{id}:
 *   put:
 *     summary: Update a banner
 *     tags: [Banners]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Banner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Banner title
 *               image:
 *                 type: string
 *                 description: Banner image URL
 *               link:
 *                 type: string
 *                 description: Banner link URL
 *     responses:
 *       200:
 *         description: Banner updated successfully.
 *       404:
 *         description: Banner not found.
 *       500:
 *         description: Error updating banner.
 */
router.put('/:id', bannerController.updateBanner);

/**
 * @swagger
 * /banners/{id}:
 *   delete:
 *     summary: Delete a banner
 *     tags: [Banners]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Banner ID
 *     responses:
 *       200:
 *         description: Banner deleted successfully.
 *       404:
 *         description: Banner not found.
 *       500:
 *         description: Error deleting banner.
 */
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;
