const mongoose = require('mongoose');

const AdvertisementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Vehicle', 'Property'],
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  heading: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Advertisement', AdvertisementSchema);
