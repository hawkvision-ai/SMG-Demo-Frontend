import type { EventFilters } from "@/api/types";

// Add/update this interface
export interface AnalyticsFilters {
  sites: string[];
  cameras: string[];
  useCases: string[];
  severities: string[];
  statuses: string[];
  locationTags: string[];
  dateRange: { start: string; end: string } | null;
  dateFilter: string | null;
  groupBy: string;
}

// Counter Analytics filter storage
export interface CounterAnalyticsFilters {
  selectedSite: string;
  selectedCounters: string[];
  counterDisplayTypes: Record<string, 'line' | 'bar'>;
  chartType: 'normal' | 'stacked';
  counterAutoApply: boolean;
}

// Core storage functions
export const saveToBrowserStorage = (data: any, userId: string, storageKey: string) => {
  try {
    const dataWithUser = { userId, data, timestamp: Date.now() };
    localStorage.setItem(storageKey, JSON.stringify(dataWithUser));
  } catch (error) {
    console.warn(`Failed to save ${storageKey} to localStorage:`, error);
  }
};

export const loadFromBrowserStorage = (userId: string, storageKey: string): any | null => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const { userId: storedUserId, data } = JSON.parse(stored);
    // Only return data if it belongs to current user
    return storedUserId === userId ? data : null;
  } catch (error) {
    console.warn(`Failed to load ${storageKey} from localStorage:`, error);
    return null;
  }
};

export const clearFromBrowserStorage = (storageKey: string) => {
  localStorage.removeItem(storageKey);
};

// Environment-specific Analytics filter storage
export const saveAnalyticsFiltersToStorage = (
  filters: AnalyticsFilters,
  userId: string,
  env: "real" | "virtual",
) => {
  const storageKey = env === "real" ? "analyticsTableFiltersReal" : "analyticsTableFiltersVirtual";
  saveToBrowserStorage(filters, userId, storageKey);
};

export const loadAnalyticsFiltersFromStorage = (
  userId: string,
  env: "real" | "virtual",
): AnalyticsFilters | null => {
  const storageKey = env === "real" ? "analyticsTableFiltersReal" : "analyticsTableFiltersVirtual";
  return loadFromBrowserStorage(userId, storageKey);
};

export const clearAnalyticsFiltersFromStorage = (env?: "real" | "virtual") => {
  if (env) {
    const storageKey =
      env === "real" ? "analyticsTableFiltersReal" : "analyticsTableFiltersVirtual";
    clearFromBrowserStorage(storageKey);
  } else {
    // Clear both
    clearFromBrowserStorage("analyticsTableFiltersReal");
    clearFromBrowserStorage("analyticsTableFiltersVirtual");
  }
};

// Counter Analytics filter storage helpers
export const saveCounterAnalyticsFiltersToStorage = (
  filters: CounterAnalyticsFilters,
  userId: string,
) => {
  saveToBrowserStorage(filters, userId, "counterAnalyticsFilters");
};

export const loadCounterAnalyticsFiltersFromStorage = (
  userId: string,
): CounterAnalyticsFilters | null => {
  return loadFromBrowserStorage(userId, "counterAnalyticsFilters");
};

export const clearCounterAnalyticsFiltersFromStorage = () => {
  clearFromBrowserStorage("counterAnalyticsFilters");
};

// Filter storage helpers (environment-specific)
export const saveFiltersToStorage = (filters: EventFilters, userId: string, env: string) => {
  saveToBrowserStorage(filters, userId, `eventTableFilters_${env}`);
};

export const loadFiltersFromStorage = (userId: string, env: string): EventFilters | null => {
  return loadFromBrowserStorage(userId, `eventTableFilters_${env}`);
};

export const clearFiltersFromStorage = (env: string) => {
  clearFromBrowserStorage(`eventTableFilters_${env}`);
};

// Timezone-aware event data caching helpers
export const saveEventDataToStorage = (
  eventData: any[],
  userId: string,
  env: string,
  timezone: string,
) => {
  saveToBrowserStorage(eventData, userId, `eventTableData_${env}_${timezone}`);
};

export const loadEventDataFromStorage = (
  userId: string,
  env: string,
  timezone: string,
): any[] | null => {
  return loadFromBrowserStorage(userId, `eventTableData_${env}_${timezone}`);
};

export const clearEventDataFromStorage = (env?: string, timezone?: string) => {
  if (env && timezone) {
    clearFromBrowserStorage(`eventTableData_${env}_${timezone}`);
  } else {
    // Clear both environments if no env specified
    clearFromBrowserStorage("eventTableData_real");
    clearFromBrowserStorage("eventTableData_virtual");
  }
};

// Timezone-aware last event ID helpers
export const saveLastEventIdToStorage = (
  lastEventId: string,
  userId: string,
  env: string,
  timezone: string,
) => {
  saveToBrowserStorage(lastEventId, userId, `eventTableLastEventId_${env}_${timezone}`);
};

export const loadLastEventIdFromStorage = (
  userId: string,
  env: string,
  timezone: string,
): string | null => {
  return loadFromBrowserStorage(userId, `eventTableLastEventId_${env}_${timezone}`);
};

export const clearLastEventIdFromStorage = (env?: string, timezone?: string) => {
  if (env && timezone) {
    clearFromBrowserStorage(`eventTableLastEventId_${env}_${timezone}`);
  } else {
    // Clear both environments if no env specified
    clearFromBrowserStorage("eventTableLastEventId_real");
    clearFromBrowserStorage("eventTableLastEventId_virtual");
  }
};

// Timezone-aware hasLoaded helpers
export const saveHasLoadedToStorage = (userId: string, env: string, timezone: string) => {
  saveToBrowserStorage(true, userId, `eventTableHasLoaded_${env}_${timezone}`);
};

export const loadHasLoadedFromStorage = (
  userId: string,
  env: string,
  timezone: string,
): boolean => {
  return loadFromBrowserStorage(userId, `eventTableHasLoaded_${env}_${timezone}`) || false;
};

export const clearHasLoadedFromStorage = (env?: string, timezone?: string) => {
  if (env && timezone) {
    clearFromBrowserStorage(`eventTableHasLoaded_${env}_${timezone}`);
  } else {
    // Clear both environments if no env specified
    clearFromBrowserStorage("eventTableHasLoaded_real");
    clearFromBrowserStorage("eventTableHasLoaded_virtual");
  }
};

// View Mode storage helpers (FROM PREVIOUS VERSION - KEPT)
export const saveViewModeToStorage = (viewMode: 'table' | 'tiles', userId: string) => {
  saveToBrowserStorage(viewMode, userId, 'eventTableViewMode');
};

export const loadViewModeFromStorage = (userId: string): 'table' | 'tiles' | null => {
  return loadFromBrowserStorage(userId, 'eventTableViewMode');
};

export const clearViewModeFromStorage = () => {
  clearFromBrowserStorage('eventTableViewMode');
};

// Clear all timezone-specific data when timezone changes
export const clearAllTimezoneData = () => {
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (
      key.includes("eventTableData_") ||
      key.includes("eventTableLastEventId_") ||
      key.includes("eventTableHasLoaded_")
    ) {
      localStorage.removeItem(key);
    }
  });
  console.log("Cleared all timezone-specific data");
};

// Utility function to clear all event table data for a specific environment and timezone
export const clearAllEventTableDataForEnvironment = (env: string, timezone: string) => {
  clearEventDataFromStorage(env, timezone);
  clearLastEventIdFromStorage(env, timezone);
  clearHasLoadedFromStorage(env, timezone);
};

// Utility function to clear all event table data for all environments
export const clearAllEventTableData = () => {
  clearEventDataFromStorage();
  clearLastEventIdFromStorage();
  clearHasLoadedFromStorage();
  clearFromBrowserStorage('eventTableFilters_real');
  clearFromBrowserStorage('eventTableFilters_virtual');
};

// Utility function for logout cleanup
export const clearAllUserData = (userId?: string) => {
  // Clear both environment-specific filters
  clearAnalyticsFiltersFromStorage("real");
  clearAnalyticsFiltersFromStorage("virtual");
  clearFromBrowserStorage("analyticsTableFilters");
  clearCounterAnalyticsFiltersFromStorage();

  // Clear all event table data including timezone-specific data
  clearAllTimezoneData();

  // Clear filters and other non-timezone data
   clearFromBrowserStorage('eventTableFilters_real');
  clearFromBrowserStorage('eventTableFilters_virtual');
  
  // Clear view mode (ADDED)
  clearViewModeFromStorage();

  // Clear any other user-specific data
  clearFromBrowserStorage("siteDashboardState");
  clearFromBrowserStorage("dashboardLayouts");

  // Clear timezone tracking
  localStorage.removeItem("lastTimezone");
  localStorage.removeItem("previousTimezone");

  console.log("Cleared all localStorage data for user logout");
};
