import { timezones } from "@/components/settings/data";
import { useAuth } from "@/context/AuthContext";

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface TimeZone {
  label: string;
  value: string;
  offset: string;
}

/**
 * Formats a date to the "YYYY-MM-DD HH:MM:SS" format
 * @param date The date to format (Date object or ISO string)
 * @returns Date formatted as YYYY-MM-DD HH:MM:SS
 */
export const formatDateTimeISO = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};


/**
 * Converts a UTC date to a specific timezone using the offset from timezone data
 * @param date The UTC date to convert (Date object or ISO string)
 * @param timezone The timezone value to convert to
 * @returns Formatted date string in the target timezone
 */
export function convertToTimeZone(date: Date | string, timezone?: string): string {
  // Create a new date from the input (assuming it's in UTC)
  const utcDate = new Date(date);
  
  // Find the timezone in our data
  const timezoneData = timezones.find(tz => tz.value === timezone);
  
  if (!timezoneData) {
    // Fallback to UTC if timezone not found
    console.warn(`Timezone ${timezone} not found in timezones data, using UTC`);
    return formatDate(utcDate);
  }
  
  // Parse the offset hours and minutes
  const offsetStr = timezoneData.offset || "+00:00"; // Default to UTC if offset is undefined
  const offsetSign = offsetStr.charAt(0) === '+' ? 1 : -1;
  const [offsetHours, offsetMinutes] = offsetStr
    .substring(1)
    .split(':')
    .map(part => parseInt(part, 10));
  
  // Calculate the offset in milliseconds
  const offsetMs = offsetSign * ((offsetHours * 60 + offsetMinutes) * 60 * 1000);
  
  // Since the input date is already in UTC, we can directly apply the timezone offset
  const targetTime = utcDate.getTime() + offsetMs;
  const adjustedDate = new Date(targetTime);
  
  return formatDate(adjustedDate);
}

/**
 * Helper function to format a date consistently
 */
function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = date.getDate();
  
  // Format hour and ensure it's 2 digits with leading zero if needed
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12 for 12 AM
  const formattedHours = hours < 10 ? '0' + hours : hours;
  
  // Ensure minutes are 2 digits with leading zero if needed
  const minutes = date.getMinutes();
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
  
  return `${month} ${day}, ${year}, ${formattedHours}:${formattedMinutes} ${ampm}`;
}

/**
 * Calculates the time difference between a given date and now, with current time converted to user's timezone
 * @param date The date to compare (Date object or ISO string)
 * @returns Human-readable time difference string
 */
export function getTimeAgo(date: Date | string): string {
  if (!date) return "unknown";
  
  try {
    // Get user's timezone from auth context
    const { getUserTimezoneOrUTC } = useAuth();
    const userTimezone = getUserTimezoneOrUTC();
    
    const targetDate = new Date(date);
    
    // Quick check for invalid date
    if (isNaN(targetDate.getTime())) {
      console.warn(`Invalid date provided to getTimeAgo: ${date}`);
      return "invalid date";
    }
    
    // Get current time and convert to user's timezone
    const now = new Date();
    const currentTime = convertToUserTimezone(now, userTimezone);
    
    // Since both times are now in the user's timezone,
    // we can calculate the difference directly
    const diffMs = currentTime.getTime() - targetDate.getTime();
    
    // Debug info if needed
    // console.log({
    //   input: date,
    //   parsedDate: targetDate.toISOString(),
    //   currentTime: currentTime.toISOString(),
    //   userTimezone,
    //   diffMs
    // });
    
    return formatTimeDifference(diffMs);
  } catch (error) {
    console.error("Error in getTimeAgo:", error);
    return "error";
  }
}

/**
 * Helper function to format time difference into human-readable string
 * @param diffMs Time difference in milliseconds
 * @returns Formatted time difference string
 */
function formatTimeDifference(diffMs: number): string {
  // If the date is in the future, return "just now"
  if (diffMs < 0) {
    return "just now";
  }
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}w`;
  } else if (diffMonths < 12) {
    return `${diffMonths}mo`;
  } else {
    return `${diffYears}y`;
  }
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Converts a date to a specific timezone
 * @param date The date to convert
 * @param timezone The timezone to convert to (e.g., 'America/New_York', 'UTC')
 * @returns Date object representing the date in the specified timezone
 */
export function convertToUserTimezone(date: Date, timezone: string): Date {
  try {
    if (!timezone) return date; // Fall back to original date if no timezone provided
    
    // Format the date to an ISO string with the target timezone
    const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    // Adjust for timezone offset differences between local and target timezone
    const localOffset = date.getTimezoneOffset();
    const targetOffset = dateInTimezone.getTimezoneOffset();
    const offsetDiff = targetOffset - localOffset;
    
    // Apply the offset difference to get the correct time
    return new Date(dateInTimezone.getTime() + offsetDiff * 60 * 1000);
  } catch (error) {
    console.error('Error converting date to timezone:', error);
    return date; // Return original date if conversion fails
  }
}