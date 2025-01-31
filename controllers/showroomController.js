const Showroom = require("../models/showroom");

// Get all showrooms
const getShowrooms = async (req, res) => {
    try {
        const showrooms = await Showroom.find({});
        res.status(200).json({ success: true, data: showrooms });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get showroom by ID
const getShowroomById = async (req, res) => {
    try {
        const { id } = req.params;
        const showroom = await Showroom.findById(id);

        if (!showroom) {
            return res.status(404).json({ success: false, message: "Showroom not found." });
        }

        res.status(200).json({ success: true, data: showroom });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add a new showroom
const addShowroom = async (req, res) => {
    try {
        const showroomData = req.body;
        const newShowroom = await Showroom.create(showroomData);

        res.status(201).json({ success: true, message: "Showroom added successfully.", data: newShowroom });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Update a showroom
const updateShowroom = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const updatedShowroom = await Showroom.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

        if (!updatedShowroom) {
            return res.status(404).json({ success: false, message: "Showroom not found." });
        }

        res.status(200).json({ success: true, message: "Showroom updated successfully.", data: updatedShowroom });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete a showroom
const deleteShowroom = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedShowroom = await Showroom.findByIdAndDelete(id);

        if (!deletedShowroom) {
            return res.status(404).json({ success: false, message: "Showroom not found." });
        }

        res.status(200).json({ success: true, message: "Showroom deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getShowrooms, getShowroomById, addShowroom, updateShowroom, deleteShowroom };
