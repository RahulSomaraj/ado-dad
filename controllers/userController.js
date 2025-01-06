const User = require("../models/user"); // Path to the User model
const otpGenerator = require("../utils/otpGenerator"); // Import the OTP generator
const emailService = require("../utils/emailService"); // Import the email service

// Get All Users
exports.getAllUsers = async (req, res) => {
	try {
		const { name, email, type, page = 1, limit = 10 } = req.query;

		// Building the query object dynamically
		const query = {};
		if (name) query.name = { $regex: name, $options: "i" }; // Case-insensitive search
		if (email) query.email = email;
		if (type) query.type = type;

		// Pagination
		const users = await User.find(query)
			.limit(limit * 1) // Convert limit to integer
			.skip((page - 1) * limit)
			.exec();

		const count = await User.countDocuments(query);

		res.json({
			users,
			totalPages: Math.ceil(count / limit),
			currentPage: page,
		});
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ error: "Error fetching users" });
	}
};

// Get User by ID
exports.getUserById = async (req, res) => {
	try {
		const userQuery = User.findById(req.params.id);

		const user = await userQuery.exec();

		if (!user || user.isDeleted) {
			return res.status(404).json({ error: "User not found" });
		}

		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ error: "Error fetching user", details: error });
	}
};

const User = require("../models/User"); // Import User model

// Create User Controller
exports.createUser = async (req, res) => {
	try {
		const { email, phoneNumber } = req.body;

		// Check if email or phonenumber already exists
		const existingUser = await User.findOne({
			$or: [{ email: email }, { phoneNumber: phoneNumber }].filter(
				(item) => item[Object.keys(item)[0]]
			), // Filter out null/undefined values
		});

		if (existingUser) {
			let errorMessage = "User with this email or phone number already exists";
			if (existingUser.email === email) {
				errorMessage = "Email is already in use";
			} else if (existingUser.phoneNumber === phoneNumber) {
				errorMessage = "Phone number is already in use";
			}
			return res.status(400).json({ error: errorMessage });
		}

		// Create new user if no duplicate found
		const newUser = new User(req.body);
		await newUser.save();
		res.status(201).json(newUser);
	} catch (error) {
		let errorMessage = "Error creating user";
		if (error.code === 11000) {
			errorMessage = "Duplicate key error: email or username already exists";
		}
		res.status(400).json({ error: errorMessage, details: error.message });
	}
};

exports.updateUser = async (req, res) => {
	try {
		const { username, email, phoneNumber } = req.body;
		const userId = req.params.id;

		// Check if the username, email, or phoneNumber already exists for other users
		const existingUser = await User.findOne({
			_id: { $ne: userId }, // Exclude the current user from the search
			$or: [
				{ username: username },
				{ email: email },
				{ phoneNumber: phoneNumber },
			],
		});

		if (existingUser) {
			let conflictField = "";
			if (existingUser.username === username) {
				conflictField = "username";
			} else if (existingUser.email === email) {
				conflictField = "email";
			} else if (existingUser.phoneNumber === phoneNumber) {
				conflictField = "phone number";
			}

			return res.status(400).json({
				error: `The ${conflictField} is already in use by another user.`,
			});
		}

		// Proceed with updating the user if no conflicts are found
		const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
			new: true,
			runValidators: true,
		});

		if (!updatedUser) {
			return res.status(404).json({ error: "User not found" });
		}

		res.status(200).json(updatedUser);
	} catch (error) {
		console.error("Error updating user:", error);
		res.status(400).json({ error: "Error updating user", details: error });
	}
};

// Soft Delete User
exports.deleteUser = async (req, res) => {
	try {
		const user = await User.findByIdAndUpdate(req.params.id, {
			isDeleted: true,
		});
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		res.status(200).json({ message: "User deleted successfully" });
	} catch (error) {
		res.status(500).json({ error: "Error deleting user", details: error });
	}
};

// Send OTP to the user's email
exports.sendOTP = async (req, res) => {
	const { email } = req.body;

	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Generate and send OTP
		await user.generateAndSendOTP(emailService, otpGenerator);

		res.status(200).json({ message: "OTP sent to your email" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Error sending OTP" });
	}
};

// Verify the OTP sent to the user's email
exports.verifyOTP = async (req, res) => {
	const { email, otp } = req.body;

	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Check if OTP is valid and not expired
		if (user.otp !== otp) {
			return res.status(400).json({ message: "Invalid OTP" });
		}

		if (user.otpExpires < Date.now()) {
			return res.status(400).json({ message: "OTP has expired" });
		}

		// OTP verified successfully
		user.otp = undefined; // Clear OTP after successful verification
		user.otpExpires = undefined; // Clear OTP expiration time
		await user.save();

		res.status(200).json({ message: "OTP verified successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Error verifying OTP" });
	}
};
