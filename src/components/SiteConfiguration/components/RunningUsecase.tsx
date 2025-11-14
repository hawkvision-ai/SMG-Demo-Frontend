import uc_camera from "@/assets/icons/uc_camera.svg";
import uc_filter from "@/assets/icons/uc_filter.svg";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface RunningUseCase {
  usecase_name: string;
  parameters: any[];
  rois: string[];
}

interface CameraUseCase {
  camera_name: string;
  usecases: RunningUseCase[];
}

interface RunningUseCasesDialogProps {
  open: boolean;
  onClose: () => void;
  siteName: string;
  runningUsecases: CameraUseCase[] | undefined;
}

type SortOrder = "asc" | "desc";

const RunningUseCasesDialog: React.FC<RunningUseCasesDialogProps> = ({
  open,
  onClose,
  siteName,
  runningUsecases,
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [excludedCameras, setExcludedCameras] = useState<string[]>([]);
  const [tempExcludedCameras, setTempExcludedCameras] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCameras, setExpandedCameras] = useState<Set<number>>(new Set());
  const [openUseCaseDropdown, setOpenUseCaseDropdown] = useState<string | null>(null); // Track which dropdown is open
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCameraDropdown, setShowCameraDropdown] = useState(false);
  const [cameraSearchTerm, setCameraSearchTerm] = useState("");
  const [cameraListSortAsc, setCameraListSortAsc] = useState(true);
  const [autoApply, setAutoApply] = useState(true);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setExpandedCameras(new Set());
      setOpenUseCaseDropdown(null);
      setSearchQuery("");
      setExcludedCameras([]);
      setTempExcludedCameras([]);
      setSortOrder("asc");
      setShowSortDropdown(false);
      setShowCameraDropdown(false);
      setCameraSearchTerm("");
    }
  }, [open]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".sort-dropdown-container")) {
        setShowSortDropdown(false);
      }
      if (!target.closest(".camera-dropdown-container")) {
        setShowCameraDropdown(false);
      }

      // Close use case dropdown if clicking outside
      if (openUseCaseDropdown) {
        const dropdownRef = dropdownRefs.current[openUseCaseDropdown];
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
          setOpenUseCaseDropdown(null);
        }
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, openUseCaseDropdown]);

  // Sync tempExcludedCameras with excludedCameras when dropdown state changes
  useEffect(() => {
    if (showCameraDropdown) {
      setTempExcludedCameras(excludedCameras);
    }
  }, [showCameraDropdown, excludedCameras]);

  // Update dropdown position on scroll or when dropdown opens
  useEffect(() => {
    const updateDropdownPosition = () => {
      if (openUseCaseDropdown) {
        const buttonEl = buttonRefs.current[openUseCaseDropdown];
        if (buttonEl) {
          const rect = buttonEl.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
          });
        }
      }
    };

    if (openUseCaseDropdown) {
      updateDropdownPosition();

      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        scrollContainer.addEventListener("scroll", updateDropdownPosition);
      }
      window.addEventListener("resize", updateDropdownPosition);

      return () => {
        if (scrollContainer) {
          scrollContainer.removeEventListener("scroll", updateDropdownPosition);
        }
        window.removeEventListener("resize", updateDropdownPosition);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [openUseCaseDropdown]);

  if (!open) return null;

  // Get unique camera names for dropdown
  const cameraNames = runningUsecases?.map((c) => c.camera_name) || [];
  const uniqueCameraNames = Array.from(new Set(cameraNames));

  // Filter and sort cameras
  const getFilteredAndSortedCameras = () => {
    if (!runningUsecases) return [];

    let filtered = runningUsecases;

    // Filter by excluded cameras (hide cameras that are in the excluded list)
    if (excludedCameras.length > 0) {
      filtered = filtered.filter((c) => !excludedCameras.includes(c.camera_name));
    }

    // Filter by search query (applied to the filtered results)
    if (searchQuery.trim()) {
      filtered = filtered.filter((c) =>
        c.camera_name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Sort cameras
    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === "asc") {
        return a.camera_name.localeCompare(b.camera_name);
      } else {
        return b.camera_name.localeCompare(a.camera_name);
      }
    });

    return sorted;
  };

  const filteredCameras = getFilteredAndSortedCameras();

  // Toggle camera expansion
  const toggleCameraExpansion = (cameraIndex: number) => {
    setExpandedCameras((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cameraIndex)) {
        newSet.delete(cameraIndex);
        // Close any open dropdown when camera is collapsed
        setOpenUseCaseDropdown(null);
      } else {
        newSet.add(cameraIndex);
      }
      return newSet;
    });
  };

  // Toggle use case dropdown
  const toggleUseCaseDropdown = (
    cameraIndex: number,
    usecaseIndex: number,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    const key = `${cameraIndex}-${usecaseIndex}`;
    setOpenUseCaseDropdown((prev) => (prev === key ? null : key));
  };

  // If no running use cases, show empty state
  if (!runningUsecases || runningUsecases.length === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        {/* Dialog Content */}
        <div className="relative z-[101] flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="relative flex-shrink-0 border-b border-slate-200 px-4 pt-6 pb-4 sm:px-8">
            <h2 className="pr-10 text-lg font-semibold text-slate-800 sm:text-xl">
              Running Use Cases <span className="text-teal-600">- {siteName}</span>
            </h2>
            <button
              onClick={onClose}
              className="absolute top-6 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Empty State Content */}
          <div className="flex flex-col items-center justify-center px-6 py-12 text-slate-500">
            <Activity className="mb-4 h-16 w-16 opacity-30" />
            <p className="text-lg">No running use cases</p>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog Content */}
      <div className="relative z-[101] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-visible rounded-lg border border-slate-200 bg-white shadow-xl sm:max-h-[85vh]">
        {/* Header */}
        <div className="relative flex-shrink-0 border-b border-slate-200 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <h2 className="pr-10 text-lg font-semibold text-slate-800 sm:text-xl">
            Running Use Cases <span className="text-teal-600">- {siteName}</span>
          </h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none sm:top-6"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            {/* Sort Dropdown */}
            <div className="sort-dropdown-container relative flex items-center gap-2">
              <button
                className="rounded-md p-2 transition-colors hover:bg-slate-100"
                aria-label="Filter options"
              >
                <img src={uc_filter} alt="filter" className="h-4 w-4 flex-shrink-0" />
              </button>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex min-w-[120px] cursor-pointer items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm transition-colors hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                <span>{sortOrder === "asc" ? "A to Z" : "Z to A"}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showSortDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {/* Sort Dropdown Menu */}
              {showSortDropdown && (
                <div className="absolute top-full left-10 z-[110] mt-1 w-30 rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSortOrder("asc");
                        setShowSortDropdown(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                        sortOrder === "asc"
                          ? "border border-teal-200 bg-teal-50 text-teal-700"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                      }`}
                    >
                      <ArrowUp className="h-3 w-3" />
                      <span>Sort A-Z</span>
                    </button>
                  </div>
                  <div className="p-2 pt-0">
                    <button
                      onClick={() => {
                        setSortOrder("desc");
                        setShowSortDropdown(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                        sortOrder === "desc"
                          ? "border border-teal-200 bg-teal-50 text-teal-700"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                      }`}
                    >
                      <ArrowDown className="h-3 w-3" />
                      <span>Sort Z-A</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Dropdown */}
            <div className="camera-dropdown-container relative flex flex-1 items-center gap-2">
              <img src={uc_camera} alt="camera" className="h-4 w-4 flex-shrink-0" />
              <button
                onClick={() => setShowCameraDropdown(!showCameraDropdown)}
                className="flex flex-1 cursor-pointer items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm transition-colors hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                <span className="truncate">
                  {excludedCameras.length === 0
                    ? "All Cameras"
                    : `${uniqueCameraNames.length - excludedCameras.length} of ${uniqueCameraNames.length} selected`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 transition-transform ${showCameraDropdown ? "rotate-180" : ""} ${excludedCameras.length > 0 ? "text-teal-600" : ""}`}
                />
              </button>

              {/* Camera Dropdown Menu */}
              {showCameraDropdown && (
                <div className="absolute top-full left-6 z-[110] mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                  {/* Search */}
                  <div className="border-b border-gray-100 p-2">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={cameraSearchTerm}
                        onChange={(e) => setCameraSearchTerm(e.target.value)}
                        className="w-full rounded border border-gray-200 py-1 pr-2 pl-6 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between border-b border-gray-100 px-2 py-1.5">
                    <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-600 hover:text-gray-800">
                      <input
                        type="checkbox"
                        checked={uniqueCameraNames
                          .filter((name) =>
                            name.toLowerCase().includes(cameraSearchTerm.toLowerCase()),
                          )
                          .every((name) => !tempExcludedCameras.includes(name))}
                        onChange={() => {
                          const filteredNames = uniqueCameraNames.filter((name) =>
                            name.toLowerCase().includes(cameraSearchTerm.toLowerCase()),
                          );
                          const allSelected = filteredNames.every(
                            (name) => !tempExcludedCameras.includes(name),
                          );

                          // If auto-apply is on and trying to deselect all, prevent it
                          if (autoApply && allSelected) return;

                          const newExcluded = allSelected ? filteredNames : [];
                          setTempExcludedCameras(newExcluded);

                          if (autoApply) {
                            setExcludedCameras(newExcluded);
                          }
                        }}
                        className="h-3 w-3 rounded border-gray-300 bg-gray-100 text-teal-600 accent-teal-600 focus:ring-teal-500"
                      />
                      <span>Select All</span>
                    </label>
                    <button
                      onClick={() => setCameraListSortAsc(!cameraListSortAsc)}
                      className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Toggle sort order"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="max-h-40 overflow-y-auto">
                    {uniqueCameraNames
                      .filter((name) => name.toLowerCase().includes(cameraSearchTerm.toLowerCase()))
                      .sort((a, b) => {
                        const comparison = a.localeCompare(b);
                        return cameraListSortAsc ? comparison : -comparison;
                      })
                      .map((name) => (
                        <label
                          key={name}
                          className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={!tempExcludedCameras.includes(name)}
                            onChange={() => {
                              const newExcluded = tempExcludedCameras.includes(name)
                                ? tempExcludedCameras.filter((v) => v !== name)
                                : [...tempExcludedCameras, name];

                              // If auto-apply is on and trying to exclude all, prevent it
                              const filteredNames = uniqueCameraNames.filter((n) =>
                                n.toLowerCase().includes(cameraSearchTerm.toLowerCase()),
                              );
                              if (
                                autoApply &&
                                !tempExcludedCameras.includes(name) &&
                                newExcluded.length >= filteredNames.length
                              ) {
                                return;
                              }

                              setTempExcludedCameras(newExcluded);

                              if (autoApply) {
                                setExcludedCameras(newExcluded);
                              }
                            }}
                            className="h-3 w-3 rounded border-gray-300 bg-gray-100 text-teal-600 accent-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-xs font-normal text-gray-600">{name}</span>
                        </label>
                      ))}
                    {uniqueCameraNames.filter((name) =>
                      name.toLowerCase().includes(cameraSearchTerm.toLowerCase()),
                    ).length === 0 && (
                      <div className="px-2 py-2 text-xs text-gray-500">No cameras found</div>
                    )}
                  </div>

                  {/* Apply Controls */}
                  <div className="border-t border-gray-100">
                    {!autoApply && (
                      <div className="border-b border-gray-100 p-2">
                        <button
                          onClick={() => {
                            const filteredNames = uniqueCameraNames.filter((name) =>
                              name.toLowerCase().includes(cameraSearchTerm.toLowerCase()),
                            );
                            const allUnselected = filteredNames.every((name) =>
                              tempExcludedCameras.includes(name),
                            );

                            // Prevent applying if all are unselected
                            if (allUnselected) return;

                            setExcludedCameras(tempExcludedCameras);
                            setShowCameraDropdown(false);
                            setCameraSearchTerm("");
                          }}
                          disabled={uniqueCameraNames
                            .filter((name) =>
                              name.toLowerCase().includes(cameraSearchTerm.toLowerCase()),
                            )
                            .every((name) => tempExcludedCameras.includes(name))}
                          className={`w-full rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                            uniqueCameraNames
                              .filter((name) =>
                                name.toLowerCase().includes(cameraSearchTerm.toLowerCase()),
                              )
                              .every((name) => tempExcludedCameras.includes(name))
                              ? "cursor-not-allowed bg-gray-100 text-gray-400"
                              : "bg-teal-600 text-white hover:bg-teal-700"
                          }`}
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    <div className="p-2">
                      <label className="flex cursor-pointer items-center gap-1.5 text-gray-600">
                        <input
                          type="checkbox"
                          checked={autoApply}
                          onChange={(e) => setAutoApply(e.target.checked)}
                          className="h-3 w-3 rounded border-gray-300 bg-gray-100 text-teal-600 accent-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-xs">Auto Apply</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Camera"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white py-1.5 pr-3 pl-9 text-sm hover:border-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollContainerRef}
          className="relative overflow-x-visible overflow-y-auto px-4 py-3 sm:px-6 sm:py-4"
        >
          {filteredCameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <img src={uc_camera} alt="camera" className="mb-4 h-12 w-12 opacity-30" />
              <p className="text-base">No cameras found</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredCameras.map((cameraData, cameraIndex) => {
                const isExpanded = expandedCameras.has(cameraIndex);

                return (
                  <div
                    key={cameraIndex}
                    className="relative overflow-visible rounded-lg border border-slate-200 bg-slate-50"
                  >
                    {/* Camera Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white p-3 sm:p-4">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <img src={uc_camera} alt="camera" className="h-4 w-4 flex-shrink-0" />
                        <h3 className="truncate text-sm font-semibold text-slate-800 sm:text-base">
                          {cameraData.camera_name}
                        </h3>
                        <span className="flex-shrink-0 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-semibold text-slate-800">
                          {cameraData.usecases.length}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleCameraExpansion(cameraIndex)}
                        className="flex flex-shrink-0 items-center gap-1.5 text-sm font-medium whitespace-nowrap text-blue-600 hover:text-blue-700"
                      >
                        {isExpanded ? "Hide" : "View Use Cases"}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Expanded Use Cases */}
                    {isExpanded && (
                      <div className="bg-slate-50 p-3 sm:p-4">
                        <div className="flex flex-wrap items-start gap-2">
                          {cameraData.usecases.map((usecase, usecaseIndex) => {
                            const usecaseKey = `${cameraIndex}-${usecaseIndex}`;
                            const isDropdownOpen = openUseCaseDropdown === usecaseKey;
                            const hasROIs = usecase.rois && usecase.rois.length > 0;

                            return (
                              <div
                                key={usecaseIndex}
                                className="relative"
                                ref={(el) => {
                                  dropdownRefs.current[usecaseKey] = el;
                                }}
                              >
                                <button
                                  ref={(el) => {
                                    buttonRefs.current[usecaseKey] = el;
                                  }}
                                  onClick={(e) =>
                                    toggleUseCaseDropdown(cameraIndex, usecaseIndex, e)
                                  }
                                  className="inline-flex w-auto items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                                >
                                  {usecase.usecase_name
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                  {isDropdownOpen ? (
                                    <ChevronUp className="ml-1 h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="ml-1 h-4 w-4" />
                                  )}
                                </button>

                                {/* ROI Dropdown */}
                                {isDropdownOpen && dropdownPosition && (
                                  <div
                                    className="fixed z-[9999] max-w-[170px] min-w-[120px] rounded border border-slate-300 bg-white shadow-md"
                                    style={{
                                      top: `${dropdownPosition.top}px`,
                                      left: `${dropdownPosition.left}px`,
                                    }}
                                  >
                                    <div className="px-2 py-1.5">
                                      {hasROIs ? (
                                        <p className="text-xs leading-relaxed">
                                          <span className="font-semibold text-slate-600">
                                            ROI's:{" "}
                                          </span>
                                          <span className="text-slate-900">
                                            {usecase.rois.join(", ")}
                                          </span>
                                        </p>
                                      ) : (
                                        <p className="text-xs text-slate-500 italic">
                                          No ROI configured
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default RunningUseCasesDialog;
