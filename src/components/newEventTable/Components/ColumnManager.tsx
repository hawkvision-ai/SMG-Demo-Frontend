import React, { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { ColumnConfig } from '@/api/types';

interface ColumnManagerProps {
  columns: ColumnConfig[];
  onApply: (updatedColumns: ColumnConfig[]) => void;
  onResetColumns: () => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const ColumnManager: React.FC<ColumnManagerProps> = ({
  columns,
  onResetColumns,
  onApply,
  onClose,
  position
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local columns state
  useEffect(() => {
    setLocalColumns([...columns]);
    setHasChanges(false);
  }, [columns]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.column-manager-dropdown')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Filter and sort columns
  const filteredAndSortedColumns = useMemo(() => {
    let filtered = localColumns.filter(column =>
      column.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const comparison = a.label.localeCompare(b.label);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [localColumns, searchTerm, sortOrder]);

  // Handle local column visibility change
  const handleLocalColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setLocalColumns(prev => 
      prev.map(col => 
        col.key === columnKey ? { ...col, visible } : col
      )
    );
    setHasChanges(true);
  };

  // Check if all filtered columns are selected
  const allSelected = filteredAndSortedColumns.every(col => col.visible);

  // Handle select all / deselect all
  const handleSelectAll = () => {
    const newVisibility = !allSelected;
    setLocalColumns(prev => 
      prev.map(col => {
        // Only update columns that match the current search
        const isInFilteredList = filteredAndSortedColumns.some(filtered => filtered.key === col.key);
        if (isInFilteredList) {
          return { ...col, visible: newVisibility };
        }
        return col;
      })
    );
    setHasChanges(true);
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Apply all changes
const handleApply = () => {
  onApply(localColumns);
  setHasChanges(false);
  onClose();
};

  return (
    <div 
      className="column-manager-dropdown fixed bg-white border border-gray-200 shadow-lg rounded z-50 w-64"
      style={{
        top: position.y, 
        left: position.x,
      }}
    >
      {/* Header */}
      <div className="p-3 border-b  rounded-t">
        <h3 className="text-sm font-semibold text-gray-800">Manage Columns</h3>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1 border border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded text-xs"
        />
      </div>

      {/* Controls */}
      <div className="p-2 flex justify-between items-center border-b">
        <button
          onClick={toggleSort}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
        >
          {sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </button>
        
        <button
          onClick={handleSelectAll}
          className="text-xs text-teal-600 hover:text-teal-800"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Column List */}
      <div className="max-h-48 overflow-y-auto">
        {filteredAndSortedColumns.length === 0 ? (
          <div className="p-2 text-xs text-gray-500">No columns found</div>
        ) : (
          filteredAndSortedColumns.map((column) => (
            <label
              key={column.key}
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-teal-50"
            >
              <input
                type="checkbox"
                checked={column.visible}
                onChange={(e) => handleLocalColumnVisibilityChange(column.key, e.target.checked)}
                className="w-3 h-3 accent-teal-600"
              />
              <span className="text-xs">{column.label}</span>
            </label>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t  flex items-center justify-between">
        <button
          onClick={onResetColumns}
          className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
        >
          Reset
        </button>
        
        <button
          onClick={handleApply}
          disabled={!hasChanges || localColumns.every(col => !col.visible)}
          className={`px-3 py-1 text-xs rounded ${hasChanges && !localColumns.every(col => !col.visible)

              ? 'bg-teal-600 text-white hover:bg-teal-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default ColumnManager;