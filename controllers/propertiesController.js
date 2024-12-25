const Property = require('../models/properties');

// Create a new property
const createProperty = async (req, res) => {
    try {
        const propertyData = req.body;
        propertyData.owner = req.user.id; // Assume `req.user.id` comes from auth middleware
        const property = new Property(propertyData);
        await property.save();
        res.status(201).json({ success: true, data: property });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all properties
const getAllProperties = async (req, res) => {
    try {
        const properties = await Property.find().populate('owner', 'name email');
        res.status(200).json({ success: true, data: properties });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get a property by ID
const getPropertyById = async (req, res) => {
    try {
        const { id } = req.params;
        const property = await Property.findById(id).populate('owner', 'name email');
        if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
        res.status(200).json({ success: true, data: property });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a property
const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const property = await Property.findOneAndUpdate(
            { _id: id, owner: req.user.id }, // Ensure the owner matches the user
            updatedData,
            { new: true, runValidators: true }
        );

        if (!property) return res.status(404).json({ success: false, message: 'Property not found or unauthorized' });
        res.status(200).json({ success: true, data: property });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete a property
const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const property = await Property.findOneAndDelete({ _id: id, owner: req.user.id });
        if (!property) return res.status(404).json({ success: false, message: 'Property not found or unauthorized' });

        res.status(200).json({ success: true, message: 'Property deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
};
