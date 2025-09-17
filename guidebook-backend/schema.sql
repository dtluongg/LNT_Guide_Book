USE guidebook_system;
-- =====================================================
-- DATABASE DESIGN FOR GUIDEBOOK SYSTEM
-- =====================================================

-- Bảng modules: Lưu các chức năng chính của phần mềm
CREATE TABLE modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,              -- Tên module hiển thị (VD: "User Management", "Reporting")
    slug VARCHAR(100) UNIQUE NOT NULL,       -- URL-friendly name (VD: "user-management", "reporting")
    icon VARCHAR(50),                        -- Icon class cho navbar (VD: "fas fa-users")
    order_index INT DEFAULT 0,               -- Thứ tự hiển thị trên navbar (số nhỏ hiện trước)
    is_active BOOLEAN DEFAULT TRUE,          -- Bật/tắt module (admin có thể ẩn module tạm thời)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng categories: Lưu danh mục (cấp 1 và cấp 2)
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    module_id INT NOT NULL,                  -- Thuộc module nào
    parent_id INT NULL,                      -- NULL = cấp 1, có giá trị = cấp 2 (con của category khác)
    title VARCHAR(200) NOT NULL,             -- Tiêu đề category hiển thị trên sidebar
    slug VARCHAR(200) NOT NULL,              -- URL slug cho SEO friendly
    description TEXT,                        -- Mô tả ngắn về category này (tùy chọn)
    order_index INT DEFAULT 0,               -- Thứ tự hiển thị trong sidebar
    is_active BOOLEAN DEFAULT TRUE,          -- Ẩn/hiện category
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Đảm bảo slug unique trong cùng 1 module
    UNIQUE KEY unique_slug_per_module (module_id, slug),
    -- Index cho performance khi query theo module
    INDEX idx_module_order (module_id, order_index)
);

-- Bảng contents: Lưu nội dung chính của mỗi category
CREATE TABLE contents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,                -- Thuộc category nào
    title VARCHAR(300) NOT NULL,             -- Tiêu đề bài viết (hiển thị ở đầu content area)
    html_content LONGTEXT,                   -- Nội dung HTML từ rich editor (có thể rất dài)
    plain_content TEXT,                      -- Nội dung text thuần (để search, tự động extract từ HTML)
    meta_description VARCHAR(500),           -- Mô tả cho SEO (tùy chọn)
    featured_image VARCHAR(500),             -- Ảnh đại diện cho bài viết (tùy chọn)
    is_published BOOLEAN DEFAULT FALSE,      -- Draft = FALSE, Published = TRUE
    view_count INT DEFAULT 0,                -- Đếm số lượt xem (analytics đơn giản)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,             -- Thời gian publish (khác với created_at)
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Index cho performance
    INDEX idx_category_published (category_id, is_published),
    INDEX idx_published_date (is_published, published_at)
);

-- Bảng media_files: Lưu thông tin file upload (hình ảnh trong content)
CREATE TABLE media_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT,                          -- Thuộc content nào (NULL nếu là file chung)
    filename VARCHAR(255) NOT NULL,          -- Tên file lưu trên server (đã rename để tránh conflict)
    original_name VARCHAR(255) NOT NULL,     -- Tên file gốc do user upload
    file_path VARCHAR(500) NOT NULL,         -- Đường dẫn đầy đủ đến file
    file_size INT,                           -- Kích thước file (bytes)
    mime_type VARCHAR(100),                  -- Loại file (image/jpeg, image/png, etc.)
    alt_text VARCHAR(200),                   -- Alt text cho SEO và accessibility
    width INT,                               -- Chiều rộng ảnh (nếu là image)
    height INT,                              -- Chiều cao ảnh (nếu là image)
    is_active BOOLEAN DEFAULT TRUE,          -- Đánh dấu file có còn được sử dụng không
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE SET NULL,
    
    -- Index để tìm file theo content
    INDEX idx_content_files (content_id, is_active)
);

-- Bảng users: Quản lý user admin (đơn giản)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,    -- Tên đăng nhập
    email VARCHAR(100) UNIQUE NOT NULL,      -- Email
    password_hash VARCHAR(255) NOT NULL,     -- Mật khẩu đã hash
    full_name VARCHAR(100),                  -- Họ tên đầy đủ
    role ENUM('admin', 'editor') DEFAULT 'editor', -- Phân quyền: admin (full access), editor (chỉ edit content)
    is_active BOOLEAN DEFAULT TRUE,          -- Bật/tắt tài khoản
    last_login_at TIMESTAMP NULL            -- Lần đăng nhập cuối (để biết ai đang active)
);

-- Bảng content_history: Lưu lịch sử chỉnh sửa content (tùy chọn)
CREATE TABLE content_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT NOT NULL,                 -- Content được chỉnh sửa
    user_id INT,                            -- User thực hiện chỉnh sửa
    title VARCHAR(300),                     -- Title tại thời điểm backup
    html_content LONGTEXT,                  -- Nội dung tại thời điểm backup
    change_note VARCHAR(500),               -- Ghi chú về thay đổi (tùy chọn)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Index để query history của 1 content
    INDEX idx_content_history (content_id, created_at)
);

-- =====================================================
-- SAMPLE DATA INSERT
-- =====================================================

-- Insert sample modules
INSERT INTO modules (name, slug, icon, order_index) VALUES 
('User Management', 'user-management', 'fas fa-users', 1),
('System Settings', 'system-settings', 'fas fa-cog', 2),
('Reports', 'reports', 'fas fa-chart-bar', 3),
('API Documentation', 'api-docs', 'fas fa-code', 4);

-- Insert sample admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES 
('admin', 'admin@company.com', '$2b$10$example_hash_here', 'System Administrator', 'admin');

-- Insert sample categories for User Management module
INSERT INTO categories (module_id, parent_id, title, slug, order_index) VALUES 
(1, NULL, 'Getting Started', 'getting-started', 1),
(1, NULL, 'User Roles', 'user-roles', 2),
(1, NULL, 'Permissions', 'permissions', 3),
(1, 2, 'Admin Role', 'admin-role', 1),
(1, 2, 'Editor Role', 'editor-role', 2),
(1, 2, 'Viewer Role', 'viewer-role', 3);

-- Insert sample content
INSERT INTO contents (category_id, title, html_content, plain_content, is_published, published_at) VALUES 
(1, 'Welcome to User Management', 
 '<h2>Introduction</h2><p>This guide will help you understand how to manage users in the system.</p><p>You can create, edit, and delete user accounts from the admin panel.</p>', 
 'Introduction This guide will help you understand how to manage users in the system. You can create, edit, and delete user accounts from the admin panel.',
 TRUE, NOW());