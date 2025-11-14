import React from "react";
import { ChevronRight, ChevronDown, Pencil, ChevronLeft } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onBack: () => void;
  editLabel?: string;
  onEditClick?: () => void;
  disableBack?: boolean; // New prop to disable back button
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isDropdown?: boolean;
  details?: DetailIcon[];
}

export interface DetailIcon {
  icon?: React.ReactNode;
  value: string | number;
}

export function Breadcrumb({ 
  items, 
  onBack, 
  editLabel, 
  onEditClick, 
  disableBack = false, // Default to false
}: BreadcrumbProps) {
  return (
    <div className={cn("flex w-full items-center justify-between")}>
      {/* Left section: Back + Breadcrumb Items */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Back Arrow */}
        {onBack && (
          <Button 
            onClick={onBack} 
            disabled={disableBack}
            className={`text-gray-600 focus:outline-none ${
              disableBack 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-teal-100"
            }`}
          >
            <ChevronLeft size={20} />
          </Button>
        )}

        {/* Breadcrumb Items with Separator */}
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {/* Separator - You can replace '/' with <ChevronRight size={16} /> */}
            {idx !== 0 && <ChevronRight size={16} className="text-gray-400" />}

            <div className="flex items-center gap-1">
              <Button
                onClick={item.onClick}
                className="flex items-center gap-1 rounded p-1 font-medium text-gray-700 hover:bg-gray-100 focus:outline-none"
              >
                {item.icon && <span className="text-gray-600">{item.icon}</span>}
                {item.label}
                {item.isDropdown && <ChevronDown size={16} />}
              </Button>
            </div>

            {Array.isArray(item.details) && item.details.length > 0 && (
              <div className="ml-3 flex items-center gap-2">
                {item.details.map((detail, i) => (
                  <div key={i} className="flex items-center gap-1 text-sm text-gray-500">
                    {detail.icon}
                    <span>{detail.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Button */}
      {editLabel && onEditClick && (
        <Button
          onClick={onEditClick}
          className="flex items-center gap-2 rounded-md border border-teal-700 bg-white px-2 py-1.5 text-sm font-medium text-teal-700 shadow-sm transition-all duration-200 hover:bg-teal-700 hover:text-white hover:shadow-md"
        >
          <Pencil size={16} />
          {editLabel}
        </Button>
      )}
    </div>
  );
}