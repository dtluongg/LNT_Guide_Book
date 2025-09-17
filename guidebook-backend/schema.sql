-- Sử dụng database
USE guidebook_system;

-- ======================================
-- 1. XÓA TOÀN BỘ CÁC BẢNG (nếu tồn tại)
-- ======================================
DROP TABLE IF EXISTS content_images;
DROP TABLE IF EXISTS content_history;
DROP TABLE IF EXISTS media_files;
DROP TABLE IF EXISTS contents;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS modules;

-- ======================================
-- 2. TẠO LẠI CÁC BẢNG
-- ======================================

-- Bảng modules
CREATE TABLE modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng categories (CÓ slug)
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    module_id INT NOT NULL,
    parent_id INT NULL,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,

    UNIQUE KEY uq_category_slug (slug),
    INDEX idx_module_order (module_id, order_index)
);

-- Bảng contents
CREATE TABLE contents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    title VARCHAR(300) NOT NULL,
    html_content LONGTEXT,
    plain_content TEXT,
    meta_description VARCHAR(500),
    featured_image VARCHAR(500),
    is_published BOOLEAN DEFAULT FALSE,
    view_count INT DEFAULT 0,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,

    INDEX idx_category_published (category_id, is_published),
    INDEX idx_published_date (is_published, published_at)
);

-- Bảng media_files
CREATE TABLE media_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    alt_text VARCHAR(200),
    width INT,
    height INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE SET NULL,

    INDEX idx_content_files (content_id, is_active)
);

-- Bảng users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'editor') DEFAULT 'editor',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL
);

-- Bảng content_history
CREATE TABLE content_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT NOT NULL,
    user_id INT,
    title VARCHAR(300),
    html_content LONGTEXT,
    change_note VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_content_history (content_id, created_at)
);

-- Bảng content_images
CREATE TABLE content_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT,
    image_url VARCHAR(500),
    alt_text VARCHAR(255),
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);

-- ======================================
-- 3. DỮ LIỆU MẪU (sample data)
-- ======================================

-- Insert sample modules
INSERT INTO modules (name, slug, icon, order_index) VALUES 
('User Management', 'user-management', 'fas fa-users', 1),
('System Settings', 'system-settings', 'fas fa-cog', 2),
('Reports', 'reports', 'fas fa-chart-bar', 3),
('API Documentation', 'api-docs', 'fas fa-code', 4);

-- Insert sample admin user (password: admin123, hash chỉ minh họa)
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
INSERT INTO contents (category_id, title, html_content, plain_content, is_published, published_at, order_index) VALUES 
(1, 'Welcome to User Management', 
 '<h2>Introduction</h2><p>This guide will help you understand how to manage users in the system.</p><p>You can create, edit, and delete user accounts from the admin panel.</p>', 
 'Introduction This guide will help you understand how to manage users in the system. You can create, edit, and delete user accounts from the admin panel.',
 TRUE, NOW(), 0);
