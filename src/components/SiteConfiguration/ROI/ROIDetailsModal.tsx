import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronDown, ChevronUp } from "lucide-react";

interface ROIDetailsModalProps {
  open: boolean;
  roiName: string;
  selectedTagIds: string[];
  availableTags: { id: string; name: string }[];
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagToggle: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ROIDetailsModal: React.FC<ROIDetailsModalProps> = ({
  open,
  roiName,
  selectedTagIds,
  availableTags,
  onNameChange,
  onTagToggle,
  onSave,
  onCancel,
  isSubmitting = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on input field when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Handle clicking outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Get selected tag names for display
  const selectedTagNames = selectedTagIds
    .map((id) => availableTags.find((tag) => tag.id === id)?.name)
    .filter(Boolean);

  // Handle tag removal directly from the selection chips
  const handleRemoveTag = (tagId: string) => {
    onTagToggle(tagId);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold text-gray-800">
            ROI Details
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Enter the ROI name and select at least one functional tag to continue.
          </DialogDescription>
        </DialogHeader>

        {/* ROI Name */}
        <div className="mb-4">
          <label htmlFor="roi-name" className="mb-2 block text-sm font-medium text-gray-700">
            ROI Name
          </label>
          <Input
            id="roi-name"
            ref={inputRef}
            value={roiName}
            onChange={onNameChange}
            placeholder="Enter ROI name"
            className="w-full"
            disabled={isSubmitting}
          />
        </div>

        {/* Tag Selector - Redesigned */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Functional Tags</label>
            <button 
              type="button"
              onClick={() => setDropdownOpen(prev => !prev)}
              className="text-sm text-teal-600 hover:text-teal-700 flex items-center"
              disabled={availableTags.length === 0}
            >
              {dropdownOpen ? "Close" : "Select Tags"}
              {dropdownOpen ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
            </button>
          </div>

          {/* Selected Tags Display */}
          <div className="min-h-[40px] border border-gray-300 rounded-md p-2 mb-2">
            {selectedTagNames.length === 0 ? (
              <span className="text-gray-400">No tags selected</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedTagIds.map((tagId) => {
                  const tag = availableTags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  
                  return (
                    <span 
                      key={tagId}
                      className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-sm text-teal-700"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tagId)}
                        className="rounded-full hover:bg-teal-200 p-0.5"
                        disabled={isSubmitting}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tag Dropdown */}
          {dropdownOpen && (
            <div 
              ref={dropdownRef}
              className="border border-gray-300 rounded-md max-h-48 overflow-y-auto shadow-sm bg-white"
            >
              {availableTags.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No tags available</div>
              ) : (
                availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <div
                      key={tag.id}
                      onClick={() => onTagToggle(tag.id)}
                      className={`
                        flex items-center justify-between px-3 py-2 cursor-pointer
                        ${isSelected ? 'bg-teal-50 text-teal-700' : 'hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex items-center">
                        <div className={`
                          w-4 h-4 mr-2 flex items-center justify-center rounded border 
                          ${isSelected ? 'border-teal-500 bg-teal-500' : 'border-gray-300'}
                        `}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <span>{tag.name}</span>
                      </div>
                      {isSelected && <span className="text-xs text-teal-600">Selected</span>}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {selectedTagIds.length === 0 && (
            <div className="text-xs text-red-600 mt-1">At least one tag required.</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSubmitting || !roiName.trim() || selectedTagIds.length === 0}
            className="bg-teal-600 text-white hover:bg-teal-700"
            type="button"
          >
            {isSubmitting ? "Saving..." : "Save ROI"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};