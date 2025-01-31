const Vehicle = require('../models/vehicle');
const Vendor = require('../models/vendor');

// Get All Vehicles with Vendor Info
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate('vendor', 'name email phoneNumber');
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching vehicles', details: error });
  }
};

// Get Vehicle by ID with Vendor Info
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('vendor', 'name email phoneNumber');
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.status(200).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching vehicle', details: error });
  }
};

// Create Vehicle with Vendor Association
exports.createVehicle = async (req, res) => {
  try {
    const { vendorId, ...vehicleData } = req.body;

    // Ensure the vendor exists
    if(vendorId){
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
    }
    // Create the vehicle
    const newVehicle = new Vehicle({ ...vehicleData, vendor: vendorId });
    await newVehicle.save();
    res.status(201).json(newVehicle);
  } catch (error) {
    res.status(400).json({ error: 'Error creating vehicle', details: error });
  }
};

// Update Vehicle and its Vendor
exports.updateVehicle = async (req, res) => {
  try {
    const { vendorId, ...vehicleData } = req.body;

    if (vendorId) {
      // Ensure the new vendor exists
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { ...vehicleData, ...(vendorId && { vendor: vendorId }) },
      { new: true, runValidators: true }
    ).populate('vendor', 'name email phoneNumber');

    if (!updatedVehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.status(200).json(updatedVehicle);
  } catch (error) {
    res.status(400).json({ error: 'Error updating vehicle', details: error });
  }
};

// Delete Vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting vehicle', details: error });
  }
};
