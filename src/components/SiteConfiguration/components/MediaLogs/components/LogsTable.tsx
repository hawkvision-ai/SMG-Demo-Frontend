import Loading from "@/components/Loading";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  Search,
  Settings,
  X,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import type { ColumnConfig, FilterState, MediaQueueLogItem, PaginationState } from "./types";

interface LogsTableProps {
  data: MediaQueueLogItem[];
  columns: ColumnConfig[];
  filters: FilterState;
  uniqueValues: {
    camera_name: string[];
    status: string[];
    user_email: string[];
  };
  onFilterChange: (filterType: keyof FilterState, value: any) => void;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  loading?: boolean;
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;
}

interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

interface DropdownState {
  [key: string]: boolean;
}

// Helper to format duration
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds === 0) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Helper to format timestamp
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return "-";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    let hours = date.getHours();
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${period}`;
  } catch {
    return timestamp;
  }
};

// Get filename from URL
const getFileName = (url: string): string => {
  try {
    const urlParts = url.split("/");
    return urlParts[urlParts.length - 1] || url;
  } catch {
    return url;
  }
};

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusColors: { [key: string]: string } = {
    queued: "bg-yellow-100 text-yellow-700",
    running: "bg-blue-100 text-blue-700",
    ready: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    completed: "bg-green-100 text-green-700",
  };

  const colorClass = statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-700";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};

// Filter dropdown component
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
  // Initialize with all options selected if no filters are applied
  const [tempSelectedValues, setTempSelectedValues] = useState<string[]>(
    selectedValues.length > 0 ? selectedValues : options
  );
  const [sortAscending, setSortAscending] = useState(true);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // If selectedValues is empty, default to all options selected
    setTempSelectedValues(selectedValues.length > 0 ? selectedValues : options);
  }, [selectedValues, options]);

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
      const rightBoundary = tableRect ? tableRect.right - 20 : viewportWidth - 20;

      // Calculate responsive width based on screen size
      let dropdownWidth = 200;
      if (viewportWidth < 640) {
        dropdownWidth = Math.min(180, viewportWidth - 40);
      } else if (viewportWidth < 1024) {
        dropdownWidth = 190;
      }

      dropdown.style.width = `${dropdownWidth}px`;
      dropdown.style.minWidth = "8rem";
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

  const isAllSelected = processedOptions.every((opt) => tempSelectedValues.includes(opt));
  const isNoneSelected = tempSelectedValues.length === 0;

  const toggleOption = (value: string) => {
    const newSelected = tempSelectedValues.includes(value)
      ? tempSelectedValues.filter((v) => v !== value)
      : [...tempSelectedValues, value];

    // Prevent deselecting all items in auto-apply mode
    if (autoApply && newSelected.length === 0) {
      return;
    }

    setTempSelectedValues(newSelected);

    if (autoApply) {
      onSelectionChange(newSelected);
    }
  };

  const toggleSelectAll = () => {
    // Prevent deselecting all in auto-apply mode
    if (autoApply && isAllSelected) return;

    const newSelected = isAllSelected ? [] : processedOptions;
    setTempSelectedValues(newSelected);

    if (autoApply) {
      onSelectionChange(newSelected);
    }
  };

  const applyChanges = () => {
    // Prevent applying when nothing is selected in manual mode
    if (isNoneSelected && !autoApply) return;
    onSelectionChange(tempSelectedValues);
    onClose();
  };

  const isSorted = sortConfig.column === columnKey;
  const sortableColumns = [
    "logged_at",
    "started_at",
    "completed_at",
    "camera_name",
    "status",
    "user_email",
    "duration_seconds",
  ];
  const isSortable = sortableColumns.includes(columnKey);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 z-[100] mt-1 rounded-md border border-gray-200 bg-white shadow-lg"
      style={{
        width: "12.5rem",
        minWidth: "8rem",
        maxWidth: "15rem",
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
                checked={tempSelectedValues.includes(option)}
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
              disabled={isNoneSelected}
              className={`w-full rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                isNoneSelected
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

const LogsTable: React.FC<LogsTableProps> = ({
  data,
  columns,
  filters,
  uniqueValues,
  onFilterChange,
  pagination,
  loading = false,
  autoApply,
  onAutoApplyChange,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: "logged_at",
    direction: "desc",
  });
  const [dropdownStates, setDropdownStates] = useState<DropdownState>({});

  const visibleColumns = useMemo(() => {
    return columns.filter((column) => column.visible);
  }, [columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.column || sortConfig.column === "") return data;

    const sorted = [...data].sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.column) {
        case "logged_at":
        case "started_at":
        case "completed_at":
          const dateA = new Date(a[sortConfig.column as keyof MediaQueueLogItem] as string);
          const dateB = new Date(b[sortConfig.column as keyof MediaQueueLogItem] as string);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case "duration_seconds":
          comparison = a.duration_seconds - b.duration_seconds;
          break;
        case "camera_name":
        case "status":
          const valA = (a[sortConfig.column as keyof MediaQueueLogItem] as string).toLowerCase();
          const valB = (b[sortConfig.column as keyof MediaQueueLogItem] as string).toLowerCase();
          comparison = valA.localeCompare(valB);
          break;
        case "user_email":
          comparison = a.user.email.localeCompare(b.user.email);
          break;
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortConfig]);

  const handleDropdownToggle = useCallback((columnKey: string) => {
    setDropdownStates((prev) => ({
      ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
      [columnKey]: !prev[columnKey],
    }));
  }, []);

  const handleSort = useCallback((column: string, direction: "asc" | "desc") => {
    if (column === "") {
      setSortConfig({ column: "", direction: "asc" });
    } else {
      setSortConfig({ column, direction });
    }
  }, []);

  const isColumnFiltered = (columnKey: string): boolean => {
    const filterKey = columnKey as keyof typeof filters;
    const filterValue = filters[filterKey];
    return Array.isArray(filterValue) && filterValue.length > 0;
  };

  const renderCellContent = (item: MediaQueueLogItem, columnKey: string, index: number) => {
    switch (columnKey) {
      case "serial":
        return (
          <span className="font-medium text-gray-700">
            {(pagination.currentPage - 1) * pagination.pageSize + index + 1}
          </span>
        );
      case "logged_at":
      case "started_at":
      case "completed_at":
        return formatTimestamp(item[columnKey]);
      case "camera_name":
        return item[columnKey];
      case "media_url":
        return (
          <div className="flex items-center gap-2">
            <span className="max-w-[150px] truncate text-sm" title={item.media_url}>
              {getFileName(item.media_url)}
            </span>
            <a
              href={item.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        );
      case "status":
        return <StatusBadge status={item.status} />;
      case "user_email":
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-200 text-xs font-medium text-purple-800">
              {item.user.initials}
            </div>
            <span className="text-sm text-gray-900">{item.user.email}</span>
          </div>
        );
      case "duration_seconds":
        return formatDuration(item.duration_seconds);
      case "message":
        return (
          <span className="max-w-[200px] truncate text-sm" title={item.message}>
            {item.message || "-"}
          </span>
        );
      default:
        return "-";
    }
  };

  const renderTableHeader = (column: ColumnConfig) => {
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

    const hasFilter = column.filterable;
    const isOpen = dropdownStates[column.key] || false;
    const isFiltered = isColumnFiltered(column.key);

    if (hasFilter) {
      return (
        <th
          key={column.key}
          className="relative border-r border-gray-300 bg-gray-100 px-4 py-3 text-left last:border-r-0"
          style={{ width: column.width }}
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
                options={uniqueValues[column.key as keyof typeof uniqueValues] || []}
                selectedValues={(filters[column.key as keyof FilterState] as string[]) || []}
                onSelectionChange={(values) =>
                  onFilterChange(column.key as keyof FilterState, values)
                }
                onClose={() => handleDropdownToggle(column.key)}
                autoApply={autoApply}
                onAutoApplyChange={onAutoApplyChange}
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
          style={{ width: column.width }}
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
                You have removed all columns from view. Please use the column manager (Settings
                icon) to select at least one column to display the data.
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
                  <span>No logs found</span>
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((item, index) => (
              <tr
                key={item.id}
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

export default LogsTable;