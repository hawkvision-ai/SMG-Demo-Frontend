import { ChevronDown, Search, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import type { FilterState } from "./types";

type DateFilterEnum = "today" | "this_week" | "this_month" | null;

interface DateFilterProps {
  dateFilter: DateFilterEnum;
  onDateFilterChange: (filter: DateFilterEnum) => void;
  filters: FilterState;
  onFilterChange: (filterType: keyof FilterState, value: any) => void;
  onResetFilters: () => void;
}

const DateFilter: React.FC<DateFilterProps> = ({
  dateFilter,
  onDateFilterChange,
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".date-filter-container")) {
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

  const handleQuickFilter = useCallback(
    (filter: DateFilterEnum) => {
      onDateFilterChange(filter);
      setIsOpen(false);
    },
    [onDateFilterChange],
  );

  const hasActiveFilters =
    dateFilter !== null ||
    filters.searchQuery ||
    filters.camera_name.length > 0 ||
    filters.status.length > 0 ||
    filters.user_email.length > 0;

  const getDisplayText = () => {
    if (dateFilter === "today") return "Today";
    if (dateFilter === "this_week") return "This Week";
    if (dateFilter === "this_month") return "This Month";
    return "All time";
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search logs..."
          value={filters.searchQuery}
          onChange={(e) => onFilterChange("searchQuery", e.target.value)}
          className="w-64 rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
        />
      </div>

      {/* Date Filter */}
      <div className="date-filter-container relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
            dateFilter
              ? "border-teal-300 bg-teal-50 text-teal-700"
              : "border-gray-300 text-gray-700"
          }`}
        >
          <span>{getDisplayText()}</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 z-50 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-xl">
            <div className="p-2">
              <button
                onClick={() => handleQuickFilter(null)}
                className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  dateFilter === null ? "bg-teal-50 text-teal-700" : "text-gray-700"
                }`}
              >
                All time
              </button>
              <button
                onClick={() => handleQuickFilter("today")}
                className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  dateFilter === "today" ? "bg-teal-50 text-teal-700" : "text-gray-700"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleQuickFilter("this_week")}
                className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  dateFilter === "this_week" ? "bg-teal-50 text-teal-700" : "text-gray-700"
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => handleQuickFilter("this_month")}
                className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  dateFilter === "this_month" ? "bg-teal-50 text-teal-700" : "text-gray-700"
                }`}
              >
                This Month
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </button>
      )}
    </div>
  );
};

export default DateFilter;
