export const formatTime = (timestamp: string | null | undefined): string => {
  if (!timestamp) return "Not available";

  try {
    const timePart = timestamp.split('T')[1];
    const [hours, minutes, secondsRaw] = timePart.split(':');

    // Take only first 2 digits of seconds, ignore anything after
    const seconds = secondsRaw.substring(0, 2);

    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const amPm = hour24 >= 12 ? 'PM' : 'AM';

    const datePart = timestamp.split('T')[0];
    const [year, month, day] = datePart.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthName = monthNames[parseInt(month) - 1];

    return `${monthName} ${parseInt(day)}, ${year}, ${hour12}:${minutes}:${seconds} ${amPm}`;
  } catch (error) {
    return "Invalid date";
  }
};


export const formatVideoMetadata = (url: string) => {
  try {
    const urlWithoutQuery = url.split("?")[0];
    const filename = decodeURIComponent(urlWithoutQuery.split("/").pop() || "");
    const cleanName = filename.trim();
    return {
      name: cleanName,
      originalName: filename,
    };
  } catch (error) {
    console.error("Error formatting video metadata:", error);
    try {
      const fallbackUrl = url.split("?")[0];
      const fallbackFilename = fallbackUrl.split("/").pop() || "unknown.mkv";
      return {
        name: fallbackFilename,
        originalName: fallbackFilename,
      };
    } catch (fallbackError) {
      return {
        name: "Unknown Video.mkv",
        originalName: "unknown.mkv",
      };
    }
  }
};

export const formatDuration = (seconds: number): string => {
  if (!seconds) return '';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getVideoDuration = (url: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      resolve(video.duration);
      window.URL.revokeObjectURL(video.src);
    };
    
    video.onerror = () => {
      reject('Error loading video metadata');
      window.URL.revokeObjectURL(video.src);
    };

    video.src = url;
  });
};

import type { TimeRange } from "../components/analytics-dashboard/Incident";

export const generateDateLabels = (timeRange: TimeRange, startDate: Date, endDate: Date): string[] => {
  const labels: string[] = [];
  const current = new Date(startDate);

  switch (timeRange) {
    case 'day':
      // Generate hourly intervals
      while (current <= endDate) {
        labels.push(current.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }));
        current.setHours(current.getHours() + 1);
      }
      break;

    case 'week':
      // Generate daily intervals
      while (current <= endDate) {
        labels.push(current.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }));
        current.setDate(current.getDate() + 1);
      }
      break;

    case 'month':
      // Generate weekly intervals or specific days
      while (current <= endDate) {
        labels.push(current.toLocaleDateString('en-US', { 
          month: 'short',
          day: 'numeric'
        }));
        current.setDate(current.getDate() + 7); // Weekly intervals
      }
      break;

    case 'quarter':
      // Generate monthly intervals
      while (current <= endDate) {
        labels.push(current.toLocaleDateString('en-US', { 
          month: 'long',
          year: 'numeric'
        }));
        current.setMonth(current.getMonth() + 1);
      }
      break;

    case 'year':
      // Generate quarterly intervals
      while (current <= endDate) {
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        labels.push(`Q${quarter} ${current.getFullYear()}`);
        current.setMonth(current.getMonth() + 3);
      }
      break;

    case 'custom':
      // Generate daily intervals for custom range
      while (current <= endDate) {
        labels.push(current.toLocaleDateString('en-US', { 
          month: 'short',
          day: 'numeric',
          year: current.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        }));
        current.setDate(current.getDate() + 1);
      }
      break;
  }

  return labels;
};

export const getDateRangeForTimeRange = (timeRange: TimeRange): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();

  switch (timeRange) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }

  return { start, end };
};

export const formatDateForGrouping = (dateStr: string, timeRange: TimeRange): string => {
  // Handle special date formats that aren't actual dates
  switch (timeRange) {
    case 'day':
      // For day range, dateStr might be "1", "2", etc. (hours)
      if (/^\d+$/.test(dateStr)) {
        return `${dateStr}:00`;
      }
      break;
    
    case 'quarter':
      // For quarter range, dateStr might be "Q1", "Q2", etc.
      if (/^Q[1-4]$/.test(dateStr)) {
        return dateStr;
      }
      break;
  }
  
  // Try to parse as a date for other time ranges
  const date = new Date(dateStr);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return dateStr; // Return original string if invalid date
  }

  // Format valid dates based on time range
  switch (timeRange) {
    case 'day':
      return date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    case 'week':
      return date.toISOString().slice(0, 10); // YYYY-MM-DD
    case 'month':
      return date.toISOString().slice(0, 7); // YYYY-MM
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    case 'year':
      return date.getFullYear().toString();
    case 'custom':
      return date.toISOString().slice(0, 10); // YYYY-MM-DD
    default:
      return dateStr;
  }
};