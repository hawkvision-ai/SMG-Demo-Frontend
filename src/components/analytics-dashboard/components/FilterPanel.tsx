import {
  AggregatedTotals,
  AnalyticsTableQueryParams,
  AnalyticsTableResponse,
  DateIncidentData,
  DetailedFilters,
  EventRecord,
  GroupBy,
  MetricValue,
  TimePeriodEnum,
} from "@/api/types";
import CustomDropdown from "@/components/CustomDropdown";
import {
  clearAnalyticsFiltersFromStorage,
  loadAnalyticsFiltersFromStorage,
  saveAnalyticsFiltersToStorage,
  type AnalyticsFilters,
} from "@/utils/browserStorage";
import { GitCompare, RotateCcw } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import TableHeaderDropdown from "../../newEventTable/Components/TableHeaderDropdown";
import DateFilter from "./utils/CustomDate";

// --- INTERFACE DEFINITIONS ---
interface Option {
  id?: string;
  name?: string;
}

interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

// --- PROPS INTERFACE ---
interface FilterPanelProps {
  // User ID for localStorage persistence
  userId: string;
  env: "real" | "virtual";

  // Date range filters
  dateRange: { start: string; end: string } | null;
  dateFilter: TimePeriodEnum | null;
  groupBy: GroupBy;

  // Handlers for date filters
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  onDateFilterChange: (filter: TimePeriodEnum | null) => void;
  onGroupByChange: (groupBy: GroupBy) => void;

  // Handler to pass detailed filter state up to the parent
  onDetailedFilterChange: (filters: DetailedFilters) => void;
  // Handler to pass filtered data up to the parent
  onFilteredDataChange: (data: DateIncidentData[]) => void;
  // Handler to pass filtered comparison data up to the parent
  onFilteredComparisonDataChange?: (data: DateIncidentData[]) => void;
  // Handler to clear all filters
  onClearAll: () => void;

  // Raw data from API - main data (now with events array)
  rawData: AnalyticsTableResponse;
  // Raw comparison data from separate API call
  comparisonRawData?: AnalyticsTableResponse;

  // Data props - these should come from the parent component
  siteOptions: (string | Option)[];
  cameraOptions: (string | Option)[];
  useCaseOptions: (string | Option)[];
  severityOptions: (string | Option)[];
  statusOptions: (string | Option)[];
  locationTagOptions: (string | Option)[];

  // Dependent options for camera filtering
  dependentCameraOptions?: Option[];
  selectedSites?: string[];

  // Auto-apply functionality
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;

  // Current detailed filters from parent
  detailedFilters?: DetailedFilters;

  // Comparison functionality
  showComparison?: boolean;
  onComparisonToggle?: (show: boolean) => void;
  canShowComparison?: boolean;

  // Comparison navigation handlers
  onPreviousPeriod?: () => void;
  onNextPeriod?: () => void;

  // Query parameters for debugging and date range info
  queryParams?: AnalyticsTableQueryParams;
  comparisonQueryParams?: AnalyticsTableQueryParams | null;
}

// --- DROPDOWN OPTIONS ---
const groupByOptions: { label: string; value: GroupBy }[] = [
  { label: "Use Case", value: "uc_types" },
  { label: "Site", value: "sites" },
  { label: "Camera", value: "cameras" },
  { label: "Severity", value: "severities" },
  { label: "Location Tags", value: "location_tags" },
  { label: "Status", value: "statuses" },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  userId,
  env,
  dateRange,
  dateFilter,
  groupBy,
  onDateRangeChange,
  onDateFilterChange,
  onGroupByChange,
  onDetailedFilterChange,
  onFilteredDataChange,
  onFilteredComparisonDataChange,
  onClearAll,
  rawData,
  comparisonRawData,
  siteOptions,
  cameraOptions,
  useCaseOptions,
  severityOptions,
  statusOptions,
  locationTagOptions,
  dependentCameraOptions,
  selectedSites,
  autoApply,
  onAutoApplyChange,
  detailedFilters: parentDetailedFilters,
  // Comparison props
  showComparison = false,
  onComparisonToggle,
  canShowComparison = false,
}) => {
  // --- STATE MANAGEMENT ---
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Use parent's detailed filters as the source of truth
  const detailedFilters = parentDetailedFilters || {
    sites: [],
    cameras: [],
    useCases: [],
    severities: [],
    statuses: [],
    locationTags: [],
  };

  // Load filters on mount AND when env changes
  useEffect(() => {
    if (!userId) return;

    const savedFilters = loadAnalyticsFiltersFromStorage(userId, env);

    if (savedFilters) {
      const restoredDetailedFilters: DetailedFilters = {
        sites: savedFilters.sites || [],
        cameras: savedFilters.cameras || [],
        useCases: savedFilters.useCases || [],
        severities: savedFilters.severities || [],
        statuses: savedFilters.statuses || [],
        locationTags: savedFilters.locationTags || [],
      };

      onDetailedFilterChange(restoredDetailedFilters);

      if (savedFilters.dateRange) {
        onDateRangeChange(savedFilters.dateRange);
      }

      if (savedFilters.dateFilter) {
        onDateFilterChange(savedFilters.dateFilter as TimePeriodEnum);
      }

      if (savedFilters.groupBy) {
        onGroupByChange(savedFilters.groupBy as GroupBy);
      }
    } else {
      // Clear filters when switching to an env with no saved filters
      onDetailedFilterChange({
        sites: [],
        cameras: [],
        useCases: [],
        severities: [],
        statuses: [],
        locationTags: [],
      });
    }

    // Set initial load to false after first load
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [userId, env]);

  // Save filters when they change
  useEffect(() => {
    if (!userId || isInitialLoad) return;

    const filtersToSave: AnalyticsFilters = {
      sites: detailedFilters.sites,
      cameras: detailedFilters.cameras,
      useCases: detailedFilters.useCases,
      severities: detailedFilters.severities,
      statuses: detailedFilters.statuses,
      locationTags: detailedFilters.locationTags,
      dateRange,
      dateFilter: dateFilter as string | null,
      groupBy: groupBy as string,
    };

    saveAnalyticsFiltersToStorage(filtersToSave, userId, env);
  }, [userId, env, detailedFilters, dateRange, dateFilter, groupBy, isInitialLoad]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest(".custom-dropdown") &&
        !target.closest(".table-header-dropdown") &&
        !target.closest(".date-filter-container")
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get the appropriate data array based on date range or filter
  const getDataForDateRange = useCallback(
    (data: AnalyticsTableResponse): DateIncidentData[] => {
      if (!data) {
        return [];
      }

      let result: DateIncidentData[] = [];

      // If we have a custom date range, use the appropriate data array
      if (dateRange) {
        // For custom date ranges, we'll use daily data if available, otherwise weekly
        result = data.daily || data.weekly || [];
      } else if (dateFilter) {
        // Handle predefined date filters
        switch (dateFilter) {
          case TimePeriodEnum.TODAY:
          case TimePeriodEnum.YESTERDAY:
            result = data.daily || data.weekly || [];
            break;
          case TimePeriodEnum.WEEKLY:
            result = data.weekly || [];
            break;
          case TimePeriodEnum.MONTHLY:
            result = data.monthly || [];
            break;
          case TimePeriodEnum.QUARTERLY:
            if (Array.isArray(data.quarterly)) {
              result = data.quarterly;
            } else {
              result = data.quarterly?.weeks || [];
            }
            break;
          case TimePeriodEnum.YEARLY:
            result = data.yearly || [];
            break;
          default:
            result = data.weekly || [];
            break;
        }
      } else {
        // Default to weekly data
        result = data.weekly || [];
      }

      // Filter data by date range if custom range is selected
      if (dateRange && dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);

        result = result.filter((item) => {
          const itemDate = new Date(item.date);
          return itemDate >= startDate && itemDate <= endDate;
        });
      }

      return result;
    },
    [dateRange, dateFilter],
  );

  // Get previous period data for comparison
  const getPreviousPeriodData = useCallback(
    (data: AnalyticsTableResponse, comparisonData?: AnalyticsTableResponse): DateIncidentData[] => {
      if (!data) return [];

      // For comparison data, try to use separate comparison API data first
      if (comparisonData) {
        let result: DateIncidentData[] = [];

        if (dateRange) {
          // For custom date ranges, use daily or weekly data from comparison API
          result = comparisonData.daily || comparisonData.weekly || [];
        } else if (dateFilter) {
          switch (dateFilter) {
            case TimePeriodEnum.TODAY:
            case TimePeriodEnum.YESTERDAY:
              result = comparisonData.daily || comparisonData.weekly || [];
              break;
            case TimePeriodEnum.WEEKLY:
              result = comparisonData.weekly || [];
              break;
            case TimePeriodEnum.MONTHLY:
              result = comparisonData.monthly || [];
              break;
            case TimePeriodEnum.QUARTERLY:
              if (Array.isArray(comparisonData.quarterly)) {
                result = comparisonData.quarterly;
              } else {
                result = comparisonData.quarterly?.weeks || [];
              }
              break;
            case TimePeriodEnum.YEARLY:
              result = comparisonData.yearly || [];
              break;
            default:
              result = [];
          }
        }

        if (result.length > 0) {
          return result;
        }
      }

      // Fallback to previous period data from main API response
      let result: DateIncidentData[] = [];

      if (dateFilter) {
        switch (dateFilter) {
          case TimePeriodEnum.WEEKLY:
            result = data.previous_weekly || [];
            break;
          case TimePeriodEnum.MONTHLY:
            result = data.previous_monthly || [];
            break;
          case TimePeriodEnum.QUARTERLY:
            if (Array.isArray(data.previous_quarterly)) {
              result = data.previous_quarterly;
            } else {
              result = data.previous_quarterly?.weeks || [];
            }
            break;
          case TimePeriodEnum.YEARLY:
            result = data.previous_yearly || [];
            break;
          default:
            result = [];
        }
      }

      return result;
    },
    [dateRange, dateFilter],
  );

  // Helper function to calculate aggregated totals from filtered events
  const calculateAggregatedTotalsFromEvents = useCallback(
    (events: EventRecord[]): AggregatedTotals => {
      const useCases: Record<string, number> = {};
      const sites: Record<string, number> = {};
      const cameras: Record<string, number> = {};
      const severities: Record<string, number> = {};
      const statuses: Record<string, number> = {};
      const locationTags: Record<string, number> = {};

      events.forEach((event) => {
        useCases[event.use_case] = (useCases[event.use_case] || 0) + event.count;
        sites[event.site] = (sites[event.site] || 0) + event.count;
        cameras[event.camera] = (cameras[event.camera] || 0) + event.count;
        severities[event.severity] = (severities[event.severity] || 0) + event.count;
        statuses[event.status] = (statuses[event.status] || 0) + event.count;

        event.location_tags.forEach((tag) => {
          locationTags[tag] = (locationTags[tag] || 0) + event.count;
        });
      });

      return {
        by_use_case: useCases,
        by_site: sites,
        by_camera: cameras,
        by_severity: severities,
        by_status: statuses,
        by_location_tag: locationTags,
      };
    },
    [],
  );

  // Helper function to create backward compatible fields from aggregated totals
  const createBackwardCompatibleFields = useCallback((aggregated: AggregatedTotals) => {
    return {
      uc_types: Object.entries(aggregated.by_use_case).reduce(
        (acc, [key, count]) => {
          acc[key] = { absolute: count };
          return acc;
        },
        {} as Record<string, MetricValue>,
      ),

      sites: Object.entries(aggregated.by_site).reduce(
        (acc, [key, count]) => {
          acc[key] = { absolute: count };
          return acc;
        },
        {} as Record<string, MetricValue>,
      ),

      cameras: Object.entries(aggregated.by_camera).reduce(
        (acc, [key, count]) => {
          acc[key] = { absolute: count };
          return acc;
        },
        {} as Record<string, MetricValue>,
      ),

      severities: Object.entries(aggregated.by_severity).reduce(
        (acc, [key, count]) => {
          acc[key] = { absolute: count };
          return acc;
        },
        {} as Record<string, MetricValue>,
      ),

      statuses: Object.entries(aggregated.by_status).reduce(
        (acc, [key, count]) => {
          acc[key] = { absolute: count };
          return acc;
        },
        {} as Record<string, MetricValue>,
      ),

      location_tags: Object.entries(aggregated.by_location_tag).reduce(
        (acc, [key, count]) => {
          acc[key] = { absolute: count };
          return acc;
        },
        {} as Record<string, MetricValue>,
      ),
    };
  }, []);

  // CORRECTED EXCLUSION FILTERING
  const applyFilters = useCallback(
    (
      data: DateIncidentData[],
      filters: DetailedFilters,
      selectedGroupBy: GroupBy,
    ): DateIncidentData[] => {
      if (!data || data.length === 0) return [];

      return data.map((dateData) => {
        // Check if this data has events array (new structure)
        if (dateData.events && Array.isArray(dateData.events)) {
          // EXCLUSION FILTERING LOGIC
          const filteredEvents = dateData.events.filter((event: EventRecord) => {
            // EXCLUSION LOGIC: If an item is selected in filters, EXCLUDE it
            // If no filters are selected, include everything

            const siteExcluded = filters.sites.length > 0 && filters.sites.includes(event.site);
            const cameraExcluded =
              filters.cameras.length > 0 && filters.cameras.includes(event.camera);
            const useCaseExcluded =
              filters.useCases.length > 0 && filters.useCases.includes(event.use_case);
            const severityExcluded =
              filters.severities.length > 0 && filters.severities.includes(event.severity);
            const statusExcluded =
              filters.statuses.length > 0 && filters.statuses.includes(event.status);
            const locationExcluded =
              filters.locationTags.length > 0 &&
              event.location_tags.some((tag) => filters.locationTags.includes(tag));

            // If ANY dimension excludes this event, exclude it (OR logic for exclusion)
            const shouldExclude =
              siteExcluded ||
              cameraExcluded ||
              useCaseExcluded ||
              severityExcluded ||
              statusExcluded ||
              locationExcluded;
            const shouldInclude = !shouldExclude;

            return shouldInclude;
          });

          // Group the filtered events by the selected dimension
          const grouped: Record<string, number> = {};

          filteredEvents.forEach((event) => {
            switch (selectedGroupBy) {
              case "uc_types":
                grouped[event.use_case] = (grouped[event.use_case] || 0) + event.count;
                break;
              case "sites":
                grouped[event.site] = (grouped[event.site] || 0) + event.count;
                break;
              case "cameras":
                grouped[event.camera] = (grouped[event.camera] || 0) + event.count;
                break;
              case "severities":
                grouped[event.severity] = (grouped[event.severity] || 0) + event.count;
                break;
              case "statuses":
                grouped[event.status] = (grouped[event.status] || 0) + event.count;
                break;
              case "location_tags":
                event.location_tags.forEach((tag) => {
                  grouped[tag] = (grouped[tag] || 0) + event.count;
                });
                break;
            }
          });

          // Convert to the expected format
          const groupedFormatted = Object.entries(grouped).reduce(
            (acc, [key, count]) => {
              if (count > 0) {
                acc[key] = { absolute: count };
              }
              return acc;
            },
            {} as Record<string, MetricValue>,
          );

          // Calculate new aggregated totals from filtered events
          const newAggregatedTotals = calculateAggregatedTotalsFromEvents(filteredEvents);

          // Create backward compatible fields
          const backwardCompatible = createBackwardCompatibleFields(newAggregatedTotals);

          return {
            ...dateData,
            events: filteredEvents,
            aggregated_totals: newAggregatedTotals,
            [selectedGroupBy]: groupedFormatted,
            ...backwardCompatible,
          };
        } else {
          // LEGACY EXCLUSION FILTERING for backward compatibility
          return applyLegacyExclusionFiltering(dateData, filters, selectedGroupBy);
        }
      });
    },
    [calculateAggregatedTotalsFromEvents, createBackwardCompatibleFields],
  );

  // EXCLUSION VERSION of legacy filtering
  const applyLegacyExclusionFiltering = useCallback(
    (
      dateData: DateIncidentData,
      filters: DetailedFilters,
      selectedGroupBy: GroupBy,
    ): DateIncidentData => {
      const filteredData: DateIncidentData = {
        date: dateData.date,
        uc_types: {},
        sites: {},
        cameras: {},
        severities: {},
        location_tags: {},
        statuses: {},
      };

      // Process each category with EXCLUSION logic
      const categories = [
        { key: "uc_types" as const, data: dateData.uc_types, filterKey: "useCases" as const },
        { key: "sites" as const, data: dateData.sites, filterKey: "sites" as const },
        { key: "cameras" as const, data: dateData.cameras, filterKey: "cameras" as const },
        { key: "severities" as const, data: dateData.severities, filterKey: "severities" as const },
        { key: "statuses" as const, data: dateData.statuses, filterKey: "statuses" as const },
        {
          key: "location_tags" as const,
          data: dateData.location_tags,
          filterKey: "locationTags" as const,
        },
      ];

      categories.forEach(({ key, data, filterKey }) => {
        if (data) {
          const activeFilter = filters[filterKey];

          Object.entries(data).forEach(([itemKey, value]) => {
            // EXCLUSION LOGIC:
            // If activeFilter is empty (no selections) → include ALL items
            // If activeFilter has items (has selections) → EXCLUDE if item is IN the selection
            const shouldExclude = activeFilter.length > 0 && activeFilter.includes(itemKey);
            const shouldInclude = !shouldExclude;

            if (shouldInclude && value.absolute > 0) {
              filteredData[key][itemKey] = { absolute: value.absolute };
            }
          });
        }
      });

      return filteredData;
    },
    [],
  );

  // Memoized filtered data based on current filters and date range/filter
  const filteredData = useMemo(() => {
    if (!rawData) {
      return [];
    }

    const dateBasedData = getDataForDateRange(rawData);
    const filtered = applyFilters(dateBasedData, detailedFilters, groupBy);

    return filtered;
  }, [rawData, dateRange, dateFilter, detailedFilters, groupBy, getDataForDateRange, applyFilters]);

  // Memoized filtered comparison data using the same filters
  const filteredComparisonData = useMemo(() => {
    if (!rawData || !showComparison) return [];

    const previousDateBasedData = getPreviousPeriodData(rawData, comparisonRawData);
    const filtered = applyFilters(previousDateBasedData, detailedFilters, groupBy);

    return filtered;
  }, [
    rawData,
    comparisonRawData,
    dateRange,
    dateFilter,
    detailedFilters,
    groupBy,
    showComparison,
    getPreviousPeriodData,
    applyFilters,
  ]);

  // Effect to notify parent of filtered data changes
  useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(filteredData);
    }
  }, [filteredData, onFilteredDataChange]);

  // Effect to notify parent of filtered comparison data changes
  useEffect(() => {
    if (onFilteredComparisonDataChange) {
      onFilteredComparisonDataChange(filteredComparisonData);
    }
  }, [filteredComparisonData, onFilteredComparisonDataChange]);

  // --- HANDLERS ---
  const handleDropdownToggle = useCallback((dropdownId: string, isOpen: boolean) => {
    setOpenDropdown(isOpen ? dropdownId : null);
  }, []);

  const handleClear = () => {
    setSortConfig(undefined);
    setOpenDropdown(null);
    onClearAll();

    if (userId) {
      clearAnalyticsFiltersFromStorage(env);
    }
  };

  const handleComparisonToggle = useCallback(() => {
    if (onComparisonToggle) {
      onComparisonToggle(!showComparison);
    }
  }, [showComparison, onComparisonToggle]);

  const handleFilterSelection = useCallback(
    (key: keyof DetailedFilters, selectedValues: string[]) => {
      const updatedFilters = { ...detailedFilters, [key]: selectedValues };
      onDetailedFilterChange(updatedFilters);
    },
    [detailedFilters, onDetailedFilterChange],
  );

  const isFilterActive = useCallback(
    (selectedValues: string[], allOptions: (string | Option)[]) => {
      return selectedValues.length > 0;
    },
    [],
  );

  const handleSort = useCallback((column: string, direction: "asc" | "desc") => {
    setSortConfig({ column, direction });
  }, []);

  const getFilterData = useCallback(
    (columnKey: string) => {
      const filterMap = {
        uc_types: {
          options: useCaseOptions,
          selected: detailedFilters.useCases,
          key: "useCases" as keyof DetailedFilters,
        },
        sites: {
          options: siteOptions,
          selected: detailedFilters.sites,
          key: "sites" as keyof DetailedFilters,
        },
        cameras: {
          options: cameraOptions,
          selected: detailedFilters.cameras,
          key: "cameras" as keyof DetailedFilters,
        },
        severities: {
          options: severityOptions,
          selected: detailedFilters.severities,
          key: "severities" as keyof DetailedFilters,
        },
        statuses: {
          options: statusOptions,
          selected: detailedFilters.statuses,
          key: "statuses" as keyof DetailedFilters,
        },
        location_tags: {
          options: locationTagOptions,
          selected: detailedFilters.locationTags,
          key: "locationTags" as keyof DetailedFilters,
        },
      };

      return (
        filterMap[columnKey as keyof typeof filterMap] || {
          options: [],
          selected: [],
          key: "sites" as keyof DetailedFilters,
        }
      );
    },
    [
      detailedFilters,
      siteOptions,
      cameraOptions,
      useCaseOptions,
      severityOptions,
      statusOptions,
      locationTagOptions,
    ],
  );

  const hasActiveFilters = useMemo(() => {
    const hasDetailedFilters = Object.values(detailedFilters).some(
      (filterArray) => filterArray.length > 0,
    );
    const hasDateFilters = !!(dateRange || dateFilter);
    return hasDetailedFilters || hasDateFilters;
  }, [detailedFilters, dateRange, dateFilter]);

  const getFilteredOptions = useCallback(
    (columnKey: string, baseOptions: (string | Option)[]) => {
      if (
        columnKey === "cameras" &&
        dependentCameraOptions &&
        selectedSites &&
        selectedSites.length > 0
      ) {
        return dependentCameraOptions.filter(() => true); // Implement your filtering logic
      }
      return baseOptions;
    },
    [dependentCameraOptions, selectedSites],
  );

  const isDateFilterActive = !!(dateRange || dateFilter);

  return (
    <div className="relative z-50 rounded-lg border border-gray-200/80 bg-gray-100 p-2 shadow-sm">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-4">
        {/* Left side filters */}
        <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          {/* Chart Filters */}
          <div className="flex items-center gap-4">
            <label htmlFor="time_period">Time Period:</label>
            <DateFilter
              dateRange={dateRange}
              dateFilter={dateFilter}
              onDateRangeChange={onDateRangeChange}
              onDateFilterChange={onDateFilterChange}
              isActive={isDateFilterActive}
              autoApply={autoApply}
              onAutoApplyChange={onAutoApplyChange}
            />

            <div className="h-4 w-px bg-gray-300" />

            <label htmlFor="groupBy">Group By:</label>
            <div className="custom-dropdown">
              <CustomDropdown
                placeholder="Group By"
                value={groupBy}
                options={groupByOptions.map((opt) => ({ label: opt.label, value: opt.value }))}
                onChange={(value) => onGroupByChange(value as GroupBy)}
              />
            </div>

            <div className="h-4 w-px bg-gray-300" />

            {canShowComparison && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleComparisonToggle}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    showComparison
                      ? "border-teal-300 bg-gray-50 text-teal-700 hover:bg-teal-100"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  title={
                    showComparison
                      ? "Hide previous period comparison"
                      : "Show previous period comparison"
                  }
                >
                  <GitCompare size={14} />
                  Compare
                </button>
              </div>
            )}
            <div className="h-4 w-px bg-gray-300" />
          </div>

          {/* Detailed Filters using TableHeaderDropdown */}
          <div className="table-header-dropdown relative z-50">
            {(() => {
              const filterData = getFilterData("sites");
              const filteredOptions = getFilteredOptions("sites", filterData.options);
              return (
                <TableHeaderDropdown
                  label="Site"
                  options={filteredOptions}
                  selectedValues={filterData.selected}
                  onSelectionChange={(values) => handleFilterSelection("sites", values)}
                  isActive={isFilterActive(filterData.selected, filterData.options)}
                  autoApply={autoApply}
                  onAutoApplyChange={onAutoApplyChange}
                  columnKey="sites"
                  isOpen={openDropdown === "sites"}
                  onToggle={(isOpen) => handleDropdownToggle("sites", isOpen)}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              );
            })()}
          </div>

          <div className="h-4 w-px bg-gray-300" />

          <div className="table-header-dropdown relative z-50">
            {(() => {
              const filterData = getFilterData("cameras");
              const filteredOptions = getFilteredOptions("cameras", filterData.options);
              return (
                <TableHeaderDropdown
                  label="Camera"
                  options={filteredOptions}
                  selectedValues={filterData.selected}
                  onSelectionChange={(values) => handleFilterSelection("cameras", values)}
                  isActive={isFilterActive(filterData.selected, filterData.options)}
                  autoApply={autoApply}
                  onAutoApplyChange={onAutoApplyChange}
                  dependentOptions={dependentCameraOptions}
                  selectedSites={selectedSites}
                  columnKey="cameras"
                  isOpen={openDropdown === "cameras"}
                  onToggle={(isOpen) => handleDropdownToggle("cameras", isOpen)}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              );
            })()}
          </div>

          <div className="h-4 w-px bg-gray-300" />

          <div className="table-header-dropdown relative z-50">
            {(() => {
              const filterData = getFilterData("uc_types");
              const filteredOptions = getFilteredOptions("uc_types", filterData.options);
              return (
                <TableHeaderDropdown
                  label="Use Case"
                  options={filteredOptions}
                  selectedValues={filterData.selected}
                  onSelectionChange={(values) => handleFilterSelection("useCases", values)}
                  isActive={isFilterActive(filterData.selected, filterData.options)}
                  autoApply={autoApply}
                  onAutoApplyChange={onAutoApplyChange}
                  columnKey="uc_types"
                  isOpen={openDropdown === "useCases"}
                  onToggle={(isOpen) => handleDropdownToggle("useCases", isOpen)}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              );
            })()}
          </div>

          <div className="h-4 w-px bg-gray-300" />

          <div className="table-header-dropdown relative z-50">
            {(() => {
              const filterData = getFilterData("severities");
              const filteredOptions = getFilteredOptions("severities", filterData.options);
              return (
                <TableHeaderDropdown
                  label="Severity"
                  options={filteredOptions}
                  selectedValues={filterData.selected}
                  onSelectionChange={(values) => handleFilterSelection("severities", values)}
                  isActive={isFilterActive(filterData.selected, filterData.options)}
                  autoApply={autoApply}
                  onAutoApplyChange={onAutoApplyChange}
                  columnKey="severities"
                  isOpen={openDropdown === "severities"}
                  onToggle={(isOpen) => handleDropdownToggle("severities", isOpen)}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              );
            })()}
          </div>

          <div className="h-4 w-px bg-gray-300" />

          <div className="table-header-dropdown relative z-50">
            {(() => {
              const filterData = getFilterData("statuses");
              const filteredOptions = getFilteredOptions("statuses", filterData.options);
              return (
                <TableHeaderDropdown
                  label="Status"
                  options={filteredOptions}
                  selectedValues={filterData.selected}
                  onSelectionChange={(values) => handleFilterSelection("statuses", values)}
                  isActive={isFilterActive(filterData.selected, filterData.options)}
                  autoApply={autoApply}
                  onAutoApplyChange={onAutoApplyChange}
                  columnKey="statuses"
                  isOpen={openDropdown === "statuses"}
                  onToggle={(isOpen) => handleDropdownToggle("statuses", isOpen)}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              );
            })()}
          </div>

          <div className="h-4 w-px bg-gray-300" />

          <div className="table-header-dropdown relative z-50">
            {(() => {
              const filterData = getFilterData("location_tags");
              const filteredOptions = getFilteredOptions("location_tags", filterData.options);
              return (
                <TableHeaderDropdown
                  label="Location Tags"
                  options={filteredOptions}
                  selectedValues={filterData.selected}
                  onSelectionChange={(values) => handleFilterSelection("locationTags", values)}
                  isActive={isFilterActive(filterData.selected, filterData.options)}
                  autoApply={autoApply}
                  onAutoApplyChange={onAutoApplyChange}
                  columnKey="location_tags"
                  isOpen={openDropdown === "locationTags"}
                  onToggle={(isOpen) => handleDropdownToggle("locationTags", isOpen)}
                />
              );
            })()}
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleClear}
            disabled={!hasActiveFilters}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              hasActiveFilters
                ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
            }`}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
