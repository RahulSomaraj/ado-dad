const express = require('express');
const ShowroomController = require('../controllers/showroomController');

const router = express.Router();

// Initialize the controller
const showroomController = new ShowroomController();

/**
 * @swagger
 * tags:
 *   name: Showrooms
 *   description: Showroom management APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Showroom:
 *       type: object
 *       required:
 *         - image
 *         - showroomName
 *         - owner
 *         - address
 *         - panCard
 *         - cinNumber
 *       properties:
 *         image:
 *           type: string
 *           description: URL of the showroom image
 *         showroomName:
 *           type: string
 *           description: Name of the showroom
 *         owner:
 *           type: string
 *           description: Name of the showroom owner
 *         address:
 *           type: string
 *           description: Address of the showroom
 *         panCard:
 *           type: string
 *           description: PAN card of the showroom
 *         cinNumber:
 *           type: string
 *           description: CIN number of the showroom
 *       example:
 *         image: "http://example.com/showroom.jpg"
 *         showroomName: "Luxury Wheels"
 *         owner: "John Doe"
 *         address: "123 Main Street"
 *         panCard: "ABCDE1234F"
 *         cinNumber: "U12345MH2000PTC123456"
 */

/**
 * @swagger
 * /showrooms:
 *   get:
 *     summary: Get all showrooms
 *     tags: [Showrooms]
 *     responses:
 *       200:
 *         description: List of all showrooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Showroom'
 */
router.get('/showrooms', (req, res) => {
    try {
        const showrooms = showroomController.getAllShowrooms();
        res.status(200).json(showrooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @swagger
 * /showrooms:
 *   post:
 *     summary: Add a new showroom
 *     tags: [Showrooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Showroom'
 *     responses:
 *       201:
 *         description: Showroom added successfully
 *       400:
 *         description: Invalid input
 */
router.post('/showrooms', (req, res) => {
    try {
        const message = showroomController.addShowroom(req.body);
        res.status(201).json({ message });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * @swagger
 * /showrooms/{name}:
 *   get:
 *     summary: Find a showroom by name
 *     tags: [Showrooms]
 *     parameters:
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the showroom
 *     responses:
 *       200:
 *         description: Showroom details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Showroom'
 *       404:
 *         description: Showroom not found
 */
router.get('/showrooms/:name', (req, res) => {
    try {
        const showroom = showroomController.findShowroomByName(req.params.name);
        res.status(200).json(showroom);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

/**
 * @swagger
 * /showrooms/{name}:
 *   delete:
 *     summary: Delete a showroom by name
 *     tags: [Showrooms]
 *     parameters:
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Name of the showroom
 *     responses:
 *       200:
 *         description: Showroom deleted successfully
 *       404:
 *         description: Showroom not found
 */
router.delete('/showrooms/:name', (req, res) => {
    try {
        const message = showroomController.deleteShowroomByName(req.params.name);
        res.status(200).json({ message });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

module.exports = router;
