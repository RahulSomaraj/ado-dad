const swaggerJsDoc = require("swagger-jsdoc");

const swaggerDefinition = {
	openapi: "3.0.0",
	info: {
		title: "OLX",
		version: "1.0.0",
		description: "API documentation for OLX",
	},
	servers: [
		{ url: "http://localhost:5000", description: "Development server" },
		{ url: "https://uat.ado-dad.com", description: "UAT server" },
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
	security: [{ bearerAuth: [] }],
};

const swaggerOptions = {
	swaggerDefinition,
	apis: ["./routes/*.js"],
};

module.exports = swaggerJsDoc(swaggerOptions);
