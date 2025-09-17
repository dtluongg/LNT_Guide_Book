import axios from 'axios';

// Lấy API URL từ environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Tạo axios instance với config cơ bản
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - log mọi API call
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.data || error.message);
    
    // Handle common errors
    if (error.response?.status === 404) {
      console.error('Resource not found');
    } else if (error.response?.status >= 500) {
      console.error('Server error');
    }
    
    return Promise.reject(error);
  }
);

// Export API service với tất cả endpoints
export const apiService = {
  // Health check
  health: () => api.get('/health'),

  // Modules API
  modules: {
    getAll: () => api.get('/modules'),
    getById: (id) => api.get(`/modules/${id}`),
    create: (data) => api.post('/modules', data)
  },

  // Categories API  
   categories: {
    getByModuleAll: (moduleId) => api.get(`/categories?module_id=${moduleId}&include_inactive=true`),
    
    // For Sidebar - get only ACTIVE categories  
    getByModule: (moduleId) => api.get(`/categories?module_id=${moduleId}`),
    
    getById: (id) => api.get(`/categories/${id}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data), // ⭐ NOW WORKS
    delete: (id) => api.delete(`/categories/${id}`)
  },

  // Contents API
  contents: {
    getByCategory: (categoryId) => api.get(`/contents?category_id=${categoryId}`),
    getById: (id) => api.get(`/contents/${id}`),
    create: (data) => api.post('/contents', data),
    update: (id, data) => api.put(`/contents/${id}`, data),
    delete: (id) => api.delete(`/contents/${id}`),
    search: (query, moduleId = null) => {
      const params = new URLSearchParams({ q: query });
      if (moduleId) params.append('module_id', moduleId);
      return api.get(`/contents/search?${params}`);
    }
  }
};

export default api;