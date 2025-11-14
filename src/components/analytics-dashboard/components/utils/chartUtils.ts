import { DateIncidentData, GroupBy } from "@/api/types";

/**
 * Calculate the maximum Y value across multiple datasets with dynamic scaling
 * This ensures both charts have the same Y-axis scale and adjusts based on visible data
 */
export const calculateMaxYValue = (
  currentData: DateIncidentData[],
  previousData: DateIncidentData[],
  groupBy: GroupBy,
  isWeightedView: boolean = false,
): number => {
  const getAllValues = (data: DateIncidentData[]): number[] => {
    const values: number[] = [];

    data.forEach((dateEntry) => {
      const categoryData = dateEntry[groupBy];
      if (!categoryData) return;

      // Use the actual absolute values (which are already normalized if in weighted mode)
      Object.values(categoryData).forEach((item) => {
        const value = item.absolute || 0;
        if (value > 0) {
          // Only include non-zero values for better scaling
          values.push(value);
        }
      });
    });

    return values;
  };

  // Get all values from both datasets
  const currentValues = getAllValues(currentData);
  const previousValues = getAllValues(previousData);

  // Combine all values
  const allValues = [...currentValues, ...previousValues];

  if (allValues.length === 0) {
    return isWeightedView ? 1 : 10; // Default fallback - lower for weighted view
  }

  const maxValue = Math.max(...allValues);

  // Dynamic padding based on the data range
  let paddingFactor = 1.2; // Default 20% padding

  // Adjust padding for very small values to ensure visibility
  if (maxValue < 1 && isWeightedView) {
    paddingFactor = 1.5; // 50% padding for small normalized values
  } else if (maxValue < 5) {
    paddingFactor = 1.3; // 30% padding for small values
  }

  const paddedMax = maxValue * paddingFactor;

  // Dynamic rounding based on value range
  return getNiceMaxValue(paddedMax, isWeightedView);
};

/**
 * Calculate stacked totals for each time period with dynamic scaling
 * Used when charts are in stacked mode to get the true maximum
 */
export const calculateStackedMaxValue = (
  currentData: DateIncidentData[],
  previousData: DateIncidentData[],
  groupBy: GroupBy,
  isWeightedView: boolean = false,
): number => {
  const getStackedTotals = (data: DateIncidentData[]): number[] => {
    return data
      .map((dateEntry) => {
        const categoryData = dateEntry[groupBy];
        if (!categoryData) return 0;

        // Sum all absolute values for this date (already normalized if in weighted mode)
        const total = Object.values(categoryData).reduce(
          (sum, item) => sum + (item.absolute || 0),
          0,
        );
        return total;
      })
      .filter((total) => total > 0); // Only include non-zero totals
  };

  const currentTotals = getStackedTotals(currentData);
  const previousTotals = getStackedTotals(previousData);

  const allTotals = [...currentTotals, ...previousTotals];

  if (allTotals.length === 0) {
    return isWeightedView ? 1 : 10;
  }

  const maxTotal = Math.max(...allTotals);

  // Dynamic padding
  let paddingFactor = 1.2;
  if (maxTotal < 1 && isWeightedView) {
    paddingFactor = 1.5;
  } else if (maxTotal < 5) {
    paddingFactor = 1.3;
  }

  const paddedMax = maxTotal * paddingFactor;

  return getNiceMaxValue(paddedMax, isWeightedView);
};

/**
 * Get a "nice" maximum value for better chart readability
 */
const getNiceMaxValue = (value: number, isWeightedView: boolean): number => {
  if (value <= 0) {
    return isWeightedView ? 0.1 : 1;
  }

  if (isWeightedView) {
    // For weighted view (normalized values), use smaller, more precise increments
    if (value <= 0.01) return 0.01;
    if (value <= 0.05) return 0.05;
    if (value <= 0.1) return Math.ceil(value * 100) / 100;
    if (value <= 0.5) return Math.ceil(value * 20) / 20;
    if (value <= 1) return Math.ceil(value * 10) / 10;
    if (value <= 2) return Math.ceil(value * 4) / 4;
    if (value <= 5) return Math.ceil(value * 2) / 2;
    if (value <= 10) return Math.ceil(value);
    if (value <= 25) return Math.ceil(value / 2.5) * 2.5;
    if (value <= 50) return Math.ceil(value / 5) * 5;
    return Math.ceil(value / 10) * 10;
  } else {
    // For absolute view, use larger increments
    if (value <= 1) return 1;
    if (value <= 5) return Math.ceil(value);
    if (value <= 10) return Math.ceil(value);
    if (value <= 25) return Math.ceil(value / 5) * 5;
    if (value <= 50) return Math.ceil(value / 10) * 10;
    if (value <= 100) return Math.ceil(value / 20) * 20;
    if (value <= 500) return Math.ceil(value / 50) * 50;
    if (value <= 1000) return Math.ceil(value / 100) * 100;
    return Math.ceil(value / 200) * 200;
  }
};

/**
 * Get consistent step size for Y-axis ticks with dynamic scaling
 */
export const getYAxisStepSize = (maxValue: number, isWeightedView: boolean): number | undefined => {
  if (maxValue <= 0) {
    return isWeightedView ? 0.01 : 1;
  }

  if (isWeightedView) {
    // For weighted view (normalized values), use appropriate step sizes
    if (maxValue <= 0.01) return 0.001;
    if (maxValue <= 0.05) return 0.005;
    if (maxValue <= 0.1) return 0.01;
    if (maxValue <= 0.5) return 0.05;
    if (maxValue <= 1) return 0.1;
    if (maxValue <= 2) return 0.25;
    if (maxValue <= 5) return 0.5;
    if (maxValue <= 10) return 1;
    if (maxValue <= 25) return 2.5;
    if (maxValue <= 50) return 5;
    return 10;
  }

  // Dynamic step size based on max value for absolute view
  if (maxValue <= 1) return 0.2;
  if (maxValue <= 5) return 1;
  if (maxValue <= 10) return 1;
  if (maxValue <= 20) return 2;
  if (maxValue <= 50) return 5;
  if (maxValue <= 100) return 10;
  if (maxValue <= 200) return 20;
  if (maxValue <= 500) return 50;
  if (maxValue <= 1000) return 100;
  return 200;
};

/**
 * Format Y-axis tick labels consistently with better precision handling
 */
export const formatYAxisLabel = (value: number, isWeightedView: boolean): string => {
  if (value === 0) return "0";

  if (isWeightedView) {
    // Show normalized values with appropriate decimal places
    if (value < 0.001) {
      return value.toFixed(4);
    } else if (value < 0.01) {
      return value.toFixed(3);
    } else if (value < 0.1) {
      return value.toFixed(2);
    } else if (value < 1) {
      return value.toFixed(2);
    } else if (value < 10) {
      return value.toFixed(1);
    } else {
      return Math.round(value).toString();
    }
  }
  return Math.round(value).toString();
};

/**
 * Get consistent Y-axis configuration for both charts with dynamic scaling
 */
export const getYAxisConfig = (
  maxYValue?: number,
  isWeightedView: boolean = false,
  weightType: "none" | "people" | "vehicle" = "none",
) => {
  const effectiveMax = maxYValue || (isWeightedView ? 1 : 10);

  // Dynamic Y-axis title based on weight type
  let yAxisTitle = "Incident Count";
  if (isWeightedView && weightType !== "none") {
    if (weightType === "people") {
      yAxisTitle = "Incident Rate (per person)";
    } else if (weightType === "vehicle") {
      yAxisTitle = "Incident Rate (per vehicle)";
    } else {
      yAxisTitle = "Normalized Incident Rate";
    }
  }

  return {
    beginAtZero: true,
    min: 0,
    max: effectiveMax,
    ticks: {
      precision: isWeightedView ? 4 : 0,
      color: "#6B7280",
      stepSize: getYAxisStepSize(effectiveMax, isWeightedView),
      callback: function (value: any) {
        return formatYAxisLabel(value, isWeightedView);
      },
    },
    grid: {
      color: "rgba(156, 163, 175, 0.3)",
      drawBorder: false,
    },
    title: {
      display: true,
      text: yAxisTitle,
      font: { size: 14, weight: "bold" as const },
      color: "#374151",
    },
  };
};

/**
 * Helper function to extract all legend keys from data
 * Used to initialize legend state
 */
export const extractLegendKeysFromData = (data: DateIncidentData[], groupBy: GroupBy): string[] => {
  const allKeys = new Set<string>();

  data.forEach((dateEntry) => {
    const categoryData = dateEntry[groupBy];
    if (categoryData) {
      Object.keys(categoryData).forEach((key) => allKeys.add(key));
    }
  });

  return Array.from(allKeys).sort();
};

/**
 * CRITICAL FUNCTION: Calculate dynamic Y-axis max based on visible legends with proper synchronization
 * This is the main function that ensures both charts share the same Y-axis scale
 */
export const calculateDynamicYMaxWithLegends = (
  incidentData: DateIncidentData[],
  comparisonData: DateIncidentData[],
  groupBy: GroupBy,
  isWeightedView: boolean = false,
  chartType: "stacked" | "grouped" = "stacked",
  visibleIncidentLegends: Record<string, boolean> = {},
  visibleComparisonLegends: Record<string, boolean> = {},
  showComparison: boolean = false,
): number => {
  // Get all possible legend keys from both datasets
  const incidentKeys = new Set<string>();
  const comparisonKeys = new Set<string>();

  // Extract all keys from incident data
  incidentData.forEach((dateEntry) => {
    const categoryData = dateEntry[groupBy];
    if (categoryData) {
      Object.keys(categoryData).forEach((key) => incidentKeys.add(key));
    }
  });

  // Extract all keys from comparison data
  comparisonData.forEach((dateEntry) => {
    const categoryData = dateEntry[groupBy];
    if (categoryData) {
      Object.keys(categoryData).forEach((key) => comparisonKeys.add(key));
    }
  });

  // Combine all unique keys
  const allPossibleKeys = new Set([...incidentKeys, ...comparisonKeys]);

  // Determine visible keys - if no legend state exists, assume all are visible
  const hasLegendState = Object.keys(visibleIncidentLegends).length > 0;
  const visibleKeys = Array.from(allPossibleKeys).filter((key) => {
    if (!hasLegendState) {
      return true; // All visible during initialization
    }
    // Key is visible if it's explicitly set to true in either incident or comparison legends
    return visibleIncidentLegends[key] === true || visibleComparisonLegends[key] === true;
  });

  // If no keys are visible after filtering, return a minimal scale
  if (visibleKeys.length === 0) {
    return isWeightedView ? 0.1 : 1;
  }

  // Helper function to calculate max value from a dataset with visible keys only
  const getMaxFromDataset = (data: DateIncidentData[]): number => {
    let maxValue = 0;

    data.forEach((dateEntry) => {
      const categoryData = dateEntry[groupBy];
      if (!categoryData) return;

      if (chartType === "stacked") {
        // For stacked charts, sum all visible values for each date
        let stackedValue = 0;
        visibleKeys.forEach((key) => {
          const item = categoryData[key];
          if (item && typeof item === 'object' && 'absolute' in item) {
            const value = item.absolute || 0;
            if (value > 0) {
              stackedValue += value;
            }
          }
        });
        maxValue = Math.max(maxValue, stackedValue);
      } else {
        // For grouped charts, find the maximum individual visible value
        visibleKeys.forEach((key) => {
          const item = categoryData[key];
          if (item && typeof item === 'object' && 'absolute' in item) {
            const value = item.absolute || 0;
            if (value > 0) {
              maxValue = Math.max(maxValue, value);
            }
          }
        });
      }
    });

    return maxValue;
  };

  // Calculate max for incident data
  const incidentMax = getMaxFromDataset(incidentData);

  // Calculate max for comparison data if shown
  let comparisonMax = 0;
  if (showComparison && comparisonData.length > 0) {
    comparisonMax = getMaxFromDataset(comparisonData);
  }

  // Use the higher of the two maximums for synchronized Y-axis
  const rawMax = Math.max(incidentMax, comparisonMax);

  // Handle edge case where no visible data exists
  if (rawMax === 0) {
    return isWeightedView ? 0.1 : 1;
  }

  // Apply appropriate padding based on data characteristics
  let paddingFactor = 1.15; // Conservative base padding

  if (isWeightedView) {
    // For weighted data, use more aggressive padding for small values
    if (rawMax < 0.001) {
      paddingFactor = 2.0; // Double for very small values
    } else if (rawMax < 0.01) {
      paddingFactor = 1.8;
    } else if (rawMax < 0.1) {
      paddingFactor = 1.5;
    } else if (rawMax < 1) {
      paddingFactor = 1.3;
    } else {
      paddingFactor = 1.2;
    }
  } else {
    // For absolute data, use moderate padding
    if (rawMax < 1) {
      paddingFactor = 1.5;
    } else if (rawMax < 5) {
      paddingFactor = 1.3;
    } else if (rawMax < 50) {
      paddingFactor = 1.2;
    } else {
      paddingFactor = 1.15;
    }
  }

  const paddedMax = rawMax * paddingFactor;

  // Ensure we always have at least a 10% buffer above the raw max
  const minimumMax = rawMax * 1.1;
  const finalMax = Math.max(paddedMax, minimumMax);

  return getNiceMaxValue(finalMax, isWeightedView);
};

/**
 * Initialize legend state - all legends visible by default
 */
export const initializeLegendState = (
  incidentData: DateIncidentData[],
  comparisonData: DateIncidentData[],
  groupBy: GroupBy,
): {
  incidentLegends: Record<string, boolean>;
  comparisonLegends: Record<string, boolean>;
} => {
  const incidentKeys = extractLegendKeysFromData(incidentData, groupBy);
  const comparisonKeys = extractLegendKeysFromData(comparisonData, groupBy);

  // Combine all unique keys to ensure consistency
  const allKeys = new Set([...incidentKeys, ...comparisonKeys]);
  const uniqueKeys = Array.from(allKeys);

  const incidentLegends = uniqueKeys.reduce(
    (acc, key) => {
      acc[key] = true; // All visible by default
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const comparisonLegends = uniqueKeys.reduce(
    (acc, key) => {
      acc[key] = true; // All visible by default
      return acc;
    },
    {} as Record<string, boolean>,
  );

  return { incidentLegends, comparisonLegends };
};

// Legacy functions kept for backward compatibility
export const calculateDynamicYMax = calculateDynamicYMaxWithLegends;
export const calculateYMaxFromWeightedData = calculateDynamicYMaxWithLegends;
export const calculateComprehensiveYMax = calculateDynamicYMaxWithLegends;

/**
 * Calculate stable Y-max that includes all data regardless of legend visibility
 * Used as a fallback when legend state is inconsistent
 */
export const calculateStableYMax = (
  weightedIncidentData: DateIncidentData[],
  weightedComparisonData: DateIncidentData[],
  groupBy: GroupBy,
  isWeightedView: boolean = false,
  chartType: "stacked" | "grouped" = "stacked",
  showComparison: boolean = false,
): number => {
  // For stable Y-max, we ignore legend visibility and use all data
  const allIncidentLegends = extractLegendKeysFromData(weightedIncidentData, groupBy).reduce(
    (acc, key) => ({ ...acc, [key]: true }),
    {},
  );
  const allComparisonLegends = extractLegendKeysFromData(weightedComparisonData, groupBy).reduce(
    (acc, key) => ({ ...acc, [key]: true }),
    {},
  );

  return calculateDynamicYMaxWithLegends(
    weightedIncidentData,
    weightedComparisonData,
    groupBy,
    isWeightedView,
    chartType,
    allIncidentLegends,
    allComparisonLegends,
    showComparison,
  );
};