const Advertisement = require('../models/advertisement');

// Create Advertisement
exports.createAdvertisement = async (req, res) => {
  try {
    const { type, heading, description } = req.body;

    // Create new advertisement
    const advertisement = new Advertisement({
      type,
      heading,
      description,
      createdBy: req.user.id, // Assuming req.user is populated by authentication middleware
    });

    await advertisement.save();

    return res.status(201).json({ success: true, data: advertisement });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Advertisements
exports.getAllAdvertisements = async (req, res) => {
  try {
    const advertisements = await Advertisement.find().populate('createdBy', 'name email');
    return res.status(200).json({ success: true, data: advertisements });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Advertisement by ID
exports.getAdvertisementById = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id).populate('createdBy', 'name email');
    if (!advertisement) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }
    return res.status(200).json({ success: true, data: advertisement });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Advertisement
exports.updateAdvertisement = async (req, res) => {
  try {
    const { type, heading, description } = req.body;

    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    // Check if the user is the owner or has admin role
    if (advertisement.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    advertisement.type = type || advertisement.type;
    advertisement.heading = heading || advertisement.heading;
    advertisement.description = description || advertisement.description;

    await advertisement.save();

    return res.status(200).json({ success: true, data: advertisement });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Advertisement
exports.deleteAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    // Check if the user is the owner or has admin role
    if (advertisement.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await advertisement.remove();

    return res.status(200).json({ success: true, message: 'Advertisement deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
