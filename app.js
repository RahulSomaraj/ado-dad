const express = require("express");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const morgan = require("morgan");
const cors = require("cors");

const connectDB = require("./config/db");
const routes = require("./routes/index");
const errorHandler = require("./middlewares/error");
dotenv.config();

const swaggerDocs = require("./config/swagger");

const app = express();

// Serve static files from the "public" folder

// Middleware to parse JSON requests
app.use(express.json());

// Logging with Morgan
app.use(morgan("dev"));

// Enable CORS for all routes
app.use(cors());

// Connect to the database
connectDB();

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Application Routes
app.use("/", routes);

// Error Handling Middleware
app.use(errorHandler);
app.use("/static", express.static("public"));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
