const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

/**
 * @swagger
 * tags:
 *   - name: Vehicles
 *     description: Vehicle management APIs
 */

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Create a new vehicle
 *     description: Creates a new vehicle with the provided data.
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               vendorId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       400:
 *         description: Validation error or bad request
 */
router.post('/', vehicleController.createVehicle);

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Get all vehicles
 *     description: Retrieves a list of all vehicles.
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: List of vehicles
 *       500:
 *         description: Internal server error
 */
router.get('/', vehicleController.getAllVehicles);

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get a single vehicle by ID
 *     description: Retrieves a vehicle by its ID.
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the vehicle to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle found
 *       404:
 *         description: Vehicle not found
 *       400:
 *         description: Invalid ID format
 *       500:
 *         description: Internal server error
 */
router.get('/:id', vehicleController.getVehicleById);

/**
 * @swagger
 * /vehicles/{id}:
 *   put:
 *     summary: Update a vehicle by ID
 *     description: Updates the vehicle with the specified ID using provided data.
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the vehicle to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               vendorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       404:
 *         description: Vehicle not found
 *       400:
 *         description: Validation error or invalid ID format
 *       500:
 *         description: Internal server error
 */
router.put('/:id', vehicleController.updateVehicle);

/**
 * @swagger
 * /vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle by ID
 *     description: Deletes a vehicle by its ID.
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the vehicle to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 *       404:
 *         description: Vehicle not found
 *       400:
 *         description: Invalid ID format
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;
