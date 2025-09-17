import React from 'react';
import { Menu, Search, Settings, BookOpen } from 'lucide-react';

const TopNavbar = ({ 
  modules, 
  activeModule, 
  onModuleChange, 
  onToggleSidebar,
  loading = false 
}) => {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Logo & Toggle */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center space-x-2">
            <BookOpen className="text-primary-500" size={24} />
            <span className="font-bold text-xl text-gray-800">
              Guidebook Admin
            </span>
          </div>
        </div>

        {/* Center - Module Tabs (Desktop) */}
        <div className="hidden md:flex items-center space-x-1">
          {loading ? (
            <div className="flex space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 w-20 bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            modules.map((module) => (
              <button
                key={module.id}
                onClick={() => onModuleChange(module)}
                className={`
                  flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${activeModule?.id === module.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                {/* Module icon mapping */}
                <span className="mr-2">
                  {module.slug === 'user-management' && '👥'}
                  {module.slug === 'system-settings' && '⚙️'}
                  {module.slug === 'reports' && '📊'}
                  {module.slug === 'api-documentation' && '📋'}
                  {module.slug === 'file-management' && '📁'}
                  {!['user-management', 'system-settings', 'reports', 'api-documentation', 'file-management'].includes(module.slug) && '📄'}
                </span>
                {module.name}
              </button>
            ))
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Search"
          >
            <Search size={20} />
          </button>
          <button 
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Module Selector */}
      <div className="md:hidden mt-3 border-t pt-3">
        {loading ? (
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        ) : (
          <select
            value={activeModule?.id || ''}
            onChange={(e) => {
              const module = modules.find(m => m.id === parseInt(e.target.value));
              if (module) onModuleChange(module);
            }}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select Module...</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </nav>
  );
};

export default TopNavbar;