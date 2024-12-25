const Banner = require('../models/Banner');

exports.createBanner = async (req, res) => {
  try {
    const { title, image, link } = req.body;
    const banner = new Banner({ title, image, link });
    await banner.save();
    return res.status(201).json({ message: 'Banner created successfully', banner });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create banner', error: err.message });
  }
};

exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find();
    return res.status(200).json({ banners });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch banners', error: err.message });
  }
};

exports.getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    return res.status(200).json({ banner });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch banner', error: err.message });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const { title, image, link } = req.body;
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      { title, image, link },
      { new: true, runValidators: true }
    );
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    return res.status(200).json({ message: 'Banner updated successfully', banner });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update banner', error: err.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    return res.status(200).json({ message: 'Banner deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete banner', error: err.message });
  }
};
