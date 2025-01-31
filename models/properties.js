const mongoose = require('mongoose');

// Defining the Schema
const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    location: {
        type: String,
        required: true,
    },
    area: {
        type: Number,
        required: true,
        min: 0,
    },
    images: {
        type: [String], // array of image URLs
        validate: [arrayLimit, '{PATH} exceeds the limit of 5 images']
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming there's a 'User' model for property owner
        required: true,
    },
    type: {
        type: String,
        enum: ['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'],
        required: true,
    },
    category: {
        type: String,
        enum: ['forSale', 'forRent', 'landsAndPlots'],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

// Helper function for image array limit validation
function arrayLimit(val) {
    return val.length <= 5;
}

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
