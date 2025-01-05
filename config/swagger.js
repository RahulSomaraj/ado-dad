const swaggerJsDoc = require("swagger-jsdoc");

const env = process.env.NODE_ENV || "development"; // Default to 'development' if NODE_ENV is not set

// Define server URLs based on environment
const servers = [
	{
		url: "http://localhost:5000",
		description: "Development server",
	},
	{
		url: "https://uat.ado-dad.com",
		description: "UAT server",
	},
];

// Dynamically set the current server based on NODE_ENV
const dynamicServer =
	env === "uat"
		? { url: "https://uat.ado-dad.com", description: "UAT server" }
		: { url: "http://localhost:5000", description: "Development server" };

const swaggerDefinition = {
	openapi: "3.0.0",
	info: {
		title: "OLX",
		version: "1.0.0",
		description: "API documentation for OLX",
	},
	servers: [dynamicServer], // Use dynamically selected server
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
	},
	security: [{ bearerAuth: [] }],
};

const swaggerOptions = {
	swaggerDefinition,
	apis: ["./routes/*.js"],
};

module.exports = swaggerJsDoc(swaggerOptions);
