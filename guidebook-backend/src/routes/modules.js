const express = require('express');
const moduleController = require('../controllers/moduleController');

const router = express.Router();

// GET /api/modules
router.get('/', moduleController.getAllModules);

// GET /api/modules/:id
router.get('/:id', moduleController.getModuleById);

// POST /api/modules
router.post('/', moduleController.createModule);

module.exports = router;