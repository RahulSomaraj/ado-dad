const Category = require('../models/category');

// Controller for Categories
module.exports = {
  // Create a new category
  createCategory: async (req, res) => {
    try {
      const { name, icon } = req.body;

      // Validation
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const newCategory = new Category({ name, icon });
      const savedCategory = await newCategory.save();

      res.status(201).json({ message: 'Category created successfully', data: savedCategory });
    } catch (error) {
      res.status(500).json({ error: 'Something went wrong', details: error.message });
    }
  },

  // Get all categories
  getAllCategories: async (req, res) => {
    try {
      const categories = await Category.find();
      res.status(200).json({ message: 'Categories fetched successfully', data: categories });
    } catch (error) {
      res.status(500).json({ error: 'Something went wrong', details: error.message });
    }
  },

  // Get category by ID
  getCategoryById: async (req, res) => {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);

      if (!category) return res.status(404).json({ error: 'Category not found' });

      res.status(200).json({ message: 'Category fetched successfully', data: category });
    } catch (error) {
      res.status(500).json({ error: 'Something went wrong', details: error.message });
    }
  },

  // Update a category
  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, icon } = req.body;

      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        { name, icon },
        { new: true, runValidators: true }
      );

      if (!updatedCategory) return res.status(404).json({ error: 'Category not found' });

      res.status(200).json({ message: 'Category updated successfully', data: updatedCategory });
    } catch (error) {
      res.status(500).json({ error: 'Something went wrong', details: error.message });
    }
  },

  // Delete a category
  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const deletedCategory = await Category.findByIdAndDelete(id);
      if (!deletedCategory) return res.status(404).json({ error: 'Category not found' });

      res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Something went wrong', details: error.message });
    }
  },
};
