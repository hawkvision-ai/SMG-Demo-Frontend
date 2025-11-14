import { Calendar, Filter } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

interface DateFilterProps {
  dateRange: { start: string; end: string } | null;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  isActive: boolean;
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({
  dateRange,
  onDateRangeChange,
  isActive,
  autoApply,
  onAutoApplyChange,
  isOpen,
  onToggle,
}) => {
  const [tempRange, setTempRange] = useState(dateRange);

  useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest(".date-filter-container")) {
        onToggle(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onToggle]);

  // Quick filter handler with proper date formatting
  const handleQuickFilter = useCallback(
    (days: number) => {
      const today = new Date();

      if (days === 0) {
        // Today - set both start and end to today
        const todayString = today.toISOString().split("T")[0];
        const range = {
          start: todayString,
          end: todayString,
        };

        console.log("Quick Filter - Today:", range);
        setTempRange(range);

        if (autoApply) {
          onDateRangeChange(range);
        }
      } else {
        // For other ranges (This Week, This Month)
        const start = new Date();
        start.setDate(start.getDate() - days);

        const range = {
          start: start.toISOString().split("T")[0],
          end: today.toISOString().split("T")[0],
        };

        console.log("Quick Filter - Range:", { days, range });
        setTempRange(range);

        if (autoApply) {
          onDateRangeChange(range);
        }
      }
    },
    [autoApply, onDateRangeChange],
  );

  // Custom range handler
  const handleCustomRange = useCallback(
    (field: "start" | "end", value: string) => {
      const newRange = {
        start: field === "start" ? value : tempRange?.start || "",
        end: field === "end" ? value : tempRange?.end || "",
      };

      console.log("Custom Range Update:", { field, value, newRange });
      setTempRange(newRange);

      // Only auto-apply when both dates are set and auto-apply is enabled
      if (autoApply && newRange.start && newRange.end) {
        onDateRangeChange(newRange);
      }
    },
    [tempRange, autoApply, onDateRangeChange],
  );

  const handleClear = useCallback(() => {
    console.log("Clearing date filter");
    setTempRange(null);
    onDateRangeChange(null); // Always apply clear immediately
    onToggle(false);
  }, [onDateRangeChange, onToggle]);

  const handleApply = useCallback(() => {
    console.log("Applying date filter:", tempRange);

    // Apply the current temp range, even if only one date is set
    if (tempRange && (tempRange.start || tempRange.end)) {
      onDateRangeChange(tempRange);
    } else {
      // If both dates are empty, clear the filter
      onDateRangeChange(null);
    }
    onToggle(false);
  }, [tempRange, onDateRangeChange, onToggle]);

  const handleDropdownToggle = useCallback(() => {
    onToggle(!isOpen);
  }, [isOpen, onToggle]);

  return (
    <div className="date-filter-container relative">
      <button
        onClick={handleDropdownToggle}
        className="flex cursor-pointer items-center gap-1 text-gray-700 hover:text-gray-900"
        title="Filter by date"
      >
        {isActive ? (
          <Filter className="h-4 w-4 text-teal-600" />
        ) : (
          <Calendar className="h-4 w-4 text-gray-400 hover:text-gray-600" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full -right-6 z-[1000] mt-1 w-64 rounded border border-gray-100 bg-white text-xs shadow-sm">
          <div className="p-2">
            {/* Quick Filters */}
            <div className="mb-3">
              <div className="flex gap-1">
                <button
                  onClick={() => handleQuickFilter(0)}
                  className="rounded bg-gray-50 px-2 py-1 text-xs font-normal transition-colors hover:bg-teal-50 hover:text-teal-600"
                >
                  Today
                </button>
                <button
                  onClick={() => handleQuickFilter(7)}
                  className="rounded bg-gray-50 px-2 py-1 text-xs font-normal transition-colors hover:bg-teal-50 hover:text-teal-600"
                >
                  This Week
                </button>
                <button
                  onClick={() => handleQuickFilter(30)}
                  className="rounded bg-gray-50 px-2 py-1 text-xs font-normal transition-colors hover:bg-teal-50 hover:text-teal-600"
                >
                  This Month
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
              <div className="mb-2 flex gap-1">
                <button
                  onClick={handleClear}
                  className="flex-1 rounded border border-gray-100 px-2 py-1 text-xs transition-colors hover:bg-gray-50"
                >
                  Clear
                </button>
                {!autoApply && (
                  <button
                    onClick={handleApply}
                    className="flex-1 rounded bg-teal-600 px-2 py-1 text-xs text-white transition-colors hover:bg-teal-700"
                  >
                    Apply
                  </button>
                )}
              </div>

              {/* Auto Apply Toggle */}
              <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => onAutoApplyChange(e.target.checked)}
                  className="h-3 w-3 rounded border-gray-300 bg-gray-100 text-teal-600 accent-teal-600 focus:ring-2 focus:ring-teal-500"
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
