import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';

interface Option {
  id?: string;
  name?: string;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface TableHeaderDropdownProps {
  label: string;
  options: (string | Option)[];
  selectedValues: string[]; // Now represents EXCLUDED values (unchecked items)
  onSelectionChange: (values: string[]) => void;
  isActive: boolean;
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;
dependentOptions?: (string | Option)[];  
 selectedSites?: string[];
  columnKey: string;
  isDisabled?: boolean;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  sortConfig?: SortConfig | null;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
}

const TableHeaderDropdown: React.FC<TableHeaderDropdownProps> = ({
  label, options, selectedValues, onSelectionChange, isActive,
  autoApply, onAutoApplyChange, dependentOptions, selectedSites, columnKey,
  isDisabled = false, isOpen, onToggle, sortConfig, onSort
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempExcludedValues, setTempExcludedValues] = useState<string[]>(selectedValues);
  const [sortAscending, setSortAscending] = useState(true);
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>('asc');

  // Sync temp values with actual excluded values
  useEffect(() => {
    setTempExcludedValues(selectedValues);
  }, [selectedValues]);

  // Reset search and temp values when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(''); // Reset search when opening
      setTempExcludedValues(selectedValues); // Ensure temp values match applied values
    }
  }, [isOpen, selectedValues]);

  // Update local sort direction based on sortConfig
  useEffect(() => {
    if (sortConfig && sortConfig.column === columnKey) {
      setLocalSortDirection(sortConfig.direction);
    }
  }, [sortConfig, columnKey]);

  // Close dropdown when disabled or clicking outside
  useEffect(() => {
    if (!isOpen || isDisabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.dropdown-container')) {
        onToggle(false);
        // Reset temp values to last applied state when closing without applying
        if (!autoApply) {
          setTempExcludedValues(selectedValues);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isDisabled, selectedValues, autoApply, onToggle]);

  // Close dropdown when disabled
  useEffect(() => {
    if (isDisabled) {
      onToggle(false);
    }
  }, [isDisabled, onToggle]);

  // Process options
  const processedOptions = useMemo(() => {
    let opts = options;

    // Filter cameras based on selected sites
    if (columnKey === 'camera_name' && dependentOptions && selectedSites?.length) {
      opts = dependentOptions;
    }

    // Convert to uniform format and filter by search
    const processed = opts
      .map(opt => typeof opt === 'string'
        ? { label: opt, value: opt }
        : { label: opt.name || '', value: opt.id || '' }
      )
      .filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

    // Sort alphabetically based on sort direction
    return processed.sort((a, b) => {
      const comparison = a.label.localeCompare(b.label);
      return sortAscending ? comparison : -comparison;
    });
  }, [options, searchTerm, dependentOptions, selectedSites, columnKey, sortAscending]);

  // Calculate if all options are selected (none are excluded)
  const isAllSelected = useMemo(() => {
    if (processedOptions.length === 0) return false;
    // All selected means no items are in the excluded list
    return processedOptions.every(opt => !tempExcludedValues.includes(opt.value));
  }, [processedOptions, tempExcludedValues]);

  // Calculate if all options are unselected (all are excluded)
  const isAllUnselected = useMemo(() => {
    if (processedOptions.length === 0) return false;
    // All unselected means all items are in the excluded list
    return processedOptions.every(opt => tempExcludedValues.includes(opt.value));
  }, [processedOptions, tempExcludedValues]);

  // Check if Apply button should be disabled (when all items are unselected in non-auto mode)
  const isApplyDisabled = useMemo(() => {
    return !autoApply && isAllUnselected;
  }, [autoApply, isAllUnselected]);

  // Check if current column is being sorted
  const isCurrentColumnSorted = useMemo(() => {
    return sortConfig && sortConfig.column === columnKey;
  }, [sortConfig, columnKey]);

  // Event handlers
  const toggleOption = useCallback((value: string) => {
    if (isDisabled) return;

    // Toggle exclusion: if excluded, include it; if included, exclude it
    const newExcluded = tempExcludedValues.includes(value)
      ? tempExcludedValues.filter(v => v !== value) // Remove from excluded (check it)
      : [...tempExcludedValues, value]; // Add to excluded (uncheck it)

    // In auto-apply mode, prevent unselecting the last item (prevent all items being excluded)
    if (autoApply && !tempExcludedValues.includes(value)) {
      // User is trying to unselect (exclude) an item
      // Check if this would result in all items being excluded
      if (newExcluded.length >= processedOptions.length) {
        return; // Don't allow unselecting the last item
      }
    }

    setTempExcludedValues(newExcluded);

    // Apply immediately if auto-apply is enabled
    if (autoApply) {
      onSelectionChange(newExcluded);
    }
  }, [tempExcludedValues, autoApply, onSelectionChange, isDisabled, processedOptions.length]);

  const toggleSelectAll = useCallback(() => {
    if (isDisabled) return;

    // In auto-apply mode, prevent unselecting all
    if (autoApply && isAllSelected) {
      return; // Don't allow unselecting all in auto-apply mode
    }

    // If all are selected (none excluded), then exclude all
    // If some/none are selected (some excluded), then include all (exclude none)
    const newExcluded = isAllSelected ? processedOptions.map(opt => opt.value) : [];

    setTempExcludedValues(newExcluded);

    // Apply immediately if auto-apply is enabled (but we already prevented unselect all above)
    if (autoApply) {
      onSelectionChange(newExcluded);
    }
  }, [processedOptions, isAllSelected, autoApply, onSelectionChange, isDisabled]);

  const applyChanges = useCallback(() => {
    if (isDisabled || isApplyDisabled) return;

    onSelectionChange(tempExcludedValues);
    onToggle(false); // Close dropdown after applying
  }, [tempExcludedValues, onSelectionChange, isDisabled, isApplyDisabled, onToggle]);

  const toggleSort = useCallback(() => {
    setSortAscending(prev => !prev);
  }, []);

  const handleDropdownToggle = useCallback(() => {
    if (isDisabled) return;
    onToggle(!isOpen);
  }, [isDisabled, isOpen, onToggle]);

  const handleColumnSort = useCallback(() => {
    if (!onSort) return;

    const newDirection = localSortDirection === 'asc' ? 'desc' : 'asc';
    setLocalSortDirection(newDirection);
    onSort(columnKey, newDirection);
  }, [localSortDirection, onSort, columnKey]);

  const handleClearSort = useCallback(() => {
    if (!onSort) return;
    onSort('', 'asc'); // Pass empty string to clear sort
  }, [onSort]);

  // Sortable columns
  const sortableColumns = ['site_name', 'camera_name', 'uc_type', 'severity', 'status', 'action_status', 'location_tags', 'functional_tag', 'comments', 'action_taken', 'mail_receivers',
    'details', 'extra_info'
  ];
  const isSortable = sortableColumns.includes(columnKey);

  return (
    <div className="relative dropdown-container">
      <button
        onClick={handleDropdownToggle}
        className={`flex items-center gap-1 ${isDisabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-700 hover:text-gray-900 cursor-pointer'
          }`}
        disabled={isDisabled}
      >
        <span>{label}</span>
        {isActive || isCurrentColumnSorted ? (
          <Filter className={`w-4 h-4 ${isDisabled ? 'text-gray-400' : 'text-teal-600'}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDisabled ? 'text-gray-400' : ''
            }`} />
        )}
      </button>

      {isOpen && !isDisabled && (
        <div className={`absolute top-full mt-1 w-50 bg-white border border-gray-200 rounded-md shadow-lg z-50 ${(() => {
            const buttonRect = (document.activeElement as HTMLElement)?.closest('.dropdown-container')?.getBoundingClientRect();
            const shouldAlignLeft = buttonRect && (buttonRect.right + 200) > window.innerWidth;
            return shouldAlignLeft ? '-left-30' : '-right-33';
          })()
          } before:content-[''] before:absolute before:-top-1 before:w-2 before:h-2 before:bg-white before:border-l before:border-t before:border-gray-200 before:transform before:rotate-45 ${(() => {
            const buttonRect = (document.activeElement as HTMLElement)?.closest('.dropdown-container')?.getBoundingClientRect();
            const shouldAlignLeft = buttonRect && (buttonRect.right + 200) > window.innerWidth;
            return shouldAlignLeft ? 'before:right-8' : 'before:left-8';
          })()
          }`}>
          {/* Column Sort Section - Only for sortable columns */}
          {isSortable && onSort && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleColumnSort}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors flex-1 ${isCurrentColumnSorted
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-gray-200'
                    }`}
                  title={`Sort ${localSortDirection === 'asc' ? 'A-Z' : 'Z-A'}`}
                >
                  {localSortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  <span>Sort {localSortDirection === 'asc' ? 'A-Z' : 'Z-A'}</span>
                </button>

                {/* Clear Sort Button - Only show when this column is being sorted */}
                {isCurrentColumnSorted && (
                  <button
                    onClick={handleClearSort}
                    className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Clear sort"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-6 pr-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="px-2 py-1 border-b border-gray-100 flex justify-between items-center">
            <label className="flex items-center gap-1 text-gray-600 hover:text-gray-800 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="w-3 h-3 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-1 accent-teal-600"
              />
              <span>Select All</span>
            </label>
            <button
              onClick={toggleSort}
              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
              title={`Sort options ${sortAscending ? 'Z-A' : 'A-Z'}`}
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          {/* Options */}
          <div className="max-h-40 overflow-y-auto overflow-x-auto min-w-0">
            {processedOptions.length === 0 ? (
              <div className="px-2 py-2 text-gray-500 text-xs">No options found</div>
            ) : (
              processedOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer min-w-max"
                >
                  <input
                    type="checkbox"
                    checked={!tempExcludedValues.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                    className="w-3 h-3 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-1 accent-teal-600"
                  />
                  <span className="text-gray-600 truncate text-xs font-normal">{option.label}</span>
                </label>
              ))
            )}
          </div>

          {/* Apply Controls */}
          <div className="border-t border-gray-100">
            {!autoApply && (
              <div className="p-2 border-b border-gray-100">
                <button
                  onClick={applyChanges}
                  disabled={isApplyDisabled}
                  className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${isApplyDisabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  title={isApplyDisabled ? 'Cannot apply when no items are selected' : 'Apply changes'}
                >
                  Apply
                </button>
              </div>
            )}
            <div className="p-2">
              <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => onAutoApplyChange(e.target.checked)}
                  className="w-3 h-3 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-1 accent-teal-600"
                />
                <span className="text-xs">Auto Apply</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableHeaderDropdown;