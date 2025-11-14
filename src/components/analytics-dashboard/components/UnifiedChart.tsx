import { DateIncidentData, GroupBy, TimePeriodEnum } from "@/api/types";
import {
  BarChart3,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  LockKeyhole,
  LockKeyholeOpen,
  Users,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GroupedChart from "../../../assets/icons/GroupedChart.svg";
import StackedChart from "../../../assets/icons/StackedChart.svg";
import { getColorForKey, initializeColorsForKeys } from "./utils/chartColors";
import {
  calculateDynamicYMaxWithLegends,
  extractLegendKeysFromData,
  formatYAxisLabel,
} from "./utils/chartUtils";
import { formatDateRangeForDisplay, getPeriodDisplayName } from "./utils/dateUtils";

export interface DetailedFilters {
  [key: string]: any;
}

type WeightType = "none" | "people" | "vehicle";
type ChartVariant = "incident" | "comparison";

interface UnifiedChartProps {
  variant: ChartVariant;
  timePeriod: TimePeriodEnum;
  groupBy: GroupBy;
  filters?: DetailedFilters;
  data: DateIncidentData[];
  comparisonData?: DateIncidentData[];

  // Chart controls
  chartType?: "stacked" | "grouped";
  isWeightedView?: boolean;
  weightType?: WeightType;
  showComparison?: boolean;

  // Navigation & Lock
  currentDateRange?: { from_date: string; to_date: string };
  timeOffset?: number;
  isLocked?: boolean;
  isLoading?: boolean;
  isTransitioning?: boolean;

  // Y-axis synchronization
  synchronizedMaxYValue?: number;

  // Legend synchronization
  visibleLegends?: Record<string, boolean>;

  // Event handlers
  onChartTypeChange?: (chartType: "stacked" | "grouped") => void;
  onWeightedViewChange?: (isWeighted: boolean) => void;
  onWeightTypeChange?: (weightType: WeightType) => void;
  onTimeNavigate?: (direction: "previous" | "next") => void;
  onLockToggle?: () => void;
  onLegendVisibilityChange?: (legendLabel: string, isVisible: boolean) => void;

  // Debug info
  debugInfo?: {
    [key: string]: any;
  };
}

export const UnifiedChart: React.FC<UnifiedChartProps> = ({
  variant,
  timePeriod,
  groupBy,
  data,
  comparisonData = [],
  chartType = "stacked",
  isWeightedView = false,
  weightType = "none",
  showComparison = false,
  currentDateRange,
  timeOffset = 0,
  isLocked = false,
  isLoading = false,
  synchronizedMaxYValue,
  visibleLegends = {},
  onChartTypeChange,
  onWeightedViewChange,
  onWeightTypeChange,
  onTimeNavigate,
  onLockToggle,
  onLegendVisibilityChange,
  debugInfo,
}) => {
  const [localVisibleLegends, setLocalVisibleLegends] = useState<Record<string, boolean>>({});

  // Helper functions defined first
  const getPeriodComparisonLabel = useCallback((period: TimePeriodEnum): string => {
    switch (period) {
      case TimePeriodEnum.TODAY:
        return "Yesterday";
      case TimePeriodEnum.YESTERDAY:
        return "Day Before Yesterday";
      case TimePeriodEnum.WEEKLY:
        return "Previous Week";
      case TimePeriodEnum.MONTHLY:
        return "Previous Month";
      case TimePeriodEnum.QUARTERLY:
        return "Previous Quarter";
      case TimePeriodEnum.YEARLY:
        return "Previous Year";
      default:
        return "Previous Period";
    }
  }, []);

  const formatDateLabel = useCallback((dateString: string, timePeriod: TimePeriodEnum): string => {
    if (timePeriod === TimePeriodEnum.QUARTERLY) {
      return dateString;
    }

    try {
      const date = new Date(dateString.replace(/-/g, "/"));

      if (timePeriod === TimePeriodEnum.YEARLY) {
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${month} - ${year}`;
      }

      if (timePeriod === TimePeriodEnum.WEEKLY || timePeriod === TimePeriodEnum.MONTHLY) {
        const dayOfMonth = date.getDate();
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayOfWeek = days[date.getDay()];
        return `${dayOfWeek}-${dayOfMonth}`;
      }

      return dateString;
    } catch {
      return dateString;
    }
  }, []);

  // Use parent's visible legends state, fall back to local state
  const effectiveVisibleLegends = useMemo(() => {
    return Object.keys(visibleLegends).length > 0 ? visibleLegends : localVisibleLegends;
  }, [visibleLegends, localVisibleLegends]);

  // Initialize local legend state when data changes
  useEffect(() => {
    if (data && data.length > 0 && Object.keys(visibleLegends).length === 0) {
      const legendKeys = extractLegendKeysFromData(data, groupBy);
      const initialLegendState = legendKeys.reduce(
        (acc, key) => {
          acc[key] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );
      setLocalVisibleLegends(initialLegendState);
    }
  }, [data, groupBy, isWeightedView, weightType, visibleLegends]);

  // Update local state when parent's visible legends change
  useEffect(() => {
    if (Object.keys(visibleLegends).length > 0) {
      setLocalVisibleLegends(visibleLegends);
    }
  }, [visibleLegends]);

  // Calculate dynamic Y-axis max if not provided
  const calculatedMaxYValue = useMemo(() => {
    if (synchronizedMaxYValue) return synchronizedMaxYValue;

    if (!data || data.length === 0) {
      return isWeightedView ? 1 : 10;
    }

    const maxY = calculateDynamicYMaxWithLegends(
      data,
      comparisonData,
      groupBy,
      isWeightedView,
      chartType,
      effectiveVisibleLegends,
      effectiveVisibleLegends,
      showComparison,
    );

    return maxY;
  }, [
    synchronizedMaxYValue,
    data,
    comparisonData,
    groupBy,
    isWeightedView,
    chartType,
    effectiveVisibleLegends,
    showComparison,
  ]);

  // Event handlers
  const handleTimeNavigation = useCallback(
    (direction: "previous" | "next") => {
      if (isLocked || isLoading) return;
      onTimeNavigate?.(direction);
    },
    [isLocked, isLoading, onTimeNavigate],
  );

  const handleLockToggle = useCallback(() => {
    onLockToggle?.();
  }, [onLockToggle]);

  const handleChartTypeChange = useCallback(
    (newChartType: "stacked" | "grouped") => {
      onChartTypeChange?.(newChartType);
    },
    [onChartTypeChange],
  );

  const handleWeightTypeChange = useCallback(
    (type: "people" | "vehicle") => {
      let newWeightType: WeightType;

      if (
        (type === "people" && weightType === "people") ||
        (type === "vehicle" && weightType === "vehicle")
      ) {
        newWeightType = "none";
      } else {
        newWeightType = type;
      }

      const hasSelection = newWeightType !== "none";
      onWeightedViewChange?.(hasSelection);
      onWeightTypeChange?.(newWeightType);
    },
    [weightType, onWeightedViewChange, onWeightTypeChange],
  );

  // Computed values
  const formattedDateRange = useMemo(() => {
    if (variant === "comparison") {
      // Show actual date range for comparison chart instead of "Previous Week"
      return formatDateRangeForDisplay(
        currentDateRange || { from_date: "", to_date: "" },
        timePeriod,
      );
    }
    return formatDateRangeForDisplay(
      currentDateRange || { from_date: "", to_date: "" },
      timePeriod,
    );
  }, [variant, currentDateRange, timePeriod]);

  const periodDisplayName = useMemo(() => {
    return getPeriodDisplayName(timePeriod);
  }, [timePeriod]);

  const isAtCurrentPeriod = useMemo(() => {
    return timeOffset === 0;
  }, [timeOffset]);

  const chartTitle = useMemo(() => {
    if (variant === "comparison") {
      const comparisonLabel = getPeriodComparisonLabel(timePeriod);
      return `${comparisonLabel} - ${groupBy.replace("_", " ").toUpperCase()}`;
    }
    return `Grouped By - ${groupBy.replace("_", " ").toUpperCase()}`;
  }, [variant, timePeriod, groupBy, getPeriodComparisonLabel]);

  // Process chart data for Recharts format
  const chartDataForDisplay = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Get all group keys from data
    const allGroupKeys = new Set<string>();
    sortedData.forEach((dateItem) => {
      const categoryData = dateItem[groupBy];
      if (categoryData) {
        Object.keys(categoryData).forEach((key) => allGroupKeys.add(key));
      }
    });
    const groupKeys = Array.from(allGroupKeys).sort();

    // Initialize colors for consistency
    initializeColorsForKeys(groupKeys);

    // Transform data into Recharts format
    return sortedData.map((dateEntry) => {
      const dateLabel = formatDateLabel(dateEntry.date, timePeriod);
      const categoryData = dateEntry[groupBy];

      const chartPoint: any = {
        date: dateLabel,
        fullDate: dateEntry.date,
      };

      // Add each group key as a property
      groupKeys.forEach((groupKey) => {
        const metricValue = categoryData?.[groupKey];
        let value = 0;

        if (typeof metricValue === "number") {
          value = metricValue;
        } else if (typeof metricValue === "object" && metricValue !== null) {
          if ("absolute" in metricValue && typeof metricValue.absolute === "number") {
            value = metricValue.absolute;
          } else if ("value" in metricValue && typeof metricValue.value === "number") {
            value = metricValue.value;
          } else if ("count" in metricValue && typeof metricValue.count === "number") {
            value = metricValue.count;
          }
        }

        chartPoint[groupKey] = value > 0 ? value : 0;
      });

      return chartPoint;
    });
  }, [data, groupBy, timePeriod, formatDateLabel]);

  // Get all unique data keys for rendering bars
  const dataKeys = useMemo(() => {
    if (chartDataForDisplay.length === 0) return [];

    const keys = Object.keys(chartDataForDisplay[0]).filter(
      (key) => key !== "date" && key !== "fullDate",
    );
    return keys.sort();
  }, [chartDataForDisplay]);

  // Custom legend click handler
  const handleLegendClickInternal = useCallback(
    (dataKey: string) => {
      const newVisibility = !effectiveVisibleLegends[dataKey];
      setLocalVisibleLegends((prev) => ({
        ...prev,
        [dataKey]: newVisibility,
      }));
      onLegendVisibilityChange?.(dataKey, newVisibility);
    },
    [effectiveVisibleLegends, onLegendVisibilityChange],
  );

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Filter out hidden legends and zero values
    const visiblePayload = payload.filter(
      (entry: any) => effectiveVisibleLegends[entry.dataKey] !== false && entry.value > 0,
    );

    if (visiblePayload.length === 0) return null;

    // ✨ NEW: Reverse the order to show from top to bottom
    const reversedPayload = [...visiblePayload].reverse();

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="mb-2 text-xs font-semibold text-gray-800">Date: {label}</p>
        {reversedPayload.map((entry: any, index: number) => {
          const formattedValue = isWeightedView
            ? entry.value.toFixed(3)
            : Math.round(entry.value).toString();

          return (
            <div key={`tooltip-${index}`} className="flex items-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.fill }} />
              <span className="text-gray-700">
                {entry.dataKey}: {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Custom Legend Component
  const CustomLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null;

    return (
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 px-4">
        {payload.map((entry: any, index: number) => {
          const isVisible = effectiveVisibleLegends[entry.dataKey] !== false;

          return (
            <button
              key={`legend-${index}`}
              onClick={() => handleLegendClickInternal(entry.dataKey)}
              className={`flex items-center gap-2 rounded px-2 py-1 transition-all ${
                isVisible ? "opacity-100" : "opacity-40"
              } hover:bg-gray-100`}
              type="button"
            >
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-xs font-medium text-gray-700">{entry.value}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const hasNonZeroValues = (dataKey: string, data: any[]): boolean => {
    return data.some((point) => {
      const value = point[dataKey];
      return value !== undefined && value !== null && value > 0;
    });
  };

  // FIXED: Improved chart spacing calculation
  const chartSpacing = useMemo(() => {
    const dataLength = chartDataForDisplay.length;

    // Count how many dataKeys actually have values
    const activeDataKeysCount = dataKeys.filter((key) =>
      hasNonZeroValues(key, chartDataForDisplay),
    ).length;

    if (chartType === "stacked") {
      // Stacked bars should be wider
      return {
        barSize: 150,
      };
    } else {
      // Grouped view - dynamic calculation based on both data points and categories
      let baseBarSize: number;

      // Calculate base bar size based on number of data points
      if (dataLength <= 7) {
        baseBarSize = 40; // Increased from 24
      } else if (dataLength <= 15) {
        baseBarSize = 30; // Increased from 20
      } else if (dataLength <= 30) {
        baseBarSize = 20; // Increased from 16
      } else {
        baseBarSize = 15; // Increased from 12
      }

      // Adjust bar size based on number of categories
      // More categories = smaller bars to fit them all
      if (activeDataKeysCount > 8) {
        baseBarSize = Math.max(8, baseBarSize * 0.6);
      } else if (activeDataKeysCount > 6) {
        baseBarSize = Math.max(10, baseBarSize * 0.7);
      } else if (activeDataKeysCount > 4) {
        baseBarSize = Math.max(12, baseBarSize * 0.85);
      }

      return {
        barSize: Math.floor(baseBarSize),
      };
    }
  }, [chartDataForDisplay.length, chartType, dataKeys, chartDataForDisplay]);

  // Check if we have valid data
  const hasData = useMemo(() => {
    return (
      chartDataForDisplay.length > 0 &&
      dataKeys.length > 0 &&
      chartDataForDisplay.some((point) => dataKeys.some((key) => point[key] > 0))
    );
  }, [chartDataForDisplay, dataKeys]);

  return (
    <div className="h-[500px] space-y-1">
      {/* Header with Navigation Controls */}
      <div className="-mt-2.5 flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-medium text-gray-800">{chartTitle}</h4>

          {/* Lock/Unlock Navigation Button */}
          <div className="ml-2 flex items-center">
            <button
              className={`group relative flex items-center justify-center rounded-lg p-1 transition-all duration-200 ${
                isLocked
                  ? "scale-110 border-2 border-red-200 bg-red-50"
                  : "border-2 border-transparent bg-transparent hover:bg-gray-100"
              }`}
              onClick={handleLockToggle}
              type="button"
              aria-label="Toggle Lock"
              title={isLocked ? `Unlock navigation (${variant} locked)` : "Lock navigation"}
              style={{ minWidth: 36, minHeight: 36 }}
            >
              {isLocked ? (
                <LockKeyhole className="text-red-600 transition-colors" size={20} />
              ) : (
                <LockKeyholeOpen className="text-teal-600 transition-colors" size={20} />
              )}
            </button>
          </div>

          {/* Time Navigation Controls */}
          <div className="mr-6 flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleTimeNavigation("previous")}
              disabled={isLocked}
              className={`group rounded-full p-1 transition-colors ${
                isLocked ? "cursor-not-allowed opacity-50" : "hover:bg-gray-200"
              }`}
              title={
                isLocked
                  ? `Navigation locked for ${periodDisplayName}`
                  : `Previous ${periodDisplayName}`
              }
            >
              <ChevronLeft
                className={`transition-colors ${
                  isLocked ? "text-gray-400" : "text-black group-hover:text-teal-600"
                }`}
              />
            </button>

            <span
              className={`mx-1 min-w-[200px] text-center text-sm font-medium transition-all duration-300 ${
                isLoading ? "opacity-70" : "opacity-100"
              } ${isLocked ? "font-semibold text-gray-700" : "text-gray-700"}`}
            >
              {formattedDateRange}
            </span>

            <button
              type="button"
              onClick={() => handleTimeNavigation("next")}
              disabled={isLocked || isAtCurrentPeriod}
              className={`group rounded-full p-1 transition-colors ${
                isLocked || isAtCurrentPeriod
                  ? "cursor-not-allowed opacity-30"
                  : "hover:bg-gray-200"
              }`}
              title={
                isLocked
                  ? `Navigation locked for ${periodDisplayName}`
                  : isAtCurrentPeriod
                    ? "At current period"
                    : `Next ${periodDisplayName}`
              }
            >
              <ChevronRight
                className={`transition-colors ${
                  isLocked || isAtCurrentPeriod
                    ? "text-gray-700"
                    : "text-black group-hover:text-teal-600"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Chart Controls - Only show for incident chart */}
        {variant === "incident" && (
          <div className="mr-8 flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">Chart Type:</span>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
                <button
                  onClick={() => handleChartTypeChange("stacked")}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors ${
                    chartType === "stacked"
                      ? "border-2 border-gray-600 bg-teal-100 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                  title="Stacked"
                >
                  <img
                    src={StackedChart}
                    alt="Stacked"
                    className="h-5 w-5"
                    style={{ boxSizing: "border-box" }}
                  />
                </button>
                <button
                  onClick={() => handleChartTypeChange("grouped")}
                  className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors ${
                    chartType === "grouped"
                      ? "border-2 border-gray-600 bg-teal-100 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                  title="Grouped"
                >
                  <img
                    src={GroupedChart}
                    alt="Grouped"
                    className="h-5 w-5"
                    style={{ boxSizing: "border-box" }}
                  />
                </button>

                {/* Weight Options */}
                <div className="ml-2 flex items-center gap-1">
                  <span className="text-xs text-gray-600">Scale by:</span>

                  <button
                    onClick={() => handleWeightTypeChange("people")}
                    disabled={groupBy !== "sites"}
                    className={`rounded-md p-1 transition-colors ${
                      groupBy !== "sites"
                        ? "cursor-not-allowed opacity-30"
                        : weightType === "people"
                          ? "border border-green-300 bg-green-50 text-green-700 shadow-sm"
                          : "text-gray-600 hover:bg-green-100 hover:text-green-800"
                    }`}
                    title={
                      groupBy !== "sites" ? "Only available when grouped by sites" : "Per Person"
                    }
                  >
                    <Users size={16} className="h-6 w-6" />
                  </button>

                  <button
                    onClick={() => handleWeightTypeChange("vehicle")}
                    disabled={groupBy !== "sites"}
                    className={`rounded-md p-1 transition-colors ${
                      groupBy !== "sites"
                        ? "cursor-not-allowed opacity-30"
                        : weightType === "vehicle"
                          ? "border border-orange-300 bg-orange-50 text-orange-700 shadow-sm"
                          : "text-gray-600 hover:bg-orange-100 hover:text-orange-800"
                    }`}
                    title={
                      groupBy !== "sites" ? "Only available when grouped by sites" : "Per Vehicle"
                    }
                  >
                    <Car size={16} className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div
        className={`h-[460px] min-h-0 flex-1 overflow-hidden rounded-xl border ${
          isLocked ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-white"
        } p-2 shadow-sm transition-all duration-300`}
      >
        <div className="relative h-full w-full">
          {/* Loading overlay */}
          {isLoading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
                <p className="text-sm font-semibold">
                  Loading {variant === "comparison" ? "comparison" : "chart"} data...
                </p>
                <p className="text-xs text-gray-400">
                  Fetching {periodDisplayName.toLowerCase()} data
                </p>
              </div>
            </div>
          ) : hasData ? (
            <div
              className={`h-full w-full transition-opacity duration-300 ${
                isLoading ? "opacity-90" : "opacity-100"
              }`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataForDisplay}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  barGap={0}
                  // REMOVED barGap and barCategoryGap - let Recharts handle spacing automatically
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#374151", fontSize: 12, fontWeight: 500 }}
                    tickLine={{ stroke: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    angle={chartDataForDisplay.length > 15 ? -45 : 0}
                    textAnchor={chartDataForDisplay.length > 15 ? "end" : "middle"}
                    height={chartDataForDisplay.length > 15 ? 80 : 60}
                  />
                  <YAxis
                    domain={[0, calculatedMaxYValue]}
                    tick={{ fill: "#374151", fontSize: 12 }}
                    tickLine={{ stroke: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickFormatter={(value) => formatYAxisLabel(value, isWeightedView)}
                    label={{
                      value: (() => {
                        if (!isWeightedView || weightType === "none") {
                          return "Incident Count";
                        }
                        if (weightType === "people") {
                          return "Incident Rate (per person)";
                        } else if (weightType === "vehicle") {
                          return "Incident Rate (per vehicle)";
                        }
                        return "Incident Count";
                      })(),
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      style: {
                        fill: "#374151",
                        fontSize: 14,
                        fontWeight: "bold",
                        textAnchor: "middle",
                      },
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
                  <Legend content={<CustomLegend />} />

                  {/* Render bars for each data key */}
                  {dataKeys.map((key, index) => {
                    const colors = getColorForKey(key);
                    const isVisible = effectiveVisibleLegends[key] !== false;

                    return (
                      <Bar
                        key={`bar-${key}-${index}`}
                        dataKey={key}
                        stackId={chartType === "stacked" ? "stack" : undefined}
                        fill={colors.bg}
                        stroke={colors.border}
                        strokeWidth={1}
                        radius={[2, 2, 0, 0]}
                        barSize={chartSpacing.barSize}
                        hide={!isVisible}
                        animationDuration={400}
                        animationEasing="ease-in-out"
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="text-center">
                {variant === "comparison" ? (
                  <Clock size={32} className="mx-auto mb-2 text-gray-300" />
                ) : (
                  <BarChart3 size={32} className="mx-auto mb-2 text-gray-300" />
                )}
                <p className="text-sm font-semibold">
                  {variant === "comparison"
                    ? `No ${getPeriodComparisonLabel(timePeriod).toLowerCase()} data available`
                    : "No data available"}
                </p>
                <p className="text-xs text-gray-400">
                  {variant === "comparison"
                    ? `${getPeriodComparisonLabel(timePeriod)} data will appear here when available`
                    : data?.length === 0
                      ? "No data matches the current filters."
                      : "Try adjusting the filters."}
                </p>
                {debugInfo && (
                  <div className="mt-2 space-y-1 text-xs text-gray-300">
                    <p>
                      Data points: {data?.length || 0} | Group by: {groupBy}
                    </p>
                    <p>
                      Time offset: {timeOffset} | Locked: {isLocked ? "Yes" : "No"}
                    </p>
                    <p>Weighted view: {isWeightedView ? "Yes" : "No"}</p>
                    <p>Weight type: {weightType}</p>
                    <p>Y-max: {calculatedMaxYValue.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
