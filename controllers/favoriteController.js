const Favorite = require('../models/favorites');

// Add a favorite
const addFavorite = async (req, res) => {
  try {
    const { userId, itemId, itemType } = req.body;


    // Check if the favorite already exists
    const existingFavorite = await Favorite.findOne({ userId, itemId, itemType });
    if (existingFavorite) {
      return res.status(400).json({ message: 'Item is already in favorites.' });
    }

    const favorite = new Favorite({ userId, itemId, itemType });
    await favorite.save();

    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ message: 'Error adding favorite.', error });
  }
};

// Get all favorites for a user
const getFavorites = async (req, res) => {
  try {
    const { userId } = req.params;
    const favorites = await Favorite.find({ userId }).populate('itemId');

    res.status(200).json(favorites);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving favorites.', error });
  }
};

// Remove a favorite
const removeFavorite = async (req, res) => {
  try {
    const { userId, itemId } = req.body;

    const favorite = await Favorite.findOneAndDelete({ userId, itemId });
    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found.' });
    }

    res.status(200).json({ message: 'Favorite removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing favorite.', error });
  }
};

module.exports = {
  addFavorite,
  getFavorites,
  removeFavorite
};
