import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/apiService';
import ContentListForCategory from '../Content/ContentTableOfCategory';

const CategoryManager = ({ activeModule, categories, onCategoriesUpdate }) => {
  const [editingCategory, setEditingCategory] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
    parent_id: null,
    order_index: 0,
  });
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingContent, setEditingContent] = useState(null);

  // Reset form and hide content list when creating/editing category
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      is_active: true,
      parent_id: null,
      order_index: categories.length + 1,
    });
    setEditingCategory(null);
    setIsCreating(false);
  };

  const handleCreate = (parentId = null) => {
    setIsCreating(true);
    setEditingCategory(null);
    setSelectedCategory(null); // Ẩn content list
    setFormData({
      title: '',
      description: '',
      is_active: true,
      parent_id: parentId,
      order_index: categories.length + 1,
    });
  };

  const handleEdit = (category) => {
    setIsCreating(false);
    setEditingCategory(category.id);
    setSelectedCategory(null); // Ẩn content list
    setFormData({
      title: category.title || '',
      description: category.description || '',
      is_active: category.is_active || false,
      parent_id: category.parent_id || null,
      order_index: category.order_index || 0,
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!activeModule) {
      toast.error('No module selected');
      return;
    }
    try {
      setLoading(true);
      const saveData = {
        ...formData,
        module_id: activeModule.id,
        order_index: formData.order_index || categories.length + 1,
      };
      if (isCreating) {
        await apiService.categories.create(saveData);
        toast.success(`Category "${saveData.title}" created successfully!`);
      } else {
        await apiService.categories.update(editingCategory, saveData);
        toast.success(`Category "${saveData.title}" updated successfully!`);
      }
      resetForm();
      onCategoriesUpdate(activeModule.id);
    } catch (error) {
      toast.error(
        error.response?.status === 400
          ? 'Validation error: ' + (error.response.data.message || 'Invalid data')
          : 'Failed to save category'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId, categoryTitle) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${categoryTitle}"?\n\nThis will also delete all content in this category.`
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await apiService.categories.delete(categoryId);
      toast.success('Category deleted successfully!');
      onCategoriesUpdate(activeModule.id);
    } catch (error) {
      toast.error(
        'Failed to delete category: ' +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleActive = async (category) => {
    try {
      setLoading(true);
      const updateData = {
        title: category.title,
        description: category.description || '',
        is_active: !category.is_active,
        parent_id: category.parent_id,
        order_index: category.order_index,
        module_id: category.module_id,
      };
      await apiService.categories.update(category.id, updateData);
      toast.success(
        `Category "${category.title}" ${
          updateData.is_active ? 'activated' : 'deactivated'
        }`
      );
      onCategoriesUpdate(category.module_id);
    } catch {
      toast.error('Failed to update category visibility');
    } finally {
      setLoading(false);
    }
  };

  // MOVE CATEGORY
  const handleMoveCategory = async (category, direction) => {
    try {
      setLoading(true);
      const allCategories = categories.flat();
      const currentIndex = allCategories.findIndex((c) => c.id === category.id);
      let newOrderIndex = category.order_index;
      if (direction === 'up' && currentIndex > 0) {
        newOrderIndex = Math.max(0, category.order_index - 1);
      } else if (
        direction === 'down' &&
        currentIndex < allCategories.length - 1
      ) {
        newOrderIndex = category.order_index + 1;
      } else {
        toast.info(`Cannot move category ${direction}`);
        return;
      }
      const updateData = {
        title: category.title,
        description: category.description || '',
        is_active: category.is_active,
        parent_id: category.parent_id,
        order_index: newOrderIndex,
        module_id: category.module_id,
      };
      await apiService.categories.update(category.id, updateData);
      toast.success(`Moved "${category.title}" ${direction}`);
      onCategoriesUpdate(activeModule.id);
    } catch {
      toast.error('Failed to move category');
    } finally {
      setLoading(false);
    }
  };

  // Chỉ hiện content list khi KHÔNG tạo/sửa category và có selectedCategory
  const showContentPanel =
    selectedCategory && !isCreating && !editingCategory;

  const CategoryItem = ({ category, level = 0 }) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isEditing = editingCategory === category.id;
    return (
      <div className='mb-2'>
        <div
          className={`
            group flex items-center justify-between p-3 border rounded-lg transition-colors relative
            ${
              isEditing
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }
            ${!category.is_active ? 'opacity-60' : ''}
          `}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => {
            setSelectedCategory(category);
            setIsCreating(false);
            setEditingCategory(null);
          }}
        >
          <div className='flex items-center flex-1 min-w-0'>
            {/* Expand/Collapse button */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(category.id);
                }}
                className='mr-2 p-1 rounded hover:bg-gray-200'
              >
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            ) : (
              <div className='w-6 mr-2' />
            )}

            {/* Icon */}
            <div className='mr-3'>
              {hasChildren ? (
                <Folder className='text-blue-500' size={18} />
              ) : (
                <div className='w-5 h-5 border border-gray-300 rounded bg-gray-100' />
              )}
            </div>

            {/* Content */}
            <div className='flex-1 min-w-0'>
              <div className='flex items-center space-x-2'>
                <h4 className='font-medium text-gray-900 truncate'>
                  {category.title}
                </h4>
                {/* Status badge với toggle button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActive(category);
                  }}
                  disabled={loading}
                  className={`
                    px-2 py-1 text-xs rounded-full flex items-center space-x-1 transition-colors
                    ${
                      category.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }
                    ${
                      loading
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    }
                  `}
                  title={
                    category.is_active
                      ? 'Click to hide from sidebar'
                      : 'Click to show in sidebar'
                  }
                >
                  {category.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{category.is_active ? 'Visible' : 'Hidden'}</span>
                </button>
              </div>
              <div className='text-sm text-gray-500'>
                {category.description && <span>{category.description}</span>}
                <span className='ml-2'>Order: {category.order_index}</span>
                {category.parent_id && (
                  <span className='ml-2 text-blue-600'>Sub-category</span>
                )}
              </div>
            </div>
          </div>
          {/* ACTION BUTTONS */}
          <div className='flex items-center space-x-1'>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreate(category.id);
              }}
              className='p-2 rounded text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors'
              title='Add Sub-category'
            >
              <Plus size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveCategory(category, 'up');
              }}
              disabled={loading}
              className='p-2 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50'
              title='Move Up'
            >
              <ArrowUp size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveCategory(category, 'down');
              }}
              disabled={loading}
              className='p-2 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50'
              title='Move Down'
            >
              <ArrowDown size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(category);
              }}
              className='p-2 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors'
              title='Edit'
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(category.id, category.title);
              }}
              disabled={loading}
              className='p-2 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50'
              title='Delete Permanently'
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {/* Children categories */}
        {hasChildren && isExpanded && (
          <div className='mt-2'>
            {category.children.map((child) => (
              <CategoryItem key={child.id} category={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!activeModule) {
    return (
      <div className='flex-1 flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <Folder size={64} className='mx-auto mb-4 text-gray-300' />
          <h3 className='text-xl font-semibold text-gray-700 mb-2'>
            No Module Selected
          </h3>
          <p className='text-gray-500'>Select a module to manage categories</p>
        </div>
      </div>
    );
  }

  // Main UI: panel trái là tree, panel phải là động (form hoặc content list)
  return (
    <div className='flex gap-6 w-full'>
      {/* Panel trái: Tree category và nút New */}
      <div className='w-1/2'>
        <div className='bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900'>
              Category Management
            </h2>
            <p className='text-sm text-gray-600 mt-1'>
              Module: {activeModule.name} • {categories.length} categories
            </p>
          </div>
          <button
            onClick={() => handleCreate()}
            className='btn-primary'
          >
            <Plus size={16} className='mr-2' />
            New Category
          </button>
        </div>
        <div className='p-6'>
          <div className='bg-white rounded-lg border border-gray-200'>
            <div className='p-4 border-b border-gray-200'>
              <h3 className='font-medium text-gray-900'>Categories</h3>
              <p className='text-sm text-gray-500 mt-1'>
                Click <Plus size={14} className='inline mx-1' /> to add sub-categories
              </p>
            </div>
            <div className='p-4'>
              {categories.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  <FolderPlus size={48} className='mx-auto mb-3 text-gray-300' />
                  <p className='font-medium'>No categories yet</p>
                  <p className='text-sm'>Create your first category to get started</p>
                </div>
              ) : (
                <div className='space-y-2'>
                  {categories.map((category) => (
                    <CategoryItem key={category.id} category={category} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Panel phải: Form tạo/sửa hoặc Content List */}
      <div className='w-1/2 flex flex-col justify-start'>
        {(isCreating || editingCategory) ? (
          <div className='bg-white rounded-lg border border-gray-200 p-8 mt-6 w-full max-w-lg mx-auto'>
            <div className='flex items-center justify-between mb-6'>
              <h3 className='text-lg font-semibold'>
                {isCreating ? 'Create Category' : 'Edit Category'}
              </h3>
              <button
                onClick={resetForm}
                className='text-gray-400 hover:text-gray-600'
              >
                <X size={20} />
              </button>
            </div>
            {/* Parent selection */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Parent Category
              </label>
              <select
                value={formData.parent_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parent_id: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              >
                <option value=''>No Parent (Root Category)</option>
                {categories
                  .filter((c) => c.id !== editingCategory)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
              </select>
            </div>
            {/* Title */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Title *
              </label>
              <input
                type='text'
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder='Category title...'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              />
            </div>
            {/* Description */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                placeholder='Category description...'
                rows={3}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              />
            </div>
            {/* Active Status */}
            <div className='mb-4'>
              <label className='flex items-center'>
                <input
                  type='checkbox'
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_active: e.target.checked,
                    })
                  }
                  className='mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500'
                />
                <span className='text-sm font-medium text-gray-700'>
                  Show in sidebar (Active)
                </span>
              </label>
            </div>
            {/* Order Index */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Order Index
              </label>
              <input
                type='number'
                value={formData.order_index}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order_index: parseInt(e.target.value) || 0,
                  })
                }
                placeholder='0'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              />
            </div>
            {/* Action Buttons */}
            <div className='flex space-x-2 pt-2'>
              <button
                onClick={handleSave}
                disabled={loading || !formData.title.trim()}
                className='flex-1 btn-primary disabled:opacity-50'
              >
                <Save size={16} className='mr-2' />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={resetForm}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
            </div>
          </div>
        ) : showContentPanel ? (
          <ContentListForCategory
            categoryId={selectedCategory.id}
            onEditContent={setEditingContent}
          />
        ) : (
          <div className='text-gray-400 text-center mt-12'>
            Chọn một category để quản lý content...
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManager;