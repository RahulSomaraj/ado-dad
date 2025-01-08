const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware'); // Corrected path to authMiddleware
const { rbac, checkOwnership } = require('../middlewares/rbacMiddleware'); // Corrected path to rbacMiddleware
const vendorController = require('../controllers/vendorController');
const router = express.Router();

// Create a new Vendor
/**
 * @swagger
 * /vendors:
 *   post:
 *     summary: Create a new vendor
 *     description: This will create a new vendor.
 *     tags: [Vendors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "johndoe@example.com"
 *               phoneNumber:
 *                 type: string
 *                 example: "1234567890"
 *               address:
 *                 type: string
 *                 example: "123 Main Street, New York, NY"
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  body('name').not().isEmpty(),
  body('email').isEmail(),
  body('address').not().isEmpty(),
  authMiddleware, // Ensure the user is authenticated
  vendorController.createVendor
);

// Get all Vendors (Admin only)
/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: Get all vendors
 *     description: This will return all vendors.
 *     tags: [Vendors]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter vendors by name
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter vendors by email
 *     responses:
 *       200:
 *         description: Successfully retrieved all vendors
 *       403:
 *         description: Access denied. Admins only
 */
router.get(
  '/vendors',
  authMiddleware, // Ensure the user is authenticated
  rbac(['admin']), // Ensure the user has 'admin' role
  vendorController.getVendors
);

// Get a single Vendor by ID
/**
 * @swagger
 * /api/vendors/{vendorId}:
 *   get:
 *     summary: Get a single vendor by ID
 *     description: This will return the details of a specific vendor.
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         description: The ID of the vendor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the vendor
 *       404:
 *         description: Vendor not found
 */
router.get(
  '/vendors/:vendorId',
  authMiddleware, // Ensure the user is authenticated
  vendorController.getVendorById
);

// Update Vendor (Admin or Vendor themselves)
/**
 * @swagger
 * /api/vendors/{vendorId}:
 *   put:
 *     summary: Update a vendor
 *     description: This will update a specific vendor's details.
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         description: The ID of the vendor to update
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
 *                 example: "Jane Doe"
 *               email:
 *                 type: string
 *                 example: "janedoe@example.com"
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *               address:
 *                 type: string
 *                 example: "456 Elm Street, Los Angeles, CA"
 *     responses:
 *       200:
 *         description: Successfully updated the vendor
 *       403:
 *         description: Access denied. Only admins or the vendor themselves can update
 *       404:
 *         description: Vendor not found
 */
router.put(
  '/vendors/:vendorId',
  authMiddleware, // Ensure the user is authenticated
  rbac(['admin', 'vendor']), // Admin or vendor themselves can update
  checkOwnership('vendorId'), // Ensure vendor can only update their own profile
  vendorController.updateVendor
);

// Delete Vendor (Admin only)
/**
 * @swagger
 * /api/vendors/{vendorId}:
 *   delete:
 *     summary: Delete a vendor
 *     description: This will delete a specific vendor.
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         description: The ID of the vendor to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully deleted the vendor
 *       403:
 *         description: Access denied. Only admins can delete a vendor
 *       404:
 *         description: Vendor not found
 */
router.delete(
  '/vendors/:vendorId',
  authMiddleware, // Ensure the user is authenticated
  rbac(['admin']), // Only admin can delete a vendor
  vendorController.deleteVendor
);

module.exports = router;
