const redis = require("redis");

// Create Redis client
const redisClient = redis.createClient({
	url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Handle connection events
redisClient.on("connect", () => {
	console.log("Connected to Redis...");
});

redisClient.on("error", (err) => {
	console.error("Redis connection error:", err);
});

// Connect to Redis
(async () => {
	try {
		await redisClient.connect();
	} catch (err) {
		console.error("Error connecting to Redis:", err);
	}
})();

module.exports = redisClient;
