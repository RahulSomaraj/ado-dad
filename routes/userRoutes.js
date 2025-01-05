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
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to fetch
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
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

router.post(
	"/",
	[
		body("type")
			.isIn(["user", "admin", "showroom"])
			.withMessage("Type must be one of user, admin, or showroom"),
		body("name").notEmpty().withMessage("Name is required"),
		body("phoneNumber")
			.matches(/^\d{10,15}$/)
			.withMessage("Invalid phone number format"),
		body("email")
			.isEmail()
			.withMessage("Invalid email format")
			.normalizeEmail(),
		body("password")
			.isLength({ min: 6 })
			.withMessage("Password must be at least 6 characters"),
		body("username")
			.isLength({ min: 4 })
			.withMessage("Username must be at least 4 characters"),
	],
	createUser
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
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
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User updated successfully
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
