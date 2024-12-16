const mongoose = require('mongoose');

const { Schema } = mongoose;

// Define Favorite Schema
const FavoriteSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item', // Assuming an Item model exists
    required: true
  },
  itemType: {
    type: String,
    enum: ['product', 'service'], // Example item types
    required: true
  }
}, { timestamps: true });
module.exports = mongoose.model('Favorite', FavoriteSchema);
