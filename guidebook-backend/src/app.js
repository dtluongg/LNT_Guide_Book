const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const moduleRoutes = require('./routes/modules');
const categoryRoutes = require('./routes/categories');
const contentRoutes = require('./routes/contents');
const uploadRoutes = require('./routes/upload');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/modules', moduleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/upload', uploadRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Guidebook API is running!',
        api_base_url: process.env.API_BASE_URL || 'http://localhost:3000',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Serve uploaded images (DI CHUYỂN DÒNG NÀY LÊN ĐÂY, TRƯỚC MIDDLEWARE 404)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler - SỬA: Dùng middleware function thay vì route pattern
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
});

module.exports = app;