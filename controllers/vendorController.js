const Vendor = require('../models/vendor');
const Product = require('../models/product');

// Vendor Controller

// Create a new vendor
exports.createVendor = async (req, res) => {
  try {
    const { name, email, phoneNumber, address } = req.body;

    // Check if vendor already exists
    const vendorExists = await Vendor.findOne({ email });
    if (vendorExists) {
      return res.status(400).json({ message: 'Vendor already exists' });
    }

    const vendor = new Vendor({ name, email, phoneNumber, address });
    await vendor.save();
    res.status(201).json({ message: 'Vendor created successfully', vendor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all vendors
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.status(200).json({ vendors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(200).json({ vendor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update vendor details
exports.updateVendor = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const vendor = await Vendor.findById(req.params.vendorId);

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    vendor.name = name || vendor.name;
    vendor.email = email || vendor.email;
    vendor.role = role || vendor.role;

    await vendor.save();
    res.status(200).json({ message: 'Vendor updated successfully', vendor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a vendor
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    await vendor.remove();
    res.status(200).json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all products for a specific vendor
exports.getProductsByVendor = async (req, res) => {
  try {
    const products = await Product.find({ vendorId: req.params.vendorId });
    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found for this vendor' });
    }
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
