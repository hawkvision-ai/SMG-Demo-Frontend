import { Check, Pencil, Search, SquarePen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ListBoxProps<T> = {
  title: string;
  items: T[];
  placeholder: string;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onSelect?: (index: number) => void;
  onItemClick?: (item: T) => void;
  onDelete?: (item: T) => void;
  addMode?: "inline" | "dropdown"; // default is undefined = legacy
  selectedItem?: T | null;
  selectedItems?: T[];
  getItemLabel: (item: T) => string;
  getItemId?: (item: T) => string | number;
  getItemColor?: (item: T) => string;
  onEditInlineId?: string | number | null;
  onEditStart?: (item: T) => void;
  onEditConfirm?: (item: T, newLabel: string) => void;
  emptyStateMessage?: string;
  maxHeight?: string;
  className?: string;
  searchable?: boolean;
  disabled?: boolean;
  isMultiSelect?: boolean;
  addOptions?: any[]; // For dropdown use only
  getAddOptionLabel?: (option: any) => string; // New prop
  onAddWithLabel?: (option: any) => void; // Modified to accept full option
  renderItem?: (item: T, index: number, selected: boolean) => React.ReactNode;
  renderChild?: (item: T) => React.ReactNode;
  isLoading?: boolean; // Added isLoading prop
};

export function ListBox<T>(props: ListBoxProps<T>) {
  const {
    title,
    items,
    placeholder,
    onAdd,
    onEdit,
    onSelect,
    onItemClick,
    onDelete,
    selectedItem,
    selectedItems = [],
    getItemLabel,
    getItemId,
    getItemColor,
    emptyStateMessage = "No items found",
    maxHeight = "",
    className = "",
    searchable = true,
    disabled = false,
    isMultiSelect = false,
    isLoading = false, // Add loading prop
  } = props;

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddDropdown(false);
      }
    };

    if (showAddDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddDropdown]);

  // Update filtered items when items change or search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter((item) => getItemLabel(item).toLowerCase().includes(query));
    setFilteredItems(filtered);
  }, [items, searchQuery, getItemLabel]);

  const selectedId = selectedItem && getItemId ? getItemId(selectedItem) : undefined;

  const handleAddClick = () => {
    if (disabled) return;

    if (props.addMode === "inline") {
      setAddingNew(true);
      setNewItemLabel("");
    } else if (props.addMode === "dropdown" && props.addOptions?.length && props.onAddWithLabel) {
      setShowAddDropdown((prev) => !prev);
    } else {
      props.onAdd?.(); // fallback (legacy)
    }
  };

  const handleInlineAddConfirm = () => {
    if (newItemLabel.trim() && props.onAddWithLabel) {
      props.onAddWithLabel(newItemLabel.trim());
      setNewItemLabel("");
      setAddingNew(false);
    }
  };

  const handleInlineAddCancel = () => {
    setNewItemLabel("");
    setAddingNew(false);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  // Function to check if item is selected
  const isItemSelected = (item: T) => {
    if (isMultiSelect && selectedItems && selectedItems.length > 0 && getItemId) {
      return selectedItems.some((selected) => getItemId(selected) === getItemId(item));
    }

    if (!selectedItem) return false;
    if (getItemId) {
      return getItemId(item) === selectedId;
    }
    return item === selectedItem;
  };

  return (
    <div
      className={`flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className} ${disabled ? "opacity-70" : ""}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>

        {onAdd && !disabled && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleAddClick}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                addingNew || showAddDropdown
                  ? "border border-teal-300 bg-teal-100 text-teal-800"
                  : "text-teal-600 hover:text-teal-800"
              }`}
              aria-label={`Add ${placeholder}`}
            >
              <SquarePen size={16} />
              {/* <span className="hidden sm:inline">Add</span> */}
            </button>

            {/* Dropdown */}
            {showAddDropdown && props.addOptions?.length && (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                {props.addOptions.map((option) => (
                  <button
                    key={props.getItemId ? props.getItemId(option) : JSON.stringify(option)}
                    onClick={() => {
                      props.onAddWithLabel?.(option);
                      setShowAddDropdown(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-teal-50"
                  >
                    {props.getAddOptionLabel ? props.getAddOptionLabel(option) : String(option)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Input */}
      {searchable && !(props.addMode === "inline" && addingNew) && (
        <div className="relative mb-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`Search ${placeholder}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="w-full rounded-md border border-gray-300 py-2 pr-8 pl-10 text-sm ring-teal-200 transition-all outline-none focus:ring-2 disabled:bg-gray-100"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              aria-label="Clear search"
            >
              <X size={16} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      )}

      {/* Selected Count (for multi-select) */}
      {isMultiSelect && selectedItems && selectedItems.length > 0 && (
        <div className="mb-2 text-xs font-medium text-teal-700">
          {selectedItems.length} {selectedItems.length === 1 ? "item" : "items"} selected
        </div>
      )}

      {/* Items List */}
      <div
        className={`flex flex-col gap-2 overflow-y-auto ${maxHeight} scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1`}
      >
        {/* Inline Add Input */}
        {props.addMode === "inline" && addingNew && (
          <div className="flex items-center gap-2 rounded-md border border-teal-300 bg-teal-50 px-3 py-2">
            <input
              type="text"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInlineAddConfirm();
                } else if (e.key === "Escape") {
                  handleInlineAddCancel();
                }
              }}
              placeholder={placeholder}
              autoFocus
              className="flex-1 rounded border border-teal-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-teal-200"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleInlineAddConfirm}
                className="rounded-full p-1 text-teal-600 hover:bg-teal-100 hover:text-teal-800"
                aria-label="Confirm add"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleInlineAddCancel}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cancel add"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  {isMultiSelect && <div className="h-4 w-4 rounded bg-gray-200"></div>}
                  <div className="h-4 w-32 rounded bg-gray-200"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gray-200"></div>
                </div>
              </div>
            </div>
          ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item, index) => {
            const label = getItemLabel(item);
            const itemId = getItemId ? getItemId(item) : index;
            const selected = isItemSelected(item);
            const itemColor = getItemColor && selected ? getItemColor(item) : undefined;

            const borderStyle = itemColor
              ? { borderLeftWidth: "4px", borderLeftColor: itemColor.replace("0.5", "0.8") }
              : {};

            return (
              <div key={String(itemId)} className="space-y-1">
                <div
                  onClick={() => {
                    if (disabled) return;
                    if (onItemClick) {
                      onItemClick(item);
                    } else if (onSelect) {
                      onSelect(items.indexOf(item));
                    }
                  }}
                  style={borderStyle}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-all ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${
                    selected
                      ? "border-teal-300 bg-teal-100 shadow-sm"
                      : "border border-gray-200 bg-gray-50 hover:border-teal-200 hover:bg-teal-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isMultiSelect && (
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? "border-teal-600 bg-teal-600" : "border-gray-300"}`}
                      >
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                    )}
                    {props.onEditInlineId === itemId ? (
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => setNewItemLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            props.onEditConfirm?.(item, newItemLabel);
                          } else if (e.key === "Escape") {
                            setNewItemLabel("");
                            props.onEditStart?.(item); // fallback to reset
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full rounded border border-teal-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="truncate text-sm font-medium text-gray-800">{label}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onEdit && !disabled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                        className="rounded-full p-1 text-gray-500 transition-colors hover:bg-teal-50 hover:text-teal-700"
                        aria-label={`Edit ${label}`}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {onDelete && !disabled && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item);
                        }}
                        className="rounded-full p-1 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${label}`}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Show dropdown or any child content under the selected item */}
                {selected && props.renderChild?.(item)}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-sm text-gray-500">
            <span>{emptyStateMessage}</span>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="mt-2 text-teal-600 hover:text-teal-800"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
