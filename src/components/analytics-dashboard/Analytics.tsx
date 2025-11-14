import { TimePeriodEnum } from "@/api/types";
import { BarChart3 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Loading from "../Loading";
import CounterAnalytics from "./components/CounterAnalytics";
import type { DashboardWidget } from "./components/DragDropProvider";
import { DragDropProvider, useDragDrop } from "./components/DragDropProvider";
import { DraggableWidget } from "./components/DraggableWidget";
import { FilterPanel } from "./components/FilterPanel";
import { UnifiedChart } from "./components/UnifiedChart";
import { useUnifiedAnalytics } from "./components/hooks/useUnifiedAnalytics";
import {
  calculateDynamicYMaxWithLegends,
  extractLegendKeysFromData,
} from "./components/utils/chartUtils";
import { formatDateRange } from "./components/utils/dateUtils";
export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const customerId = user?.customer_id ?? "";
  const userId = user?.id ?? "";
  const [currentEnv, setCurrentEnv] = useState<"real" | "virtual">(() => {
    const storedEnv = localStorage.getItem("hawkview-env");
    return storedEnv === "virtual" ? "virtual" : "real";
  });

  // Use the unified analytics hook
  const {
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
    timeOffset: incidentTimeOffset,
    independentComparisonOffset,
    lockState,
    visibleLegends,
    filterData,
    selectedSites,

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
    handleIncidentLegendClick,
    handleComparisonLegendClick,
    handleClearAll,
    handleFilteredDataChange,
    handleFilteredComparisonDataChange,
  } = useUnifiedAnalytics({ userId, customerId });

  // ENHANCED: Global legend state management with better synchronization
  const [globalVisibleLegends, setGlobalVisibleLegends] = useState<Record<string, boolean>>({});
  const [forceRefreshCounter, setForceRefreshCounter] = useState(0);

  // Force refresh function for legend changes
  const forceRefresh = useCallback(() => {
    setForceRefreshCounter((prev) => prev + 1);
  }, []);

  // Listen for environment changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "hawkview-env") {
        const newEnv = e.newValue === "virtual" ? "virtual" : "real";
        console.log("Environment changed to:", newEnv);
        setCurrentEnv(newEnv);
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener("storage", handleStorageChange);

    // Also create a custom event for same-tab changes
    const handleCustomEnvChange = (e: CustomEvent) => {
      const newEnv = e.detail === "virtual" ? "virtual" : "real";
      console.log("Environment changed (same tab) to:", newEnv);
      setCurrentEnv(newEnv);
    };

    window.addEventListener("envChange" as any, handleCustomEnvChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("envChange" as any, handleCustomEnvChange);
    };
  }, []);

  // ENHANCED: Initialize and synchronize global legend state
  useEffect(() => {
    // Get all unique legend keys from both datasets
    const incidentKeys = processedIncidentData
      ? extractLegendKeysFromData(processedIncidentData, groupBy)
      : [];
    const comparisonKeys =
      processedComparisonData && showComparison
        ? extractLegendKeysFromData(processedComparisonData, groupBy)
        : [];

    // Combine all unique keys
    const allUniqueKeys = Array.from(new Set([...incidentKeys, ...comparisonKeys]));

    if (allUniqueKeys.length > 0) {
      // Check if we need to update the legend state
      const currentKeys = Object.keys(globalVisibleLegends);
      const needsUpdate =
        allUniqueKeys.length !== currentKeys.length ||
        allUniqueKeys.some((key) => !(key in globalVisibleLegends));

      if (needsUpdate) {
        const newLegendState = allUniqueKeys.reduce(
          (acc, key) => {
            // Preserve existing visibility state, default to true for new keys
            acc[key] = globalVisibleLegends[key] !== undefined ? globalVisibleLegends[key] : true;
            return acc;
          },
          {} as Record<string, boolean>,
        );

        setGlobalVisibleLegends(newLegendState);
      }
    }
  }, [
    processedIncidentData,
    processedComparisonData,
    groupBy,
    showComparison,
    isWeightedView,
    weightType,
  ]);

  // ENHANCED: Reset legends when significant changes occur
  useEffect(() => {
    if (processedIncidentData && processedIncidentData.length > 0) {
      const incidentKeys = extractLegendKeysFromData(processedIncidentData, groupBy);
      const comparisonKeys =
        processedComparisonData && showComparison
          ? extractLegendKeysFromData(processedComparisonData, groupBy)
          : [];

      const allKeys = Array.from(new Set([...incidentKeys, ...comparisonKeys]));

      // Reset all to visible when groupBy, weightType, or isWeightedView changes
      const resetState = allKeys.reduce(
        (acc, key) => {
          acc[key] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );

      setGlobalVisibleLegends(resetState);
      forceRefresh();
    }
  }, [groupBy, isWeightedView, weightType, forceRefresh]); // Only reset on these specific changes

  // CRITICAL: Enhanced Y-axis calculation with better error handling
  const synchronizedYAxisMax = useMemo(() => {
    // Ensure we have data before calculating
    if (!processedIncidentData || processedIncidentData.length === 0) {
      return isWeightedView ? 0.1 : 1;
    }

    // Ensure we have valid legend state
    const hasValidLegendState = Object.keys(globalVisibleLegends).length > 0;

    try {
      const calculatedMax = calculateDynamicYMaxWithLegends(
        processedIncidentData,
        showComparison && processedComparisonData ? processedComparisonData : [],
        groupBy,
        isWeightedView,
        chartType,
        globalVisibleLegends, // Use synchronized state for both
        globalVisibleLegends, // Same state ensures perfect synchronization
        showComparison,
      );

      // Ensure we have a reasonable minimum scale
      const minScale = isWeightedView ? 0.05 : 0.5;
      const finalMax = Math.max(calculatedMax, minScale);

      return finalMax;
    } catch (error) {
      console.warn("Error calculating synchronized Y-axis max:", error);
      // Fallback to a reasonable default
      return isWeightedView ? 1 : 10;
    }
  }, [
    processedIncidentData,
    processedComparisonData,
    groupBy,
    isWeightedView,
    chartType,
    globalVisibleLegends,
    showComparison,
    forceRefreshCounter, // Include refresh counter to force recalculation
  ]);

  // ENHANCED: Global legend click handler with improved synchronization
  const handleGlobalLegendClick = useCallback(
    (legendLabel: string, isVisible: boolean) => {
      // Update global legend state immediately
      setGlobalVisibleLegends((prev) => {
        const newState = {
          ...prev,
          [legendLabel]: isVisible,
        };

        // Force a refresh to trigger Y-axis recalculation
        setTimeout(() => forceRefresh(), 0);

        return newState;
      });

      // Also call the original handlers for compatibility
      if (handleIncidentLegendClick) {
        handleIncidentLegendClick(legendLabel, isVisible);
      }
      if (handleComparisonLegendClick) {
        handleComparisonLegendClick(legendLabel, isVisible);
      }
    },
    [handleIncidentLegendClick, handleComparisonLegendClick, forceRefresh],
  );

  // Format date ranges for display
  const formattedIncidentDateRange = useMemo(() => {
    return formatDateRange(incidentDateRange);
  }, [incidentDateRange]);

  const formattedComparisonDateRange = useMemo(() => {
    if (!comparisonDateRange) return null;
    return formatDateRange(comparisonDateRange);
  }, [comparisonDateRange]);

  // Check if comparison can be shown
  const canShowComparison = useMemo(() => {
    return true;
  }, []);

  // Build query parameters for debugging
  const incidentQueryParams = useMemo(() => {
    return {
      user_id: userId,
      customer_id: customerId,
      from_date: incidentDateRange.start,
      to_date: incidentDateRange.end,
      time_period: dateFilter
        ? dateFilter === TimePeriodEnum.TODAY || dateFilter === TimePeriodEnum.YESTERDAY
          ? "daily"
          : dateFilter === TimePeriodEnum.WEEKLY
            ? "weekly"
            : dateFilter === TimePeriodEnum.MONTHLY
              ? "monthly"
              : dateFilter === TimePeriodEnum.QUARTERLY
                ? "quarterly"
                : dateFilter === TimePeriodEnum.YEARLY
                  ? "yearly"
                  : "weekly"
        : undefined,
    };
  }, [customerId, userId, incidentDateRange, dateFilter]);

  const comparisonQueryParams = useMemo(() => {
    if (!comparisonDateRange) return null;
    return {
      user_id: userId,
      customer_id: customerId,
      from_date: comparisonDateRange.start,
      to_date: comparisonDateRange.end,
      time_period: dateFilter
        ? dateFilter === TimePeriodEnum.TODAY || dateFilter === TimePeriodEnum.YESTERDAY
          ? "daily"
          : dateFilter === TimePeriodEnum.WEEKLY
            ? "weekly"
            : dateFilter === TimePeriodEnum.MONTHLY
              ? "monthly"
              : dateFilter === TimePeriodEnum.QUARTERLY
                ? "quarterly"
                : dateFilter === TimePeriodEnum.YEARLY
                  ? "yearly"
                  : "weekly"
        : undefined,
    };
  }, [customerId, userId, comparisonDateRange, dateFilter]);

  // Enhanced widgets with better Y-axis synchronization
  const initialWidgets = useMemo((): DashboardWidget[] => {
    const storedEnv = localStorage.getItem("hawkview-env");
    const actualEnv = storedEnv === "virtual" ? "virtual" : "real";
    const widgets: DashboardWidget[] = [
      {
        id: "filters",
        type: "filters",
        title: "Filters & Controls",
        component: FilterPanel,
        props: {
          userId: userId,
          env: actualEnv,
          dateRange,
          dateFilter,
          groupBy,
          onDateRangeChange: handleDateRangeChange,
          onDateFilterChange: handleDateFilterChange,
          onGroupByChange: handleGroupByChange,
          onDetailedFilterChange: handleDetailedFilterChange,
          onFilteredDataChange: handleFilteredDataChange,
          onFilteredComparisonDataChange: handleFilteredComparisonDataChange,
          onClearAll: handleClearAll,
          rawData: effectiveIncidentData,
          comparisonRawData: effectiveComparisonData,
          siteOptions: filterData.sites,
          cameraOptions: filterData.cameras,
          useCaseOptions: filterData.useCases,
          severityOptions: filterData.severities,
          statusOptions: filterData.statuses,
          locationTagOptions: filterData.locationTags,
          dependentCameraOptions: filterData.dependentCameras,
          selectedSites: selectedSites,
          autoApply,
          onAutoApplyChange: handleAutoApplyChange,
          detailedFilters: detailedFilters,
          showComparison: showComparison,
          onComparisonToggle: handleComparisonToggle,
          canShowComparison: canShowComparison,
          onPreviousPeriod: handlePreviousPeriod,
          onNextPeriod: handleNextPeriod,
          queryParams: incidentQueryParams,
          comparisonQueryParams: comparisonQueryParams,
        },
      },
      {
        id: "chart",
        type: "chart",
        title: "Incident Analytics Chart",
        component: UnifiedChart,
        props: {
          variant: "incident",
          timePeriod: dateFilter || TimePeriodEnum.WEEKLY,
          groupBy,
          filters: detailedFilters,
          data: processedIncidentData,
          comparisonData: showComparison ? processedComparisonData : [],
          chartType,
          isWeightedView,
          weightType,
          showComparison,
          currentDateRange: {
            from_date: incidentDateRange.start,
            to_date: incidentDateRange.end,
          },
          timeOffset: incidentTimeOffset,
          isLocked: lockState.incident,
          isLoading: incidentLoading || isNavigating,
          synchronizedMaxYValue: synchronizedYAxisMax,
          visibleLegends: globalVisibleLegends,
          onChartTypeChange: handleChartTypeChange,
          onWeightedViewChange: handleWeightedViewChange,
          onWeightTypeChange: handleWeightTypeChange,
          onTimeNavigate: handleIncidentTimeNavigation,
          onLockToggle: handleIncidentLockToggle,
          onLegendVisibilityChange: handleGlobalLegendClick,
          debugInfo: {
            rawDataLength: effectiveIncidentData?.weekly?.length || 0,
            filteredDataLength: processedIncidentData.length,
            hasProcessedData: !!processedChartData,
            processedDatasets: processedChartData?.datasets?.length || 0,
            timeOffset: incidentTimeOffset,
            isLocked: lockState.incident,
            dateRange: formattedIncidentDateRange,
            customRange: dateRange,
            predefinedFilter: dateFilter,
            synchronizedYMax: synchronizedYAxisMax,
            legendCount: Object.keys(globalVisibleLegends).length,
            visibleLegendCount: Object.keys(globalVisibleLegends).filter(
              (k) => globalVisibleLegends[k],
            ).length,
          },
        },
      },
    ];

    // Add comparison chart widget if conditions are met
    if (showComparison && comparisonDateRange) {
      const timePeriodForChart = dateFilter || TimePeriodEnum.WEEKLY;
      widgets.push({
        id: "comparison",
        type: "comparison",
        title: `Previous ${timePeriodForChart.charAt(0).toUpperCase() + timePeriodForChart.slice(1)} Comparison`,
        component: UnifiedChart,
        props: {
          variant: "comparison",
          timePeriod: timePeriodForChart,
          groupBy,
          data: processedComparisonData,
          chartType,
          isWeightedView,
          weightType,
          currentDateRange: {
            from_date: comparisonDateRange.start,
            to_date: comparisonDateRange.end,
          },
          timeOffset: lockState.incident ? independentComparisonOffset : incidentTimeOffset,
          isLocked: lockState.comparison,
          isLoading: comparisonLoading || isNavigating,
          synchronizedMaxYValue: synchronizedYAxisMax,
          visibleLegends: globalVisibleLegends,
          onTimeNavigate: handleComparisonTimeNavigation,
          onLockToggle: handleComparisonLockToggle,
          onLegendVisibilityChange: handleGlobalLegendClick,
          debugInfo: {
            dateRange: formattedComparisonDateRange,
            isLocked: lockState.comparison,
            incidentOffset: incidentTimeOffset,
            independentOffset: independentComparisonOffset,
            incidentLocked: lockState.incident,
            customRange: dateRange,
            predefinedFilter: dateFilter,
            synchronizedYMax: synchronizedYAxisMax,
            legendCount: Object.keys(globalVisibleLegends).length,
            visibleLegendCount: Object.keys(globalVisibleLegends).filter(
              (k) => globalVisibleLegends[k],
            ).length,
          },
        },
      });
    }
    widgets.push({
      id: "standalone-counter",
      type: "counter",
      title: "Counter Analytics",
      component: CounterAnalytics,
      props: {
        dateRange: dateRange,
        dateFilter: dateFilter,
        incidentDateRange: incidentDateRange,
      },
    });

    return widgets;
  }, [
    // Core state dependencies
    userId,
    currentEnv,
    dateRange,
    dateFilter,
    groupBy,
    detailedFilters,
    isWeightedView,
    weightType,
    showComparison,
    chartType,
    autoApply,
    incidentTimeOffset,
    independentComparisonOffset,
    lockState,
    visibleLegends,
    filterData,
    selectedSites,

    // Data dependencies
    processedIncidentData,
    processedComparisonData,
    processedChartData,
    sharedYAxisMax,
    synchronizedYAxisMax,

    // API data dependencies
    effectiveIncidentData,
    effectiveComparisonData,

    // Loading and date state dependencies
    incidentLoading,
    comparisonLoading,
    isNavigating,
    incidentDateRange,
    comparisonDateRange,
    formattedIncidentDateRange,
    formattedComparisonDateRange,
    canShowComparison,
    incidentQueryParams,
    comparisonQueryParams,

    // Enhanced global legend state dependencies
    globalVisibleLegends,
    forceRefreshCounter,

    // Event handler dependencies
    handleDateRangeChange,
    handleDateFilterChange,
    handleGroupByChange,
    handleDetailedFilterChange,
    handleFilteredDataChange,
    handleFilteredComparisonDataChange,
    handleClearAll,
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
    handleGlobalLegendClick,
  ]);

  // Show loading only on initial load (when there's no data yet)
  const isInitialLoading = incidentLoading && !effectiveIncidentData;

  return (
    <div
      className="flex w-full max-w-full flex-col overflow-visible rounded-xl bg-gray-100 p-2 shadow-md sm:p-4 lg:p-6"
      style={{ height: "87vh", position: "relative", zIndex: 1 }}
    >
      <div
        className="m-0 flex w-full max-w-full flex-1 flex-col p-0"
        style={{
          minHeight: 0,
          overflow: "auto",
          position: "relative",
        }}
      >
        {isInitialLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loading />
          </div>
        ) : incidentError && !effectiveIncidentData ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center text-red-600">
              <BarChart3 size={32} className="mx-auto mb-2 text-red-300" />
              <p className="text-sm font-semibold">Failed to load analytics data</p>
              <p className="text-xs text-gray-400">Please try again later</p>
              <div className="mt-2 text-xs text-gray-500">
                <p>
                  Filter: {dateFilter || "Custom"} | Offset: {incidentTimeOffset}
                </p>
                <p>Date Range: {formattedIncidentDateRange}</p>
                {dateRange && (
                  <p>
                    Custom Range: {dateRange.start} to {dateRange.end}
                  </p>
                )}
                <p>Synchronized Y-max: {synchronizedYAxisMax.toFixed(3)}</p>
                <p>
                  Global Visible Legends:{" "}
                  {Object.keys(globalVisibleLegends).filter((k) => globalVisibleLegends[k]).length}{" "}
                  / {Object.keys(globalVisibleLegends).length}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <DragDropProvider key={currentEnv} initialWidgets={initialWidgets}>
            <DashboardContent
              dateRange={dateRange}
              dateFilter={dateFilter}
              incidentDateRange={incidentDateRange}
            />
          </DragDropProvider>
        )}
      </div>
    </div>
  );
};

// DashboardContent component
interface DashboardContentProps {
  dateRange: { start: string; end: string } | null;
  dateFilter: TimePeriodEnum | null;
  incidentDateRange: { start: string; end: string };
}

const DashboardContent: React.FC<DashboardContentProps> = ({}) => {
  const { widgets } = useDragDrop();

  return (
    <div className="w-full max-w-full space-y-4 overflow-visible sm:space-y-6">
      {widgets.map((widget) => {
        const Component = widget.component;

        return (
          <DraggableWidget key={widget.id} widget={widget}>
            <div className="w-full max-w-full">
              <Component {...widget.props} />
            </div>
          </DraggableWidget>
        );
      })}
    </div>
  );
};

export default Analytics;
