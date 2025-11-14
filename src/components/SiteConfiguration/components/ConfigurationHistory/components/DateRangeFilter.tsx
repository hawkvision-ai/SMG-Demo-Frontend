import { ChevronDown } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

type DateFilterEnum = "today" | "this_week" | "this_month" | null;

interface DateFilterProps {
  dateRange: { start: string; end: string } | null;
  dateFilter?: DateFilterEnum;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  onDateFilterChange?: (dateFilter: DateFilterEnum) => void;
  isActive: boolean;
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;
  displayText?: string;
}

// Helper function to generate date range from filter type
const generateDateRangeFromFilter = (filter: DateFilterEnum): { start: string; end: string } | null => {
  if (!filter) return null;

  // Get current date in local timezone
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let startDate: Date;
  let endDate: Date;

  switch (filter) {
    case "today":
      // Today: from today to today (Oct 15 to Oct 15)
      startDate = new Date(today);
      endDate = new Date(today);
      break;
    case "this_week":
      // This Week: from Sunday to Saturday of current week
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
      break;
    case "this_month":
      // This Month: from 1st to last day of current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Start of month
      
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
      break;
    default:
      return null;
  }

  // Format dates as YYYY-MM-DD in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatLocalDate(startDate),
    end: formatLocalDate(endDate),
  };
};

const DateFilter: React.FC<DateFilterProps> = ({
  dateRange,
  dateFilter = null,
  onDateRangeChange,
  onDateFilterChange,
  isActive,
  autoApply,
  onAutoApplyChange,
  displayText = "All time",
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
      const target = event.target as Element;
      const container = target.closest(".date-filter-container");

      if (!container) {
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Quick filter handler
  const handleQuickFilter = useCallback(
    (filter: DateFilterEnum) => {
      setTempFilter(filter);
      setTempRange(null); // Clear custom range when using quick filter

      // Apply immediately if auto-apply is enabled
      if (autoApply) {
        if (onDateFilterChange) {
          onDateFilterChange(filter);
        }
        
        // Generate and apply date range
        const range = generateDateRangeFromFilter(filter);
        if (range) {
          onDateRangeChange(range);
          setIsOpen(false);
        }
      }
    },
    [autoApply, onDateFilterChange, onDateRangeChange],
  );

  // Custom range handler
  const handleCustomRange = useCallback(
    (field: "start" | "end", value: string) => {
      const newRange = {
        start: field === "start" ? value : tempRange?.start || "",
        end: field === "end" ? value : tempRange?.end || "",
      };

      setTempRange(newRange);
      setTempFilter(null); // Clear quick filter when using custom range

      // Auto-apply when both dates are set and auto-apply is enabled
      if (autoApply && newRange.start && newRange.end) {
        onDateRangeChange(newRange);
        if (onDateFilterChange) {
          onDateFilterChange(null);
        }
      }
    },
    [tempRange, autoApply, onDateRangeChange, onDateFilterChange],
  );

  const handleClear = useCallback(() => {
    setTempRange(null);
    setTempFilter(null);
    onDateRangeChange(null); // Always apply clear immediately
    if (onDateFilterChange) {
      onDateFilterChange(null);
    }
    setIsOpen(false);
  }, [onDateRangeChange, onDateFilterChange]);

  const handleApply = useCallback(() => {
    if (tempFilter) {
      // Apply quick filter
      if (onDateFilterChange) {
        onDateFilterChange(tempFilter);
      }
      // Generate and apply date range for quick filters
      const range = generateDateRangeFromFilter(tempFilter);
      if (range) {
        onDateRangeChange(range);
      }
    } else if (tempRange && tempRange.start && tempRange.end) {
      // Apply custom range
      onDateRangeChange(tempRange);
      if (onDateFilterChange) {
        onDateFilterChange(null);
      }
    }
    setIsOpen(false);
  }, [tempRange, tempFilter, onDateRangeChange, onDateFilterChange]);

  return (
    <div className="date-filter-container relative">
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 ${
          isActive ? "border-teal-300 bg-teal-50 text-teal-700" : ""
        }`}
      >
        <span>{displayText}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-1 w-64 rounded-md border border-gray-200 bg-white text-xs shadow-xl">
          {/* Arrow pointer */}
          <div className="absolute -top-1 right-6 h-2 w-2 rotate-45 border-t border-l border-gray-200 bg-white" />

          <div className="p-2">
            {/* Quick Filters */}
            <div className="mb-3">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickFilter("today");
                  }}
                  className={`rounded px-2 py-1 text-xs font-normal transition-colors ${
                    tempFilter === "today"
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "bg-gray-50 hover:bg-teal-50 hover:text-teal-600"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickFilter("this_week");
                  }}
                  className={`rounded px-2 py-1 text-xs font-normal transition-colors ${
                    tempFilter === "this_week"
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "bg-gray-50 hover:bg-teal-50 hover:text-teal-600"
                  }`}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickFilter("this_month");
                  }}
                  className={`rounded px-2 py-1 text-xs font-normal transition-colors ${
                    tempFilter === "this_month"
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "bg-gray-50 hover:bg-teal-50 hover:text-teal-600"
                  }`}
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Custom Range */}
            <div className="mb-3">
              <div className="mb-2 text-xs text-gray-700">Custom Range</div>
              <div className="flex gap-1">
                <input
                  type="date"
                  value={tempRange?.start || ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleCustomRange("start", e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  max={tempRange?.end || ""}
                  className="w-full rounded border border-teal-200 px-1 py-1 text-xs font-normal focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={tempRange?.end || ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleCustomRange("end", e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  min={tempRange?.start || ""}
                  className="w-full rounded border border-teal-200 px-1 py-1 text-xs font-normal focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="border-t border-gray-100 pt-2">
              <div className="mb-2 flex gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs transition-colors hover:bg-gray-50"
                >
                  Clear
                </button>
                {!autoApply && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply();
                    }}
                    disabled={!tempFilter && (!tempRange?.start || !tempRange?.end)}
                    className="flex-1 rounded bg-teal-600 px-2 py-1 text-xs text-white transition-colors hover:bg-teal-700 disabled:bg-gray-300"
                  >
                    Apply
                  </button>
                )}
              </div>

              {/* Auto Apply Toggle */}
              <label
                className="flex cursor-pointer items-center gap-1 text-xs text-gray-600"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => {
                    e.stopPropagation();
                    onAutoApplyChange(e.target.checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3 w-3 rounded border-gray-300 bg-gray-100 text-teal-600 accent-teal-600 focus:ring-1 focus:ring-teal-500"
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