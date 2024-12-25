const express = require("express");
const router = express.Router();
const { getShowrooms, addShowroom, deleteShowroom } = require("../controllers/showroomController");
const authMiddleware = require("../middlewares/authMiddleware");
const {rbac} = require("../middlewares/rbacMiddleware");
const { validateShowroom } = require("../middlewares/validationMiddleware");

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
 * /api/showrooms:
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
 *             $ref: '#/components/schemas/Showroom'
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
router.post("/", authMiddleware, rbac(["admin"]), validateShowroom, addShowroom);

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

module.exports = router;
