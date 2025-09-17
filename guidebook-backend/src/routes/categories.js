const express = require('express');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// GET /api/categories?module_id=1
router.get('/', categoryController.getAllCategories);

// GET /api/categories/:id
router.get('/:id', categoryController.getCategoryById);

// POST /api/categories
router.post('/', categoryController.createCategory);

// PUT /api/categories/:id
router.put('/:id', categoryController.updateCategory);

// DELETE /api/categories/:id
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;