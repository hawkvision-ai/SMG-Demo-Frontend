// components/AverageFPSMonitoring.tsx
import React, { useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { Activity, Check } from "lucide-react";
import { SiteMonitoringData } from "@/api/types";


interface MonitoringDataPoint {
  timestamp: string;
  fps: number | string | null;
}



type TimePeriod = "1D" | "1W" | "1M" | "1Y";

interface AverageFPSMonitoringProps {
  realtimeMonitoringData: Record<string, SiteMonitoringData> | null;
  selectedSite: string;
  monitoringTimePeriod: TimePeriod;
  isInitialLoading: boolean;
  user: any;
}

const AverageFPSMonitoring: React.FC<AverageFPSMonitoringProps> = ({
  realtimeMonitoringData,
  selectedSite,
  monitoringTimePeriod,
  isInitialLoading,
  user,
}) => {

  const [fpsVisible, setFpsVisible] = useState<boolean>(true);

  const toggleFPSVisibility = () => {
    setFpsVisible(prev => !prev);
  };
  // Helper function to extract date and time from ISO timestamp
  const extractDateTime = (timestamp: string) => {
    const isoMatch = timestamp.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (isoMatch) {
      return {
        date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`,
        time: `${isoMatch[4]}:${isoMatch[5]}`,
        year: isoMatch[1],
        month: isoMatch[2],
        day: isoMatch[3],
        hour: isoMatch[4],
        minute: isoMatch[5]
      };
    }
    return null;
  };

  // Helper function to format timestamp for display
  const formatTimestampForDisplay = (timestamp: string): string => {
    const dateTime = extractDateTime(timestamp);
    if (!dateTime) return timestamp;

    return `${dateTime.date} ${dateTime.time}`;
  };

  // Helper function to format tick labels based on period
  const formatTickForDisplay = (timestamp: string): string => {
    const dateTime = extractDateTime(timestamp);
    if (!dateTime) return timestamp;

    if (monitoringTimePeriod === "1D") {
      return dateTime.time;
    } else if (monitoringTimePeriod === "1W") {
      return `${dateTime.day}/${dateTime.month}/${dateTime.year}`;
    } else if (monitoringTimePeriod === "1M") {
      return `${dateTime.day}/${dateTime.month}/${dateTime.year}`;
    } else {
      return `${dateTime.month}/${dateTime.year}`;
    }
  };

  const getCurrentSiteData = () => {
    if (!realtimeMonitoringData || !selectedSite) return null;
    return realtimeMonitoringData[selectedSite];
  };

  // Get latest date from data or use a default
  const getLatestDate = (rawData: any[]) => {
    if (rawData && rawData.length > 0) {
      const timestamps = rawData.map(item => item.timestamp).sort();
      const latestTimestamp = timestamps[timestamps.length - 1];
      return extractDateTime(latestTimestamp);
    }
    return {
      year: "2025",
      month: "07",
      day: "08",
      hour: "08",
      minute: "00"
    };
  };

  // Generate complete time range for fixed periods
  const generateCompleteTimeRange = (): MonitoringDataPoint[] => {
    const siteData = getCurrentSiteData();
    const rawData = siteData?.data[monitoringTimePeriod] || [];
    const latestDate = getLatestDate(rawData);

    const timePoints: MonitoringDataPoint[] = [];

    const createTimestamp = (year: string, month: string, day: string, hour: string, minute: string): string => {
      return `${year}-${month}-${day}T${hour}:${minute}:00+00:00`;
    };

    const padPoint = (timestamp: string): MonitoringDataPoint => ({
      timestamp,
      fps: null,
    });

    if (monitoringTimePeriod === "1D") {
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const hourStr = hour.toString().padStart(2, '0');
          const minuteStr = minute.toString().padStart(2, '0');
          const timestamp = createTimestamp(latestDate.year, latestDate.month, latestDate.day, hourStr, minuteStr);
          timePoints.push(padPoint(timestamp));
        }
      }
    } else if (monitoringTimePeriod === "1W") {
      const latestDay = parseInt(latestDate.day);
      const latestMonth = parseInt(latestDate.month);
      const latestYear = parseInt(latestDate.year);

      for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        let currentDay = latestDay - dayOffset;
        let currentMonth = latestMonth;
        let currentYear = latestYear;

        while (currentDay <= 0) {
          currentMonth -= 1;
          if (currentMonth <= 0) {
            currentMonth = 12;
            currentYear -= 1;
          }

          const daysInPrevMonth = currentMonth === 2 ? 28 : (currentMonth === 4 || currentMonth === 6 || currentMonth === 9 || currentMonth === 11) ? 30 : 31;
          currentDay += daysInPrevMonth;
        }

        const dayStr = currentDay.toString().padStart(2, '0');
        const monthStr = currentMonth.toString().padStart(2, '0');
        const yearStr = currentYear.toString();

        for (let hour = 0; hour < 24; hour += 2) {
          const hourStr = hour.toString().padStart(2, '0');
          const timestamp = createTimestamp(yearStr, monthStr, dayStr, hourStr, "00");
          timePoints.push(padPoint(timestamp));
        }
      }
    } else if (monitoringTimePeriod === "1M") {
      const latestDay = parseInt(latestDate.day);
      const latestMonth = parseInt(latestDate.month);
      const latestYear = parseInt(latestDate.year);

      for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
        let currentDay = latestDay - dayOffset;
        let currentMonth = latestMonth;
        let currentYear = latestYear;

        while (currentDay <= 0) {
          currentMonth -= 1;
          if (currentMonth <= 0) {
            currentMonth = 12;
            currentYear -= 1;
          }

          const daysInPrevMonth = currentMonth === 2 ? 28 : (currentMonth === 4 || currentMonth === 6 || currentMonth === 9 || currentMonth === 11) ? 30 : 31;
          currentDay += daysInPrevMonth;
        }

        const dayStr = currentDay.toString().padStart(2, '0');
        const monthStr = currentMonth.toString().padStart(2, '0');
        const yearStr = currentYear.toString();

        for (let hour = 0; hour < 24; hour += 6) {
          const hourStr = hour.toString().padStart(2, '0');
          const timestamp = createTimestamp(yearStr, monthStr, dayStr, hourStr, "00");
          timePoints.push(padPoint(timestamp));
        }
      }
    } else if (monitoringTimePeriod === "1Y") {
      const latestMonth = parseInt(latestDate.month);
      const latestYear = parseInt(latestDate.year);

      for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
        let currentMonth = latestMonth - monthOffset;
        let currentYear = latestYear;

        if (currentMonth <= 0) {
          currentMonth += 12;
          currentYear -= 1;
        }

        const monthStr = currentMonth.toString().padStart(2, '0');
        const yearStr = currentYear.toString();

        const daysInMonth = currentMonth === 2 ? 28 : (currentMonth === 4 || currentMonth === 6 || currentMonth === 9 || currentMonth === 11) ? 30 : 31;

        for (let day = 1; day <= daysInMonth; day++) {
          const dayStr = day.toString().padStart(2, '0');
          const timestamp = createTimestamp(yearStr, monthStr, dayStr, "00", "00");
          timePoints.push(padPoint(timestamp));
        }
      }
    }

    return timePoints;
  };

  const getCurrentFPSData = (): MonitoringDataPoint[] => {
    const siteData = getCurrentSiteData();
    const rawData = siteData?.data[monitoringTimePeriod] || [];

    if (rawData.length === 0) {
      return [];
    }

    const completeTimeRange = generateCompleteTimeRange();
    const dataMap = new Map<string, MonitoringDataPoint>();

    rawData.forEach((item: any) => {
      const dateTime = extractDateTime(item.timestamp);
      if (!dateTime) return;

      let key = "";
      if (monitoringTimePeriod === "1D") {
        const minute = parseInt(dateTime.minute);
        const roundedMinute = Math.floor(minute / 15) * 15;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${dateTime.hour}-${roundedMinute.toString().padStart(2, '0')}`;
      } else if (monitoringTimePeriod === "1W") {
        const hour = parseInt(dateTime.hour);
        const roundedHour = Math.floor(hour / 2) * 2;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${roundedHour.toString().padStart(2, '0')}`;
      } else if (monitoringTimePeriod === "1M") {
        const hour = parseInt(dateTime.hour);
        const roundedHour = Math.floor(hour / 6) * 6;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${roundedHour.toString().padStart(2, '0')}`;
      } else {
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}`;
      }

      dataMap.set(key, {
        timestamp: item.timestamp,
        fps: item.fps === "N/A" ? null : (Number(item.fps) ?? null),
      });
    });

    return completeTimeRange.map((interval) => {
      const dateTime = extractDateTime(interval.timestamp);
      if (!dateTime) return interval;

      let key = "";
      if (monitoringTimePeriod === "1D") {
        const minute = parseInt(dateTime.minute);
        const roundedMinute = Math.floor(minute / 15) * 15;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${dateTime.hour}-${roundedMinute.toString().padStart(2, '0')}`;
      } else if (monitoringTimePeriod === "1W") {
        const hour = parseInt(dateTime.hour);
        const roundedHour = Math.floor(hour / 2) * 2;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${roundedHour.toString().padStart(2, '0')}`;
      } else if (monitoringTimePeriod === "1M") {
        const hour = parseInt(dateTime.hour);
        const roundedHour = Math.floor(hour / 6) * 6;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${roundedHour.toString().padStart(2, '0')}`;
      } else {
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}`;
      }

      return dataMap.get(key) || interval;
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const formattedTime = formatTimestampForDisplay(label);

      return (
        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <p className="mb-1 text-xs font-medium text-gray-700">
            {formattedTime}
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null) return null;
            const fpsValue = entry.value;
            const isLowFPS = fpsValue < 15; // Alert when FPS is low

            return (
              <p
                key={index}
                style={{ color: entry.color }}
                className={`text-xs ${isLowFPS ? "font-bold" : "font-medium"}`}
              >
                Site FPS: {fpsValue.toFixed(1)}
                {isLowFPS && " ⚠️"}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Check if FPS has any valid data
  const hasValidFPSData = (): boolean => {
    const data = getCurrentFPSData();
    return data.some(point => point.fps !== null && point.fps !== undefined);
  };

  // Calculate interval for X-axis ticks
  const getXAxisInterval = (): number => {
    const dataLength = getCurrentFPSData().length;

    if (monitoringTimePeriod === "1D") {
      return 7;
    } else if (monitoringTimePeriod === "1W") {
      return 11;
    } else if (monitoringTimePeriod === "1M") {
      return Math.max(1, Math.floor(dataLength / 15));
    } else {
      return Math.max(1, Math.floor(dataLength / 12));
    }
  };

  // Get date for 1D period
  const getDateForDisplay = (): string => {
    const currentSiteData = getCurrentSiteData();
    if (!currentSiteData || !currentSiteData.data[monitoringTimePeriod]) return "";

    const data = currentSiteData.data[monitoringTimePeriod];
    if (data.length === 0) return "";

    const dateTime = extractDateTime(data[0].timestamp);
    return dateTime ? dateTime.date : "";
  };

  const fpsData = getCurrentFPSData();
  const currentSiteData = getCurrentSiteData();

  return (
    <div className="rounded-lg bg-white shadow-md flex flex-col h-full">
      {/* Simple Header */}
      <div className="border-b border-gray-100 p-2">
        <h3 className="text-sm font-bold text-gray-700 text-center">Site FPS Monitoring</h3>
      </div>

      {/* Chart Area */}
      <div className="p-4 sm:p-6" style={{ height: 'calc(100% - 60px)' }}>
        <div className="relative" style={{ height: 'calc(100% - 0px)' }}>

          {isInitialLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600"></div>

              </div>
            </div>
          ) : !currentSiteData || fpsData.length === 0 || !hasValidFPSData() ? (
            <div className="relative h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 10, right: 30, left: 1, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    stroke="#666"
                    axisLine={true}
                    tickLine={true}
                    domain={['', '']}
                    type="category"
                  />
                  <YAxis stroke="#666" domain={[0, 100]} />
                </LineChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center bg-white/30">
                <div className="text-center text-gray-600">
                  <Activity className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <div className="text-sm font-medium">No FPS Data Available</div>
                  <div className="text-sm">for {monitoringTimePeriod} period at {selectedSite}</div>
                </div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={fpsData}
                margin={{ top: 10, right: 30, left: 1, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#666"
                  interval={getXAxisInterval()}
                  tick={{ fontSize: 11 }}
                  tickLine={{ stroke: '#666' }}
                  tickFormatter={(value: string) => formatTickForDisplay(value)}
                  angle={-35}
                  textAnchor={"end"}
                  height={40}
                />
                <YAxis stroke="#666" domain={[0, (dataMax: number) => Math.ceil(dataMax + 8)]} />
                <Tooltip content={<CustomTooltip />} />

                {/* Reference lines for FPS (reversed logic - lower is worse) */}
                <ReferenceLine
                  y={5}
                  stroke="#C70039"
                  strokeWidth={1}
                  strokeDasharray="8 4"
                  label={{ value: "Critical Low", position: "top", style: { fontSize: '13px', fill: '#999', fontWeight: '300' } }}
                />

                <ReferenceLine
                  y={10}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  label={{ value: "Warning Low", position: "top", style: { fontSize: '13px', fill: '#999', fontWeight: '300' } }}
                />

                {/* FPS Line */}
                {fpsVisible && hasValidFPSData() && (
                  <Line
                    type="monotone"
                    dataKey="fps"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    dot={{ r: 1 }}
                    activeDot={{ r: 3 }}
                    name="Site FPS"
                    connectNulls={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Date display for 1D period */}
        {monitoringTimePeriod === "1D" && fpsData.length > 0 && (
          <div className="mt-1 text-center text-sm text-gray-600">
            <span className="font-medium">Date: {getDateForDisplay()}</span>
          </div>
        )}
      </div>
      {/* FPS Controls */}
      {hasValidFPSData() && (
        <div className="p-2 sm:pt-0">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={toggleFPSVisibility}
              className={`flex items-center gap-1.5 rounded px-1 py-1 text-xs font-medium transition-all ${fpsVisible ? 'hover:bg-gray-100' : 'bg-gray-50 opacity-50 line-through hover:bg-gray-100'
                }`}
            >
              <div
                className={`h-3 w-3 rounded border-2 flex items-center justify-center flex-shrink-0 ${fpsVisible ? '' : 'bg-gray-200'
                  }`}
                style={{
                  backgroundColor: fpsVisible ? '#10b981' : 'transparent',
                  borderColor: '#10b981'
                }}
              >
                {fpsVisible && (
                  <Check className="h-2 w-2 text-white" strokeWidth={3} />
                )}
              </div>
              <span
                className="select-none"
                style={{ color: fpsVisible ? '#10b981' : '#9CA3AF' }}
              >
                FPS
              </span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AverageFPSMonitoring;