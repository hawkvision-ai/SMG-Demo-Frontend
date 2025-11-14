import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, ArrowUpDown, X } from 'lucide-react';
import { sortOptions, getNextSortOrder, SortOrder } from './utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MultiSelectDropdownProps {
  // Basic props
  placeholder?: string;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  className?: string;
  
  // Options
  options: MultiSelectOption[];
  
  // Search functionality
  searchable?: boolean;
  searchPlaceholder?: string;
  
  // Visual customization
  showSelectAll?: boolean;
  selectAllText?: string;
  maxVisibleOptions?: number;
  
  // Sorting functionality
  showSort?: boolean;
  defaultSortOrder?: SortOrder;
  
  // Callbacks
  onFocus?: () => void;
  onBlur?: () => void;
  onSelectAll?: (allValues: string[]) => void;
  
  // Dropdown positioning
  dropdownPosition?: 'bottom' | 'top';
  
  // Styling variants
  variant?: 'default' | 'compact';

  // Modal support
  inModal?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  placeholder = "Select options",
  selectedValues = [],
  onChange,
  disabled = false,
  className = "",
  options = [],
  searchable = true,
  searchPlaceholder = "Search...",
  showSelectAll = true,
  selectAllText = "Select All",
  maxVisibleOptions = 6,
  showSort = true,
  defaultSortOrder = 'asc',
  onFocus,
  onBlur,
  onSelectAll,
  dropdownPosition = 'top', // Changed default from 'bottom' to 'top'
  variant = 'default',
  inModal = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Sort and filter options based on search
  const processedOptions = React.useMemo(() => {
    let filtered = options;
    
    // Filter based on search
    if (searchValue.trim()) {
      filtered = filtered.filter(option => 
        option.label.toLowerCase().includes(searchValue.toLowerCase())
      );
    }
    
    // Sort options
    return sortOptions(filtered, sortOrder);
  }, [options, searchValue, sortOrder]);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
        setSearchValue("");
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, searchable]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      const totalOptions = showSelectAll ? processedOptions.length + 1 : processedOptions.length;
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < totalOptions - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex === 0 && showSelectAll) {
            handleSelectAll();
          } else if (selectedIndex > 0 || (!showSelectAll && selectedIndex >= 0)) {
            const optionIndex = showSelectAll ? selectedIndex - 1 : selectedIndex;
            if (optionIndex >= 0 && optionIndex < processedOptions.length) {
              handleOptionToggle(processedOptions[optionIndex].value);
            }
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          setSearchValue("");
          break;
        case ' ':
          if (selectedIndex >= 0) {
            event.preventDefault();
            if (selectedIndex === 0 && showSelectAll) {
              handleSelectAll();
            } else {
              const optionIndex = showSelectAll ? selectedIndex - 1 : selectedIndex;
              if (optionIndex >= 0 && optionIndex < processedOptions.length) {
                handleOptionToggle(processedOptions[optionIndex].value);
              }
            }
          }
          break;
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedIndex, processedOptions, selectedValues, showSelectAll]);
  
  const handleOptionToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };
  
  const handleSelectAll = () => {
    // Get all available options that are not disabled
    const allAvailableValues = options
      .filter(opt => !opt.disabled)
      .map(opt => opt.value);
    
    if (onSelectAll) {
      // Use the custom onSelectAll handler
      onSelectAll(allAvailableValues);
    } else {
      // Default behavior
      const areAllSelected = allAvailableValues.every(value => 
        selectedValues.includes(value)
      );
      
      if (areAllSelected) {
        // Deselect all
        onChange([]);
      } else {
        // Select all available options
        onChange(allAvailableValues);
      }
    }
  };
  
  const handleSort = () => {
    setSortOrder(getNextSortOrder(sortOrder));
  };
  
  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (onFocus && !isOpen) onFocus();
      if (onBlur && isOpen) onBlur();
    }
  };
  
  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return (
        <span className="text-gray-500 truncate">
          {placeholder}
        </span>
      );
    }
    
    // Show individual tags for selected items
    return (
      <div className="flex flex-wrap items-center gap-1 min-h-[20px] max-w-full">
        {selectedValues.map((value) => {
          const option = options.find(opt => opt.value === value);
          const displayLabel = option ? option.label : value;
          
          return (
            <span
              key={value}
              className="inline-flex items-center rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
            >
              {displayLabel}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOptionToggle(value);
                }}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>
    );
  };
  
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-gray-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };
  
  // Check if all available options are selected
  const availableOptions = options.filter(opt => !opt.disabled);
  const isAllSelected = availableOptions.length > 0 && 
    availableOptions.every(option => selectedValues.includes(option.value));
  
  const baseButtonClasses = "w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white text-left focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-gray-100";
  const buttonClasses = variant === 'compact' 
    ? `${baseButtonClasses} px-3 py-2 text-sm`
    : `${baseButtonClasses} px-4 py-2.5`;
  
  // Dynamic z-index based on context
  const dropdownZIndex = inModal ? 'z-[9999]' : 'z-[60]';
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        disabled={disabled}
        className={`${buttonClasses} ${
          selectedValues.length === 0 ? 'text-gray-500' : 'text-gray-900'
        } ${disabled ? 'cursor-not-allowed' : 'hover:bg-gray-50'} min-h-[42px] items-start`}
      >
        <div className="flex-1 min-w-0 py-1">
          {getDisplayText()}
        </div>
        <div className="flex-shrink-0 ml-2">
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className={`absolute ${dropdownZIndex} w-full bg-white border border-gray-200 rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 ${
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ zIndex: inModal ? 9999 : 60 }}
        >
          {/* Search box */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setSelectedIndex(-1);
                  }}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Select All and Sort header */}
          {(showSelectAll || showSort) && processedOptions.length > 0 && (
            <div className="flex items-center justify-between bg-teal-50 border-b border-gray-200">
              {/* Select All option */}
              {showSelectAll && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  onMouseEnter={() => setSelectedIndex(0)}
                  className={`flex-1 flex items-center px-3 py-2 text-sm transition-colors duration-150 focus:outline-none ${
                    selectedIndex === 0
                      ? "bg-teal-100 border-l-2 border-teal-500"
                      : "hover:bg-teal-100"
                  }`}
                >
                  <div className={`mr-3 h-4 w-4 rounded border-2 flex items-center justify-center ${
                    isAllSelected 
                      ? "bg-teal-600 border-teal-600" 
                      : "border-gray-300 bg-white"
                  }`}>
                    {isAllSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-teal-700 font-medium">{selectAllText}</span>
                </button>
              )}
              
              {/* Sort button */}
              {showSort && (
                <button
                  type="button"
                  onClick={handleSort}
                  className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-teal-100 hover:text-teal-700 transition-colors duration-150 focus:outline-none"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="ml-1 text-xs font-medium">
                    {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Options list */}
          <div className={`max-h-${maxVisibleOptions * 10} overflow-y-auto`}>
            {/* Individual options */}
            {processedOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
            ) : (
              processedOptions.map((option, index) => {
                const displayIndex = showSelectAll ? index + 1 : index;
                const isSelected = selectedValues.includes(option.value);
                const isHighlighted = selectedIndex === displayIndex;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && handleOptionToggle(option.value)}
                    onMouseEnter={() => !option.disabled && setSelectedIndex(displayIndex)}
                    disabled={option.disabled}
                    className={`w-full flex items-center px-3 py-2 text-sm transition-colors duration-150 focus:outline-none ${
                      isHighlighted && !option.disabled
                        ? "bg-gray-100 border-l-2 border-teal-500"
                        : !option.disabled
                          ? "hover:bg-gray-50"
                          : ""
                    } ${
                      option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                    } text-gray-600`}
                  >
                    <div className={`mr-3 h-4 w-4 rounded border-2 flex items-center justify-center ${
                      isSelected 
                        ? "bg-blue-600 border-blue-600" 
                        : "border-gray-300 bg-white"
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="flex-1 text-left">
                      {searchable && searchValue ? 
                        highlightMatch(option.label, searchValue) : 
                        option.label
                      }
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;