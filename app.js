const express = require("express");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const dotenv = require("dotenv");
const fs = require("fs");

// Load environment variables
dotenv.config();

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Connect to MongoDB
mongoose.set("debug", true);
mongoose.connect('mongodb://13.126.129.26:27017/yourDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: false, // Disable SSL if the server doesn't use it
}).then(() => {
    console.log('MongoDB connected successfully.');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

// Swagger configuration
const swaggerDefinition = {
	openapi: "3.0.0",
	info: {
		title: "OLX",
		version: "1.0.0",
		description: "API documentation for OLX",
	},
	servers: [
		{
			url: "http://localhost:3000",
			description: "Development server",
		},
	],
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
	},
	security: [
		{
			bearerAuth: [],
		},
	],
};

const swaggerOptions = {
	swaggerDefinition,
	apis: ["./routes/*.js"], // Adjust path to include all route files for Swagger
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// Secret key for JWT (make sure to keep this secret)
const SECRET_KEY = "your_secret_key"; // Change this to a secure secret

// Sample user data for demonstration (replace with a real database in production)
const users = [
	{ id: 1, username: "user1", password: "password123" },
	{ id: 2, username: "user2", password: "password456" },
];

// Login route - Authenticate and issue JWT
app.post("/api/login", (req, res) => {
	const { username, password } = req.body;

	// Find the user by username
	const user = users.find((u) => u.username === username);

	// Validate credentials
	if (!user || user.password !== password) {
		return res.status(401).json({ message: "Invalid credentials" });
	}

	// Generate a Bearer token (JWT)
	const token = jwt.sign(
		{ user_id: user.id, username: user.username },
		SECRET_KEY,
		{ expiresIn: "1h" }
	);

	// Return the token to the client
	res.json({ token });
});

// Protected route (example)
app.get("/api/protected", (req, res) => {
	// Check for token in the Authorization header
	const token = req.headers["authorization"]?.split(" ")[1];

	if (!token) {
		return res.status(403).json({ message: "No token provided" });
	}

	// Verify the token
	jwt.verify(token, SECRET_KEY, (err, decoded) => {
		if (err) {
			return res.status(401).json({ message: "Invalid or expired token" });
		}

		// Token is valid, proceed with the request
		res.json({ message: "Protected data", user: decoded });
	});
});

// Import routes
const authRoutes = require("./routes/authRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const userRoutes = require("./routes/userRoutes");
const cartRoutes = require("./routes/cartRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const showroomRoutes = require("./routes/showroomRoutes");
// Use routes
app.use("/auth", authRoutes);
app.use("/properties", propertyRoutes);
app.use("/users", userRoutes);
app.use("/categories", categoryRoutes);
app.use("/favorites", favoriteRoutes);
app.use("/banners", bannerRoutes);
app.use("/cart", cartRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/ratings", ratingRoutes);
app.use("/vendors", vendorRoutes);
app.use("/showroom", showroomRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: "Something went wrong!" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
