// utils/dateUtils.ts - Enhanced with custom date range support
import { TimePeriodEnum } from "@/api/types";

export interface DateRange {
  from_date: string;
  to_date: string;
  time_period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | null;
}

// NEW: Simple DateRange interface for custom ranges (used by Analytics component)
export interface SimpleDateRange {
  start: string;
  end: string;
}

/**
 * Calculate the number of days between two dates
 */
export const getDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
};

/**
 * Add or subtract days from a date
 */
export const addDays = (date: string, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
};

/**
 * Calculate previous period date range based on current range
 */
export const calculatePreviousPeriod = (currentRange: SimpleDateRange): SimpleDateRange => {
  const rangeDuration = getDaysBetween(currentRange.start, currentRange.end);

  // Calculate previous period end date (one day before current start)
  const previousEnd = addDays(currentRange.start, -1);

  // Calculate previous period start date
  const previousStart = addDays(previousEnd, -(rangeDuration - 1));

  return {
    start: previousStart,
    end: previousEnd,
  };
};

/**
 * Calculate next period date range based on current range
 */
export const calculateNextPeriod = (currentRange: SimpleDateRange): SimpleDateRange => {
  const rangeDuration = getDaysBetween(currentRange.start, currentRange.end);

  // Calculate next period start date (one day after current end)
  const nextStart = addDays(currentRange.end, 1);

  // Calculate next period end date
  const nextEnd = addDays(nextStart, rangeDuration - 1);

  return {
    start: nextStart,
    end: nextEnd,
  };
};

/**
 * Format date range for display
 */
export const formatDateRange = (range: SimpleDateRange): string => {
  const start = new Date(range.start);
  const end = new Date(range.end);

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
  };

  const startFormatted = start.toLocaleDateString("en-US", options);
  const endFormatted = end.toLocaleDateString("en-US", options);

  if (range.start === range.end) {
    return startFormatted;
  }

  return `${startFormatted} - ${endFormatted}`;
};

/**
 * Check if a date range is valid
 */
export const isValidDateRange = (range: SimpleDateRange | null): boolean => {
  if (!range || !range.start || !range.end) {
    return false;
  }

  const start = new Date(range.start);
  const end = new Date(range.end);

  return start <= end && !isNaN(start.getTime()) && !isNaN(end.getTime());
};

/**
 * Get date ranges for predefined periods
 * FIXED: Ensures exact date ranges with proper calculations
 */
export const getDateRangeForPeriod = (period: TimePeriodEnum): SimpleDateRange | null => {
  const today = new Date();
  // Important: Set timezone to avoid any timezone issues
  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();

  // Create a clean date object for today
  const todayClean = new Date(year, month, date);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  switch (period) {
    case TimePeriodEnum.TODAY:
      // TODAY: Same date for start and end
      const todayResult = {
        start: formatDate(todayClean),
        end: formatDate(todayClean),
      };
      return todayResult;

    case TimePeriodEnum.YESTERDAY: {
      // YESTERDAY: Previous date for both start and end
      const yesterday = new Date(todayClean);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayResult = {
        start: formatDate(yesterday),
        end: formatDate(yesterday),
      };
      return yesterdayResult;
    }

    case TimePeriodEnum.WEEKLY: {
      // WEEKLY: Last 7 days including today
      // If today is 28th, we want 22nd to 28th (7 days total)
      const weekStart = new Date(todayClean);
      weekStart.setDate(weekStart.getDate() - 6); // Go back 6 days to include today as 7th day

      const weeklyResult = {
        start: formatDate(weekStart),
        end: formatDate(todayClean),
      };
      return weeklyResult;
    }

    case TimePeriodEnum.MONTHLY: {
      // MONTHLY: Last 30 days including today
      const monthStart = new Date(todayClean);
      monthStart.setDate(monthStart.getDate() - 29); // Go back 29 days to include today as 30th day

      const monthlyResult = {
        start: formatDate(monthStart),
        end: formatDate(todayClean),
      };
      return monthlyResult;
    }

    case TimePeriodEnum.QUARTERLY: {
      // QUARTERLY: Last 90 days including today
      const quarterStart = new Date(todayClean);
      quarterStart.setDate(quarterStart.getDate() - 89); // Go back 89 days to include today as 90th day

      const quarterlyResult = {
        start: formatDate(quarterStart),
        end: formatDate(todayClean),
      };
      return quarterlyResult;
    }

    case TimePeriodEnum.YEARLY: {
      // YEARLY: Last 365 days including today
      const yearStart = new Date(todayClean);
      yearStart.setDate(yearStart.getDate() - 364); // Go back 364 days to include today as 365th day

      const yearlyResult = {
        start: formatDate(yearStart),
        end: formatDate(todayClean),
      };
      return yearlyResult;
    }

    default:
      return null;
  }
};

/**
 * Convert SimpleDateRange to DateRange for API calls
 * @param range - The simple date range
 * @param timePeriod - The time period enum (optional, for determining time_period)
 * @returns DateRange object for API consumption
 */
export const convertToApiDateRange = (
  range: SimpleDateRange,
  timePeriod?: TimePeriodEnum | null,
): DateRange => {
  let apiTimePeriod: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | null = null;

  if (timePeriod) {
    switch (timePeriod) {
      case TimePeriodEnum.TODAY:
      case TimePeriodEnum.YESTERDAY:
        apiTimePeriod = "daily";
        break;
      case TimePeriodEnum.WEEKLY:
        apiTimePeriod = "weekly";
        break;
      case TimePeriodEnum.MONTHLY:
        apiTimePeriod = "monthly";
        break;
      case TimePeriodEnum.QUARTERLY:
        apiTimePeriod = "quarterly";
        break;
      case TimePeriodEnum.YEARLY:
        apiTimePeriod = "yearly";
        break;
      default:
        apiTimePeriod = null;
    }
  }

  return {
    from_date: range.start,
    to_date: range.end,
    time_period: apiTimePeriod,
  };
};

/**
 * Calculate date ranges with time offset for any time period
 * Updated to match your requirements with proper date range calculations
 * @param period - The time period enum
 * @param offset - The number of periods to offset (negative for past, positive for future)
 * @returns DateRange object with formatted dates
 */
export const calculateDateRangeWithOffset = (
  period: TimePeriodEnum,
  offset: number = 0,
): DateRange => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0]; // YYYY-MM-DD format
  };

  // Calculate the base end date by applying the offset
  const baseEndDate = new Date(today);

  switch (period) {
    case TimePeriodEnum.TODAY:
      // For TODAY: each offset moves by 1 day
      baseEndDate.setDate(baseEndDate.getDate() + offset);
      return {
        from_date: formatDate(baseEndDate),
        to_date: formatDate(baseEndDate),
        time_period: "daily" as const,
      };

    case TimePeriodEnum.YESTERDAY:
      // For YESTERDAY: base is yesterday, then apply offset
      baseEndDate.setDate(baseEndDate.getDate() - 1 + offset);
      return {
        from_date: formatDate(baseEndDate),
        to_date: formatDate(baseEndDate),
        time_period: "daily" as const,
      };

    case TimePeriodEnum.WEEKLY:
      // For WEEKLY: each offset moves by 7 days
      baseEndDate.setDate(baseEndDate.getDate() + offset * 7);

      const weekStart = new Date(baseEndDate);
      weekStart.setDate(weekStart.getDate() - 6); // 6 days back + end date = 7 days total

      return {
        from_date: formatDate(weekStart),
        to_date: formatDate(baseEndDate),
        time_period: "weekly" as const,
      };

    case TimePeriodEnum.MONTHLY:
      // For MONTHLY: each offset moves by 30 days
      baseEndDate.setDate(baseEndDate.getDate() + offset * 30);

      const monthStart = new Date(baseEndDate);
      monthStart.setDate(monthStart.getDate() - 29); // 29 days back + end date = 30 days total

      return {
        from_date: formatDate(monthStart),
        to_date: formatDate(baseEndDate),
        time_period: "monthly" as const,
      };

    case TimePeriodEnum.QUARTERLY:
      // For QUARTERLY: each offset moves by 90 days
      baseEndDate.setDate(baseEndDate.getDate() + offset * 90);

      const quarterStart = new Date(baseEndDate);
      quarterStart.setDate(quarterStart.getDate() - 89); // 89 days back + end date = 90 days total

      return {
        from_date: formatDate(quarterStart),
        to_date: formatDate(baseEndDate),
        time_period: "quarterly" as const,
      };

    case TimePeriodEnum.YEARLY:
      // For YEARLY: each offset moves by 365 days
      baseEndDate.setDate(baseEndDate.getDate() + offset * 365);

      const yearStart = new Date(baseEndDate);
      yearStart.setDate(yearStart.getDate() - 364); // 364 days back + end date = 365 days total

      return {
        from_date: formatDate(yearStart),
        to_date: formatDate(baseEndDate),
        time_period: "yearly" as const,
      };

    default:
      // Default to weekly
      baseEndDate.setDate(baseEndDate.getDate() + offset * 7);
      const defaultStart = new Date(baseEndDate);
      defaultStart.setDate(defaultStart.getDate() - 6);

      return {
        from_date: formatDate(defaultStart),
        to_date: formatDate(baseEndDate),
        time_period: "weekly" as const,
      };
  }
};

/**
 * Calculate comparison date ranges that show the immediately preceding period
 * FIXED: Weekly calculation now shows the exact previous week without gaps
 * @param period - The time period enum
 * @param offset - The number of periods to offset the base date
 * @returns DateRange object for comparison period or null if not supported
 */
export const calculateComparisonDateRange = (
  period: TimePeriodEnum,
  offset: number = 0,
): DateRange | null => {
  // First, get the current incident date range for the given offset
  const incidentRange = calculateDateRangeWithOffset(period, offset);

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Calculate the comparison period based on the incident period
  switch (period) {
    case TimePeriodEnum.TODAY:
      // If incident is "today", comparison is "yesterday"
      const incidentDate = new Date(incidentRange.from_date);
      const comparisonDate = new Date(incidentDate);
      comparisonDate.setDate(comparisonDate.getDate() - 1);

      return {
        from_date: formatDate(comparisonDate),
        to_date: formatDate(comparisonDate),
        time_period: "daily" as const,
      };

    case TimePeriodEnum.YESTERDAY:
      // If incident is "yesterday", comparison is "day before yesterday"
      const yesterdayDate = new Date(incidentRange.from_date);
      const dayBeforeYesterday = new Date(yesterdayDate);
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

      return {
        from_date: formatDate(dayBeforeYesterday),
        to_date: formatDate(dayBeforeYesterday),
        time_period: "daily" as const,
      };

    case TimePeriodEnum.WEEKLY:
      // FIXED: For weekly, get the exact previous week
      // If incident is Jul 11-17, comparison should be Jul 4-10
      const incidentFromDate = new Date(incidentRange.from_date); // Jul 11
      const incidentToDate = new Date(incidentRange.to_date); // Jul 17

      // Previous week ends the day before incident week starts
      const comparisonToDate = new Date(incidentFromDate);
      comparisonToDate.setDate(comparisonToDate.getDate() - 1); // Jul 10

      // Previous week starts 6 days before it ends (7-day week)
      const comparisonFromDate = new Date(comparisonToDate);
      comparisonFromDate.setDate(comparisonFromDate.getDate() - 6); // Jul 4

      return {
        from_date: formatDate(comparisonFromDate),
        to_date: formatDate(comparisonToDate),
        time_period: "weekly" as const,
      };

    case TimePeriodEnum.MONTHLY:
      // For monthly: if incident is June 24 - July 24, comparison should be May 24 - June 23
      const monthIncidentFrom = new Date(incidentRange.from_date);
      const monthIncidentTo = new Date(incidentRange.to_date);

      const monthComparisonTo = new Date(monthIncidentFrom);
      monthComparisonTo.setDate(monthComparisonTo.getDate() - 1);

      const monthComparisonFrom = new Date(monthComparisonTo);
      monthComparisonFrom.setDate(monthComparisonFrom.getDate() - 29); // 30-day period

      return {
        from_date: formatDate(monthComparisonFrom),
        to_date: formatDate(monthComparisonTo),
        time_period: "monthly" as const,
      };

    case TimePeriodEnum.QUARTERLY:
      // For quarterly: similar logic but with 3-month periods
      const quarterIncidentFrom = new Date(incidentRange.from_date);

      const quarterComparisonTo = new Date(quarterIncidentFrom);
      quarterComparisonTo.setDate(quarterComparisonTo.getDate() - 1);

      const quarterComparisonFrom = new Date(quarterComparisonTo);
      quarterComparisonFrom.setDate(quarterComparisonFrom.getDate() - 89); // 90-day period

      return {
        from_date: formatDate(quarterComparisonFrom),
        to_date: formatDate(quarterComparisonTo),
        time_period: "quarterly" as const,
      };

    case TimePeriodEnum.YEARLY:
      // For yearly: similar logic but with 1-year periods
      const yearIncidentFrom = new Date(incidentRange.from_date);

      const yearComparisonTo = new Date(yearIncidentFrom);
      yearComparisonTo.setDate(yearComparisonTo.getDate() - 1);

      const yearComparisonFrom = new Date(yearComparisonTo);
      yearComparisonFrom.setDate(yearComparisonFrom.getDate() - 364); // 365-day period

      return {
        from_date: formatDate(yearComparisonFrom),
        to_date: formatDate(yearComparisonTo),
        time_period: "yearly" as const,
      };

    default:
      return null;
  }
};

/**
 * Format date range for display in the UI
 * @param dateRange - The date range object
 * @param period - The time period for context
 * @returns Formatted string for display
 */
export const formatDateRangeForDisplay = (
  dateRange: { from_date: string; to_date: string },
  period: TimePeriodEnum,
): string => {
  if (!dateRange) {
    return "Loading...";
  }

  const fromDate = new Date(dateRange.from_date);
  const toDate = new Date(dateRange.to_date);

  const formatOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  // Handle same-date scenarios (TODAY, YESTERDAY)
  if (dateRange.from_date === dateRange.to_date) {
    return fromDate.toLocaleDateString("en-US", formatOptions);
  }

  // Handle date ranges
  const fromFormatted = fromDate.toLocaleDateString("en-US", formatOptions);
  const toFormatted = toDate.toLocaleDateString("en-US", formatOptions);

  return `${fromFormatted} - ${toFormatted}`;
};

/**
 * Get the period name for display (e.g., "week", "month", etc.)
 * @param period - The time period enum
 * @returns Human-readable period name
 */
export const getPeriodDisplayName = (period: TimePeriodEnum): string => {
  switch (period) {
    case TimePeriodEnum.TODAY:
      return "day";
    case TimePeriodEnum.YESTERDAY:
      return "day";
    case TimePeriodEnum.WEEKLY:
      return "week";
    case TimePeriodEnum.MONTHLY:
      return "month";
    case TimePeriodEnum.QUARTERLY:
      return "quarter";
    case TimePeriodEnum.YEARLY:
      return "year";
    default:
      return "period";
  }
};
