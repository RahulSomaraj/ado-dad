const { validationResult, body } = require("express-validator");

// Validation middleware using `express-validator`
const validateShowroom = [
    body("image").isURL().withMessage("Image must be a valid URL"),
    body("showroomName").notEmpty().withMessage("Showroom name is required"),
    body("owner").notEmpty().withMessage("Owner name is required"),
    body("address").notEmpty().withMessage("Address is required"),
    body("panCard")
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
        .withMessage("Invalid PAN Card format"),
    body("cinNumber")
        .matches(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{1}$/)
        .withMessage("Invalid CIN Number format"),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    },
];

module.exports = { validateShowroom };
