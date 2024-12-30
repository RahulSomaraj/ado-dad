const express = require('express');
const router = express.Router();
const { getAllVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/vehicleController');
const authMiddleware = require('../middlewares/authMiddleware');
const {rbac} = require('../middlewares/rbacMiddleware');

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle management
 */

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Get all vehicles (with vendor info)
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: List of vehicles with vendor information
 */
router.get('/', authMiddleware, rbac(['admin', 'showroom']), getAllVehicles);

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get a vehicle by ID (with vendor info)
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle details with vendor information
 */
router.get('/:id', authMiddleware, rbac(['admin', 'showroom']), getVehicleById);

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Create a new vehicle with vendor association
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendorId:
 *                 type: string
 *                 description: Vendor ID to associate
 *               vehicleData:
 *                 $ref: '#/components/schemas/Vehicle'
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 */
router.post('/', authMiddleware, rbac(['admin','vendor']), createVehicle);

/**
 * @swagger
 * /vehicles/{id}:
 *   put:
 *     summary: Update a vehicle and its vendor
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendorId:
 *                 type: string
 *                 description: Vendor ID to update
 *               vehicleData:
 *                 $ref: '#/components/schemas/Vehicle'
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 */
router.put('/:id', authMiddleware, rbac(['admin', 'showroom']), updateVehicle);

/**
 * @swagger
 * /vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 */
router.delete('/:id', authMiddleware, rbac(['admin']), deleteVehicle);

module.exports = router;
