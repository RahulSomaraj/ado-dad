const Rating = require('../models/rating');

// Add a Rating
exports.addRating = async (req, res) => {
  const { productId, rating, review } = req.body;
  const userId = req.user.id;

  try {
    const newRating = new Rating({
      user: userId,
      product: productId,
      rating,
      review,
    });

    await newRating.save();
    res.status(201).json({ message: 'Rating added successfully.', rating: newRating });
  } catch (error) {
    res.status(500).json({ error: 'Error adding rating.' });
  }
};

// Get All Ratings for a Product
exports.getRatingsByProduct = async (req, res) => {
  const { productId } = req.params;

  try {
    const ratings = await Rating.find({ product: productId }).populate('user', 'name');
    res.status(200).json(ratings);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching ratings.' });
  }
};

// Add a Comment to a Rating
exports.addComment = async (req, res) => {
  const { ratingId } = req.params;
  const { comment } = req.body;
  const userId = req.user.id;

  try {
    const rating = await Rating.findById(ratingId);
    if (!rating) return res.status(404).json({ error: 'Rating not found.' });

    rating.comments.push({ createdBy: userId, comment });
    await rating.save();

    res.status(200).json({ message: 'Comment added successfully.', rating });
  } catch (error) {
    res.status(500).json({ error: 'Error adding comment.' });
  }
};

// Get a Rating with Comments
exports.getRatingWithComments = async (req, res) => {
  const { ratingId } = req.params;

  try {
    const rating = await Rating.findById(ratingId)
      .populate('user', 'name')
      .populate('comments.createdBy', 'name');

    if (!rating) return res.status(404).json({ error: 'Rating not found.' });

    res.status(200).json(rating);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching rating.' });
  }
};
