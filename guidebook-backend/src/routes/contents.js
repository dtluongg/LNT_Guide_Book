const express = require('express');
const contentController = require('../controllers/contentController');

const router = express.Router();

// GET /api/contents/search?q=keyword
router.get('/search', contentController.searchContent);

// GET /api/contents?category_id=1
router.get('/', contentController.getContentByCategory);

// GET /api/contents/:id
router.get('/:id', contentController.getContentById);

// POST /api/contents
router.post('/', contentController.createContent);

// PUT /api/contents/:id
router.put('/:id', contentController.updateContent);

// DELETE /api/contents/:id
router.delete('/:id', contentController.deleteContent);

module.exports = router;