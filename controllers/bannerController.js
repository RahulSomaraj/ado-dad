const Banner = require('../models/banner');

// Create a new banner
exports.createBanner = async (req, res) => {
  try {
    const { title, image, link } = req.body;

    const newBanner = new Banner({
      title,
      image,
      link,
    });

    const savedBanner = await newBanner.save();
    res.status(201).json({ message: 'Banner created successfully', banner: savedBanner });
  } catch (error) {
    res.status(500).json({ error: 'Error creating banner', details: error.message });
  }
};

// Get all banners
exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.status(200).json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching banners', details: error.message });
  }
};

// Get a single banner by ID
exports.getBannerById = async (req, res) => {
  const { id } = req.params;

  try {
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.status(200).json(banner);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching banner', details: error.message });
  }
};

// Update a banner by ID
exports.updateBanner = async (req, res) => {
  const { id } = req.params;
  const { title, image, link } = req.body;

  try {
    const updatedBanner = await Banner.findByIdAndUpdate(id, { title, image, link }, { new: true, runValidators: true });

    if (!updatedBanner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.status(200).json({ message: 'Banner updated successfully', banner: updatedBanner });
  } catch (error) {
    res.status(500).json({ error: 'Error updating banner', details: error.message });
  }
};

// Delete a banner by ID
exports.deleteBanner = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedBanner = await Banner.findByIdAndDelete(id);
    if (!deletedBanner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.status(200).json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting banner', details: error.message });
  }
};
