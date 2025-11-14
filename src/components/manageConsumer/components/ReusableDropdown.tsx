import { ChevronDown } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  isSelectAll?: boolean; // New property for select all option
}

interface ReusableDropdownProps {
  // Basic props
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;

  // Options
  options: DropdownOption[];

  // Search functionality
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  // Visual customization
  showSearchHeader?: boolean;
  searchHeaderText?: string;
  showAllOptionsHeader?: boolean;
  allOptionsHeaderText?: string;

  // Advanced features
  allowCustomValues?: boolean;
  customValueText?: string;
  maxVisibleOptions?: number;

  // Callbacks
  onFocus?: () => void;
  onBlur?: () => void;
  onSelectAll?: (allValues: string[]) => void; // New callback for select all

  // Dropdown positioning
  dropdownPosition?: "bottom" | "top";

  // Styling variants
  variant?: "default" | "compact";
}

const ReusableDropdown: React.FC<ReusableDropdownProps> = ({
  placeholder = "Select an option",
  value = "",
  onChange,
  disabled = false,
  className = "",
  options = [],
  searchable = false,
  searchValue = "",
  onSearchChange,
  showSearchHeader = false,
  searchHeaderText = "Matching Options",
  showAllOptionsHeader = false,
  allOptionsHeaderText = "All Available Options",
  allowCustomValues = false,
  customValueText = "Press Enter to add new option:",
  onFocus,
  onBlur,
  onSelectAll,
  dropdownPosition = "bottom",
  variant = "default",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [internalSearchValue, setInternalSearchValue] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use external search value if provided, otherwise use internal
  const currentSearchValue = searchable && onSearchChange ? searchValue : internalSearchValue;

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!currentSearchValue.trim()) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(currentSearchValue.toLowerCase()),
    );
  }, [options, currentSearchValue]);

  // Get all filtered options (no limitation by maxVisibleOptions for dropdown display)
  const visibleOptions = filteredOptions;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) => (prev < visibleOptions.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
          break;
        case "Enter":
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < visibleOptions.length) {
            handleOptionSelect(visibleOptions[selectedIndex].value);
          } else if (allowCustomValues && currentSearchValue.trim()) {
            handleCustomValueAdd();
          } else if (selectedIndex === -1 && visibleOptions.length > 0) {
            // Select first option if none is selected
            handleOptionSelect(visibleOptions[0].value);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedIndex, visibleOptions, currentSearchValue, allowCustomValues]);

  const handleOptionSelect = (optionValue: string) => {
    // Check if this is a select all option
    const selectedOption = options.find((opt) => opt.value === optionValue);
    if (selectedOption?.isSelectAll && onSelectAll) {
      // Get all non-select-all option values
      const allValues = options
        .filter((opt) => !opt.isSelectAll && !opt.disabled)
        .map((opt) => opt.value);
      onSelectAll(allValues);
    } else {
      onChange(optionValue);
    }

    setIsOpen(false);
    setSelectedIndex(-1);

    // Clear search if using internal search
    if (searchable && !onSearchChange) {
      setInternalSearchValue("");
    }
  };

  const handleCustomValueAdd = () => {
    if (currentSearchValue.trim()) {
      onChange(currentSearchValue.trim());
      setIsOpen(false);
      setSelectedIndex(-1);

      // Clear search
      if (onSearchChange) {
        onSearchChange("");
      } else {
        setInternalSearchValue("");
      }
    }
  };

  const handleSearchChange = (newValue: string) => {
    if (onSearchChange) {
      onSearchChange(newValue);
    } else {
      setInternalSearchValue(newValue);
    }
    setSelectedIndex(-1);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-gray-900">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (onFocus) onFocus();
    }
  };

  const handleInputBlur = () => {
    // Delay blur to allow for option selection
    setTimeout(() => {
      if (onBlur) onBlur();
    }, 150);
  };

  // Get selected option label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : searchable ? currentSearchValue : "";

  const baseInputClasses =
    "w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-gray-100";
  const inputClasses =
    variant === "compact"
      ? `${baseInputClasses} px-3 py-2 text-sm`
      : `${baseInputClasses} px-4 py-2.5`;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Input Field */}
      {searchable ? (
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            handleSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onClick={handleInputClick}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClasses} pr-10`}
          autoComplete="off"
        />
      ) : (
        <button
          type="button"
          onClick={handleInputClick}
          onBlur={handleInputBlur}
          disabled={disabled}
          className={`${inputClasses} pr-10 text-left ${!selectedOption && !value ? "text-gray-500" : ""}`}
        >
          {displayValue || placeholder}
        </button>
      )}

      {/* Dropdown Arrow */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen &&
        (filteredOptions.length > 0 ||
          currentSearchValue.trim() ||
          (!searchable && options.length > 0)) && (
          <div
            className="ring-opacity-5 absolute z-[70] mb-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black"
            style={
              dropdownPosition === "top" ? { bottom: "100%" } : { top: "100%", marginTop: "4px" }
            }
          >
            {/* Filtered/Matching Options */}
            {filteredOptions.length > 0 ? (
              <>
                {showSearchHeader && currentSearchValue.trim() && (
                  <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                    {searchHeaderText}
                  </div>
                )}

                {visibleOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 focus:outline-none ${
                      selectedIndex === index
                        ? "border-l-2 border-teal-500 bg-teal-100"
                        : index === 0 && selectedIndex === -1
                          ? "border-l-2 border-teal-400 bg-gray-100"
                          : "hover:bg-teal-50"
                    } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!option.disabled) {
                        handleOptionSelect(option.value);
                      }
                    }}
                    onMouseEnter={() => !option.disabled && setSelectedIndex(index)}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        option.isSelectAll
                          ? "bg-teal-500" // Special color for select all
                          : selectedIndex === index
                            ? "bg-teal-600"
                            : index === 0 && selectedIndex === -1
                              ? "bg-teal-500"
                              : "bg-gray-400"
                      }`}
                    />
                    <span
                      className={`flex-1 ${option.isSelectAll ? "font-medium text-teal-700" : ""}`}
                    >
                      {searchable && currentSearchValue
                        ? highlightMatch(option.label, currentSearchValue)
                        : option.label}
                    </span>
                    {(selectedIndex === index || (index === 0 && selectedIndex === -1)) && (
                      <span className="text-xs font-medium text-teal-600">↵</span>
                    )}
                  </button>
                ))}
              </>
            ) : currentSearchValue.trim() && allowCustomValues ? (
              /* Custom Value Option */
              <div className="px-3 py-3 text-sm">
                <div className="mb-1 text-gray-500">{customValueText}</div>
                <div className="flex items-center gap-2 font-medium text-gray-700">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />"{currentSearchValue.trim()}"
                  <span className="ml-auto text-xs font-medium text-blue-600">↵</span>
                </div>
              </div>
            ) : !searchable && options.length > 0 ? (
              /* All Available Options (non-searchable) */
              <>
                {showAllOptionsHeader && (
                  <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                    {allOptionsHeaderText}
                  </div>
                )}
                {visibleOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                      option.disabled ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!option.disabled) {
                        handleOptionSelect(option.value);
                      }
                    }}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        option.isSelectAll ? "bg-teal-500" : "bg-gray-400"
                      }`}
                    />
                    <span className={option.isSelectAll ? "font-medium text-teal-700" : ""}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </>
            ) : null}
          </div>
        )}
    </div>
  );
};

export default ReusableDropdown;
