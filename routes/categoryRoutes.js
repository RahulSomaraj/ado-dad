const express = require("express");
const categoryController = require("../controllers/categoryController");

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Subcategory:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the subcategory
 *         description:
 *           type: string
 *           description: A brief description of the subcategory
 *     Category:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the category
 *         description:
 *           type: string
 *           description: A brief description of the category
 *         subcategories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Subcategory'
 *       required:
 *         - name
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
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       201:
 *         description: The category was successfully created
 *       500:
 *         description: Failed to create the category
 */
router.post("/c", categoryController.createCategory);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of all categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       500:
 *         description: Failed to fetch categories
 */
router.get("/", categoryController.getAllCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The category ID
 *     responses:
 *       200:
 *         description: The category details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *       500:
 *         description: Failed to fetch the category
 */
router.get("/:id", categoryController.getCategoryById);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       200:
 *         description: The category was updated
 *       404:
 *         description: Category not found
 *       500:
 *         description: Failed to update the category
 */
router.put("/:id", categoryController.updateCategory);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The category ID
 *     responses:
 *       200:
 *         description: The category was deleted
 *       404:
 *         description: Category not found
 *       500:
 *         description: Failed to delete the category
 */
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
