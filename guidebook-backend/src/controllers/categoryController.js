const { executeQuery } = require('../config/database');

// ✅ Helper function to auto-generate slug from title
const generateSlug = (title) => {
    return title
        .toLowerCase()
        .trim()
        // Vietnamese characters normalization
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/đ/g, 'd')
        // Remove special characters, keep only alphanumeric, spaces, and hyphens
        .replace(/[^a-z0-9\s-]/g, '')
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Replace multiple hyphens with single hyphen
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-|-$/g, '');
};

// ✅ Helper function to ensure unique slug
const ensureUniqueSlug = async (baseSlug, moduleId, excludeId = null) => {
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
        const checkQuery = excludeId 
            ? 'SELECT id FROM categories WHERE slug = ? AND module_id = ? AND id != ?'
            : 'SELECT id FROM categories WHERE slug = ? AND module_id = ?';
        
        const checkParams = excludeId 
            ? [slug, moduleId, excludeId]
            : [slug, moduleId];
            
        const existing = await executeQuery(checkQuery, checkParams);
        
        if (existing.length === 0) {
            break; // Slug is unique
        }
        
        // Generate new slug with counter
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    
    return slug;
};

const categoryController = {
    // GET /api/categories?module_id=1 - Lấy categories (có thể include inactive)
    getAllCategories: async (req, res) => {
        try {
            const { module_id, include_inactive } = req.query;
            
            if (!module_id) {
                return res.status(400).json({
                    success: false,
                    message: 'module_id is required'
                });
            }

            // Nếu include_inactive=true (cho Management view), lấy tất cả
            // Nếu không (cho Sidebar), chỉ lấy active
            const whereClause = include_inactive === 'true' 
                ? 'WHERE c.module_id = ?' 
                : 'WHERE c.module_id = ? AND c.is_active = true';

            const query = `
                SELECT 
                    c.id, 
                    c.module_id,
                    c.parent_id,
                    c.title,
                    c.slug,
                    c.description,
                    c.order_index,
                    c.is_active,
                    c.created_at,
                    c.updated_at,
                    parent.title as parent_title
                FROM categories c
                LEFT JOIN categories parent ON c.parent_id = parent.id
                ${whereClause}
                ORDER BY c.parent_id ASC, c.order_index ASC
            `;
            
            const categories = await executeQuery(query, [module_id]);
            
            // Organize into hierarchy (parent -> children)
            const organized = organizeCategories(categories);
            
            console.log(`📂 Retrieved ${categories.length} categories for module ${module_id} (include_inactive: ${include_inactive})`);
            
            res.json({
                success: true,
                data: organized,
                total: categories.length,
                message: 'Categories retrieved successfully'
            });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve categories',
                error: error.message
            });
        }
    },

    // GET /api/categories/:id - Lấy category theo ID
    getCategoryById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    c.id, 
                    c.module_id,
                    c.parent_id,
                    c.title,
                    c.slug,
                    c.description,
                    c.order_index,
                    c.is_active,
                    c.created_at,
                    c.updated_at,
                    m.name as module_name,
                    parent.title as parent_title
                FROM categories c
                JOIN modules m ON c.module_id = m.id
                LEFT JOIN categories parent ON c.parent_id = parent.id
                WHERE c.id = ?
            `;
            
            const categories = await executeQuery(query, [id]);
            
            if (categories.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }
            
            res.json({
                success: true,
                data: categories[0],
                message: 'Category retrieved successfully'
            });
        } catch (error) {
            console.error('Get category by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve category',
                error: error.message
            });
        }
    },

    // POST /api/categories - Tạo category mới
    createCategory: async (req, res) => {
        try {
            const { module_id, parent_id, title, description, order_index, is_active } = req.body;
            
            console.log('📝 Creating category:', req.body);
            
            // ✅ REMOVE slug from required validation
            if (!module_id || !title || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'module_id and title are required'
                });
            }

            // Check if module exists
            const moduleCheck = await executeQuery(
                'SELECT id FROM modules WHERE id = ? AND is_active = true', 
                [module_id]
            );
            
            if (moduleCheck.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            // ✅ AUTO-GENERATE unique slug from title
            const baseSlug = generateSlug(title.trim());
            const uniqueSlug = await ensureUniqueSlug(baseSlug, module_id);

            console.log(`🔤 Generated slug: "${title}" -> "${uniqueSlug}"`);

            // Check if parent exists (if parent_id provided)
            if (parent_id) {
                const parentCheck = await executeQuery(
                    'SELECT id FROM categories WHERE id = ? AND module_id = ?', 
                    [parent_id, module_id]
                );
                
                if (parentCheck.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Parent category not found'
                    });
                }
            }
            
            const query = `
                INSERT INTO categories (module_id, parent_id, title, slug, description, order_index, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;
            
            const result = await executeQuery(query, [
                module_id, 
                parent_id || null, 
                title.trim(), 
                uniqueSlug,  // ✅ Use auto-generated unique slug
                description || null, 
                order_index || 0,
                is_active !== undefined ? is_active : true
            ]);
            
            console.log('✅ Category created with ID:', result.insertId);
            
            res.status(201).json({
                success: true,
                data: {
                    id: result.insertId,
                    module_id,
                    parent_id: parent_id || null,
                    title: title.trim(),
                    slug: uniqueSlug,
                    description,
                    order_index: order_index || 0,
                    is_active: is_active !== undefined ? is_active : true
                },
                message: 'Category created successfully'
            });
        } catch (error) {
            console.error('Create category error:', error);
            
            res.status(500).json({
                success: false,
                message: 'Failed to create category',
                error: error.message
            });
        }
    },

    // PUT /api/categories/:id - Update category
    updateCategory: async (req, res) => {
        try {
            const { id } = req.params;
            const { module_id, parent_id, title, description, order_index, is_active } = req.body;
            
            console.log('📝 Updating category ID:', id);
            console.log('📝 Update data:', req.body);
            
            // Check if category exists
            const existing = await executeQuery(
                'SELECT * FROM categories WHERE id = ?', 
                [id]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            const existingCategory = existing[0];

            // ✅ AUTO-GENERATE new slug if title changed
            let newSlug = existingCategory.slug;
            
            if (title && title.trim() !== existingCategory.title) {
                const baseSlug = generateSlug(title.trim());
                newSlug = await ensureUniqueSlug(
                    baseSlug, 
                    module_id || existingCategory.module_id, 
                    id // Exclude current category from uniqueness check
                );
                console.log(`🔤 Updated slug: "${title}" -> "${newSlug}"`);
            }

            // Update query
            const query = `
                UPDATE categories SET 
                    module_id = ?, 
                    parent_id = ?, 
                    title = ?, 
                    slug = ?, 
                    description = ?, 
                    order_index = ?, 
                    is_active = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            await executeQuery(query, [
                module_id !== undefined ? module_id : existingCategory.module_id,
                parent_id !== undefined ? parent_id : existingCategory.parent_id,
                title !== undefined ? title.trim() : existingCategory.title,
                newSlug, // ✅ Use auto-generated slug
                description !== undefined ? description : existingCategory.description,
                order_index !== undefined ? order_index : existingCategory.order_index,
                is_active !== undefined ? is_active : existingCategory.is_active,
                id
            ]);

            // Get updated category
            const updated = await executeQuery(
                'SELECT * FROM categories WHERE id = ?',
                [id]
            );
            
            console.log('✅ Category updated successfully:', updated[0]);
            
            res.json({
                success: true,
                data: updated[0],
                message: 'Category updated successfully'
            });
        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update category',
                error: error.message
            });
        }
    },

    // DELETE /api/categories/:id - Delete category
    deleteCategory: async (req, res) => {
        try {
            const { id } = req.params;
            
            console.log('🗑️ Deleting category ID:', id);
            
            // Check if category exists
            const existing = await executeQuery(
                'SELECT id, title FROM categories WHERE id = ?', 
                [id]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Check if category has children
            const children = await executeQuery(
                'SELECT id FROM categories WHERE parent_id = ? AND is_active = true', 
                [id]
            );
            
            if (children.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete category that has subcategories'
                });
            }

            // Check if category has contents
            const contents = await executeQuery(
                'SELECT id FROM contents WHERE category_id = ?', 
                [id]
            );
            
            if (contents.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete category that has ${contents.length} content(s). Delete contents first.`
                });
            }
            
            // Hard delete
            await executeQuery(
                'DELETE FROM categories WHERE id = ?', 
                [id]
            );
            
            console.log('✅ Category deleted successfully');
            
            res.json({
                success: true,
                message: 'Category deleted successfully'
            });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete category',
                error: error.message
            });
        }
    }
};

// Helper function to organize categories into hierarchy
const organizeCategories = (categories) => {
    const parents = [];
    const children = [];
    
    // Separate parents and children
    categories.forEach(cat => {
        if (cat.parent_id === null) {
            parents.push({
                ...cat,
                children: []
            });
        } else {
            children.push(cat);
        }
    });
    
    // Attach children to parents
    children.forEach(child => {
        const parent = parents.find(p => p.id === child.parent_id);
        if (parent) {
            parent.children.push(child);
        }
    });
    
    return parents;
};

module.exports = categoryController;