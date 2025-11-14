import Loading from "@/components/Loading";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Search, X, Settings } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import type { ColumnConfig, ConfigurationHistoryItem, FilterState } from "./types";

interface HistoryTableProps {
  data: ConfigurationHistoryItem[];
  allData?: ConfigurationHistoryItem[];
  columns: ColumnConfig[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onRowClick: (item: ConfigurationHistoryItem) => void;
  loading?: boolean;
  startIndex: number;
}

interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

interface DropdownState {
  [key: string]: boolean;
}

// Helper function to format timestamp for display (12-hour format)
const formatTimestampForDisplay = (timestamp: string): string => {
  if (!timestamp) return "No Time";
  try {
    const date = new Date(timestamp.replace(" ", "T"));
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    let hours = date.getHours();
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${period}`;
  } catch (error) {
    return timestamp;
  }
};

const HistoryTable: React.FC<HistoryTableProps> = ({
  data,
  allData,
  columns,
  filters,
  onFiltersChange,
  onRowClick,
  loading = false,
  startIndex,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: "timestamp",
    direction: "desc",
  });
  const [dropdownStates, setDropdownStates] = useState<DropdownState>({});
  const [autoApply, setAutoApply] = useState(true);

  // Get visible columns
  const visibleColumns = useMemo(() => {
    const visible = columns.filter((column) => column.visible);
    return visible;
  }, [columns]);

  // Get unique filter options from all data (not just current page)
  const getFilterOptions = useCallback(
    (columnKey: string): string[] => {
      const uniqueValues = new Set<string>();
      const sourceData = allData || data;
      sourceData.forEach((item) => {
        switch (columnKey) {
          case "changes":
            uniqueValues.add(item.changes);
            break;
          case "user":
            uniqueValues.add(item.user.name);
            break;
          case "site":
            uniqueValues.add(item.site);
            break;
          case "camera":
            uniqueValues.add(item.camera);
            break;
        }
      });
      return Array.from(uniqueValues).sort();
    },
    [data, allData],
  );

  // Apply sorting to data (filtering is now done in parent component)
  const sortedData = useMemo(() => {
    const sorted = [...data];

    // Apply sorting
    if (sortConfig.column && sortConfig.column !== "") {
      sorted.sort((a, b) => {
        let comparison = 0;

        switch (sortConfig.column) {
          case "timestamp": {
            // Parse timestamps accurately for sorting
            const dateA = new Date(a.timestamp.replace(" ", "T"));
            const dateB = new Date(b.timestamp.replace(" ", "T"));
            comparison = dateA.getTime() - dateB.getTime();
            break;
          }
          case "changes":
            comparison = a.changes.localeCompare(b.changes);
            break;
          case "user":
            comparison = a.user.name.localeCompare(b.user.name);
            break;
          case "site":
            comparison = a.site.localeCompare(b.site);
            break;
          case "camera":
            comparison = a.camera.localeCompare(b.camera);
            break;
          default:
            return 0;
        }

        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return sorted;
  }, [data, sortConfig]);

  // Dropdown handlers
  const handleDropdownToggle = useCallback((columnKey: string) => {
    setDropdownStates((prev) => ({
      ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
      [columnKey]: !prev[columnKey],
    }));
  }, []);

  const handleFilterChange = useCallback(
    (columnKey: string, values: string[]) => {
      const newFilters = { ...filters };

      switch (columnKey) {
        case "changes":
          newFilters.changes = values;
          break;
        case "user":
          newFilters.user = values;
          break;
        case "site":
          newFilters.site = values;
          break;
        case "camera":
          newFilters.camera = values;
          break;
      }

      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange],
  );

  const handleSort = useCallback((column: string, direction: "asc" | "desc") => {
    if (column === "") {
      setSortConfig({ column: "", direction: "asc" });
    } else {
      setSortConfig({ column, direction });
    }
  }, []);

  // Get current filter values
  const getCurrentFilterValues = useCallback(
    (columnKey: string): string[] => {
      switch (columnKey) {
        case "changes":
          return filters.changes;
        case "user":
          return filters.user;
        case "site":
          return filters.site;
        case "camera":
          return filters.camera;
        default:
          return [];
      }
    },
    [filters],
  );

  // Check if column has active filters
  const isColumnFiltered = useCallback(
    (columnKey: string): boolean => {
      return getCurrentFilterValues(columnKey).length > 0;
    },
    [getCurrentFilterValues],
  );

  // Render user with avatar
  const renderUser = (user: ConfigurationHistoryItem["user"]) => (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-200 text-xs font-medium text-purple-800">
        {user.initials}
      </div>
      <span className="text-sm text-gray-900">{user.name}</span>
    </div>
  );

  // Render cell content
  const renderCellContent = (item: ConfigurationHistoryItem, columnKey: string, index: number) => {
    switch (columnKey) {
      case "serial":
        return <span className="font-medium text-gray-700">{startIndex + index + 1}</span>;
      case "timestamp":
        return formatTimestampForDisplay(item.timestamp);
      case "changes":
        return item.changes;
      case "user":
        return renderUser(item.user);
      case "site":
        return item.site;
      case "camera":
        return item.camera;
      default:
        return "-";
    }
  };

  // Render table header
  const renderTableHeader = (column: ColumnConfig) => {
    // Serial number column - no sorting or filtering
    if (column.key === "serial") {
      return (
        <th
          key={column.key}
          className="border-r border-gray-300 bg-gray-100 px-4 py-3 text-center last:border-r-0"
          style={{ width: column.width }}
        >
          <span className="text-sm font-medium text-gray-700">{column.label}</span>
        </th>
      );
    }

    const hasFilter =
      column.filterable && ["changes", "user", "site", "camera"].includes(column.key);
    const isOpen = dropdownStates[column.key] || false;
    const isFiltered = isColumnFiltered(column.key);

    if (hasFilter) {
      return (
        <th
          key={column.key}
          className="relative border-r border-gray-300 bg-gray-100 px-4 py-3 text-left last:border-r-0"
        >
          <div className="dropdown-container relative">
            <button
              onClick={() => handleDropdownToggle(column.key)}
              className="flex cursor-pointer items-center gap-1 text-gray-700 hover:text-gray-900"
            >
              <span className="text-sm font-medium">{column.label}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""} ${isFiltered ? "text-teal-600" : ""}`}
              />
            </button>

            {isOpen && (
              <FilterDropdown
                options={getFilterOptions(column.key)}
                selectedValues={getCurrentFilterValues(column.key)}
                onSelectionChange={(values) => handleFilterChange(column.key, values)}
                onClose={() => handleDropdownToggle(column.key)}
                autoApply={autoApply}
                onAutoApplyChange={setAutoApply}
                columnKey={column.key}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            )}
          </div>
        </th>
      );
    } else {
      return (
        <th
          key={column.key}
          className="border-r border-gray-300 bg-gray-100 px-4 py-3 text-left last:border-r-0"
        >
          <span className="text-sm font-medium text-gray-700">{column.label}</span>
        </th>
      );
    }
  };

  if (loading) {
    return (
      <div className="h-full border border-gray-300 bg-white">
        <div className="flex h-full items-center justify-center">
          <Loading />
        </div>
      </div>
    );
  }

  // Check if no columns are visible
  if (visibleColumns.length === 0) {
    return (
      <div className="h-full border border-gray-300 bg-white">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">All Columns Hidden</h3>
              <p className="max-w-md text-sm text-gray-600">
                You have removed all columns from view. Please use the column manager (Settings icon) to select at least one column to display the data.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-auto border border-gray-300 bg-white"
      style={{ position: "relative" }}
    >
      <table className="w-full min-w-full">
        <thead className="sticky top-0 z-10">
          <tr className="relative border-b-2 border-gray-300">
            {visibleColumns.map(renderTableHeader)}
          </tr>
        </thead>
        <tbody className="bg-white">
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={visibleColumns.length}
                className="border-b border-gray-300 px-4 py-8 text-center text-gray-500"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <span>No configurations found</span>
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((item, index) => (
              <tr
                key={item.id}
                onClick={() => onRowClick(item)}
                className="cursor-pointer border-b border-gray-300 bg-white transition-colors hover:bg-gray-100"
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className="border-r border-gray-300 px-4 py-4 text-sm last:border-r-0"
                  >
                    {renderCellContent(item, column.key, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// Filter Dropdown Component
interface FilterDropdownProps {
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onClose: () => void;
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;
  columnKey: string;
  sortConfig: SortConfig;
  onSort: (column: string, direction: "asc" | "desc") => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  onClose,
  autoApply,
  onAutoApplyChange,
  columnKey,
  sortConfig,
  onSort,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tempExcludedValues, setTempExcludedValues] = useState<string[]>(selectedValues);
  const [sortAscending, setSortAscending] = useState(true);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setTempExcludedValues(selectedValues);
  }, [selectedValues]);

  // Add resize listener to reposition dropdown on screen size changes
  React.useEffect(() => {
    const handleResize = () => {
      if (dropdownRef.current) {
        // Trigger repositioning on resize
        const event = new Event("resize");
        window.dispatchEvent(event);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest(".dropdown-container")) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  React.useLayoutEffect(() => {
    if (dropdownRef.current) {
      const dropdown = dropdownRef.current;
      const table = dropdown.closest(".overflow-auto");

      // Reset styles
      dropdown.style.transform = "";
      dropdown.style.left = "";
      dropdown.style.right = "";
      dropdown.style.top = "";
      dropdown.style.bottom = "";
      dropdown.style.width = "";
      dropdown.style.maxWidth = "";
      dropdown.style.minWidth = "";

      const rect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Get table container bounds to avoid scrollbar overlap
      const tableRect = table ? table.getBoundingClientRect() : null;
      const rightBoundary = tableRect ? tableRect.right - 20 : viewportWidth - 20; // Account for scrollbar

      // Calculate responsive width based on screen size - reduced sizes
      let dropdownWidth = 200; // default 12.5rem - reduced from 16rem
      if (viewportWidth < 640) {
        dropdownWidth = Math.min(180, viewportWidth - 40); // smaller on mobile
      } else if (viewportWidth < 1024) {
        dropdownWidth = 190; // medium screens
      }

      dropdown.style.width = `${dropdownWidth}px`;
      dropdown.style.minWidth = "8rem"; // reduced from 10rem
      dropdown.style.maxWidth = `${Math.min(dropdownWidth, viewportWidth - 40)}px`;

      // Horizontal positioning - avoid scrollbar overlap
      if (rect.left + dropdownWidth > rightBoundary) {
        dropdown.style.right = "0";
        dropdown.style.left = "auto";
        // If still overlapping, shift further left
        if (rect.right > rightBoundary) {
          dropdown.style.right = `${Math.max(0, rect.right - rightBoundary + 10)}px`;
        }
      } else {
        dropdown.style.left = "0";
        dropdown.style.right = "auto";
      }

      // Vertical positioning
      if (rect.bottom > viewportHeight - 20) {
        dropdown.style.bottom = "100%";
        dropdown.style.top = "auto";
        dropdown.style.marginBottom = "4px";
        dropdown.style.marginTop = "0";
      } else {
        dropdown.style.top = "100%";
        dropdown.style.bottom = "auto";
        dropdown.style.marginTop = "4px";
        dropdown.style.marginBottom = "0";
      }
    }
  });

  const processedOptions = useMemo(() => {
    const filtered = options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered.sort((a, b) => {
      const comparison = a.localeCompare(b);
      return sortAscending ? comparison : -comparison;
    });
  }, [options, searchTerm, sortAscending]);

  const isAllSelected = processedOptions.every((opt) => !tempExcludedValues.includes(opt));
  const isAllUnselected = processedOptions.every((opt) => tempExcludedValues.includes(opt));

  const toggleOption = (value: string) => {
    const newExcluded = tempExcludedValues.includes(value)
      ? tempExcludedValues.filter((v) => v !== value)
      : [...tempExcludedValues, value];

    if (
      autoApply &&
      !tempExcludedValues.includes(value) &&
      newExcluded.length >= processedOptions.length
    ) {
      return;
    }

    setTempExcludedValues(newExcluded);

    if (autoApply) {
      onSelectionChange(newExcluded);
    }
  };

  const toggleSelectAll = () => {
    if (autoApply && isAllSelected) return;

    const newExcluded = isAllSelected ? processedOptions : [];
    setTempExcludedValues(newExcluded);

    if (autoApply) {
      onSelectionChange(newExcluded);
    }
  };

  const applyChanges = () => {
    if (isAllUnselected && !autoApply) return;
    onSelectionChange(tempExcludedValues);
    onClose();
  };

  const isSorted = sortConfig.column === columnKey;
  const sortableColumns = ["timestamp", "changes", "user", "site", "camera"];
  const isSortable = sortableColumns.includes(columnKey);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 z-[100] mt-1 rounded-md border border-gray-200 bg-white shadow-lg"
      style={{
        width: "12.5rem", // Reduced from 16rem - this will be overridden by useLayoutEffect
        minWidth: "8rem", // Reduced from 10rem
        maxWidth: "15rem", // Reduced from 20rem
      }}
    >
      {/* Column Sort Section */}
      {isSortable && (
        <div className="border-b border-gray-100 p-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const newDirection = sortConfig.direction === "asc" ? "desc" : "asc";
                onSort(columnKey, newDirection);
              }}
              className={`flex flex-1 items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
                isSorted
                  ? "border border-teal-200 bg-teal-50 text-teal-700"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              {sortConfig.direction === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              <span>Sort {sortConfig.direction === "asc" ? "A-Z" : "Z-A"}</span>
            </button>

            {isSorted && (
              <button
                onClick={() => onSort("", "asc")}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="border-b border-gray-100 p-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 transform text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded border border-gray-200 py-1 pr-2 pl-6 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between border-b border-gray-100 px-2 py-1">
        <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-600 hover:text-gray-800">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            className="h-3 w-3 rounded border-gray-300 bg-gray-100 text-teal-600 accent-teal-600 focus:ring-teal-500"
          />
          <span>Select All</span>
        </label>
        <button
          onClick={() => setSortAscending(!sortAscending)}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <ArrowUpDown className="h-3 w-3" />
        </button>
      </div>

      {/* Options */}
      <div className="max-h-40 overflow-y-auto">
        {processedOptions.length === 0 ? (
          <div className="px-2 py-2 text-xs text-gray-500">No options found</div>
        ) : (
          processedOptions.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={!tempExcludedValues.includes(option)}
                onChange={() => toggleOption(option)}
                className="h-3 w-3 rounded border-gray-300 bg-gray-100 text-teal-600 accent-teal-600 focus:ring-teal-500"
              />
              <span className="text-xs font-normal text-gray-600">{option}</span>
            </label>
          ))
        )}
      </div>

      {/* Apply Controls */}
      <div className="border-t border-gray-100">
        {!autoApply && (
          <div className="border-b border-gray-100 p-2">
            <button
              onClick={applyChanges}
              disabled={isAllUnselected}
              className={`w-full rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                isAllUnselected
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              }`}
            >
              Apply
            </button>
          </div>
        )}
        <div className="p-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-gray-600">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => onAutoApplyChange(e.target.checked)}
              className="h-3 w-3 rounded border-gray-300 bg-gray-100 text-teal-600 accent-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs">Auto Apply</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default HistoryTable;