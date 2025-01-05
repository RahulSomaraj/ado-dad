const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { rbac } = require('../middlewares/rbacMiddleware');
const { 
  createVehicleCompany, 
  getVehicleCompanies, 
  getVehicleCompanyById, 
  updateVehicleCompany, 
  deleteVehicleCompany,
  validateRequest 
} = require('../controllers/vehicleCompanyController');
const { check } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vehicle Companies
 *   description: Vehicle Companies API
 */

/**
 * @swagger
 * /vehicle-companies:
 *   get:
 *     summary: Get all vehicle companies
 *     tags: [Vehicle Companies]
 *     responses:
 *       200:
 *         description: List of vehicle companies
 */
router.get('/vehicle-companies', authMiddleware, getVehicleCompanies);

/**
 * @swagger
 * /vehicle-companies/{id}:
 *   get:
 *     summary: Get a vehicle company by ID
 *     tags: [Vehicle Companies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle company ID
 *     responses:
 *       200:
 *         description: Vehicle company details
 *       404:
 *         description: Vehicle company not found
 */
router.get('/:id', authMiddleware, getVehicleCompanyById);

/**
 * @swagger
 * /vehicle-companies:
 *   post:
 *     summary: Create a new vehicle company
 *     tags: [Vehicle Companies]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               originCountry:
 *                 type: string
 *               logo:
 *                 type: string
 *             required:
 *               - name
 *               - originCountry
 *               - logo
 *     responses:
 *       201:
 *         description: Vehicle company created successfully
 */
router.post(
  '/',
  authMiddleware,
  rbac(['admin']),
  validateRequest([
    check('name').notEmpty().withMessage('Name is required.'),
    check('originCountry').notEmpty().withMessage('Origin country is required.'),
    check('logo').isURL().withMessage('Logo must be a valid URL.')
  ]),
  createVehicleCompany
);

/**
 * @swagger
 * /vehicle-companies/{id}:
 *   put:
 *     summary: Update a vehicle company by ID
 *     tags: [Vehicle Companies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               originCountry:
 *                 type: string
 *               logo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vehicle company updated successfully
 */
router.put(
  '/:id',
  authMiddleware,
  rbac(['admin']),
  validateRequest([
    check('name').optional().notEmpty().withMessage('Name must not be empty.'),
    check('originCountry').optional().notEmpty().withMessage('Origin country must not be empty.'),
    check('logo').optional().isURL().withMessage('Logo must be a valid URL.')
  ]),
  updateVehicleCompany
);

/**
 * @swagger
 * /vehicle-companies/{id}:
 *   delete:
 *     summary: Delete a vehicle company by ID
 *     tags: [Vehicle Companies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle company ID
 *     responses:
 *       200:
 *         description: Vehicle company deleted successfully
 */
router.delete(
  '/:id',
  authMiddleware,
  rbac(['admin']),
  deleteVehicleCompany
);

module.exports = router;
