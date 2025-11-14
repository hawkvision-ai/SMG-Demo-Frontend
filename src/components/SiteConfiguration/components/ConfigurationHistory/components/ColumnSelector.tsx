import type { ColumnConfig } from "@/api/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

interface ColumnSelectorProps {
  columns: ColumnConfig[];
  onApply: (updatedColumns: ColumnConfig[]) => void;
  onResetColumns: () => void;
  onClose: () => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  onResetColumns,
  onApply,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local columns state
  useEffect(() => {
    setLocalColumns([...columns]);
    setHasChanges(false);
  }, [columns]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest(".column-manager-dropdown")) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Filter and sort columns - NOW INCLUDING serial number column
  const filteredAndSortedColumns = useMemo(() => {
    let filtered = localColumns.filter((column) =>
      column.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return filtered.sort((a, b) => {
      const comparison = a.label.localeCompare(b.label);
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [localColumns, searchTerm, sortOrder]);

  // Handle local column visibility change
  const handleLocalColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setLocalColumns((prev) =>
      prev.map((col) => (col.key === columnKey ? { ...col, visible } : col)),
    );
    setHasChanges(true);
  };

  // Check if all filtered columns are selected
  const allSelected = filteredAndSortedColumns.every((col) => col.visible);

  // Handle select all / deselect all
  const handleSelectAll = () => {
    const newVisibility = !allSelected;
    setLocalColumns((prev) =>
      prev.map((col) => {
        // Only update columns that match the current search
        const isInFilteredList = filteredAndSortedColumns.some(
          (filtered) => filtered.key === col.key,
        );
        if (isInFilteredList) {
          return { ...col, visible: newVisibility };
        }
        return col;
      }),
    );
    setHasChanges(true);
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Apply all changes - removed serial column forced visibility
  const handleApply = () => {
    onApply(localColumns);
    setHasChanges(false);
    onClose();
  };

  return (
    <div className="column-manager-dropdown absolute top-full right-0 z-50 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-xl">
      {/* Arrow pointer */}
      <div className="absolute -top-1 right-6 h-2 w-2 rotate-45 border-t border-l border-gray-200 bg-white" />

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
                onChange={(e) => handleLocalColumnVisibilityChange(column.key, e.target.checked)}
                className="h-3 w-3 accent-teal-600"
              />
              <span className="text-xs">{column.label}</span>
            </label>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t bg-gray-50 p-2">
        <button
          onClick={onResetColumns}
          className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-800"
        >
          Reset
        </button>

        <button
          onClick={handleApply}
          disabled={!hasChanges}
          className={`rounded px-3 py-1 text-xs ${
            hasChanges
              ? "bg-teal-600 text-white hover:bg-teal-700"
              : "cursor-not-allowed bg-gray-300 text-gray-500"
          }`}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default ColumnSelector;
