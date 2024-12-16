const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  vehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],
  role: { 
    type: String, 
    enum: ['vendor', 'admin'], // Limit to vendor or admin roles
    default: 'vendor' 
  },
}, { timestamps: true }); // Automatically manage createdAt and updatedAt fields

module.exports = mongoose.model('Vendor', VendorSchema);
