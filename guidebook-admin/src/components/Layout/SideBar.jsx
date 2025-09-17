// FIX: Update Sidebar.jsx với proper hover actions
import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Folder, 
  FolderPlus,
  FileText,
  Settings,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';

const Sidebar = ({ 
  categories, 
  activeCategory, 
  onCategoryChange, 
  isOpen, 
  onToggle, 
  onCreateCategory,
  loading,
  activeView = 'content',
  onViewChange,
  onCategoriesUpdate,
  activeModule      
}) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Lọc chỉ categories có is_active = true cho sidebar
  const activeCategories = categories.filter(category => category.is_active);

  const toggleExpanded = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // ✅ IMPLEMENT HOVER ACTIONS
  const handleEditCategory = (category) => {
    console.log('✏️ Edit category from sidebar:', category);
    onViewChange('categories'); // Switch to management view
    toast.success(`Opening editor for "${category.title}"`);
  };

  const handleMoveCategory = async (category, direction) => {
    console.log('📁 Move category:', category, direction);
    
    try {
      // Find current position
      const currentIndex = categories.findIndex(c => c.id === category.id);
      let newOrderIndex = category.order_index;
      
      if (direction === 'up' && currentIndex > 0) {
        newOrderIndex = category.order_index - 1;
      } else if (direction === 'down' && currentIndex < categories.length - 1) {
        newOrderIndex = category.order_index + 1;
      } else {
        toast.error(`Cannot move ${direction}`);
        return;
      }

      // Update order in backend
      const updateData = {
        title: category.title,
        slug: category.slug,
        description: category.description || '',
        is_active: category.is_active,
        parent_id: category.parent_id,
        order_index: newOrderIndex,
        module_id: category.module_id
      };

      await apiService.categories.update(category.id, updateData);
      toast.success(`Moved "${category.title}" ${direction}`);
      
      // Reload categories
      if (onCategoriesUpdate && activeModule) {
        onCategoriesUpdate(activeModule.id);
      }
      
    } catch (error) {
      console.error('Move failed:', error);
      toast.error('Failed to move category');
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!confirm(`Delete "${category.title}"?\n\nThis will permanently delete the category and all its content.`)) {
      return;
    }

    try {
      await apiService.categories.delete(category.id);
      toast.success('Category deleted successfully');
      
      // Reload categories
      if (onCategoriesUpdate && activeModule) {
        onCategoriesUpdate(activeModule.id);
      }
      
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete category');
    }
  };

  const renderCategoryItem = (category, level = 0) => {
    const isActive = activeCategory && activeCategory.id === category.id;
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    
    return (
      <div key={category.id} className="group relative">
        <div
          onClick={() => onCategoryChange(category)}
          className={`
            w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center
            ${isActive 
              ? 'bg-primary-100 text-primary-700 font-medium' 
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
          style={{ paddingLeft: `${12 + (level * 16)}px` }}
        >
          {/* Expand/Collapse for children */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(category.id);
              }}
              className="mr-2 p-0.5 rounded hover:bg-gray-200"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          )}
          
          <div className="w-4 h-4 mr-2 flex items-center justify-center">
            {hasChildren ? (
              <Folder size={14} className="text-blue-500" />
            ) : (
              <FileText size={14} className="text-gray-400" />
            )}
          </div>
          <span className="truncate flex-1">{category.title}</span>
        </div>

        {/* ✅ HOVER ACTIONS - WORKING NOW */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded shadow-sm border border-gray-200 flex z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditCategory(category);
            }}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-l"
            title="Edit Category"
          >
            <Edit3 size={12} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMoveCategory(category, 'up');
            }}
            className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50"
            title="Move Up"
          >
            <ArrowUp size={12} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMoveCategory(category, 'down');
            }}
            className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50"
            title="Move Down"
          >
            <ArrowDown size={12} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCategory(category);
            }}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-r"
            title="Delete Category"
          >
            <Trash2 size={12} />
          </button>
        </div>
        
        {/* Render children nếu expanded */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category.children.filter(child => child.is_active).map(child => 
              renderCategoryItem(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        bg-white border-r border-gray-200 h-full transition-transform duration-300 ease-in-out z-30
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:block
        fixed inset-y-0 left-0 w-80
      `}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center">
              <Folder className="mr-2 text-primary-500" size={18} />
              Categories
            </h2>
            <div className="flex space-x-1">
              <button
                onClick={() => onViewChange('content')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  activeView === 'content' 
                    ? 'bg-primary-100 text-primary-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileText size={12} className="inline mr-1" />
                Content
              </button>
              <button
                onClick={() => onViewChange('categories')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  activeView === 'categories' 
                    ? 'bg-primary-100 text-primary-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Settings size={12} className="inline mr-1" />
                Manage
              </button>
            </div>
          </div>
          
          <button
            onClick={() => onViewChange('categories')}
            className="w-full flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white text-sm rounded-md hover:bg-primary-600 transition-colors shadow-sm"
          >
            <FolderPlus size={16} />
            <span>Manage Categories</span>
          </button>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : activeCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FolderPlus size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-sm">No active categories</p>
              <p className="text-xs">Activate categories in Manage view</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activeCategories.map(category => renderCategoryItem(category))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            {activeCategories.length} active • {categories.length} total
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;