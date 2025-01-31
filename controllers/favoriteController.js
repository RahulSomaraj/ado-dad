const Favorite = require('../models/favorites');

// Add a favorite
exports.addFavorite = async (req, res) => {
  try {
    const { itemId, itemType } = req.body;
    const userId = req.user.id; // AuthMiddleware should populate `req.user`

    const favorite = new Favorite({ userId, itemId, itemType });
    await favorite.save();

    return res.status(201).json({ message: 'Item added to favorites', favorite });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get user's favorites
exports.getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await Favorite.find({ userId }).populate('itemId');

    return res.status(200).json({ favorites });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get a specific favorite by ID
exports.getFavoriteById = async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const userId = req.user.id;

    // Find the favorite by userId and favoriteId
    const favorite = await Favorite.findOne({ _id: favoriteId, userId }).populate('itemId');
    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    return res.status(200).json({ favorite });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Remove a favorite
exports.removeFavorite = async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const userId = req.user.id;

    const favorite = await Favorite.findOneAndDelete({ _id: favoriteId, userId });
    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    return res.status(200).json({ message: 'Item removed from favorites' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Update a favorite
exports.updateFavorite = async (req, res) => {
  try {
    const { favoriteId } = req.params;
    const { itemId, itemType } = req.body;
    const userId = req.user.id;

    // Find the favorite by userId and favoriteId
    const favorite = await Favorite.findOne({ _id: favoriteId, userId });
    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    // Update the favorite
    if (itemId) favorite.itemId = itemId;
    if (itemType) favorite.itemType = itemType;

    // Save the updated favorite
    await favorite.save();

    return res.status(200).json({ message: 'Favorite updated', favorite });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
