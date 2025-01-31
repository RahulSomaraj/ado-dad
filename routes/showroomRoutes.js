const express = require("express");
const router = express.Router();
const {
    getShowrooms,
    addShowroom,
    updateShowroom,
    deleteShowroom,
    getShowroomById,
} = require("../controllers/showroomController");
const authMiddleware = require("../middlewares/authMiddleware");
const { rbac } = require("../middlewares/rbacMiddleware");
const {
    validateShowroom,
} = require("../middlewares/validation/showRoomValidation");

/**
 * @swagger
 * tags:
 *   name: Showrooms
 *   description: Showroom management API
 */

/**
 * @swagger
 * /api/showrooms:
 *   get:
 *     summary: Get all showrooms
 *     tags: [Showrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter showrooms by city
 *       - in: query
 *         name: capacity
 *         schema:
 *           type: number
 *         description: Filter showrooms by minimum capacity
 *     responses:
 *       200:
 *         description: List of all showrooms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Showroom'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", authMiddleware, rbac(["admin", "user"]), getShowrooms);

/**
 * @swagger
 * /showrooms:
 *   post:
 *     summary: Add a new showroom
 *     tags: [Showrooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/image.jpg"
 *               showroomName:
 *                 type: string
 *                 example: "Prime Auto Showroom"
 *               owner:
 *                 type: string
 *                 example: "John Doe"
 *               address:
 *                 type: string
 *                 example: "123 Main Street, New York, NY"
 *               panCard:
 *                 type: string
 *                 example: "ABCDE1234F"
 *               cinNumber:
 *                 type: string
 *                 example: "A12345BC6789XYZ1"
 *     responses:
 *       201:
 *         description: Showroom added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Showroom'
 *       400:
 *         description: Bad Request (Validation errors)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
    "/",
    authMiddleware,
    rbac(["admin", 'user']),
    validateShowroom,
    addShowroom
);

/**
 * @swagger
 * /api/showrooms/{id}:
 *   put:
 *     summary: Update a showroom
 *     tags: [Showrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The showroom ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/image.jpg"
 *               showroomName:
 *                 type: string
 *                 example: "Luxury Showroom"
 *               owner:
 *                 type: string
 *                 example: "Jane Smith"
 *               address:
 *                 type: string
 *                 example: "456 Deluxe Avenue, Los Angeles, CA"
 *               panCard:
 *                 type: string
 *                 example: "XYZAB9876K"
 *               cinNumber:
 *                 type: string
 *                 example: "U12345XYZ9876A"
 *     responses:
 *       200:
 *         description: Showroom updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Showroom'
 *       400:
 *         description: Bad Request (Validation errors)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put("/:id", authMiddleware, rbac(["admin"]), validateShowroom, updateShowroom);

/**
 * @swagger
 * /api/showrooms/{id}:
 *   delete:
 *     summary: Delete a showroom
 *     tags: [Showrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The showroom ID
 *     responses:
 *       200:
 *         description: Showroom deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Showroom not found
 */
router.delete("/:id", authMiddleware, rbac(["admin"]), deleteShowroom);

/**
 * @swagger
 * /api/showrooms/{id}:
 *   get:
 *     summary: Get a showroom by ID
 *     tags: [Showrooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The showroom ID
 *     responses:
 *       200:
 *         description: Showroom details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Showroom'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Showroom not found
 */
router.get("/:id", authMiddleware, rbac(["admin", "user"]), getShowroomById);

module.exports = router;
