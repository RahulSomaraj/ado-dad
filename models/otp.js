const mongoose = require('mongoose');

// Define OTP schema
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,  // Ensure one OTP per email
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Create and export OTP model
module.exports = mongoose.model('OTP', otpSchema);
