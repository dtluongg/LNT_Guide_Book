const { executeQuery } = require('../config/database');

const contentController = {
    // GET /api/contents?category_id=1 - Lấy content của 1 category
    getContentByCategory: async (req, res) => {
        try {
            const { category_id } = req.query;
            
            if (!category_id) {
                return res.status(400).json({
                    success: false,
                    message: 'category_id is required'
                });
            }

            const query = `
                SELECT 
                    c.id,
                    c.category_id,
                    c.title,
                    c.html_content,
                    c.plain_content,
                    c.meta_description,
                    c.featured_image,
                    c.is_published,
                    c.order_index,
                    c.view_count,
                    c.created_at,
                    c.updated_at,
                    c.published_at,
                    cat.title as category_title,
                    cat.slug as category_slug,
                    m.name as module_name
                FROM contents c
                JOIN categories cat ON c.category_id = cat.id
                JOIN modules m ON cat.module_id = m.id
                WHERE c.category_id = ? 
                ORDER BY c.created_at ASC
            `;
            
            const contents = await executeQuery(query, [category_id]);
            
            // If no content found, return empty but not error
            res.json({
                success: true,
                data: contents,
                total: contents.length,
                message: contents.length > 0 ? 'Contents retrieved successfully' : 'No content found for this category'
            });
        } catch (error) {
            console.error('Get content by category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve contents',
                error: error.message
            });
        }
    },

    // GET /api/contents/:id - Lấy content theo ID
    getContentById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    c.id,
                    c.category_id,
                    c.title,
                    c.html_content,
                    c.plain_content,
                    c.meta_description,
                    c.featured_image,
                    c.is_published,
                    c.view_count,
                    c.created_at,
                    c.updated_at,
                    c.published_at,
                    cat.title as category_title,
                    cat.slug as category_slug,
                    m.name as module_name,
                    m.slug as module_slug
                FROM contents c
                JOIN categories cat ON c.category_id = cat.id
                JOIN modules m ON cat.module_id = m.id
                WHERE c.id = ?
            `;
            
            const contents = await executeQuery(query, [id]);
            
            if (contents.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Content not found'
                });
            }

            // Increment view count
            await executeQuery(
                'UPDATE contents SET view_count = view_count + 1 WHERE id = ?', 
                [id]
            );
            
            res.json({
                success: true,
                data: contents[0],
                message: 'Content retrieved successfully'
            });
        } catch (error) {
            console.error('Get content by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve content',
                error: error.message
            });
        }
    },

    // POST /api/contents - Tạo content mới
    createContent: async (req, res) => {
        try {
            const { 
                category_id, 
                title, 
                html_content, 
                meta_description, 
                featured_image,
                is_published = false
            } = req.body;
            
            if (!category_id || !title) {
                return res.status(400).json({
                    success: false,
                    message: 'category_id and title are required'
                });
            }

            // Check if category exists
            const categoryCheck = await executeQuery(
                'SELECT id FROM categories WHERE id = ? AND is_active = true', 
                [category_id]
            );
            
            if (categoryCheck.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Tìm order_index lớn nhất và +1
            const maxOrderRes = await executeQuery(
                'SELECT MAX(order_index) as max_order FROM contents WHERE category_id = ?', 
                [category_id]
            );
            const nextOrderIndex = (maxOrderRes[0]?.max_order ?? -1) + 1;

            // Extract plain text from HTML (simple version)
            const plain_content = html_content ? 
                html_content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
            
            const query = `
                INSERT INTO contents (
                    category_id, 
                    title, 
                    html_content, 
                    plain_content, 
                    meta_description, 
                    featured_image,
                    is_published,
                    published_at,
                    order_index
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const published_at = is_published ? new Date() : null;
            
            const result = await executeQuery(query, [
                category_id,
                title,
                html_content || '',
                plain_content,
                meta_description || null,
                featured_image || null,
                is_published,
                published_at,
                nextOrderIndex             // Thêm order_index khi tạo mới
            ]);
            
            res.status(201).json({
                success: true,
                data: {
                    id: result.insertId,
                    category_id,
                    title,
                    html_content,
                    is_published,
                    published_at,
                    order_index: nextOrderIndex
                },
                message: 'Content created successfully'
            });
        } catch (error) {
            console.error('Create content error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create content',
                error: error.message
            });
        }
    },

    // PUT /api/contents/:id - Update content
    // PUT /api/contents/:id - Update content (có thể chỉnh order_index)
    updateContent: async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                title, 
                html_content, 
                meta_description, 
                featured_image,
                is_published,
                order_index             // Đọc order_index nếu client gửi lên
            } = req.body;
            
            // Check if content exists
            const existing = await executeQuery(
                'SELECT * FROM contents WHERE id = ?', 
                [id]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Content not found'
                });
            }

            const existingContent = existing[0];

            // Extract plain text from HTML
            const plain_content = html_content ? 
                html_content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
            
            // Handle published_at logic
            let published_at = existingContent.published_at;
            if (is_published === true && !existingContent.is_published) {
                published_at = new Date();
            } else if (is_published === false) {
                published_at = null;
            }

            const query = `
                UPDATE contents 
                SET 
                    title = ?, 
                    html_content = ?, 
                    plain_content = ?, 
                    meta_description = ?, 
                    featured_image = ?,
                    is_published = ?,
                    published_at = ?,
                    order_index = ?
                WHERE id = ?
            `;
            
            const params = [
                title || existingContent.title || '',
                html_content || existingContent.html_content || '',
                plain_content || '',
                meta_description !== undefined ? meta_description : null,
                featured_image !== undefined ? featured_image : null,
                is_published !== undefined ? is_published : existingContent.is_published,
                published_at,
                order_index !== undefined ? order_index : existingContent.order_index,   // Giữ nguyên nếu không gửi lên
                id
            ];
            
            await executeQuery(query, params);
            
            res.json({
                success: true,
                message: 'Content updated successfully'
            });
        } catch (error) {
            console.error('Update content error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update content',
                error: error.message
            });
        }
    },

    // DELETE /api/contents/:id - Delete content
    deleteContent: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Check if content exists
            const existing = await executeQuery(
                'SELECT id FROM contents WHERE id = ?', 
                [id]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Content not found'
                });
            }
            
            // Hard delete content
            await executeQuery('DELETE FROM contents WHERE id = ?', [id]);
            
            res.json({
                success: true,
                message: 'Content deleted successfully'
            });
        } catch (error) {
            console.error('Delete content error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete content',
                error: error.message
            });
        }
    },

    // GET /api/contents/search?q=keyword - Search content
    searchContent: async (req, res) => {
        try {
            const { q, module_id } = req.query;
            
            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query (q) is required'
                });
            }
            
            let query = `
                SELECT 
                    c.id,
                    c.category_id,
                    c.title,
                    c.plain_content,
                    c.meta_description,
                    c.view_count,
                    c.published_at,
                    cat.title as category_title,
                    m.name as module_name
                FROM contents c
                JOIN categories cat ON c.category_id = cat.id
                JOIN modules m ON cat.module_id = m.id
                WHERE c.is_published = true 
                AND (c.title LIKE ? OR c.plain_content LIKE ?)
            `;
            
            const params = [`%${q}%`, `%${q}%`];
            
            if (module_id) {
                query += ' AND m.id = ?';
                params.push(module_id);
            }
            
            query += ' ORDER BY c.view_count DESC, c.published_at DESC LIMIT 20';
            
            const results = await executeQuery(query, params);
            
            res.json({
                success: true,
                data: results,
                total: results.length,
                query: q,
                message: results.length > 0 ? 'Search completed' : 'No results found'
            });
        } catch (error) {
            console.error('Search content error:', error);
            res.status(500).json({
                success: false,
                message: 'Search failed',
                error: error.message
            });
        }
    }
};

module.exports = contentController;