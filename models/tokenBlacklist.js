const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema({
	token: {
		type: String,
		required: true,
		unique: true,
	},
	expiresAt: {
		type: Date,
		required: true,
	},
});

// Create index to automatically remove expired tokens
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

const TokenBlacklist = mongoose.model("TokenBlacklist", tokenBlacklistSchema);

module.exports = TokenBlacklist;
