const Rating = require('../models/rating'); // Path to your Rating model

// Create a new rating
exports.createRating = async (req, res) => {
  try {
    const { user, product, rating, review } = req.body;
    const newRating = new Rating({ user, product, rating, review });
    await newRating.save();
    res.status(201).json({ message: 'Rating created successfully', data: newRating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a comment to a rating
exports.addComment = async (req, res) => {
  const { ratingId } = req.params;
  const { comment } = req.body;
  try {
    const rating = await Rating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }
    
    rating.comments.push({
      createdBy: req.user._id, // assuming user is attached to req by authMiddleware
      comment,
    });
    
    await rating.save();
    res.status(200).json({ message: 'Comment added successfully', data: rating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get ratings for a product
exports.getRatingsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const ratings = await Rating.find({ product: productId }).populate('user');
    res.status(200).json({ data: ratings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a rating
exports.deleteRating = async (req, res) => {
  const { ratingId } = req.params;
  try {
    const rating = await Rating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({ message: 'Rating not found' });
    }
    await rating.remove();
    res.status(200).json({ message: 'Rating deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
