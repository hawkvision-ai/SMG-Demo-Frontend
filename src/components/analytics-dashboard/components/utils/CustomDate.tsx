import { TimePeriodEnum } from "@/api/types";
import { Calendar, Filter } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

interface DateFilterProps {
  dateRange: { start: string; end: string } | null;
  dateFilter: TimePeriodEnum | null;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  onDateFilterChange: (dateFilter: TimePeriodEnum | null) => void;
  isActive: boolean;
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({
  dateRange,
  dateFilter,
  onDateRangeChange,
  onDateFilterChange,
  isActive,
  autoApply,
  onAutoApplyChange,
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
      if (!(event.target as Element).closest(".date-filter-container")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Quick filter handler - using your TimePeriodEnum values
  const handleQuickFilter = useCallback(
    (filter: TimePeriodEnum) => {
      setTempFilter(filter);
      setTempRange(null); // Clear custom range when using quick filter

      // Apply immediately if auto-apply is enabled
      if (autoApply) {
        onDateFilterChange(filter);
      }
    },
    [autoApply, onDateFilterChange],
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
      }
    },
    [tempRange, autoApply, onDateRangeChange],
  );

  const handleClear = useCallback(() => {
    // Only clear the custom date range, keep the predefined filter intact
    setTempRange(null);
    onDateRangeChange(null); // Clear the custom range
    // Don't clear tempFilter or call onDateFilterChange to preserve predefined selections
  }, [onDateRangeChange]);

  const handleApply = useCallback(() => {
    if (tempFilter) {
      onDateFilterChange(tempFilter);
    } else if (tempRange && tempRange.start && tempRange.end) {
      onDateRangeChange(tempRange);
    }
    setIsOpen(false);
  }, [tempRange, tempFilter, onDateRangeChange, onDateFilterChange]);

  // Get display text for the current selection
  const getDisplayText = useCallback(() => {
    if (dateRange && dateRange.start && dateRange.end) {
      if (dateRange.start === dateRange.end) {
        return new Date(dateRange.start).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
      const startDate = new Date(dateRange.start).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endDate = new Date(dateRange.end).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `${startDate} - ${endDate}`;
    }

    if (dateFilter) {
      switch (dateFilter) {
        case TimePeriodEnum.TODAY:
          return "Today";
        case TimePeriodEnum.YESTERDAY:
          return "Yesterday";
        case TimePeriodEnum.WEEKLY:
          return "Last 7 Days";
        case TimePeriodEnum.MONTHLY:
          return "Last 30 Days";
        case TimePeriodEnum.QUARTERLY:
          return "Last 90 Days";
        case TimePeriodEnum.YEARLY:
          return "Last 365 Days";
        default:
          return "Date Range";
      }
    }

    return "Date Range";
  }, [dateRange, dateFilter]);

  // Check if custom range is being used (for showing Clear button)
  const hasCustomRange = tempRange && (tempRange.start || tempRange.end);

  return (
    <div className="date-filter-container relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
          isActive
            ? "border-teal-300 bg-teal-50 text-gray-700 hover:bg-teal-100"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
        title="Filter by date"
      >
        {isActive ? (
          <Filter className="h-4 w-4 text-gray-600" />
        ) : (
          <Calendar className="h-4 w-4 text-gray-500" />
        )}
        <span className="font-medium">{getDisplayText()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2">
            {/* Quick Filters - using your TimePeriodEnum values */}
            <div className="mb-4">
              <div className="mb-2 text-sm font-medium text-gray-700">Quick Filters</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickFilter(TimePeriodEnum.TODAY)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    tempFilter === TimePeriodEnum.TODAY
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-600"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleQuickFilter(TimePeriodEnum.YESTERDAY)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    tempFilter === TimePeriodEnum.YESTERDAY
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-600"
                  }`}
                >
                Yesterday
                </button>
                <button
                  onClick={() => handleQuickFilter(TimePeriodEnum.WEEKLY)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    tempFilter === TimePeriodEnum.WEEKLY
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-600"
                  }`}
                >
                 Last 7 Days
                </button>
                <button
                  onClick={() => handleQuickFilter(TimePeriodEnum.MONTHLY)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    tempFilter === TimePeriodEnum.MONTHLY
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-600"
                  }`}
                >
                Last 30 Days
                </button>
                <button
                  onClick={() => handleQuickFilter(TimePeriodEnum.QUARTERLY)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    tempFilter === TimePeriodEnum.QUARTERLY
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-600"
                  }`}
                >
                Last 90 Days
                </button>
                <button
                  onClick={() => handleQuickFilter(TimePeriodEnum.YEARLY)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    tempFilter === TimePeriodEnum.YEARLY
                      ? "border border-teal-200 bg-teal-100 text-teal-700"
                      : "bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-600"
                  }`}
                >
                Last 365 Days
                </button>
              </div>
            </div>

            {/* Custom Range */}
            <div className="mb-4">
              <div className="mb-2 text-sm font-medium text-gray-700">Custom Range</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-600">From</label>
                  <input
                    type="date"
                    value={tempRange?.start || ""}
                    onChange={(e) => handleCustomRange("start", e.target.value)}
                    max={tempRange?.end || ""}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-600">To</label>
                  <input
                    type="date"
                    value={tempRange?.end || ""}
                    onChange={(e) => handleCustomRange("end", e.target.value)}
                    min={tempRange?.start || ""}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="border-t border-gray-200 pt-4">
              <div className="mb-3 flex gap-2">
                {/* Clear button - only show when custom range is being used */}
                {hasCustomRange && (
                  <button
                    onClick={handleClear}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Clear
                  </button>
                )}
                {!autoApply && (
                  <button
                    onClick={handleApply}
                    disabled={!tempFilter && (!tempRange?.start || !tempRange?.end)}
                    className={`${hasCustomRange ? "flex-1" : "w-full"} rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-300`}
                  >
                    Apply
                  </button>
                )}
              </div>

              {/* Auto Apply Toggle */}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => onAutoApplyChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500"
                />
                Auto Apply Changes
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;
