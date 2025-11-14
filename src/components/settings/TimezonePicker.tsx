// src/components/TimezonePicker.tsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Search, Clock, ChevronDown } from "lucide-react";

export interface TimezoneOption {
  label: string;
  value: string;
  offset?: string;
}

interface TimezonePickerProps {
  value: string;
  onChange: (value: string) => void;
  timezones: TimezoneOption[];
  label?: string;
  required?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  helpText?: string;
  className?: string;
  labelClassName?: string;
  iconClassName?: string;
}

const TimezonePicker: React.FC<TimezonePickerProps> = ({
  value,
  onChange,
  timezones,
  label = "Timezone",
  required = false,
  isLoading = false,
  loadingText = "Saving...",
  helpText = "System time will be displayed according to this timezone",
  className = "",
  labelClassName = "",
  iconClassName = "",
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter timezones based on search
  const filteredTimezones = useMemo(() => {
    if (!searchTerm.trim()) return timezones;
    return timezones.filter(
      (tz) =>
        tz.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tz.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tz.offset && tz.offset.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, timezones]);

  // Selected timezone label
  const selectedTimezone = useMemo(() => {
    return timezones.find((tz) => tz.value === value)?.label || "Select timezone...";
  }, [value, timezones]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="timezone" className={`flex items-center gap-2 ${labelClassName}`}>
          <Clock className={`w-4 h-4 text-gray-500 ${iconClassName}`} />
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      {/* Custom timezone dropdown with search */}
      <div className="relative" ref={dropdownRef}>
        {/* Dropdown trigger button */}
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between border border-gray-300 rounded-md h-10 px-3 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <div className="truncate">{selectedTimezone.split(" ")[0]}</div>
          <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
        </button>

        {/* Dropdown menu */}
        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md border border-gray-200 overflow-hidden">
            {/* Search input */}
            <div className="sticky top-0 z-10 bg-white p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search timezone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Timezone list */}
            <div className="max-h-52 overflow-y-auto py-1">
              {filteredTimezones.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No matching timezones found</div>
              ) : (
                filteredTimezones.map((tz) => (
                  <button
                    key={tz.value}
                    type="button"
                    onClick={() => {
                      onChange(tz.value);
                      setShowDropdown(false);
                      setSearchTerm("");
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                      value === tz.value ? "bg-gray-50 font-medium" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{tz.label.split(" ")[0]}</span>
                      {tz.offset && <span className="text-gray-500 text-xs">{tz.offset}</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-1 text-xs text-teal-600 mt-1">
          <div className="h-3 w-3 rounded-full border-2 border-teal-600 border-r-transparent animate-spin" />
          <span>{loadingText}</span>
        </div>
      )}

      {/* Help text */}
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
    </div>
  );
};

export default TimezonePicker;