// CustomDropdown.tsx

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Type definition for dropdown option
 */
export type DropdownOption = {
  label: string;
  value: string;
};

/**
 * Props type definition for CustomDropdown component
 */
export interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: string;
  isSite?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
  hideLabel?: boolean;
}

/**
 * Reusable dropdown component for filters and selection
 */
const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select",
  width = "w-44",
  isSite = false,
  className = "",
  id,
  disabled = false,
  hideLabel = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find label for current value
  const getCurrentLabel = (): string => {
    // If no value is selected and hideLabel is true, return empty string
    if (!value && hideLabel) return "";
    
    // If value exists, find the corresponding label
    if (value) {
      const selectedOption = options.find(option => option.value === value);
      // Return the label if found, or empty string if hideLabel is true
      return selectedOption ? selectedOption.label : (hideLabel ? "" : placeholder);
    }
    
    // Default case - return placeholder
    return placeholder;
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (disabled) return;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div 
      className={`relative ${className}`} 
      ref={dropdownRef}
      id={id}
    >
      <button
        className={`flex items-center justify-between rounded-md border border-gray-200 bg-white py-1.5 px-3 ${width} text-black ${
          isSite ? 'text-base font-semibold' : 'text-sm'
        } shadow-sm transition hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        <span className="truncate">{getCurrentLabel()}</span>
        <ChevronDown 
          className={`ml-1 h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          aria-hidden="true"
        />
      </button>

      {isOpen && !disabled && (
        <div 
          className={`absolute left-0 z-50 mt-1 max-h-56 overflow-y-auto ${width} rounded-md border border-gray-200 bg-white shadow-md`}
          role="listbox"
        >
       
          
          {/* Map through provided options */}
          {options.map((option) => (
  <div
    key={option.value || 'empty-value'} 
    className={`cursor-pointer px-3 py-1.5 text-sm transition hover:bg-gray-100 ${
      value === option.value ? 'bg-gray-50 font-medium text-teal-600' : ''
    }`}
    onClick={() => {
      onChange(option.value);
      setIsOpen(false);
    }}
    role="option"
    aria-selected={value === option.value}
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(option.value);
        setIsOpen(false);
      }
    }}
  >
    {option.label}
  </div>
))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;