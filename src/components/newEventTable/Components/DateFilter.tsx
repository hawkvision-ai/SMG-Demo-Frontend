import type { DateFilterEnum } from '@/api/types';
import { Calendar, Filter } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface DateFilterProps {
  dateRange: { start: string; end: string } | null;
  dateFilter: DateFilterEnum;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  onDateFilterChange: (dateFilter: DateFilterEnum) => void;
  isActive: boolean;
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({
  dateRange, dateFilter, onDateRangeChange, onDateFilterChange,
  isActive, autoApply, onAutoApplyChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState(dateRange);
  const [tempFilter, setTempFilter] = useState(dateFilter);

  useEffect(() => {
    setTempRange(dateRange);
    setTempFilter(dateFilter);
  }, [dateRange, dateFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.date-filter-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Quick filter handler - matches your backend: "today", "this_week", "this_month"
  const handleQuickFilter = useCallback((filter: DateFilterEnum) => {
    setTempFilter(filter);
    setTempRange(null); // Clear custom range when using quick filter

    // Apply immediately if auto-apply is enabled
    if (autoApply) {
      onDateFilterChange(filter);
    }
  }, [autoApply, onDateFilterChange]);

  // Custom range handler
  const handleCustomRange = useCallback((field: 'start' | 'end', value: string) => {
    const newRange = {
      start: field === 'start' ? value : (tempRange?.start || ''),
      end: field === 'end' ? value : (tempRange?.end || '')
    };

    setTempRange(newRange);
    setTempFilter(null); // Clear quick filter when using custom range

    // Auto-apply when both dates are set and auto-apply is enabled
    if (autoApply && newRange.start && newRange.end) {
      onDateRangeChange(newRange);
    }
  }, [tempRange, autoApply, onDateRangeChange]);

  const handleClear = useCallback(() => {
    setTempRange(null);
    setTempFilter(null);
    onDateRangeChange(null); // Always apply clear immediately
    onDateFilterChange(null);
    setIsOpen(false);
  }, [onDateRangeChange, onDateFilterChange]);

  const handleApply = useCallback(() => {
    if (tempFilter) {
      onDateFilterChange(tempFilter);
    } else if (tempRange && tempRange.start && tempRange.end) {
      onDateRangeChange(tempRange);
    }
    setIsOpen(false);
  }, [tempRange, tempFilter, onDateRangeChange, onDateFilterChange]);

  return (
    <div className="relative date-filter-container">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-xs text-gray-700 hover:text-gray-900 cursor-pointer"
        title="Filter by date"
      >
        {isActive ? (
          <Filter className="w-3 h-3 text-teal-600" />
        ) : (
          <Calendar className="w-3 h-3 text-gray-500" />
        )}
      </div>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50 text-xs ${document.querySelector('th:last-child .date-filter-container') ? '-right-6' : '-left-15'
          }`}>
          <div className={`absolute -top-1 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45 ${document.querySelector('th:last-child .date-filter-container') ? 'right-10' : 'left-6'
            }`} />
          <div className="p-2">
        {/* Quick Filters - matches your backend specification */}
            <div className="mb-3">
              <div className="text-xs text-gray-700 mb-1.5">Quick Filters</div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => handleQuickFilter("today")}
                  className={`px-2 py-1 text-xs font-normal rounded transition-colors ${
                    tempFilter === "today" 
                      ? 'bg-teal-100 text-teal-700 border border-teal-200' 
                      : 'bg-gray-50 hover:bg-teal-50 hover:text-teal-600'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleQuickFilter("yesterday")}
                  className={`px-2 py-1 text-xs font-normal rounded transition-colors ${
                    tempFilter === "yesterday" 
                      ? 'bg-teal-100 text-teal-700 border border-teal-200' 
                      : 'bg-gray-50 hover:bg-teal-50 hover:text-teal-600'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => handleQuickFilter("last_7_days")}
                  className={`px-2 py-1 font-normal text-xs rounded transition-colors ${
                    tempFilter === "last_7_days" 
                      ? 'bg-teal-100 text-teal-700 border border-teal-200' 
                      : 'bg-gray-50 hover:bg-teal-50 hover:text-teal-600'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleQuickFilter("last_30_days")}
                  className={`px-2 py-1 font-normal text-xs rounded transition-colors ${
                    tempFilter === "last_30_days" 
                      ? 'bg-teal-100 text-teal-700 border border-teal-200' 
                      : 'bg-gray-50 hover:bg-teal-50 hover:text-teal-600'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => handleQuickFilter("last_90_days")}
                  className={`px-2 py-1 font-normal text-xs rounded transition-colors ${
                    tempFilter === "last_90_days" 
                      ? 'bg-teal-100 text-teal-700 border border-teal-200' 
                      : 'bg-gray-50 hover:bg-teal-50 hover:text-teal-600'
                  }`}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={() => handleQuickFilter("last_365_days")}
                  className={`px-2 py-1 font-normal text-xs rounded transition-colors ${
                    tempFilter === "last_365_days" 
                      ? 'bg-teal-100 text-teal-700 border border-teal-200' 
                      : 'bg-gray-50 hover:bg-teal-50 hover:text-teal-600'
                  }`}
                >
                  Last 365 Days
                </button>
              </div>
            </div>
            {/* Custom Range */}
            <div className="mb-3">
              <div className="mb-2 text-xs text-gray-700">Custom Range</div>
              <div className="flex flex-row gap-1">
                <div className="flex flex-1 flex-col">
                  <label className="mb-1 text-xs text-gray-500">From</label>
                  <input
                    type="date"
                    value={tempRange?.start || ""}
                    onChange={(e) => handleCustomRange("start", e.target.value)}
                    max={tempRange?.end || ""}
                    className="w-full rounded border border-teal-200 px-1 py-1 text-xs font-normal focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:outline-none"
                  />
                </div>
                <div className="flex flex-1 flex-col">
                  <label className="mb-1 text-xs text-gray-500">To</label>
                  <input
                    type="date"
                    value={tempRange?.end || ""}
                    onChange={(e) => handleCustomRange("end", e.target.value)}
                    min={tempRange?.start || ""}
                    className="w-full rounded border border-teal-200 px-1 py-1 text-xs font-normal focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="border-t border-gray-100 pt-2">
              <div className="flex gap-1 mb-2">
                <button
                  onClick={handleClear}
                  className="flex-1 px-2 py-1 text-xs border border-gray-100 rounded hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                {!autoApply && (
                  <button
                    onClick={handleApply}
                    disabled={!tempFilter && (!tempRange?.start || !tempRange?.end)}
                    className="flex-1 px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
                  >
                    Apply
                  </button>
                )}
              </div>

              {/* Auto Apply Toggle */}
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => onAutoApplyChange(e.target.checked)}
                  className="w-3 h-3 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 accent-teal-600"
                />
                Auto Apply
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;