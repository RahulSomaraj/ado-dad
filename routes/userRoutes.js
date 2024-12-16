const express = require('express');
const router = express.Router();
const {
  createUser,
  verifyOtp,
  loginUser,
  updateUser,
  getUserById,
  getAllUsers,
  deleteUser,
} = require('../controllers/userController');
const authenticate = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: User Management
 *     description: APIs for managing users
 */

/**
 * @swagger
 * /users/create:
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user with the provided details.
 *     tags: [User Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profilePic:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/image.jpg"
 *               type:
 *                 type: string
 *                 enum: [user, admin, showroom]
 *                 example: "user"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "securepassword123"
 *     responses:
 *       201:
 *         description: User created successfully.
 *       500:
 *         description: Server error.
 */
router.post('/create', authenticate, createUser);

/**
 * @swagger
 * /users/verify-otp:
 *   post:
 *     summary: Verify the OTP
 *     description: Verifies the OTP sent to the user's email.
 *     tags: [User Management] 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "johndoe@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully.
 *       400:
 *         description: Invalid or expired OTP.
 *       500:
 *         description: Server error.
 */
router.post('/verify-otp', verifyOtp);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a user and returns a JWT token.
 *     tags: [User Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "securepassword123"
 *     responses:
 *       200:
 *         description: Login successful.
 *       401:
 *         description: Invalid credentials.
 *       500:
 *         description: Server error.
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieves a user by their ID.
 *     tags: [User Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */
router.get('/:id', authenticate, getUserById);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves a list of all users.
 *     tags: [User Management]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully.
 *       500:
 *         description: Server error.
 */
router.get('/', authenticate, getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user by ID
 *     description: Updates a user's details by their ID.
 *     tags: [User Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               profilePic:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */
router.put('/:id', authenticate, updateUser);

/**
 * @swagger
 * /users/{id}/soft-delete:
 *   put:
 *     summary: Soft delete user by ID
 *     description: Soft deletes a user without permanently removing their data.
 *     tags: [User Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User soft deleted successfully.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */
router.put('/:id/soft-delete', authenticate, deleteUser);

module.exports = router;
