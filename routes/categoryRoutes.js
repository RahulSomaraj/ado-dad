
const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const { rbac } = require('../middlewares/rbacMiddleware');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management API
 */

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - icon
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the category.
 *                 example: Electronics
 *               icon:
 *                 type: string
 *                 description: The icon URL for the category.
 *                 example: "https://example.com/icon-electronics.png"
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authMiddleware,
  rbac(['admin','user']), // Allow only admins and users to create categories
  CategoryController.createCategory
);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     description: Fetch categories with optional filtering by name.
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter categories by name (case-insensitive).
 *         example: "Electronics"
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       500:
 *         description: Server error
 */
router.get('/categories', authMiddleware, CategoryController.getAllCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Category ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.get('/categories/:id', authMiddleware, CategoryController.getCategoryById);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Category ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated name of the category.
 *                 example: "Updated Electronics"
 *               icon:
 *                 type: string
 *                 description: Updated icon URL for the category.
 *                 example: "https://example.com/icon-updated-electronics.png"
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.put(
  '/categories/:id',
  authMiddleware,
  rbac(['admin']),
  CategoryController.updateCategory
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Category ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/categories/:id',
  authMiddleware,
  rbac(['admin']),
  CategoryController.deleteCategory
);

module.exports = router;
