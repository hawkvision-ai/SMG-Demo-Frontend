import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, TrendingUp, BarChart3, ArrowUpDown, Check } from 'lucide-react';

interface CounterDropdownProps {
  counters: string[];
  selectedCounters: string[];
  counterDisplayTypes: Record<string, 'line' | 'bar'>;
  onCounterToggle: (counterName: string) => void;
  onDisplayTypeChange: (counterName: string, displayType: 'line' | 'bar') => void;
  onSelectAll: () => void;
  onUnselectAll: () => void;
  disabled?: boolean;
  autoApply?: boolean;
  onAutoApplyChange?: (autoApply: boolean) => void;
}

const CounterDropdown: React.FC<CounterDropdownProps> = ({
  counters,
  selectedCounters,
  counterDisplayTypes,
  onCounterToggle,
  onDisplayTypeChange,
  onSelectAll,
  onUnselectAll,
  disabled = false,
  autoApply = false,
  onAutoApplyChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);
  const [tempSelectedCounters, setTempSelectedCounters] = useState<string[]>(selectedCounters);
  const [tempDisplayTypes, setTempDisplayTypes] = useState<Record<string, 'line' | 'bar'>>(counterDisplayTypes);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Update temp state when props change
  useEffect(() => {
    setTempSelectedCounters(selectedCounters);
    setTempDisplayTypes(counterDisplayTypes);
  }, [selectedCounters, counterDisplayTypes]);


 const sortedCounters = [...counters]
  .filter(counter => counter.toLowerCase().includes(searchQuery.toLowerCase()))
  .sort((a, b) => sortAscending ? a.localeCompare(b) : b.localeCompare(a));

  // Check selection state for temp selections
  const allSelected = sortedCounters.length > 0 && sortedCounters.every(counter => tempSelectedCounters.includes(counter));
  const someSelected = tempSelectedCounters.length > 0 && !allSelected;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        // Reset temp values to last applied state when closing without applying (if not auto-apply)
        if (!autoApply) {
          setTempSelectedCounters(selectedCounters);
          setTempDisplayTypes(counterDisplayTypes);
        }
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, autoApply, selectedCounters, counterDisplayTypes]);

  const handleTempCounterToggle = (counterName: string) => {
    const newSelectedCounters = tempSelectedCounters.includes(counterName)
      ? tempSelectedCounters.filter(name => name !== counterName)
      : [...tempSelectedCounters, counterName];

    // In auto-apply mode, prevent unselecting the last counter
    if (autoApply && tempSelectedCounters.includes(counterName) && newSelectedCounters.length === 0) {
      return; // Don't allow unselecting the last counter in auto-apply mode
    }

    setTempSelectedCounters(newSelectedCounters);

    // Apply immediately if auto-apply is enabled
    if (autoApply) {
      onCounterToggle(counterName); // This handles both add and remove
    }
  };

  const handleTempDisplayTypeChange = (counterName: string, displayType: 'line' | 'bar') => {
    const newDisplayTypes = {
      ...tempDisplayTypes,
      [counterName]: displayType
    };
    
    setTempDisplayTypes(newDisplayTypes);

    // Apply immediately if auto-apply is enabled
    if (autoApply) {
      onDisplayTypeChange(counterName, displayType);
    }
  };

  const handleTempSelectAll = () => {
    // Determine what action we're taking
    const willUnselectAll = allSelected;
    const willSelectAll = !allSelected; // This includes both someSelected and noneSelected cases
    
    const newSelectedCounters = willUnselectAll ? [] : sortedCounters;

    // In auto-apply mode, prevent unselecting all (but allow selecting all)
    if (autoApply && willUnselectAll) {
      return; // Don't allow unselecting all in auto-apply mode
    }

    setTempSelectedCounters(newSelectedCounters);

    // Apply immediately if auto-apply is enabled
    if (autoApply) {
      if (willSelectAll) {
        onSelectAll();
      } else {
        onUnselectAll();
      }
    }
  };

  const handleSetAllToLine = () => {
    const newDisplayTypes: Record<string, 'line' | 'bar'> = {};
    sortedCounters.forEach(counter => {
      newDisplayTypes[counter] = 'line';
    });
    const updatedDisplayTypes = { ...tempDisplayTypes, ...newDisplayTypes };
    
    setTempDisplayTypes(updatedDisplayTypes);

    // Apply immediately if auto-apply is enabled
    if (autoApply) {
      sortedCounters.forEach(counter => {
        if (counterDisplayTypes[counter] !== 'line') {
          onDisplayTypeChange(counter, 'line');
        }
      });
    }
  };

  const handleSetAllToBar = () => {
    const newDisplayTypes: Record<string, 'line' | 'bar'> = {};
    sortedCounters.forEach(counter => {
      newDisplayTypes[counter] = 'bar';
    });
    const updatedDisplayTypes = { ...tempDisplayTypes, ...newDisplayTypes };
    
    setTempDisplayTypes(updatedDisplayTypes);

    // Apply immediately if auto-apply is enabled
    if (autoApply) {
      sortedCounters.forEach(counter => {
        if (counterDisplayTypes[counter] !== 'bar') {
          onDisplayTypeChange(counter, 'bar');
        }
      });
    }
  };

  const handleApply = () => {
    // Apply changes to parent component
    tempSelectedCounters.forEach(counter => {
      if (!selectedCounters.includes(counter)) {
        onCounterToggle(counter);
      }
    });

    selectedCounters.forEach(counter => {
      if (!tempSelectedCounters.includes(counter)) {
        onCounterToggle(counter);
      }
    });

    Object.entries(tempDisplayTypes).forEach(([counter, displayType]) => {
      if (counterDisplayTypes[counter] !== displayType) {
        onDisplayTypeChange(counter, displayType);
      }
    });

    setIsOpen(false);
    setSearchQuery('');
  };

  const hasChanges = 
    JSON.stringify(tempSelectedCounters.sort()) !== JSON.stringify(selectedCounters.sort()) ||
    JSON.stringify(tempDisplayTypes) !== JSON.stringify(counterDisplayTypes);

  // Check if Apply button should be disabled (when no counters are selected in non-auto mode)
  const isApplyDisabled = !autoApply && tempSelectedCounters.length === 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <span className="text-sm font-medium text-gray-700 mr-2">Counters:</span>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-1.5 shadow-sm bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:ring-2 focus:ring-teal-500"
        disabled={disabled}
      >
        <span>{selectedCounters.length} selected</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-60 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-1">
              <div className=" p-1">
    <input
      type="text"
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full px-2 py-0.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
    />
  </div>

            {/* Select All Checkbox with Sort Toggle */}
            <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100 mb-1">
              <label className="flex items-center hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleTempSelectAll}
                  className="mr-2 accent-teal-600"
                />
                <span className="text-sm font-medium">
                  Select All
                </span>
              </label>
              
              <button
                onClick={() => setSortAscending(!sortAscending)}
                className="p-1 hover:bg-gray-100 rounded"
                title={`Sort ${sortAscending ? 'Z-A' : 'A-Z'}`}
              >
                <ArrowUpDown className="w-3 h-3 text-gray-500" />
              </button>
            </div>

            {/* Bulk Display Type Controls */}
            <div className="flex gap-2 mb-2 px-2">
              <button
                onClick={handleSetAllToLine}
                className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
              >
                <TrendingUp className="w-3 h-3" />
                All Lines
              </button>
              <button
                onClick={handleSetAllToBar}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded border border-orange-200"
              >
                <BarChart3 className="w-3 h-3" />
                All Bars
              </button>
            </div>

            {/* Counter List */}
            <div className="max-h-35 overflow-y-auto mb-3">
              {sortedCounters.map(counter => (
                <div key={counter} className="flex items-center justify-between px-2 py-1 hover:bg-gray-50 rounded">
                  <label className="flex items-center cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={tempSelectedCounters.includes(counter)}
                      onChange={() => handleTempCounterToggle(counter)}
                      className="mr-2 accent-teal-600 flex-shrink-0"
                    />
                    <span className="text-sm truncate">{counter}</span>
                  </label>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleTempDisplayTypeChange(counter, 'line')}
                      className={`p-1 rounded transition-colors ${
                        tempDisplayTypes[counter] === 'line' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                      title="Line chart"
                    >
                      <TrendingUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleTempDisplayTypeChange(counter, 'bar')}
                      className={`p-1 rounded transition-colors ${
                        tempDisplayTypes[counter] === 'bar' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                      title="Bar chart"
                    >
                      <BarChart3 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply Controls - Similar to TableHeaderDropdown */}
            <div className="border-t border-gray-100">
              {!autoApply && (
                <div className="p-2 border-b border-gray-100">
                  <button
                    onClick={handleApply}
                    disabled={isApplyDisabled}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-0.5 rounded-md text-sm font-medium transition-colors ${
                      isApplyDisabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                    title={isApplyDisabled ? 'Cannot apply when no counters are selected' : 'Apply changes'}
                  >
                    <Check className="w-4 h-4" />
                    Apply 
                  </button>
                </div>
              )}
              
              {/* Auto Apply Option - Below Apply button */}
              {onAutoApplyChange && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounterDropdown;