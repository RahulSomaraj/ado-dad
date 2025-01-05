const express = require("express");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const dotenv = require("dotenv");
const fs = require("fs");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");

// Load environment variables
dotenv.config();

const app = express();

// Middleware to parse JSON
app.use(express.json());

// app.use(morgan("combined"));
app.use(morgan("dev")); // Logs in the console in dev-friendly format

// Connect to MongoDB
mongoose.set("debug", true);
mongoose
	.connect(process.env.MONGO_URI, {
		ssl: false, // Disable SSL if the server doesn't use it
	})
	.then(() => {
		console.log("MongoDB connected successfully.");
	})
	.catch((err) => {
		console.error("Error connecting to MongoDB:", err);
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
			url: "http://localhost:5000",
			description: "Development server",
		},
		{
			url: "http://uat.ado-dad.com",
			description: "UAT server",
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
	apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const SECRET_KEY = process.env.SECRET_KEY || "your_secret_key";

// Sample user data
const users = [
	{ id: 1, username: "user1", password: "password123" },
	{ id: 2, username: "user2", password: "password456" },
];

// Login route
app.post("/api/login", (req, res) => {
	const { username, password } = req.body;

	const user = users.find((u) => u.username === username);

	if (!user || user.password !== password) {
		return res.status(401).json({ message: "Invalid credentials" });
	}

	const token = jwt.sign(
		{ user_id: user.id, username: user.username },
		SECRET_KEY,
		{ expiresIn: "1h" }
	);

	res.json({ token });
});

// Protected route
app.get("/api/protected", (req, res) => {
	const token = req.headers["authorization"]?.split(" ")[1];

	if (!token) {
		return res.status(403).json({ message: "No token provided" });
	}

	jwt.verify(token, SECRET_KEY, (err, decoded) => {
		if (err) {
			return res.status(401).json({ message: "Invalid or expired token" });
		}
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
const vehicleCompanyRoutes = require("./routes/vehicleCompanyRoutes");
const advertisementRoutes = require("./routes/advertisementRoutes");

// Use routes
app.use("/auth", authRoutes);
app.use("/advertisements", advertisementRoutes);
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
app.use("/vehicle-companies", vehicleCompanyRoutes);

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
