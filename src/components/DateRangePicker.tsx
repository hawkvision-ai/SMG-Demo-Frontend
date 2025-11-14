// DateRangePicker.tsx
import React, { useState, useEffect } from 'react';
import { CalendarIcon } from "lucide-react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface DateRangePickerProps {
  fromDate: Date | undefined;
  toDate: Date | undefined;
  onFromDateChange: (date: Date | undefined) => void;
  onToDateChange: (date: Date | undefined) => void;
  onApplyDateRange: (fromDate: Date | undefined, toDate: Date | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onApplyDateRange,
  className
}: DateRangePickerProps) {
  const [isFromCalendarOpen, setIsFromCalendarOpen] = useState(false);
  const [isToCalendarOpen, setIsToCalendarOpen] = useState(false);
  
  // Internal state to track selected dates before applying
  const [tempFromDate, setTempFromDate] = useState<Date | undefined>(fromDate);
  const [tempToDate, setTempToDate] = useState<Date | undefined>(toDate);
  
  // Update internal state when props change
  useEffect(() => {
    setTempFromDate(fromDate);
    setTempToDate(toDate);
  }, [fromDate, toDate]);

  // Function to handle proper date selection (setting to start of day)
  const handleFromDateChange = (date: Date | Date[]) => {
    if (Array.isArray(date)) return;
    const adjustedDate = new Date(date);
    adjustedDate.setHours(0, 0, 0, 0); // Set to start of day
    setTempFromDate(adjustedDate);
    onFromDateChange(adjustedDate); 
    setIsFromCalendarOpen(false);
    
    // If to date is earlier than from date, reset to date
    if (tempToDate && tempToDate < adjustedDate) {
      setTempToDate(undefined);
      onToDateChange(undefined);
    }
  };

  const handleToDateChange = (date: Date | Date[]) => {
    if (Array.isArray(date)) return;
    const adjustedDate = new Date(date);
    adjustedDate.setHours(0, 0, 0, 0); // Set to start of day
    setTempToDate(adjustedDate);
    onToDateChange(adjustedDate);
    setIsToCalendarOpen(false);
  };

  // Only enable the Apply button when both dates are selected
  const canApply = tempFromDate && tempToDate;

  // Handle applying the date range
  const handleApplyDateRange = () => {
    if (canApply) {
      onApplyDateRange(tempFromDate, tempToDate);
    }
  };

  // Handle clearing all dates
  const handleClearDates = () => {
    setTempFromDate(undefined);
    setTempToDate(undefined);
    onFromDateChange(undefined);
    onToDateChange(undefined);
    onApplyDateRange(undefined, undefined);
  };

  // Helper function for className concatenation
  const classNames = (...classes: (string | undefined | boolean)[]) => {
    return classes.filter(Boolean).join(' ');
  };

  return (
    <div className={classNames("space-y-4", className)}>
      <div className={classNames("flex gap-2")}>
        {/* From Date */}
        <div className="relative flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">From</label>
          <button
            onClick={() => {
              setIsFromCalendarOpen(!isFromCalendarOpen);
              setIsToCalendarOpen(false); // Close the other calendar
            }}
            className={classNames(
              "flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none",
              !tempFromDate && "text-gray-400"
            )}
            type="button"
          >
            <span>
              {tempFromDate 
                ? tempFromDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) 
                : "Select date"}
            </span>
            <CalendarIcon className="h-4 w-4 opacity-70" />
          </button>
          
          {isFromCalendarOpen && (
            <div className="absolute z-50 mt-1">
              <div className="rounded-md bg-white p-1 shadow-lg">
                <Calendar
                  onChange={handleFromDateChange}
                  value={tempFromDate || new Date()}
                  maxDate={tempToDate}
                  className="border-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* To Date */}
        <div className="relative flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">To</label>
          <button
            onClick={() => {
              setIsToCalendarOpen(!isToCalendarOpen);
              setIsFromCalendarOpen(false); // Close the other calendar
            }}
            className={classNames(
              "flex h-9 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none",
              !tempToDate && "text-gray-400"
            )}
            type="button"
          >
            <span>
              {tempToDate 
                ? tempToDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) 
                : "Select date"}
            </span>
            <CalendarIcon className="h-4 w-4 opacity-70" />
          </button>
          
          {isToCalendarOpen && (
            <div className="absolute z-50 mt-1">
              <div className="rounded-md bg-white p-1 shadow-lg">
                <Calendar
                  onChange={handleToDateChange}
                  value={tempToDate || new Date()}
                  minDate={tempFromDate}
                  className="border-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleClearDates}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
          type="button"
        >
          Clear
        </button>
        
        <button
          onClick={handleApplyDateRange}
          disabled={!canApply}
          className={classNames(
            "rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500",
            canApply 
              ? "bg-teal-600 hover:bg-teal-700" 
              : "bg-gray-400 cursor-not-allowed"
          )}
          type="button"
        >
          Apply
        </button>
      </div>
    </div>
  );
}