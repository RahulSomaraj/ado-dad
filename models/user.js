const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

// Define User Schema
const UserSchema = new Schema({
  profilePic: {
    type: String,
    required: false,
    default: 'default-profile-pic-url'
  },
  type: {
    type: String,
    enum: ['user', 'admin', 'showroom',],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d{10,15}$/.test(v); // Ensures a valid phone number format
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 4
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,   // OTP value
    required: false
  },
  otpExpires: {
    type: Date,     // Expiry date of OTP
    required: false
  }
}, { timestamps: true });

// Hash the password before saving
UserSchema.pre('save', async function(next) {
  if (this.isModified('password') || this.isNew) {
    this.password = await bcrypt.hash(this.password, 10); // Hash password with bcrypt
  }
  next();
});

// Method to compare password during login
UserSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password); // Compare the hashed password
};

// Add method to generate OTP and send email
UserSchema.methods.generateAndSendOTP = async function(emailService, otpGenerator) {
  const otp = otpGenerator.generateOTP(); // Assuming this method generates an OTP
  
  // Set OTP and expiry time (e.g., 10 minutes from now)
  this.otp = otp;
  this.otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
  
  // Send OTP via email using email service
  await emailService.sendEmail({
    to: this.email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}`
  });

  await this.save();
};

module.exports = mongoose.model('User', UserSchema);
