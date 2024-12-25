const jwt = require("jsonwebtoken");
const User = require("../models/user"
);
exports.login = async (req, res) => {
	const { email, password } = req.body;

	try {
		console.log("Incoming request body:", req.body);

		if (!email || !password) {
			return res.status(400).json({ error: "Email and password are required" });
		}

		const user = await User.findOne({ email });
		console.log("User found:", user);

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const isMatch = await user.comparePassword(password);
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
