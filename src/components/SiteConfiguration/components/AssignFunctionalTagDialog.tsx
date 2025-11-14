import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";

type FunctionalTag = {
    id: string;
    name: string;
};

type AssignFunctionalTagDialogProps = {
    open: boolean;
    onClose: () => void;
    tags: FunctionalTag[];
    assignedTagIds: string[]; // IDs already assigned to this ROI
    selected: string[]; // IDs currently selected in the dialog
    setSelected: (ids: string[]) => void;
    onAssign: (ids: string[]) => void | Promise<void>;
    onDelete: (id: string) => void | Promise<void>;
    mode: "assign" | "add";
    loading?: boolean;
};

export function AssignFunctionalTagDialog({
    open,
    onClose,
    tags,
    assignedTagIds,
    selected,
    setSelected,
    onAssign,
    mode,
    loading,
    onDelete
}: AssignFunctionalTagDialogProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown if clicked outside
    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [dropdownOpen]);

    // Keyboard: Esc closes dialog
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const isTagAssigned = (id: string) => assignedTagIds.includes(id);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Filter tags based on search query
    const filteredTags = tags.filter(tag => 
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
        aria-labelledby="tag-dialog-title"
      >
        {/* Dialog overlay with subtle animation */}
        <div 
          className="absolute inset-0 bg-black/40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
    
        {/* Dialog panel */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
          <div className="mb-5">
            <h2 
              id="tag-dialog-title" 
              className="text-xl font-semibold text-gray-800"
            >
              {mode === "assign" ? "Assign Functional Tag(s)" : "Add More Functional Tag(s)"}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {mode === "assign"
                ? "This ROI doesn't have any functional tags yet. Please assign at least one."
                : "Select additional functional tags to add to this ROI."}
            </p>
          </div>
    
          {/* Currently assigned tags section */}
          {mode === "add" && assignedTagIds.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-medium text-gray-500 mb-2">
                Already assigned:
              </div>
              <div className="flex flex-wrap gap-2">
                {assignedTagIds.map((id) => {
                  const tag = tags.find((t) => t.id === id);
                  return tag ? (
                    <span
                      key={id}
                      className="bg-gray-100 text-gray-700 rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1 group transition-colors"
                    >
                      {tag.name}
                      <button
                        type="button"
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-red-300"
                        onClick={(e) => {
                          e.preventDefault();
                          onDelete(id);
                        }}
                        aria-label={`Remove ${tag.name} tag`}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="14" 
                          height="14" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
    
          {/* Multi-select dropdown */}
          <div className="relative mb-6" ref={dropdownRef}>
            <label 
              id="tag-select-label" 
              className="block text-xs font-medium text-gray-500 mb-2"
            >
              Select tags:
            </label>
            
            <Button
              type="button"
              className={`w-full min-h-[46px] flex flex-wrap items-center gap-2 border rounded-lg px-4 py-2 text-left transition focus:ring-2 focus:ring-offset-1
                ${dropdownOpen ? "border-teal-500 ring-2 ring-teal-100" : "border-gray-300 hover:border-teal-400"}
                ${selected.length === 0 ? "h-[46px]" : ""}`}
              onClick={() => setDropdownOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              aria-labelledby="tag-select-label"
            >
              {selected.length === 0 && (
                <span className="text-gray-400">Select functional tags…</span>
              )}
              {selected.map((id) => {
                const tag = tags.find((t) => t.id === id);
                if (!tag) return null;
                return (
                  <span
                    key={id}
                    className="bg-teal-600 text-gray-700 rounded-full pl-2 py-1 h-8 text-xs font-medium flex items-center group"

                  >
                    {tag.name}
                    <Button
                      type="button"
                      className="p-0.5 text-teal-700 hover:text-teal-900 hover:bg-teal-800 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(selected.filter((x) => x !== id));
                      }}
                      aria-label={`Remove ${tag.name} from selection`}
                    >
                      {/* <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg> */}
                      X
                    </Button>
                  </span>
                );
              })}
              <span className="ml-auto text-gray-400">
                <svg
                  className={`w-5 h-5 inline-block transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </Button>
    
            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute left-0 z-20 mt-1 w-full bg-white border border-teal-300 rounded-lg shadow-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <svg 
                      className="absolute left-3 top-2.5 text-gray-400" 
                      width="16" 
                      height="16" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search tags..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-labelledby="tag-select-label"
                    />
                  </div>
                </div>
                
                <div className="max-h-48 overflow-y-auto" role="listbox">
                  {filteredTags.length === 0 ? (
                    <div className="text-gray-500 p-4 text-center text-sm">
                      {searchQuery ? "No matching tags found" : "No tags available"}
                    </div>
                  ) : (
                    filteredTags.map((tag) => {
                      const disabled = isTagAssigned(tag.id);
                      const isSelected = selected.includes(tag.id);
                      
                      return (
                        <div
                          key={tag.id}
                          role="option"
                          aria-selected={isSelected || disabled}
                          className={`flex items-center px-4 py-2.5 gap-2 cursor-pointer transition-colors
                            ${disabled 
                              ? "text-gray-400 cursor-not-allowed bg-gray-50" 
                              : isSelected
                                ? "bg-teal-50 hover:bg-teal-100"
                                : "hover:bg-gray-50"
                            }`}
                          onClick={() => {
                            if (disabled) return;
                            if (isSelected) {
                              setSelected(selected.filter((x) => x !== tag.id));
                            } else {
                              setSelected([...selected, tag.id]);
                            }
                          }}
                        >
                          <span className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isSelected || disabled}
                              onChange={() => {}}
                              className="sr-only"
                              id={`tag-${tag.id}`}
                              disabled={disabled}
                            />
                            <span 
                              className={`w-4 h-4 border rounded flex items-center justify-center transition-colors
                                ${isSelected || disabled
                                  ? "bg-teal-500 border-teal-500"
                                  : "border-gray-300"
                                }`}
                            >
                              {(isSelected || disabled) && (
                                <svg 
                                  width="10" 
                                  height="10" 
                                  viewBox="0 0 12 12" 
                                  fill="none" 
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                          </span>
                          <label 
                            htmlFor={`tag-${tag.id}`}
                            className="text-sm flex-1 cursor-pointer select-none"
                          >
                            {tag.name}
                          </label>
                          {disabled && (
                            <span className="ml-1 text-xs px-1.5 py-0.5 bg-gray-100 rounded-full">
                              assigned
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
    
          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1"
              onClick={onClose}
            >
              Exit
            </Button>
            <Button
              type="button"
              disabled={selected.length === 0 || loading}
              className={`px-5 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1
                ${loading 
                  ? "bg-teal-500 text-white cursor-not-allowed" 
                  : selected.length === 0
                    ? "bg-teal-400 text-white opacity-60 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 focus:ring-teal-300"
                }`}
              onClick={() => onAssign(selected)}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg 
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    ></circle>
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Assigning...
                </span>
              ) : (
                mode === "assign" ? "Assign Tags" : "Add Tags"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
}