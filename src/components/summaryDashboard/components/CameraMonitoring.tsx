
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
import { Camera, Check } from "lucide-react";

interface CameraData {
  name: string;
  fps: number | string;
  thresholds: {
    danger_line: number;
    warning_line: number;
  };
}

interface MetricEntry {
  timestamp: string;
  cameras: {
    [cameraId: string]: CameraData;
  };
}

interface CameraDataPoint {
  timestamp: string;
  [cameraId: string]: number | string | null;
}

interface CameraInfo {
  id: string;
  name: string;
  color: string;
  thresholds: {
    danger_line: number;
    warning_line: number;
  };
}

interface CameraVisibility {
  [cameraId: string]: boolean;
}

type TimePeriod = "1D" | "1W" | "1M" | "1Y";

interface CameraMonitoringProps {
  cameraHealthData: any;
  selectedSite: string;
  setSelectedSite: (site: string) => void;
  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;
  isInitialLoading: boolean;
  user: any;
  className?: string;
}

const CameraMonitoring: React.FC<CameraMonitoringProps> = ({
  cameraHealthData,
  selectedSite,
  setSelectedSite,
  timePeriod,
  setTimePeriod,
  isInitialLoading,
  user,
  className = ""
}) => {
  const [visibleCameras, setVisibleCameras] = useState<CameraVisibility>({});

  const cameraColors = [
    "#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6",
    "#1abc9c", "#e67e22", "#34495e", "#16a085", "#27ae60"
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

    if (timePeriod === "1D") {
      return dateTime.time;
    } else if (timePeriod === "1W") {
      return `${dateTime.day}/${dateTime.month}/${dateTime.year}`;
    } else if (timePeriod === "1M") {
      return `${dateTime.day}/${dateTime.month}/${dateTime.year}`;
    } else {
      return `${dateTime.month}/${dateTime.year}`;
    }
  };

  const getCurrentSiteData = () => {
    if (!cameraHealthData || !selectedSite) return null;
    return cameraHealthData[selectedSite];
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

  // Get most recent camera details for each camera
  const getMostRecentCameraDetails = (metricsData: MetricEntry[]) => {
    const cameraDetails: { [id: string]: { name: string; thresholds: any } } = {};

    const sortedMetrics = [...metricsData].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const allCameraIds = new Set<string>();
    metricsData.forEach(entry => {
      Object.keys(entry.cameras).forEach(cameraId => {
        allCameraIds.add(cameraId);
      });
    });

    Array.from(allCameraIds).forEach(cameraId => {
      const mostRecentEntry = sortedMetrics.find(entry =>
        entry.cameras[cameraId] &&
        entry.cameras[cameraId].name &&
        entry.cameras[cameraId].thresholds
      );

      if (mostRecentEntry) {
        cameraDetails[cameraId] = {
          name: mostRecentEntry.cameras[cameraId].name,
          thresholds: mostRecentEntry.cameras[cameraId].thresholds,
        };
      }
    });

    return cameraDetails;
  };

  // Generate complete time range for fixed periods
  const generateCompleteTimeRange = (): CameraDataPoint[] => {
    const siteData = getCurrentSiteData();
    const rawData = siteData?.metrics[timePeriod] || [];
    const latestDate = getLatestDate(rawData);

    const timePoints: CameraDataPoint[] = [];

    const createTimestamp = (year: string, month: string, day: string, hour: string, minute: string): string => {
      return `${year}-${month}-${day}T${hour}:${minute}:00+00:00`;
    };

    const padPoint = (timestamp: string): CameraDataPoint => ({
      timestamp,
    });

    if (timePeriod === "1D") {
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const hourStr = hour.toString().padStart(2, '0');
          const minuteStr = minute.toString().padStart(2, '0');
          const timestamp = createTimestamp(latestDate.year, latestDate.month, latestDate.day, hourStr, minuteStr);
          timePoints.push(padPoint(timestamp));
        }
      }
    } else if (timePeriod === "1W") {
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
    } else if (timePeriod === "1M") {
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
    } else if (timePeriod === "1Y") {
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

  const getTransformedCameraData = (): { data: CameraDataPoint[]; cameras: CameraInfo[] } => {
    if (!cameraHealthData || !selectedSite || !cameraHealthData[selectedSite]) {
      return { data: [], cameras: [] };
    }

    const siteData = cameraHealthData[selectedSite];
    const metricsData = siteData.metrics[timePeriod] || [];

    if (metricsData.length === 0) {
      return { data: [], cameras: [] };
    }

    const cameraDetails = getMostRecentCameraDetails(metricsData);

    const allCameras = Object.keys(cameraDetails);

    if (allCameras.length === 0) {
      return { data: [], cameras: [] };
    }

    const cameras: CameraInfo[] = allCameras.map((cameraId, index) => ({
      id: cameraId,
      name: cameraDetails[cameraId]?.name || `Camera ${index + 1}`,
      color: cameraColors[index % cameraColors.length],
      thresholds: cameraDetails[cameraId]?.thresholds || { danger_line: 90, warning_line: 75 },
    }));

    const completeTimeRange = generateCompleteTimeRange();
    const dataMap = new Map<string, MetricEntry>();

    metricsData.forEach((entry: MetricEntry) => {
      const dateTime = extractDateTime(entry.timestamp);
      if (!dateTime) return;

      let key = "";
      if (timePeriod === "1D") {
        const minute = parseInt(dateTime.minute);
        const roundedMinute = Math.floor(minute / 15) * 15;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${dateTime.hour}-${roundedMinute.toString().padStart(2, '0')}`;
      } else if (timePeriod === "1W") {
        const hour = parseInt(dateTime.hour);
        const roundedHour = Math.floor(hour / 2) * 2;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${roundedHour.toString().padStart(2, '0')}`;
      } else if (timePeriod === "1M") {
        const hour = parseInt(dateTime.hour);
        const roundedHour = Math.floor(hour / 6) * 6;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${roundedHour.toString().padStart(2, '0')}`;
      } else {
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}`;
      }

      dataMap.set(key, entry);
    });

    const transformedData: CameraDataPoint[] = completeTimeRange.map((point) => {
      const dateTime = extractDateTime(point.timestamp);
      if (!dateTime) return point;

      let key = "";
      if (timePeriod === "1D") {
        const minute = parseInt(dateTime.minute);
        const roundedMinute = Math.floor(minute / 15) * 15;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${dateTime.hour}-${roundedMinute.toString().padStart(2, '0')}`;
      } else if (timePeriod === "1W") {
        const hour = parseInt(dateTime.hour);
        const roundedHour = Math.floor(hour / 2) * 2;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${roundedHour.toString().padStart(2, '0')}`;
      } else if (timePeriod === "1M") {
        const hour = parseInt(dateTime.hour);
        const roundedHour = Math.floor(hour / 6) * 6;
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}-${roundedHour.toString().padStart(2, '0')}`;
      } else {
        key = `${dateTime.year}-${dateTime.month}-${dateTime.day}`;
      }

      const actualEntry = dataMap.get(key);
      const dataPoint: CameraDataPoint = {
        timestamp: actualEntry ? actualEntry.timestamp : point.timestamp,
      };

      cameras.forEach((camera) => {
        if (actualEntry && actualEntry.cameras[camera.id]) {
          const cameraData = actualEntry.cameras[camera.id];
          const fpsValue = cameraData?.fps;
          dataPoint[camera.id] = (fpsValue === "N/A" || fpsValue === null || fpsValue === undefined) ? null : Number(fpsValue);
        }
        else {
          dataPoint[camera.id] = null;
        }
      });

      return dataPoint;
    });

    return { data: transformedData, cameras };
  };

  // Check if camera has any valid data (not all N/A/null)
  const cameraHasValidData = (cameraId: string): boolean => {
    const { data } = getTransformedCameraData();
    return data.some(point => point[cameraId] !== null && point[cameraId] !== undefined);
  };

  // Calculate interval for X-axis ticks
  const getXAxisInterval = (): number => {
    const dataLength = getTransformedCameraData().data.length;

    if (timePeriod === "1D") {
      return 7;
    } else if (timePeriod === "1W") {
      return 11;
    } else if (timePeriod === "1M") {
      return Math.max(1, Math.floor(dataLength / 15));
    } else {
      return Math.max(1, Math.floor(dataLength / 12));
    }
  };

  // Get date for 1D period
  const getDateForDisplay = (): string => {
    const currentSiteData = getCurrentSiteData();
    if (!currentSiteData || !currentSiteData.metrics[timePeriod]) return "";

    const data = currentSiteData.metrics[timePeriod];
    if (data.length === 0) return "";

    const dateTime = extractDateTime(data[0].timestamp);
    return dateTime ? dateTime.date : "";
  };

  const toggleCameraVisibility = (cameraId: string) => {
    setVisibleCameras(prev => ({
      ...prev,
      [cameraId]: !prev[cameraId]
    }));
  };




  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const formattedTime = formatTimestampForDisplay(label);
      const { cameras } = getTransformedCameraData();

      return (
        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <p className="mb-1 text-xs font-medium text-gray-700">{formattedTime}</p>
          {payload.map((entry: any, index: number) => {
            const camera = cameras.find(c => c.id === entry.dataKey);
            if (!camera || entry.value === null) return null;

            const fps = entry.value;
            const isAlert = typeof fps === 'number' && fps < (camera.thresholds?.danger_line || 5);

            return (
              <p
                key={index}
                style={{ color: entry.color }}
                className={`text-xs ${isAlert ? "font-bold" : "font-medium"}`}
              >
                {camera.name}: {typeof fps === 'number' ? fps.toFixed(1) : 'N/A'} FPS
                {isAlert && " ⚠️"}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // WITH THIS:
  const { data: chartData, cameras } = getTransformedCameraData();

  const effectiveVisibility = cameras.reduce((acc, camera) => {
    acc[camera.id] = visibleCameras[camera.id] !== false;
    return acc;
  }, {} as CameraVisibility);

  const camerasWithValidData = cameras.filter(camera =>
    cameraHasValidData(camera.id) && effectiveVisibility[camera.id]
  );

  const getReferenceLines = () => {
    const firstCameraWithThresholds = cameras.find(c => c.thresholds);
    if (firstCameraWithThresholds) {
      return {
        danger: firstCameraWithThresholds.thresholds.danger_line,
        warning: firstCameraWithThresholds.thresholds.warning_line
      };
    }
    return { danger: 5, warning: 10 };
  };

  const referenceLines = getReferenceLines();
  const currentSiteData = getCurrentSiteData();

  return (
    <div className={`rounded-lg bg-white shadow-md flex flex-col h-full ${className}`}>
      {/* Simple Header */}
      <div className="border-b border-gray-100 p-2">
        <h3 className="text-sm font-bold text-gray-700 text-center">Camera FPS Monitoring</h3>
      </div>

      {/* Chart Area */}
      <div className="p-4 sm:p-6 flex-1 overflow-hidden">
        <div className="relative h-full">
          {isInitialLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600"></div>

              </div>
            </div>
          ) : !getCurrentSiteData() || chartData.length === 0 || cameras.length === 0 ? (
            <div className="relative h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 10, right: 30, left: 1, bottom: 10 }}>
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
                  <Camera className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <div className="text-sm font-medium">No Camera Data Available</div>
                  <div className="text-sm">for {timePeriod} period at {selectedSite}</div>
                </div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
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

                <ReferenceLine
                  y={referenceLines.danger}
                  stroke="#C70039"
                  strokeWidth={1}
                  strokeDasharray="8 4"
                  label={{ value: "Critical Low", position: "insideBottomRight", style: { fontSize: '13px', fill: '#999', fontWeight: '300' } }}
                />
                <ReferenceLine
                  y={referenceLines.warning}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  label={{ value: "Warning Low", position: "top", style: { fontSize: '13px', fill: '#999', fontWeight: '300' } }}
                />

                {camerasWithValidData.map((camera) => (
                  <Line
                    key={camera.id}
                    type="monotone"
                    dataKey={camera.id}
                    stroke={camera.color}
                    strokeWidth={1.5}
                    dot={{ r: 1 }}
                    activeDot={{ r: 3 }}
                    name={camera.name}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Date display for 1D period */}
        {timePeriod === "1D" && chartData.length > 0 && (
          <div className="mt-1 text-center text-sm text-gray-600">
            <span className="font-medium">Date: {getDateForDisplay()}</span>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      {cameras.length > 0 && (
        <div className="p-2 sm:pt-0">
              <div className="max-h-24 overflow-y-auto overflow-x-hidden">

          <div className="flex flex-wrap gap-2 justify-center pr-2">
            {cameras
              .filter(camera => cameraHasValidData(camera.id))
              .map((camera) => (
                <button
                  key={camera.id}
                  onClick={() => toggleCameraVisibility(camera.id)}
                  className={`flex items-center gap-1.5 rounded px-1 py-1 text-xs font-medium transition-all ${effectiveVisibility[camera.id]
                    ? 'hover:bg-gray-100'
                    : 'bg-gray-50 opacity-50 line-through hover:bg-gray-100'
                    }`}
                >
                  <div
                    className={`h-3 w-3 rounded border-2 flex items-center justify-center flex-shrink-0 ${effectiveVisibility[camera.id] ? '' : 'bg-gray-200'
                      }`}
                    style={{
                      backgroundColor: effectiveVisibility[camera.id] ? camera.color : 'transparent',
                      borderColor: camera.color
                    }}
                  >
                    {effectiveVisibility[camera.id] && (
                      <Check className="h-2 w-2 text-white" strokeWidth={3} />
                    )}
                  </div>
                  <span
                    className="select-none"
                    style={{ color: effectiveVisibility[camera.id] ? camera.color : '#9CA3AF' }}
                  >
                    {camera.name}
                  </span>
                </button>
              ))}
          </div>
              </div>
        </div>
      )}
    </div>
  );
};

export default CameraMonitoring;