import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { ColumnConfig } from "./types";

interface ColumnSelectorProps {
  columns: ColumnConfig[];
  onColumnVisibilityChange: (columnKey: string, visible: boolean) => void;
  onColumnReorder: (columns: ColumnConfig[]) => void;
  showColumnManager: boolean;
  setShowColumnManager: (show: boolean) => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  onColumnVisibilityChange,
  showColumnManager,
  setShowColumnManager,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest(".column-manager-dropdown")) {
        setShowColumnManager(false);
      }
    };

    if (showColumnManager) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColumnManager, setShowColumnManager]);

  // Filter and sort columns
  const filteredAndSortedColumns = useMemo(() => {
    let filtered = columns.filter((column) =>
      column.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return filtered.sort((a, b) => {
      const comparison = a.label.localeCompare(b.label);
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [columns, searchTerm, sortOrder]);

  const allSelected = filteredAndSortedColumns.every((col) => col.visible);

  const handleSelectAll = () => {
    const newVisibility = !allSelected;
    filteredAndSortedColumns.forEach((col) => {
      onColumnVisibilityChange(col.key, newVisibility);
    });
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowColumnManager(!showColumnManager)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Settings className="h-4 w-4" />
        Columns
      </button>

      {showColumnManager && (
        <div className="column-manager-dropdown absolute top-full right-0 z-50 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="rounded-t border-b bg-gray-50 p-3">
            <h3 className="text-sm font-semibold text-gray-800">Manage Columns</h3>
          </div>

          {/* Search */}
          <div className="border-b p-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded border border-teal-400 px-2 py-1 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between border-b p-2">
            <button
              onClick={toggleSort}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
            >
              {sortOrder === "asc" ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {sortOrder === "asc" ? "A-Z" : "Z-A"}
            </button>

            <button onClick={handleSelectAll} className="text-xs text-teal-600 hover:text-teal-800">
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Column List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredAndSortedColumns.length === 0 ? (
              <div className="p-2 text-xs text-gray-500">No columns found</div>
            ) : (
              filteredAndSortedColumns.map((column) => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 p-2 hover:bg-teal-50"
                >
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={(e) => onColumnVisibilityChange(column.key, e.target.checked)}
                    className="h-3 w-3 accent-teal-600"
                  />
                  <span className="text-xs">{column.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;
