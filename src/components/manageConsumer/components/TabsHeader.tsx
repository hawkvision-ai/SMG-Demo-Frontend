import React from 'react';
import { TabsHeaderProps } from '@/api/types';

const TabsHeader: React.FC<TabsHeaderProps> = ({ activeTab, onTabChange }) => {
  const tabs = ['Consumer', 'Admin'];
  
  return (
    <div className="border-gray-200">
      <nav className="-mb-px flex space-x-8 px-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab.toLowerCase())}
            className={`py-3 px-1 border-b-2 font-medium text-XL transition-colors ${
              activeTab === tab.toLowerCase()
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabsHeader;