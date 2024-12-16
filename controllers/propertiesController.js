// Importing the properties object
const properties = require('../models/properties');

// Utility function to validate category and type
const isValidCategoryAndType = (category, type) => {
    return properties[category] && (category === 'landsAndPlots' || properties[category][type]);
};

// Controller function to get all properties
const getAllProperties = (req, res) => {
    try {
        res.status(200).json({
            message: 'Successfully retrieved all properties',
            properties: properties.viewAll
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving properties', error: error.message });
    }
};

// Controller function to get properties for sale by type
const getForSaleProperties = (req, res) => {
    try {
        res.status(200).json({
            message: 'Successfully retrieved properties for sale',
            properties: properties.forSale
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving for sale properties', error: error.message });
    }
};

// Controller function to get properties for rent by type
const getForRentProperties = (req, res) => {
    try {
        res.status(200).json({
            message: 'Successfully retrieved properties for rent',
            properties: properties.forRent
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving for rent properties', error: error.message });
    }
};

// Controller function to get properties by type (e.g., houses, apartments)
const getPropertiesByType = (req, res) => {
    const { category, type } = req.params;

    try {
        // Validate category and type
        if (!properties[category]) {
            return res.status(404).json({ message: 'Category not found' });
        }
        if (category !== 'landsAndPlots' && !properties[category][type]) {
            return res.status(404).json({ message: 'Type not found in the category' });
        }

        res.status(200).json({
            message: `Successfully retrieved ${type} properties in the ${category} category`,
            properties: properties[category][type]
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving properties by type', error: error.message });
    }
};

// Controller function to post a new property
const postProperty = (req, res) => {
    const { category, type, property } = req.body;

    try {
        // Validate category and type
        if (!properties[category]) {
            return res.status(400).json({ message: 'Invalid category' });
        }

        // Handle validation for types within the category
        if (!isValidCategoryAndType(category, type)) {
            return res.status(400).json({ message: 'Invalid type in the category' });
        }

        // Add the property to the appropriate category and type
        if (category === 'landsAndPlots') {
            properties.landsAndPlots.push(property);
        } else {
            properties[category][type].push(property);
        }

        // Add to viewAll
        properties.viewAll.push(property);

        res.status(201).json({
            message: 'Property posted successfully',
            property
        });
    } catch (error) {
        res.status(500).json({ message: 'Error posting property', error: error.message });
    }
};

// Exporting the controller functions for use in routing
module.exports = {
    getAllProperties,
    getForSaleProperties,
    getForRentProperties,
    getPropertiesByType,
    postProperty
};
