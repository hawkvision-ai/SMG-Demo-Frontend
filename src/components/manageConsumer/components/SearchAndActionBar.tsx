import React from 'react';
import { Search, Plus } from 'lucide-react';

interface SearchAndActionBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateClick: () => void;
  activeTab: string; // Add activeTab prop
}

const SearchAndActionBar: React.FC<SearchAndActionBarProps> = ({ 
  searchTerm, 
  onSearchChange, 
  onCreateClick,
  activeTab
}) => {
  const isAdminTab = activeTab === 'admin';
  
  return (
    <div className="px-4 py-4 flex items-center justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder={`Search ${isAdminTab ? 'Admin' : 'Consumer'}`}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>
      
      <button
        onClick={onCreateClick}
        className="ml-4 inline-flex items-center px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create {isAdminTab ? 'Admin' : 'Consumer'}
      </button>
    </div>
  );
};

export default SearchAndActionBar;