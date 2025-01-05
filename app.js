const express = require("express");
const dotenv = require("dotenv");
const swaggerUi = require("swagger-ui-express");
const morgan = require("morgan");

const connectDB = require("./config/db");
const swaggerDocs = require("./config/swagger");
const routes = require("./routes/index");
const errorHandler = require("./middlewares/error");

dotenv.config();

const app = express();
app.use(express.json());
app.use(morgan("dev"));

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
