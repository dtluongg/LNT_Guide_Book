import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import TopNavbar from './components/Layout/TopNavBar.jsx';
import Sidebar from './components/Layout/SideBar';
import ContentEditor from './components/Content/ContentEditor';
import CategoryManager from './components/Category/CategoryManager';
import { apiService } from './services/apiService';

function App() {
  const [modules, setModules] = useState([]);
  const [activeModule, setActiveModule] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [contentsLoading, setContentsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('content'); // 'content' or 'categories'

  // Load modules khi component mount
  useEffect(() => {
    loadModules();
  }, []);

  // Load categories khi activeModule thay đổi
  useEffect(() => {
    if (activeModule) {
      loadCategories(activeModule.id);
    } else {
      setCategories([]);
      setActiveCategory(null);
      setContents([]);
    }
  }, [activeModule, activeView]);

  // Load contents khi activeCategory thay đổi
  useEffect(() => {
    if (activeCategory && activeView === 'content') {
      loadContents(activeCategory.id);
    } else {
      setContents([]);
    }
  }, [activeCategory, activeView]);

  const loadModules = async () => {
    try {
      setLoading(true);

      // Test API connection
      const healthCheck = await apiService.health();
      console.log('🏥 Backend health:', healthCheck.data);

      // Load modules
      const response = await apiService.modules.getAll();
      const moduleData = response.data.data || [];

      setModules(moduleData);

      // Auto select module đầu tiên
      if (moduleData.length > 0) {
        setActiveModule(moduleData[0]);
        toast.success(`Loaded ${moduleData.length} modules`);
      } else {
        toast.error('No modules found');
      }
    } catch (error) {
      console.error('Failed to load modules:', error);
      toast.error('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  // Fix the loadCategories function to properly handle filtering:

  const loadCategories = async (moduleId) => {
    try {
      setCategoriesLoading(true);

      // Sử dụng API khác nhau tuỳ theo view
      const response =
        activeView === 'categories'
          ? await apiService.categories.getByModuleAll(moduleId) // Management: ALL categories
          : await apiService.categories.getByModule(moduleId); // Sidebar: ACTIVE only

      const categoryData = response.data.data || [];

      setCategories(categoryData);

      if (categoryData.length > 0 && activeView === 'content') {
        setActiveCategory(categoryData[0]);
        toast.success(`Loaded ${categoryData.length} categories`);
      } else {
        setActiveCategory(null);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
      setCategories([]);
      setActiveCategory(null);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Reload categories when view changes
  const handleViewChange = (view) => {
    setActiveView(view);
    if (view === 'categories') {
      setActiveCategory(null);
      setContents([]);
    }

    // Reload categories với API phù hợp
    if (activeModule) {
      loadCategories(activeModule.id);
    }

    toast.success(`Switched to ${view} view`);
  };

  const loadContents = async (categoryId) => {
    try {
      setContentsLoading(true);
      const response = await apiService.contents.getByCategory(categoryId);
      const contentData = response.data.data || [];

      setContents(contentData);
      console.log(
        `📄 Loaded ${contentData.length} contents for category ${categoryId}`
      );
    } catch (error) {
      console.error('Failed to load contents:', error);
      toast.error('Failed to load contents');
      setContents([]);
    } finally {
      setContentsLoading(false);
    }
  };

  const handleModuleChange = (module) => {
    setActiveModule(module);
    setActiveCategory(null);
    setContents([]);
    toast.success(`Switched to ${module.name}`);
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    toast.success(`Selected: ${category.title}`);
  };

  const handleCreateCategory = (parentId) => {
    console.log('Create category with parent:', parentId);
    setActiveView('categories');
    toast('Opening category manager...', { icon: '📁' });
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleContentUpdate = (categoryId) => {
    // Reload contents when content is created/updated/deleted
    loadContents(categoryId);
  };

  const handleCategoriesUpdate = (moduleId) => {
    if (activeModule) {
      loadCategories(activeModule.id); // ← FIX: Call loadCategories properly
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Toast notifications */}
      <Toaster
        position='top-right'
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />

      {/* Top Navigation */}
      <TopNavbar
        modules={modules}
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        onToggleSidebar={handleToggleSidebar}
        loading={loading}
      />

      {/* Main Content Area */}
      <div className='flex h-screen pt-16'>
        {/* Sidebar */}
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          isOpen={sidebarOpen}
          onToggle={handleToggleSidebar}
          onCreateCategory={handleCreateCategory}
          loading={categoriesLoading}
          activeView={activeView}
          onViewChange={handleViewChange}
          onCategoriesUpdate={handleCategoriesUpdate} 
          activeModule={activeModule} 
        />
        {/* Main Content */}
        {activeView === 'categories' ? (
          <CategoryManager
            activeModule={activeModule}
            categories={categories}
            onCategoriesUpdate={handleCategoriesUpdate}
          />
        ) : (
          <ContentEditor
            activeCategory={activeCategory}
            contents={contents}
            onContentUpdate={handleContentUpdate}
            loading={contentsLoading}
          />
        )}
      </div>
    </div>
  );
}

export default App;
