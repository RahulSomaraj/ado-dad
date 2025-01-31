const mongoose = require("mongoose");

const connectDB = async () => {
	try {
		const username = process.env.MONGO_USER;
		const password = process.env.MONGO_PASSWORD;
		const connectionString = process.env.MONGO_URI.replace(
			"<username>",
			username
		).replace("<insertYourPassword>", password);
		console.log(connectionString);
		await mongoose.connect(connectionString);
		console.log("MongoDB connected successfully.");
	} catch (err) {
		console.error("Error connecting to MongoDB:", err);
		process.exit(1);
	}
};

module.exports = connectDB;
