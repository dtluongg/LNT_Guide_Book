const { executeQuery } = require('../config/database');

const moduleController = {
    // GET /api/modules - Lấy tất cả modules
    getAllModules: async (req, res) => {
        try {
            const query = `
                SELECT id, name, slug, icon, order_index, is_active, created_at
                FROM modules 
                WHERE is_active = true 
                ORDER BY order_index ASC
            `;
            
            const modules = await executeQuery(query);
            
            res.json({
                success: true,
                data: modules,
                message: 'Modules retrieved successfully'
            });
        } catch (error) {
            console.error('Get modules error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve modules',
                error: error.message
            });
        }
    },

    // GET /api/modules/:id - Lấy module theo ID
    getModuleById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT id, name, slug, icon, order_index, is_active, created_at
                FROM modules 
                WHERE id = ? AND is_active = true
            `;
            
            const modules = await executeQuery(query, [id]);
            
            if (modules.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }
            
            res.json({
                success: true,
                data: modules[0],
                message: 'Module retrieved successfully'
            });
        } catch (error) {
            console.error('Get module by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve module',
                error: error.message
            });
        }
    },

    // POST /api/modules - Tạo module mới
    createModule: async (req, res) => {
        try {
            const { name, slug, icon, order_index } = req.body;
            
            // Validation
            if (!name || !slug) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and slug are required'
                });
            }
            
            const query = `
                INSERT INTO modules (name, slug, icon, order_index)
                VALUES (?, ?, ?, ?)
            `;
            
            const result = await executeQuery(query, [name, slug, icon || null, order_index || 0]);
            
            res.status(201).json({
                success: true,
                data: {
                    id: result.insertId,
                    name,
                    slug,
                    icon,
                    order_index: order_index || 0
                },
                message: 'Module created successfully'
            });
        } catch (error) {
            console.error('Create module error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create module',
                error: error.message
            });
        }
    }
};

module.exports = moduleController;