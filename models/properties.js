// properties.js

const mongoose = require('mongoose');

// Defining the Schema
const propertySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    area: {
        type: Number, // area in square feet or meters
        required: true
    },
    images: [String], // array of image URLs
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming there's a 'User' model for property owner
        required: true
    },
    type: {
        type: String,
        enum: ['house', 'apartment', 'shopAndOffice', 'pgAndGuestHouse', 'land'],
        required: true
    },
    category: {
        type: String,
        enum: ['forSale', 'forRent', 'landsAndPlots'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Define models for each property category (For Sale, For Rent, Lands and Plots)
const Property = mongoose.model('Property', propertySchema);

// Export the Property model
module.exports = Property;
