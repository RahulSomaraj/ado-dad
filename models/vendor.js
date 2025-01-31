const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vendor name is required.'],
    trim: true, // Automatically trims whitespace
  },
  email: {
    type: String,
    required: [true, 'Vendor email is required.'],
    unique: true,
    lowercase: true, // Ensure email is stored in lowercase
    validate: {
      validator: function (email) {
        return /^\S+@\S+\.\S+$/.test(email); // Basic email regex validation
      },
      message: props => `${props.value} is not a valid email!`,
    },
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required.'],
    validate: {
      validator: function (phone) {
        return /^\d{10,15}$/.test(phone); // Validate phone number (10-15 digits)
      },
      message: props => `${props.value} is not a valid phone number!`,
    },
  },
  address: {
    type: String,
    required: [true, 'Vendor address is required.'],
    trim: true,
  },

}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Vendor', vendorSchema);
