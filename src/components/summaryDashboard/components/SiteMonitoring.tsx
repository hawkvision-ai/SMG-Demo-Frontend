import React, { useState, useEffect } from "react";
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
import { SiteMonitoringData, MonitoringDataPoint } from "@/api/types";




type TimePeriod = "1D" | "1W" | "1M" | "1Y";

interface MetricVisibility {
  gpu: boolean;
  memory: boolean;
  cpu: boolean;
  gpu_avg: boolean;

}

interface SiteMonitoringProps {
  realtimeMonitoringData: Record<string, SiteMonitoringData> | null;
  selectedSite: string;
  setSelectedSite: (site: string) => void;
  monitoringTimePeriod: TimePeriod;
  setMonitoringTimePeriod: (period: TimePeriod) => void;
  isInitialLoading: boolean;
  user: any;
}

const SiteMonitoring: React.FC<SiteMonitoringProps> = ({
  realtimeMonitoringData,
  selectedSite,
  setSelectedSite,
  monitoringTimePeriod,
  setMonitoringTimePeriod,
  isInitialLoading,
  user,
}) => {
  const [visibleMetrics, setVisibleMetrics] = useState<MetricVisibility>({
    gpu: true,
    memory: true,
    cpu: true,
    gpu_avg: true,

  });

  const metricConfig = [
    { key: 'gpu', label: 'GPU', color: '#FFC300' },
    { key: 'memory', label: 'Memory', color: '#0d9488' },
    { key: 'cpu', label: 'CPU', color: '#2563eb' },
    { key: 'gpu_avg', label: 'Avg GPU', color: "#dc31ecff" },
  ];

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
      gpu: null,
      memory: null,
      cpu: null,
      fps: null,
      gpu_avg: null,
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

  const getCurrentMetricsData = (): MonitoringDataPoint[] => {
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
        gpu: item.gpu === "N/A" ? null : (Number(item.gpu) ?? null),
        memory: item.memory === "N/A" ? null : (Number(item.memory) ?? null),
        cpu: item.cpu === "N/A" ? null : (Number(item.cpu) ?? null),
        fps: item.fps === "N/A" ? null : (Number(item.fps) ?? null),
        gpu_avg: item.gpu_avg === "N/A" ? null : (Number(item.gpu_avg) ?? null),
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
      const dangerLine = getCurrentSiteData()?.thresholds?.danger_line || 75;
      const formattedTime = formatTimestampForDisplay(label);

      return (
        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <p className="mb-1 text-xs font-medium text-gray-700">
            {formattedTime}
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === "dangerLine" || entry.value === null) return null;
            const rawValue = entry.value;
            const displayValue = entry.dataKey === "fps" ? rawValue.toFixed(1) : `${rawValue.toFixed(1)}%`;
            const isAlert = rawValue > dangerLine;

            return (
              <p
                key={index}
                style={{ color: entry.color }}
                className={`text-xs ${isAlert ? "font-bold" : "font-medium"}`}
              >
                {entry.name}: {displayValue}
                {isAlert && " ⚠️"}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Check if metric has any valid data (not all N/A)
  const hasValidData = (metricKey: string): boolean => {
    const data = getCurrentMetricsData();
    return data.some(point => point[metricKey] !== null && point[metricKey] !== undefined);
  };

  // Calculate interval for X-axis ticks
  const getXAxisInterval = (): number => {
    const dataLength = getCurrentMetricsData().length;

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

  const toggleMetricVisibility = (metricKey: string) => {
    setVisibleMetrics(prev => ({
      ...prev,
      [metricKey]: !prev[metricKey]
    }));
  };

  const metricsData = getCurrentMetricsData();
  const currentSiteData = getCurrentSiteData();

  return (
    <div className="rounded-lg bg-white shadow-md h-full flex flex-col">
      {/* Simple Header */}
      <div className="border-b border-gray-100 p-2 ">
        <h3 className="text-sm font-bold text-gray-700 text-center">Site Monitoring</h3>
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
          ) : !currentSiteData || metricsData.length === 0 ? (
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
                  <div className="text-sm font-medium">No Monitoring Data Available</div>
                  <div className="text-sm">for {monitoringTimePeriod} period at {selectedSite}</div>
                </div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={metricsData}
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
                <YAxis stroke="#666" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />

                <ReferenceLine
                  y={currentSiteData?.thresholds?.danger_line || 75}
                  stroke="#C70039"
                  strokeWidth={1}
                  strokeDasharray="8 4"
                  label={{ value: "Overload", position: "top", style: { fontSize: '13px', fill: '#999', fontWeight: '300' } }}
                />

                <ReferenceLine
                  y={currentSiteData?.thresholds?.warning_line || 60}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  label={{ value: "Warning", position: "top", style: { fontSize: '13px', fill: '#999', fontWeight: '300' } }}
                />

                {/* Render lines based on visibility and data availability */}
                {visibleMetrics.gpu && hasValidData('gpu') && (
                  <Line
                    type="monotone"
                    dataKey="gpu"
                    stroke="#FFC300"
                    strokeWidth={1.5}
                    dot={{ r: 1 }}
                    activeDot={{ r: 3 }}
                    name="GPU"
                    connectNulls={false}
                  />
                )}

                {visibleMetrics.memory && hasValidData('memory') && (
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#0d9488"
                    strokeWidth={1.5}
                    dot={{ r: 1 }}
                    activeDot={{ r: 3 }}
                    name="Memory"
                    connectNulls={false}
                  />
                )}

                {visibleMetrics.cpu && hasValidData('cpu') && (
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    dot={{ r: 1 }}
                    activeDot={{ r: 3 }}
                    name="CPU"
                    connectNulls={false}
                  />
                )}

                {visibleMetrics.gpu_avg && hasValidData('gpu_avg') && (
                  <Line
                    type="monotone"
                    dataKey="gpu_avg"
                    stroke="#dc31ecff"
                    strokeWidth={1.5}
                    dot={{ r: 1 }}
                    activeDot={{ r: 3 }}
                    name="Avg GPU"
                    connectNulls={false}
                  />
                )}


              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Date display for 1D period */}
        {monitoringTimePeriod === "1D" && metricsData.length > 0 && (
          <div className="mt-1 text-center text-sm text-gray-600">
            <span className="font-medium">Date: {getDateForDisplay()}</span>
          </div>
        )}
      </div>

      {/* Metrics Controls */}
      {metricsData.length > 0 && (
        <div className="p-2 sm:pt-0">
          <div className="flex flex-wrap gap-2 justify-center">
            {metricConfig.map(({ key, label, color }) => (
              hasValidData(key) && (
                <button
                  key={key}
                  onClick={() => toggleMetricVisibility(key)}
                  className={`flex items-center gap-1.5 rounded px-1 py-1 text-xs font-medium transition-all ${visibleMetrics[key]
                    ? 'hover:bg-gray-100'
                    : 'bg-gray-50 opacity-50 line-through hover:bg-gray-100'
                    }`}
                >
                  <div
                    className={`h-3 w-3 rounded border-2 flex items-center justify-center flex-shrink-0 ${visibleMetrics[key] ? '' : 'bg-gray-200'
                      }`}
                    style={{
                      backgroundColor: visibleMetrics[key] ? color : 'transparent',
                      borderColor: color
                    }}
                  >
                    {visibleMetrics[key] && (
                      <Check className="h-2 w-2 text-white" strokeWidth={3} />
                    )}
                  </div>
                  <span
                    className="select-none"
                    style={{ color: visibleMetrics[key] ? color : '#9CA3AF' }}
                  >
                    {label}
                  </span>
                </button>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteMonitoring;