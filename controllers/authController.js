const jwt = require("jsonwebtoken");
const User = require("../models/user");
exports.login = async (req, res) => {
	const { username, password } = req.body;

	try {
		console.log("Incoming request body:", req.body);

		if (!username || !password) {
			return res
				.status(400)
				.json({ error: "Username and password are required" });
		}

		const user = await User.findOne({
			$or: [
				{ email: username }, // Check by email
				{ phoneNumber: username }, // Check by phonenumber
			],
		});
		console.log("User found:", user);

		if (!user) {
			return res.status(400).json({ error: "User not found" });
		}

		let isMatch = await user.comparePassword(password);

		if (user.phoneNumber == username) {
			isMatch = user.otp == password;
		}

		if (!isMatch) {
			return res.status(400).json({ error: "Invalid credentials" });
		}

		const payload = { userId: user._id, role: user.type };
		const token = jwt.sign(payload, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});

		return res.status(200).json({
			message: "Login successful",
			token: `Bearer ${token}`,
		});
	} catch (err) {
		console.error("Error during login:", err.message);
		return res.status(500).json({ error: err.message });
	}
};
