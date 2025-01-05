const { body } = require("express-validator");

// User validation rules
const createUserValidationRules = [
	body("type")
		.isIn(["user", "admin", "showroom"])
		.withMessage("Type must be one of user, admin, or showroom"),
	body("name").notEmpty().withMessage("Name is required"),
	body("phoneNumber")
		.matches(/^\d{10,15}$/)
		.withMessage("Invalid phone number format"),
	body("email").isEmail().withMessage("Invalid email format").normalizeEmail(),
	body("password")
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters"),
	body("username")
		.isLength({ min: 4 })
		.withMessage("Username must be at least 4 characters"),
	(req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, errors: errors.array() });
		}
		next();
	},
];

const editUserValidationRules = [
	body("type")
		.isIn(["user", "admin", "showroom"])
		.optional()
		.withMessage("Type must be one of user, admin, or showroom"),
	body("name").notEmpty().optional().withMessage("Name is required"),
	body("phoneNumber")
		.matches(/^\d{10,15}$/)
		.optional()
		.withMessage("Invalid phone number format"),
	body("email")
		.optional()
		.isEmail()
		.withMessage("Invalid email format")
		.normalizeEmail(),
	body("password")
		.optional()
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters"),
	body("username")
		.optional()
		.isLength({ min: 4 })
		.withMessage("Username must be at least 4 characters"),
	(req, res, next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ success: false, errors: errors.array() });
		}
		next();
	},
];

module.exports = { createUserValidationRules, editUserValidationRules };
