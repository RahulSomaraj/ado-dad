const VehicleCompany = require("../models/vehicleCompany");
const { check, validationResult } = require("express-validator");

// Middleware for input validation (now moved to controller)
const validateRequest = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Controller methods
const createVehicleCompany = async (req, res) => {
  try {
    const { name, originCountry, logo } = req.body;
    const vehicleCompany = new VehicleCompany({ name, originCountry, logo });
    await vehicleCompany.save();
    res.status(201).json(vehicleCompany);
  } catch (err) {
    res.status(500).json({ message: "Error creating vehicle company", error: err.message });
  }
};

const getVehicleCompanies = async (req, res) => {
  try {
    const companies = await VehicleCompany.find();
    res.status(200).json(companies);
  } catch (err) {
    res.status(500).json({ message: "Error fetching vehicle companies", error: err.message });
  }
};

const getVehicleCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await VehicleCompany.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Vehicle company not found" });
    }
    res.status(200).json(company);
  } catch (err) {
    res.status(500).json({ message: "Error fetching vehicle company", error: err.message });
  }
};

const updateVehicleCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const company = await VehicleCompany.findByIdAndUpdate(id, updates, { new: true });
    if (!company) {
      return res.status(404).json({ message: "Vehicle company not found" });
    }
    res.status(200).json(company);
  } catch (err) {
    res.status(500).json({ message: "Error updating vehicle company", error: err.message });
  }
};

const deleteVehicleCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await VehicleCompany.findByIdAndDelete(id);
    if (!company) {
      return res.status(404).json({ message: "Vehicle company not found" });
    }
    res.status(200).json({ message: "Vehicle company deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting vehicle company", error: err.message });
  }
};

module.exports = {
  createVehicleCompany,
  getVehicleCompanies,
  getVehicleCompanyById,
  updateVehicleCompany,
  deleteVehicleCompany,
  validateRequest,
};
