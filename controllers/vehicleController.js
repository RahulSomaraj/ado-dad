const Vehicle = require('../models/vehicle');
const Vendor = require('../models/vendor');

// Create a new vehicle
exports.createVehicle = async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    const savedVehicle = await vehicle.save();
    res.status(201).json({ message: 'Vehicle created successfully', data: savedVehicle });
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
};

// Get all vehicles
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.status(200).json({ message: 'Vehicles fetched successfully', data: vehicles });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Get a single vehicle by ID
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.status(200).json({ message: 'Vehicle fetched successfully', data: vehicle });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid vehicle ID format' });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Update a vehicle by ID
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.status(200).json({ message: 'Vehicle updated successfully', data: vehicle });
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else if (error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid vehicle ID format' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
};

// Delete a vehicle by ID
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid vehicle ID format' });
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
