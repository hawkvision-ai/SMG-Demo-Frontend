import {
  AnalyticsTableQueryParams,
  AnalyticsTableResponse,
  DateIncidentData,
  DetailedFilters,
  GroupBy,
  TimePeriodEnum,
} from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import { useGetAnalyticsTable, useGetSitesByCustomer } from "@/hooks/useApi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateDynamicYMaxWithLegends } from "../utils/chartUtils";
import {
  addDays,
  calculateNextPeriod,
  calculatePreviousPeriod,
  getDateRangeForPeriod,
  getDaysBetween,
  type SimpleDateRange,
} from "../utils/dateUtils";

// Weight type definition
type WeightType = "none" | "people" | "vehicle";

// Enhanced lock state interface
interface LockState {
  incident: boolean;
  comparison: boolean;
}

// Site data interface for normalization
interface SiteNormalizationData {
  staff_count: number;
  no_of_vehicle: number;
}

// Filter data structure
interface FilterData {
  sites: (string | { id?: string; name?: string })[];
  cameras: (string | { id?: string; name?: string })[];
  useCases: (string | { id?: string; name?: string })[];
  severities: (string | { id?: string; name?: string })[];
  statuses: (string | { id?: string; name?: string })[];
  locationTags: (string | { id?: string; name?: string })[];
  dependentCameras?: { id?: string; name?: string }[];
}

interface UseUnifiedAnalyticsProps {
  userId: string;
  customerId: string;
}

export const useUnifiedAnalytics = ({ userId, customerId }: UseUnifiedAnalyticsProps) => {
  const { env } = useEnv();
  const { user } = useAuth();

  // ================== STATE MANAGEMENT ==================

  // Date & Filter State
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [dateFilter, setDateFilter] = useState<TimePeriodEnum | null>(TimePeriodEnum.WEEKLY);
  const [groupBy, setGroupBy] = useState<GroupBy>("uc_types");
  const [detailedFilters, setDetailedFilters] = useState<DetailedFilters>({
    sites: [],
    cameras: [],
    useCases: [],
    severities: [],
    statuses: [],
    locationTags: [],
  });

  // Chart State - Unified for both charts
  const [isWeightedView, setIsWeightedView] = useState(false);
  const [weightType, setWeightType] = useState<WeightType>("none");
  const [showComparison, setShowComparison] = useState(false);
  const [chartType, setChartType] = useState<"stacked" | "grouped">("stacked");
  const [autoApply, setAutoApply] = useState<boolean>(true);

  // Navigation State - Unified for both charts
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [independentComparisonOffset, setIndependentComparisonOffset] = useState<number>(0);

  // Lock State - Unified behavior
  const [lockState, setLockState] = useState<LockState>({
    incident: false,
    comparison: false,
  });
  const [lockedIncidentRange, setLockedIncidentRange] = useState<SimpleDateRange | null>(null);
  const [lockedComparisonRange, setLockedComparisonRange] = useState<SimpleDateRange | null>(null);

  // Legend State - Unified for both charts (now managed at component level)
  const [visibleLegends, setVisibleLegends] = useState<Record<string, boolean>>({});

  // Navigation Loading State - Shows loader immediately on navigation
  const [isNavigating, setIsNavigating] = useState(false);

  // Internal State
  const [filterData, setFilterData] = useState<FilterData>({
    sites: [],
    cameras: [],
    useCases: [],
    severities: [],
    statuses: [],
    locationTags: [],
    dependentCameras: [],
  });
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Data state
  const [filteredData, setFilteredData] = useState<DateIncidentData[]>([]);
  const [filteredComparisonData, setFilteredComparisonData] = useState<DateIncidentData[]>([]);
  const [lastSuccessfulIncidentData, setLastSuccessfulIncidentData] =
    useState<AnalyticsTableResponse | null>(null);
  const [lastSuccessfulComparisonData, setLastSuccessfulComparisonData] =
    useState<AnalyticsTableResponse | null>(null);

  // Debounce refs
  const incidentDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const comparisonDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const navigationDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  // Fetch flags
  const [shouldFetchIncident, setShouldFetchIncident] = useState(true);
  const [shouldFetchComparison, setShouldFetchComparison] = useState(false);
  const [lastIncidentFetch, setLastIncidentFetch] = useState<string>("");
  const [lastComparisonFetch, setLastComparisonFetch] = useState<string>("");

  // ================== DATA LOGIC ==================

  // Get sites data for normalization
  const sitesApiResponse = useGetSitesByCustomer(customerId);

  // Helper function to calculate date range from current state
  const calculateCurrentDateRange = useCallback((): SimpleDateRange => {
    if (dateRange && dateRange.start && dateRange.end) {
      return {
        start: dateRange.start,
        end: dateRange.end,
      };
    } else if (dateFilter) {
      const baseRange = getDateRangeForPeriod(dateFilter);
      if (!baseRange) {
        const fallback = getDateRangeForPeriod(TimePeriodEnum.WEEKLY);
        return fallback!;
      }

      if (timeOffset !== 0) {
        let offsetDays = 0;

        switch (dateFilter) {
          case TimePeriodEnum.TODAY:
          case TimePeriodEnum.YESTERDAY:
            offsetDays = timeOffset * 1;
            break;
          case TimePeriodEnum.WEEKLY:
            offsetDays = timeOffset * 7;
            break;
          case TimePeriodEnum.MONTHLY:
            offsetDays = timeOffset * 30;
            break;
          case TimePeriodEnum.QUARTERLY:
            offsetDays = timeOffset * 90;
            break;
          case TimePeriodEnum.YEARLY:
            offsetDays = timeOffset * 365;
            break;
          default:
            offsetDays = timeOffset * 7;
        }

        const offsetRange = {
          start: addDays(baseRange.start, offsetDays),
          end: addDays(baseRange.end, offsetDays),
        };
        return offsetRange;
      }

      return baseRange;
    }

    const fallback = getDateRangeForPeriod(TimePeriodEnum.WEEKLY);
    return fallback!;
  }, [dateRange, dateFilter, timeOffset]);

  // Calculate incident chart date range with lock protection
  const incidentDateRange = useMemo((): SimpleDateRange => {
    if (lockState.incident && lockedIncidentRange) {
      return lockedIncidentRange;
    }
    return calculateCurrentDateRange();
  }, [calculateCurrentDateRange, lockState.incident, lockedIncidentRange]);

  // Calculate comparison date range - unified behavior
  const comparisonDateRange = useMemo((): SimpleDateRange | null => {
    if (!showComparison) {
      return null;
    }

    if (lockState.comparison && lockedComparisonRange) {
      return lockedComparisonRange;
    }

    let baseRange: SimpleDateRange;

    // If incident is locked but comparison is not, use independent offset
    if (lockState.incident && !lockState.comparison && independentComparisonOffset !== 0) {
      const originalRange = calculateCurrentDateRange();
      let offsetDays = 0;

      if (dateFilter) {
        switch (dateFilter) {
          case TimePeriodEnum.TODAY:
          case TimePeriodEnum.YESTERDAY:
            offsetDays = independentComparisonOffset * 1;
            break;
          case TimePeriodEnum.WEEKLY:
            offsetDays = independentComparisonOffset * 7;
            break;
          case TimePeriodEnum.MONTHLY:
            offsetDays = independentComparisonOffset * 30;
            break;
          case TimePeriodEnum.QUARTERLY:
            offsetDays = independentComparisonOffset * 90;
            break;
          case TimePeriodEnum.YEARLY:
            offsetDays = independentComparisonOffset * 365;
            break;
          default:
            offsetDays = independentComparisonOffset * 7;
        }
      } else if (dateRange) {
        offsetDays = independentComparisonOffset * getDaysBetween(dateRange.start, dateRange.end);
      }

      baseRange = {
        start: addDays(originalRange.start, offsetDays),
        end: addDays(originalRange.end, offsetDays),
      };
    } else {
      // Standard behavior: comparison follows incident
      baseRange = incidentDateRange;
    }

    const previousRange = calculatePreviousPeriod(baseRange);
    return previousRange;
  }, [
    showComparison,
    lockState,
    lockedComparisonRange,
    incidentDateRange,
    calculateCurrentDateRange,
    independentComparisonOffset,
    dateFilter,
    dateRange,
  ]);

  // Convert date ranges to API query format
  const buildQueryParams = useCallback(
    (range: SimpleDateRange): AnalyticsTableQueryParams => {
      let params: AnalyticsTableQueryParams;

      if (dateFilter) {
        let timePeriod: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
        switch (dateFilter) {
          case TimePeriodEnum.TODAY:
          case TimePeriodEnum.YESTERDAY:
            timePeriod = "daily";
            break;
          case TimePeriodEnum.WEEKLY:
            timePeriod = "weekly";
            break;
          case TimePeriodEnum.MONTHLY:
            timePeriod = "monthly";
            break;
          case TimePeriodEnum.QUARTERLY:
            timePeriod = "quarterly";
            break;
          case TimePeriodEnum.YEARLY:
            timePeriod = "yearly";
            break;
          default:
            timePeriod = "weekly";
        }
        params = {
          user_id: userId,
          customer_id: customerId,
          from_date: range.start,
          to_date: range.end,
          time_period: timePeriod,
          env: env,
          timezone: user?.timezone ?? "UTC",
        };
      } else {
        params = {
          user_id: userId,
          customer_id: customerId,
          from_date: range.start,
          to_date: range.end,
          env: env,
          timezone: user?.timezone ?? "UTC",
        };
      }

      return params;
    },
    [customerId, userId, dateFilter, env],
  );

  // Build query parameters
  const incidentQueryParams = useMemo((): AnalyticsTableQueryParams => {
    return buildQueryParams(incidentDateRange);
  }, [incidentDateRange, buildQueryParams]);

  const comparisonQueryParams = useMemo((): AnalyticsTableQueryParams | null => {
    if (!comparisonDateRange) {
      return null;
    }
    return buildQueryParams(comparisonDateRange);
  }, [comparisonDateRange, buildQueryParams]);

  // API hooks
  const {
    data: incidentApiResponse,
    loading: incidentLoading,
    error: incidentError,
    execute: fetchIncidentData,
  } = useGetAnalyticsTable(incidentQueryParams);

  const {
    data: comparisonApiResponse,
    loading: comparisonLoading,
    error: comparisonError,
    execute: fetchComparisonData,
  } = useGetAnalyticsTable(comparisonQueryParams || incidentQueryParams);

  // ================== DATA PROCESSING ==================

  // Preserve successful API responses
  useEffect(() => {
    if (incidentApiResponse && !incidentError) {
      setLastSuccessfulIncidentData(incidentApiResponse);
    }
  }, [incidentApiResponse, incidentError]);

  useEffect(() => {
    if (comparisonApiResponse && !comparisonError) {
      setLastSuccessfulComparisonData(comparisonApiResponse);
    }
  }, [comparisonApiResponse, comparisonError]);

  // Reset navigation loading state when new data arrives
  useEffect(() => {
    if (!incidentLoading && !comparisonLoading && isNavigating) {
      setIsNavigating(false);
    }
  }, [incidentLoading, comparisonLoading, isNavigating]);

  // Use last successful data when current API call fails
  const effectiveIncidentData = useMemo(() => {
    if (incidentApiResponse && !incidentError) {
      return incidentApiResponse;
    }
    if (incidentError && lastSuccessfulIncidentData) {
      return lastSuccessfulIncidentData;
    }
    return incidentApiResponse;
  }, [incidentApiResponse, incidentError, lastSuccessfulIncidentData]);

  const effectiveComparisonData = useMemo(() => {
    if (comparisonApiResponse && !comparisonError) {
      return comparisonApiResponse;
    }
    if (comparisonError && lastSuccessfulComparisonData) {
      return lastSuccessfulComparisonData;
    }
    return comparisonApiResponse;
  }, [comparisonApiResponse, comparisonError, lastSuccessfulComparisonData]);

  // Build site normalization mapping
  const siteNormalizationMap = useMemo((): Record<string, SiteNormalizationData> => {
    if (!sitesApiResponse.data || sitesApiResponse.loading || sitesApiResponse.error) {
      return {};
    }

    const mapping: Record<string, SiteNormalizationData> = {};

    sitesApiResponse.data.forEach((site) => {
      const siteKey = site.name || site.id?.toString() || "";
      if (siteKey) {
        mapping[siteKey] = {
          staff_count: site.staff_count || 0,
          no_of_vehicle: site.no_of_vehicle || 0,
        };

        if (site.id && site.id.toString() !== siteKey) {
          mapping[site.id.toString()] = mapping[siteKey];
        }
      }
    });

    return mapping;
  }, [sitesApiResponse.data, sitesApiResponse.loading, sitesApiResponse.error]);

  // Helper function to extract unique values from analytics data
  const extractUniqueValues = useCallback(
    (data: AnalyticsTableResponse, comparisonData?: AnalyticsTableResponse): FilterData => {
      const allSites = new Set<string>();
      const allCameras = new Set<string>();
      const allUseCases = new Set<string>();
      const allSeverities = new Set<string>();
      const allStatuses = new Set<string>();
      const allLocationTags = new Set<string>();

      const processQuarterlyData = (quarterlyData: any) => {
        if (Array.isArray(quarterlyData)) {
          return quarterlyData;
        }
        return quarterlyData?.weeks || [];
      };

      // Process main data periods
      const mainPeriods = [
        ...(data.daily || []),
        ...(data.weekly || []),
        ...(data.monthly || []),
        ...processQuarterlyData(data.quarterly),
        ...(data.yearly || []),
        ...(data.previous_daily || []),
        ...(data.previous_weekly || []),
        ...(data.previous_monthly || []),
        ...processQuarterlyData(data.previous_quarterly),
        ...(data.previous_yearly || []),
      ];

      // Process comparison data periods if provided
      const comparisonPeriods = comparisonData
        ? [
            ...(comparisonData.daily || []),
            ...(comparisonData.weekly || []),
            ...(comparisonData.monthly || []),
            ...processQuarterlyData(comparisonData.quarterly),
            ...(comparisonData.yearly || []),
            ...(comparisonData.previous_daily || []),
            ...(comparisonData.previous_weekly || []),
            ...(comparisonData.previous_monthly || []),
            ...processQuarterlyData(comparisonData.previous_quarterly),
            ...(comparisonData.previous_yearly || []),
          ]
        : [];

      // Combine all periods
      const allPeriods = [...mainPeriods, ...comparisonPeriods];

      allPeriods.forEach((dateItem) => {
        Object.keys(dateItem.sites || {}).forEach((site) => allSites.add(site));
        Object.keys(dateItem.cameras || {}).forEach((camera) => allCameras.add(camera));
        Object.keys(dateItem.uc_types || {}).forEach((useCase) => allUseCases.add(useCase));
        Object.keys(dateItem.severities || {}).forEach((severity) => allSeverities.add(severity));
        Object.keys(dateItem.statuses || {}).forEach((status) => allStatuses.add(status));
        Object.keys(dateItem.location_tags || {}).forEach((tag) => allLocationTags.add(tag));
      });

      return {
        sites: Array.from(allSites).sort(),
        cameras: Array.from(allCameras).sort(),
        useCases: Array.from(allUseCases).sort(),
        severities: Array.from(allSeverities).sort(),
        statuses: Array.from(allStatuses).sort(),
        locationTags: Array.from(allLocationTags).sort(),
        dependentCameras: Array.from(allCameras)
          .sort()
          .map((camera) => ({ id: camera, name: camera })),
      };
    },
    [],
  );

  // Normalization functions for weighted calculations
  const inferSiteFromKey = useCallback(
    (
      key: string,
      groupByType: GroupBy,
      normalizationMap: Record<string, SiteNormalizationData>,
    ): string | null => {
      if (groupByType === "sites") {
        return normalizationMap[key] ? key : null;
      }

      if (groupByType === "cameras") {
        const sitePatterns = [
          /^([^_]+)_/,
          /^([^-]+)-/,
          /@([^@]+)$/,
          /\[([^\]]+)\]/,
          /^(.+?)\s*cam/i,
        ];

        for (const pattern of sitePatterns) {
          const match = key.match(pattern);
          if (match && match[1]) {
            const extractedSite = match[1].trim();
            if (normalizationMap[extractedSite]) {
              return extractedSite;
            }
          }
        }
      }

      if (
        groupByType === "uc_types" ||
        groupByType === "location_tags" ||
        groupByType === "severities" ||
        groupByType === "statuses"
      ) {
        const siteKeys = Object.keys(normalizationMap);
        for (const siteKey of siteKeys) {
          if (
            key.toLowerCase().includes(siteKey.toLowerCase()) ||
            siteKey.toLowerCase().includes(key.toLowerCase())
          ) {
            return siteKey;
          }
        }
      }

      return null;
    },
    [],
  );

  const getAggregateNormalizationFactor = useCallback(
    (
      selectedWeightType: WeightType,
      normalizationMap: Record<string, SiteNormalizationData>,
    ): number => {
      if (selectedWeightType === "none") {
        return 1;
      }

      const sites = Object.values(normalizationMap);
      if (sites.length === 0) {
        return 1;
      }

      let totalFactor = 0;
      sites.forEach((site) => {
        let siteFactor = 1;
        if (selectedWeightType === "people") {
          siteFactor = Math.max(site.staff_count, 1);
        } else if (selectedWeightType === "vehicle") {
          siteFactor = Math.max(site.no_of_vehicle, 1);
        }
        totalFactor += siteFactor;
      });

      return Math.max(totalFactor / sites.length, 1);
    },
    [],
  );

  const getNormalizationFactor = useCallback(
    (
      key: string,
      groupByType: GroupBy,
      selectedWeightType: WeightType,
      normalizationMap: Record<string, SiteNormalizationData>,
    ): number => {
      if (selectedWeightType === "none") {
        return 1;
      }

      const siteKey = inferSiteFromKey(key, groupByType, normalizationMap);

      if (!siteKey) {
        const aggregateFactor = getAggregateNormalizationFactor(
          selectedWeightType,
          normalizationMap,
        );
        return aggregateFactor;
      }

      const siteData = normalizationMap[siteKey];
      if (!siteData) {
        return getAggregateNormalizationFactor(selectedWeightType, normalizationMap);
      }

      let factor = 1;
      if (selectedWeightType === "people") {
        factor = Math.max(siteData.staff_count, 1);
      } else if (selectedWeightType === "vehicle") {
        factor = Math.max(siteData.no_of_vehicle, 1);
      }

      return Math.max(factor, 1);
    },
    [inferSiteFromKey, getAggregateNormalizationFactor],
  );

  // Apply weighted calculation to data
  const applyWeightedCalculationToData = useCallback(
    (
      inputData: DateIncidentData[],
      selectedGroupBy: GroupBy,
      selectedWeightType: WeightType,
      normalizationMap: Record<string, SiteNormalizationData>,
    ): DateIncidentData[] => {
      if (selectedWeightType === "none") {
        return inputData;
      }

      const hasSiteData = Object.keys(normalizationMap).length > 0;
      if (!hasSiteData) {
        return inputData;
      }

      return inputData.map((dateData) => {
        const categoryData = dateData[selectedGroupBy] || {};
        const normalizedGroup: Record<string, { absolute: number; percentage: number }> = {};

        Object.entries(categoryData).forEach(([key, value]) => {
          const normalizationFactor = getNormalizationFactor(
            key,
            selectedGroupBy,
            selectedWeightType,
            normalizationMap,
          );

          const normalizedAbsolute = (value as any).absolute / normalizationFactor;

          // CRITICAL FIX: Only include entries with meaningful values (> 0.001 threshold)
          // This prevents tiny decimal values from showing as minimal red lines
          if (normalizedAbsolute > 0.001) {
            normalizedGroup[key] = {
              absolute: normalizedAbsolute,
              percentage: (value as any).percentage,
            };
          }
        });

        return {
          ...dateData,
          [selectedGroupBy]: normalizedGroup,
        };
      });
    },
    [getNormalizationFactor],
  );
  // Process incident data with weighted calculation
  const processedIncidentData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return [];
    }

    if (!isWeightedView || weightType === "none") {
      return filteredData;
    }

    return applyWeightedCalculationToData(filteredData, groupBy, weightType, siteNormalizationMap);
  }, [
    filteredData,
    isWeightedView,
    weightType,
    groupBy,
    siteNormalizationMap,
    applyWeightedCalculationToData,
    refreshCounter,
  ]);

  // Process comparison data with weighted calculation
  const processedComparisonData = useMemo(() => {
    if (!showComparison || !filteredComparisonData || filteredComparisonData.length === 0) {
      return [];
    }

    if (!isWeightedView || weightType === "none") {
      return filteredComparisonData;
    }

    return applyWeightedCalculationToData(
      filteredComparisonData,
      groupBy,
      weightType,
      siteNormalizationMap,
    );
  }, [
    showComparison,
    filteredComparisonData,
    isWeightedView,
    weightType,
    groupBy,
    siteNormalizationMap,
    applyWeightedCalculationToData,
    refreshCounter,
  ]);

  // Calculate Y-axis maximum from the weighted data with dynamic scaling based on visible legends
  const sharedYAxisMax = useMemo(() => {
    // Early return for empty data
    if (!processedIncidentData || processedIncidentData.length === 0) {
      return isWeightedView ? 0.1 : 1;
    }

    // Ensure we have comparison data if comparison is enabled
    const comparisonDataForCalculation =
      showComparison && processedComparisonData ? processedComparisonData : [];

    try {
      const calculatedMax = calculateDynamicYMaxWithLegends(
        processedIncidentData,
        comparisonDataForCalculation,
        groupBy,
        isWeightedView,
        chartType,
        visibleLegends, // Use the visibleLegends from the hook state
        visibleLegends, // Same legend state for both charts for perfect sync
        showComparison,
      );

      // Ensure we always have a reasonable minimum
      const minScale = isWeightedView ? 0.05 : 0.5;
      return Math.max(calculatedMax, minScale);
    } catch (error) {
      console.warn("Error in sharedYAxisMax calculation:", error);
      // Fallback to a reasonable default
      return isWeightedView ? 1 : 10;
    }
  }, [
    processedIncidentData,
    processedComparisonData,
    groupBy,
    isWeightedView,
    weightType,
    chartType,
    showComparison,
    visibleLegends, // Include visibleLegends as a dependency
    refreshCounter, // Include refreshCounter to force recalculation when needed
  ]);

  // Process chart data for display (simplified since unified chart handles it)
  const processDataForChart = useCallback(
    (data: DateIncidentData[], selectedGroupBy: GroupBy): { labels: string[]; datasets: any[] } => {
      if (!data || data.length === 0) {
        return { labels: [], datasets: [] };
      }

      const labels = data.map((item) => {
        const date = new Date(item.date);

        if (item.date.includes("Q") && item.date.includes("W")) {
          return item.date;
        } else if (item.date.includes(":")) {
          return date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
        } else if (item.date.includes("Q")) {
          return item.date;
        } else {
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
      });

      return { labels, datasets: [] };
    },
    [],
  );

  // Process chart data
  const processedChartData = useMemo(() => {
    if (!processedIncidentData || processedIncidentData.length === 0) {
      return null;
    }

    return processDataForChart(processedIncidentData, groupBy);
  }, [processedIncidentData, groupBy, processDataForChart, refreshCounter]);

  // ================== EVENT HANDLERS ==================

  // Refresh chart calculations
  const refreshChartCalculations = useCallback(() => {
    console.log("🔄 FORCING COMPLETE CHART REFRESH");
    setRefreshCounter((prev) => prev + 1);
  }, []);

  // Helper function to clear legend states
  const clearLegendStates = useCallback(() => {
    setVisibleLegends({});
    // Force a refresh after clearing legends
    setRefreshCounter((prev) => prev + 1);
  }, []);

  // Enhanced debounced navigation execution
  const executeDebouncedNavigation = useCallback(() => {
    if (navigationDebounceRef.current) {
      clearTimeout(navigationDebounceRef.current);
    }

    setIsNavigating(true);

    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
  }, []);

  // Date Filter Handlers
  const handleDateRangeChange = useCallback((range: { start: string; end: string } | null) => {
    setDateRange(range);
    if (range) {
      setDateFilter(null);
      setTimeOffset(0);
    }
  }, []);

  const handleDateFilterChange = useCallback((filter: TimePeriodEnum | null) => {
    setDateFilter(filter);
    if (filter) {
      setDateRange(null);
      setTimeOffset(0);
    }
  }, []);

  const handleGroupByChange = useCallback(
    (newGroupBy: GroupBy) => {
      setGroupBy(newGroupBy);
      clearLegendStates();
    },
    [clearLegendStates],
  );

  const handleDetailedFilterChange = useCallback((newFilters: DetailedFilters) => {
    setDetailedFilters(newFilters);
  }, []);

  // Chart Control Handlers
  const handleChartTypeChange = useCallback(
    (newChartType: "stacked" | "grouped") => {
      setChartType(newChartType);
      refreshChartCalculations();
    },
    [refreshChartCalculations],
  );

  const handleWeightedViewChange = useCallback(
    (weighted: boolean) => {
      setIsWeightedView(weighted);
      setVisibleLegends({});
      refreshChartCalculations();
    },
    [refreshChartCalculations],
  );

  const handleWeightTypeChange = useCallback(
    (newWeightType: WeightType) => {
      setWeightType(newWeightType);
      setVisibleLegends({});
      refreshChartCalculations();
    },
    [refreshChartCalculations],
  );

  const handleComparisonToggle = useCallback((show: boolean) => {
    setShowComparison(show);
  }, []);

  const handleAutoApplyChange = useCallback((newAutoApply: boolean) => {
    setAutoApply(newAutoApply);
  }, []);

  // Unified Navigation Handlers
  const handlePreviousPeriod = useCallback(() => {
    if (lockState.incident && lockState.comparison) {
      return;
    }

    if (pendingNavigationRef.current) {
      return;
    }

    pendingNavigationRef.current = () => {
      if (dateRange && dateRange.start && dateRange.end) {
        const currentRange = { start: dateRange.start, end: dateRange.end };
        const previousRange = calculatePreviousPeriod(currentRange);
        setDateRange(previousRange);
        setDateFilter(null);
      } else {
        setTimeOffset((prev) => prev - 1);
      }
    };

    executeDebouncedNavigation();
  }, [lockState, dateRange, timeOffset, executeDebouncedNavigation]);

  const handleNextPeriod = useCallback(() => {
    if (lockState.incident && lockState.comparison) {
      return;
    }

    if (pendingNavigationRef.current) {
      return;
    }

    pendingNavigationRef.current = () => {
      if (dateRange && dateRange.start && dateRange.end) {
        const currentRange = { start: dateRange.start, end: dateRange.end };
        const nextRange = calculateNextPeriod(currentRange);
        setDateRange(nextRange);
        setDateFilter(null);
      } else {
        setTimeOffset((prev) => prev + 1);
      }
    };

    executeDebouncedNavigation();
  }, [lockState, dateRange, timeOffset, executeDebouncedNavigation]);

  // Chart-specific navigation
  const handleChartTimeNavigation = useCallback(
    (direction: "previous" | "next", chartType: "incident" | "comparison") => {
      if (lockState.incident && lockState.comparison) {
        return;
      }

      if (pendingNavigationRef.current) {
        return;
      }

      pendingNavigationRef.current = () => {
        if (chartType === "comparison" && lockState.incident && !lockState.comparison) {
          const newIndependentOffset =
            direction === "next"
              ? independentComparisonOffset + 1
              : independentComparisonOffset - 1;
          setIndependentComparisonOffset(newIndependentOffset);
        } else {
          if (dateRange && dateRange.start && dateRange.end) {
            const currentRange = { start: dateRange.start, end: dateRange.end };
            const newRange =
              direction === "next"
                ? calculateNextPeriod(currentRange)
                : calculatePreviousPeriod(currentRange);
            setDateRange(newRange);
            setDateFilter(null);
          } else {
            const newOffset = direction === "next" ? timeOffset + 1 : timeOffset - 1;
            setTimeOffset(newOffset);
          }
        }
      };

      executeDebouncedNavigation();
    },
    [lockState, timeOffset, independentComparisonOffset, dateRange, executeDebouncedNavigation],
  );

  // Convenience handlers for backward compatibility
  const handleIncidentTimeNavigation = useCallback(
    (direction: "previous" | "next") => {
      handleChartTimeNavigation(direction, "incident");
    },
    [handleChartTimeNavigation],
  );

  const handleComparisonTimeNavigation = useCallback(
    (direction: "previous" | "next") => {
      handleChartTimeNavigation(direction, "comparison");
    },
    [handleChartTimeNavigation],
  );

  // Lock Handlers
  const handleIncidentLockToggle = useCallback(() => {
    setLockState((prev: LockState) => {
      const newState = { ...prev, incident: !prev.incident };

      if (newState.incident) {
        setLockedIncidentRange(incidentDateRange);
      } else {
        setLockedIncidentRange(null);
      }

      return newState;
    });
  }, [incidentDateRange]);

  const handleComparisonLockToggle = useCallback(() => {
    setLockState((prev: LockState) => {
      const newState = { ...prev, comparison: !prev.comparison };

      if (newState.comparison && showComparison && comparisonDateRange) {
        setLockedComparisonRange(comparisonDateRange);
      } else if (!newState.comparison) {
        setLockedComparisonRange(null);
      }

      return newState;
    });
  }, [showComparison, comparisonDateRange]);

  // Unified Legend Handlers
  const handleLegendClick = useCallback((legendLabel: string, isVisible: boolean) => {
    setVisibleLegends((prev) => ({
      ...prev,
      [legendLabel]: isVisible,
    }));
  }, []);

  // For backward compatibility
  const handleIncidentLegendClick = handleLegendClick;
  const handleComparisonLegendClick = handleLegendClick;

  // Master clear handler
  const handleClearAll = useCallback(() => {
    setDateRange(null);
    setDateFilter(TimePeriodEnum.WEEKLY);
    setGroupBy("uc_types");
    setDetailedFilters({
      sites: [],
      cameras: [],
      useCases: [],
      severities: [],
      statuses: [],
      locationTags: [],
    });
    setIsWeightedView(false);
    setWeightType("none");
    setShowComparison(false);
    setChartType("stacked");
    setTimeOffset(0);
    setIndependentComparisonOffset(0);
    setLockState({
      incident: false,
      comparison: false,
    });
    setLockedIncidentRange(null);
    setLockedComparisonRange(null);
    clearLegendStates();
  }, [clearLegendStates]);

  // Data change handlers
  const handleFilteredDataChange = useCallback((data: DateIncidentData[]) => {
    setFilteredData(data);
  }, []);

  const handleFilteredComparisonDataChange = useCallback((data: DateIncidentData[]) => {
    setFilteredComparisonData(data);
  }, []);

  // ================== API CALL MANAGEMENT ==================

  // Debounced API call functions
  const debouncedFetchIncident = useCallback(() => {
    if (incidentDebounceRef.current) {
      clearTimeout(incidentDebounceRef.current);
    }

    incidentDebounceRef.current = setTimeout(() => {
      const queryKey = JSON.stringify(incidentQueryParams);
      setLastIncidentFetch(queryKey);
      fetchIncidentData();
      setShouldFetchIncident(false);
    }, 200);
  }, [incidentQueryParams, fetchIncidentData]);

  const debouncedFetchComparison = useCallback(() => {
    if (comparisonDebounceRef.current) {
      clearTimeout(comparisonDebounceRef.current);
    }

    comparisonDebounceRef.current = setTimeout(() => {
      const queryKey = comparisonQueryParams ? JSON.stringify(comparisonQueryParams) : "";
      setLastComparisonFetch(queryKey);
      fetchComparisonData();
      setShouldFetchComparison(false);
    }, 200);
  }, [comparisonQueryParams, fetchComparisonData]);

  // API fetch effects
  useEffect(() => {
    if (!shouldFetchIncident) return;

    const queryKey = JSON.stringify(incidentQueryParams);
    if (queryKey === lastIncidentFetch) {
      setShouldFetchIncident(false);
      return;
    }

    debouncedFetchIncident();
  }, [shouldFetchIncident, incidentQueryParams, lastIncidentFetch, debouncedFetchIncident]);

  useEffect(() => {
    if (
      !shouldFetchComparison ||
      lockState.comparison ||
      !showComparison ||
      !comparisonQueryParams
    ) {
      return;
    }

    const queryKey = JSON.stringify(comparisonQueryParams);
    if (queryKey === lastComparisonFetch && queryKey !== "") {
      setShouldFetchComparison(false);
      return;
    }

    debouncedFetchComparison();
  }, [
    shouldFetchComparison,
    lockState.comparison,
    showComparison,
    comparisonQueryParams,
    lastComparisonFetch,
    debouncedFetchComparison,
  ]);

  // Trigger fetch when parameters change
  useEffect(() => {
    const queryKey = JSON.stringify(incidentQueryParams);
    if (!lockState.incident && queryKey !== lastIncidentFetch) {
      setShouldFetchIncident(true);
    }
  }, [incidentQueryParams, lockState.incident, lastIncidentFetch]);

  useEffect(() => {
    const queryKey = comparisonQueryParams ? JSON.stringify(comparisonQueryParams) : "";
    if (
      !lockState.comparison &&
      showComparison &&
      comparisonQueryParams &&
      queryKey !== lastComparisonFetch
    ) {
      setShouldFetchComparison(true);
    }
  }, [comparisonQueryParams, lockState.comparison, showComparison, lastComparisonFetch]);

  // Update filter data and selected sites
  const processedFilterData = useMemo(() => {
    if (!effectiveIncidentData) return null;
    // Pass comparison data when comparison mode is enabled
    return extractUniqueValues(
      effectiveIncidentData,
      showComparison ? effectiveComparisonData : undefined,
    );
  }, [effectiveIncidentData, effectiveComparisonData, showComparison, extractUniqueValues]);

  useEffect(() => {
    if (processedFilterData) {
      setFilterData(processedFilterData);
    }
  }, [processedFilterData]);

  useEffect(() => {
    setSelectedSites(detailedFilters.sites);
  }, [detailedFilters.sites]);

  // ================== RETURN VALUES ==================

  return {
    // State
    dateRange,
    dateFilter,
    groupBy,
    detailedFilters,
    isWeightedView,
    weightType,
    showComparison,
    chartType,
    autoApply,
    timeOffset,
    independentComparisonOffset,
    lockState,
    lockedIncidentRange,
    lockedComparisonRange,
    visibleLegends,
    filterData,
    selectedSites,
    refreshCounter,

    // Processed Data
    processedIncidentData,
    processedComparisonData,
    processedChartData,
    sharedYAxisMax,

    // API Data
    effectiveIncidentData,
    effectiveComparisonData,

    // Loading States
    incidentLoading,
    comparisonLoading,
    isNavigating,

    // Error States
    incidentError,

    // Date Ranges
    incidentDateRange,
    comparisonDateRange,

    // Filtered Data
    filteredData,
    filteredComparisonData,

    // Event Handlers
    handleDateRangeChange,
    handleDateFilterChange,
    handleGroupByChange,
    handleDetailedFilterChange,
    handleChartTypeChange,
    handleWeightedViewChange,
    handleWeightTypeChange,
    handleComparisonToggle,
    handleAutoApplyChange,
    handlePreviousPeriod,
    handleNextPeriod,
    handleIncidentTimeNavigation,
    handleComparisonTimeNavigation,
    handleIncidentLockToggle,
    handleComparisonLockToggle,
    handleLegendClick,
    handleIncidentLegendClick,
    handleComparisonLegendClick,
    handleClearAll,
    handleFilteredDataChange,
    handleFilteredComparisonDataChange,
    refreshChartCalculations,

    // For external use
    setFilterData,
    setSelectedSites,
  };
};
