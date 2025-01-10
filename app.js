const express = require("express");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const morgan = require("morgan");
const cors = require("cors"); // Import cors

const connectDB = require("./config/db");
const routes = require("./routes/index");
const errorHandler = require("./middlewares/error");

dotenv.config();

const swaggerDocs = require("./config/swagger");

const app = express();
app.use(express.json());
app.use(morgan("dev"));

// Enable CORS for all routes
app.use(cors());
app.use("/static", express.static("public"));

// Custom CORS configuration (Optional)
app.use(
	cors({
		origin: "*", // Allow all origins
		methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
		allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
	})
);

// Connect to Database
connectDB();

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use("/", routes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
