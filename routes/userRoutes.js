const express = require("express");
const router = express.Router();
const {
	getAllUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	sendOTP,
	verifyOTP,
} = require("../controllers/userController");
const { body } = require("express-validator");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users with optional filters
 *     tags: [Users]
 *     description: Retrieve a list of users. Supports filtering by name, email, type, and pagination.
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter users by name (case-insensitive).
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter users by exact email.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [user, admin, showroom]
 *         description: Filter by user type.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination (default is 1).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page (default is 10).
 *     responses:
 *       200:
 *         description: A list of users with pagination.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *       500:
 *         description: Internal server error.
 */

router.get("/", getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     description: Retrieve user information by their ID. Supports filtering fields with query parameters.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to retrieve.
 *
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

router.get("/:id", getUserById);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     description: API to create a new user with validation for required fields and optional fields.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - username
 *               - type
 *               - phoneNumber
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *                 description: Full name of the user (required).
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *                 description: User's email address (must be unique and valid).
 *               password:
 *                 type: string
 *                 format: password
 *                 example: strongpassword
 *                 description: Password with a minimum of 6 characters (required).
 *               username:
 *                 type: string
 *                 example: johnd
 *                 description: Unique username for the user (minimum 4 characters).
 *               type:
 *                 type: string
 *                 enum: [user, admin, showroom]
 *                 example: user
 *                 description: Type of user (must be either 'user', 'admin', or 'showroom').
 *               phoneNumber:
 *                 type: string
 *                 example: '1234567890'
 *                 description: Phone number (must be 10 to 15 digits).
 *               profilePic:
 *                 type: string
 *                 example: https://example.com/profile.jpg
 *                 description: Optional URL of the user's profile picture.
 *               otp:
 *                 type: string
 *                 example: '123456'
 *                 description: Optional one-time password for user verification.
 *               otpExpires:
 *                 type: string
 *                 format: date-time
 *                 example: '2024-12-31T23:59:59.000Z'
 *                 description: Expiry date-time for the OTP (optional).
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request or validation error
 */

router.post("/", createUserValidationRules, createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update an existing user
 *     tags: [Users]
 *     description: API to update an existing user with validation for required and optional fields.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - username
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *                 description: Full name of the user (required).
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *                 description: User's email address (must be unique and valid).
 *               password:
 *                 type: string
 *                 format: password
 *                 example: strongpassword
 *                 description: Password with a minimum of 6 characters (required).
 *               username:
 *                 type: string
 *                 example: johnd
 *                 description: Unique username for the user (minimum 4 characters, required).
 *               type:
 *                 type: string
 *                 enum: [user, admin, showroom]
 *                 example: user
 *                 description: Type of user (optional, default is 'user').
 *               phoneNumber:
 *                 type: string
 *                 example: '1234567890'
 *                 description: Phone number (optional, must be 10 to 15 digits).
 *               profilePic:
 *                 type: string
 *                 example: https://example.com/profile.jpg
 *                 description: Optional URL of the user's profile picture.
 *               otp:
 *                 type: string
 *                 example: '123456'
 *                 description: Optional one-time password for user verification.
 *               otpExpires:
 *                 type: string
 *                 format: date-time
 *                 example: '2024-12-31T23:59:59.000Z'
 *                 description: Expiry date-time for the OTP (optional).
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       400:
 *         description: Bad request or validation error
 */
router.put("/:id", updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Soft delete a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete("/:id", deleteUser);

/**
 * @swagger
 * /users/send-otp:
 *   post:
 *     summary: Send OTP to the user's email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address to receive OTP
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent to the user's email
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post("/send-otp", sendOTP);

/**
 * @swagger
 * /users/verify-otp:
 *   post:
 *     summary: Verify OTP sent to the user's email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               otp:
 *                 type: string
 *                 description: OTP to be verified
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid OTP or expired OTP
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post("/verify-otp", verifyOTP);

module.exports = router;
