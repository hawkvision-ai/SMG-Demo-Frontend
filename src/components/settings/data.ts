// data.ts
// Simple function to check if we're in summer time period (March-October for Northern Hemisphere)
const isSummerTime = (): boolean => {
  const now = new Date();
  const month = now.getMonth() + 1; // getMonth() returns 0-11, so add 1
  // Rough approximation: March to October is summer time for most Northern Hemisphere countries
  return month >= 3 && month <= 10;
};

// Function to adjust offset for summer time
const adjustForSummerTime = (baseOffset: string, timezone: string): string => {
  if (!isSummerTime()) return baseOffset;
  
  // List of timezones that observe DST and need +1 hour in summer
  const dstTimezones = [
    "America/New_York", "America/Toronto", "America/Chicago", "America/Denver", 
    "America/Los_Angeles", "America/Anchorage", "Europe/London", "Europe/Dublin",
    "Europe/Berlin", "Europe/Paris", "Europe/Madrid", "Europe/Rome", 
    "Europe/Athens", "Europe/Stockholm", "Australia/Sydney", "Australia/Melbourne",
    "Australia/Adelaide", "Pacific/Auckland"
  ];
  
  if (dstTimezones.includes(timezone)) {
    // Parse the offset and add 1 hour
    const sign = baseOffset.charAt(0);
    const hours = parseInt(baseOffset.substring(1, 3));
    const minutes = baseOffset.substring(4, 6);
    
    let newHours = hours;
    if (sign === '+') {
      newHours = hours + 1;
    } else {
      newHours = hours - 1;
    }
    
    // Format back to string
    const newSign = newHours >= 0 ? '+' : '-';
    const formattedHours = Math.abs(newHours).toString().padStart(2, '0');
    return `${newSign}${formattedHours}:${minutes}`;
  }
  
  return baseOffset;
};

export const timezones = [
  { label: "UTC", value: "UTC", offset: "+00:00" },
  { label: "Pacific/Honolulu (UTC -10:00)", value: "Pacific/Honolulu", offset: "-10:00" },
  { label: "America/Anchorage (UTC -09:00)", value: "America/Anchorage", offset: adjustForSummerTime("-09:00", "America/Anchorage") },
  { label: "America/Los_Angeles (UTC -08:00)", value: "America/Los_Angeles", offset: adjustForSummerTime("-08:00", "America/Los_Angeles") },
  { label: "America/Denver (UTC -07:00)", value: "America/Denver", offset: adjustForSummerTime("-07:00", "America/Denver") },
  { label: "America/Chicago (UTC -06:00)", value: "America/Chicago", offset: adjustForSummerTime("-06:00", "America/Chicago") },
  { label: "America/Mexico_City (UTC -06:00)", value: "America/Mexico_City", offset: "-06:00" },
  { label: "America/New_York (UTC -05:00)", value: "America/New_York", offset: adjustForSummerTime("-05:00", "America/New_York") },
  { label: "America/Toronto (UTC -05:00)", value: "America/Toronto", offset: adjustForSummerTime("-05:00", "America/Toronto") },
  { label: "America/Sao_Paulo (UTC -03:00)", value: "America/Sao_Paulo", offset: "-03:00" },
  { label: "Atlantic/Azores (UTC -01:00)", value: "Atlantic/Azores", offset: "-01:00" },
  { label: "Europe/London (UTC +00:00)", value: "Europe/London", offset: adjustForSummerTime("+00:00", "Europe/London") },
  { label: "Europe/Dublin (UTC +00:00)", value: "Europe/Dublin", offset: adjustForSummerTime("+00:00", "Europe/Dublin") },
  { label: "Europe/Berlin (UTC +01:00)", value: "Europe/Berlin", offset: adjustForSummerTime("+01:00", "Europe/Berlin") },
  { label: "Europe/Paris (UTC +01:00)", value: "Europe/Paris", offset: adjustForSummerTime("+01:00", "Europe/Paris") },
  { label: "Europe/Madrid (UTC +01:00)", value: "Europe/Madrid", offset: adjustForSummerTime("+01:00", "Europe/Madrid") },
  { label: "Europe/Rome (UTC +01:00)", value: "Europe/Rome", offset: adjustForSummerTime("+01:00", "Europe/Rome") },
  { label: "Europe/Athens (UTC +02:00)", value: "Europe/Athens", offset: adjustForSummerTime("+02:00", "Europe/Athens") },
  { label: "Africa/Cairo (UTC +02:00)", value: "Africa/Cairo", offset: "+02:00" },
  { label: "Africa/Johannesburg (UTC +02:00)", value: "Africa/Johannesburg", offset: "+02:00" },
  { label: "Europe/Moscow (UTC +03:00)", value: "Europe/Moscow", offset: "+03:00" },
  { label: "Asia/Tehran (UTC +03:30)", value: "Asia/Tehran", offset: "+03:30" },
  { label: "Asia/Dubai (UTC +04:00)", value: "Asia/Dubai", offset: "+04:00" },
  { label: "Asia/Karachi (UTC +05:00)", value: "Asia/Karachi", offset: "+05:00" },
  { label: "Asia/Kolkata (UTC +05:30)", value: "Asia/Kolkata", offset: "+05:30" },
  { label: "Asia/Kathmandu (UTC +05:45)", value: "Asia/Kathmandu", offset: "+05:45" },
  { label: "Asia/Dhaka (UTC +06:00)", value: "Asia/Dhaka", offset: "+06:00" },
  { label: "Asia/Bangkok (UTC +07:00)", value: "Asia/Bangkok", offset: "+07:00" },
  { label: "Asia/Jakarta (UTC +07:00)", value: "Asia/Jakarta", offset: "+07:00" },
  { label: "Asia/Shanghai (UTC +08:00)", value: "Asia/Shanghai", offset: "+08:00" },
  { label: "Asia/Hong_Kong (UTC +08:00)", value: "Asia/Hong_Kong", offset: "+08:00" },
  { label: "Asia/Singapore (UTC +08:00)", value: "Asia/Singapore", offset: "+08:00" },
  { label: "Asia/Tokyo (UTC +09:00)", value: "Asia/Tokyo", offset: "+09:00" },
  { label: "Asia/Seoul (UTC +09:00)", value: "Asia/Seoul", offset: "+09:00" },
  { label: "Australia/Perth (UTC +08:00)", value: "Australia/Perth", offset: "+08:00" },
  { label: "Australia/Adelaide (UTC +09:30)", value: "Australia/Adelaide", offset: adjustForSummerTime("+09:30", "Australia/Adelaide") },
  { label: "Australia/Sydney (UTC +10:00)", value: "Australia/Sydney", offset: adjustForSummerTime("+10:00", "Australia/Sydney") },
  { label: "Pacific/Guam (UTC +10:00)", value: "Pacific/Guam", offset: "+10:00" },
  { label: "Pacific/Auckland (UTC +12:00)", value: "Pacific/Auckland", offset: adjustForSummerTime("+12:00", "Pacific/Auckland") },
];
