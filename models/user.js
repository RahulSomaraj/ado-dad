const mongoose = require('mongoose');

const { Schema } = mongoose;

// Define User Schema
const UserSchema = new Schema({
  profilePic: {
    type: String,
    required: false
  },
  type: {
    type: String,
    enum: ['user', 'admin', 'showroom'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
