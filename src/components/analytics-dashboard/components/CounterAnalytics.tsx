import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { BarChart3, MapPin } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useGetSitesByCustomer } from '../../../hooks/useApi';
import { apiClient } from '../../../api/api-client';
import CustomDropdown from '@/components/CustomDropdown';
import CounterDropdown from '../CounterDropdown';
import Loading from '@/components/Loading';
import {
  saveCounterAnalyticsFiltersToStorage,
  loadCounterAnalyticsFiltersFromStorage
} from '@/utils/browserStorage';

import { SiteCounterOccupancyData } from '@/api/types';

interface Site {
  id: string;
  name: string;
}

type ChartType = 'normal' | 'stacked';
type DisplayType = 'line' | 'bar';


interface StandaloneCounterAnalyticsProps {
  dateRange?: { start: string; end: string } | null;
  incidentDateRange?: { start: string; end: string };
  dateFilter?: any;
}

export default function CounterAnalytics({
  // dateRange: parentDateRange,
  incidentDateRange,
  dateFilter: parentDateFilter
}: StandaloneCounterAnalyticsProps) {

  const { user } = useAuth();
  const customerId = user?.customer_id ?? "";
  const userId = user?.id ?? "";
  const timezone = user?.timezone;

  // State management
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedCounters, setSelectedCounters] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>('normal');
  const [showLines, setShowLines] = useState(true);
  const [showBars, setShowBars] = useState(true);


  const [counterDisplayTypes, setCounterDisplayTypes] = useState<Record<string, DisplayType>>({});
  const [hiddenCounters, setHiddenCounters] = useState<Set<string>>(new Set());

  // API state for occupancy data
  const [occupancyData, setOccupancyData] = useState<SiteCounterOccupancyData[] | null>(null);
  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [occupancyError, setOccupancyError] = useState<Error | null>(null);
  const [counterAutoApply, setCounterAutoApply] = useState(false);


  // API hooks
  const sitesApiResponse = useGetSitesByCustomer(customerId, userId);

  // Extract sites data
  const sites = useMemo((): Site[] => {
    if (!sitesApiResponse.data || sitesApiResponse.loading || sitesApiResponse.error) {
      return [];
    }
    return sitesApiResponse.data.map(site => ({
      id: site.id,
      name: site.name
    }));
  }, [sitesApiResponse.data, sitesApiResponse.loading, sitesApiResponse.error]);

  useEffect(() => {
    if (!userId) return;

    const savedFilters = loadCounterAnalyticsFiltersFromStorage(userId);
    if (savedFilters) {
      if (savedFilters.selectedSite) setSelectedSite(savedFilters.selectedSite);
      if (savedFilters.selectedCounters?.length > 0) setSelectedCounters(savedFilters.selectedCounters);
      if (savedFilters.counterDisplayTypes) setCounterDisplayTypes(savedFilters.counterDisplayTypes);
      if (savedFilters.chartType) setChartType(savedFilters.chartType);
      if (savedFilters.counterAutoApply !== undefined) setCounterAutoApply(savedFilters.counterAutoApply);
    }
  }, []);

  // Auto-select first site when sites load
  useEffect(() => {
    if (sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);

  // Calculate date range for API call
  const getDateRange = useCallback(() => {
    if (incidentDateRange) {
      return {
        start: incidentDateRange.start,
        end: incidentDateRange.end
      };
    }
    return null;
  }, [incidentDateRange]);


  // Fetch occupancy data function
  const fetchOccupancyData = useCallback(async () => {
    if (!selectedSite) return;

    const range = getDateRange();
    if (!range) return;

    setOccupancyLoading(true);
    setOccupancyError(null);

    try {
      const result = await apiClient.getSiteCounterOccupancy(
        selectedSite,

        range.start,
        range.end,
        timezone
      );

      setOccupancyData(result);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to fetch occupancy data');
      setOccupancyError(err);
      console.error('Failed to fetch occupancy data:', error);
    } finally {
      setOccupancyLoading(false);
    }
  }, [selectedSite, getDateRange, timezone]);

  // Fetch occupancy data when dependencies change
  useEffect(() => {
    fetchOccupancyData();
  }, [fetchOccupancyData]);


  // Add this NEW useEffect after your existing one
  useEffect(() => {
    if (!selectedSite) return;

    const interval = setInterval(() => {
      fetchOccupancyData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedSite, incidentDateRange]);


  // Save filters to storage whenever they change
  useEffect(() => {
    if (!userId) return;

    saveCounterAnalyticsFiltersToStorage(
      {
        selectedSite,
        selectedCounters,
        counterDisplayTypes,
        chartType,
        counterAutoApply,
      },
      userId
    );
  }, [selectedSite, selectedCounters, counterDisplayTypes, chartType, counterAutoApply, userId]);


  const aggregateMinuteData = useCallback((rawData: SiteCounterOccupancyData[]) => {
    if (!rawData || rawData.length === 0) return [];

    // Determine aggregation level based on date range
    const daysDiff = incidentDateRange ?
      Math.ceil((new Date(incidentDateRange.end).getTime() - new Date(incidentDateRange.start).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const getQuarterWeek = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const quarter = Math.floor(month / 3) + 1; // 1-4

      // Get first day of the quarter
      const quarterStart = new Date(year, (quarter - 1) * 3, 1);

      // Calculate week number within the quarter (1-13)
      const daysDiff = Math.floor((date.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24));
      const weekInQuarter = Math.min(Math.ceil((daysDiff + 1) / 7), 13);

      return { year, quarter, week: weekInQuarter };
    };

    const getTimeBucket = (timestamp: string) => {
      const date = new Date(timestamp);

      if (parentDateFilter === 'daily' || daysDiff <= 1) {
        // Hourly buckets
        date.setMinutes(0, 0, 0);
        return date.toISOString();
      } else if (parentDateFilter === 'quarterly') {
        // Calculate quarter and week within quarter
        const qw = getQuarterWeek(date);
        return `${qw.year}-Q${qw.quarter}-W${qw.week.toString().padStart(2, '0')}`;
      } else if (parentDateFilter === 'yearly' || daysDiff > 365) {
        // Monthly buckets
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
      } else {
        // Daily buckets
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
      }
    };



    // Generate all time buckets in range
    const generateTimeBuckets = () => {
      if (!incidentDateRange) return [];
      const buckets = [];
      const start = new Date(incidentDateRange.start);
      const end = new Date(incidentDateRange.end);

      if (parentDateFilter === 'daily' || daysDiff <= 1) {
        // Generate hourly buckets
        for (let hour = 0; hour < 24; hour++) {
          const bucket = new Date(start);
          bucket.setHours(hour, 0, 0, 0);
          buckets.push(bucket.toISOString());
        }
      } else if (parentDateFilter === 'quarterly') {
        // Calculate actual quarter and week for start and end dates
        const startQW = getQuarterWeek(start);
        const endQW = getQuarterWeek(end);

        // Generate weeks from start quarter-week to end quarter-week
        for (let year = startQW.year; year <= endQW.year; year++) {
          for (let quarter = 1; quarter <= 4; quarter++) {
            // Skip quarters outside our range
            if (year === startQW.year && quarter < startQW.quarter) continue;
            if (year === endQW.year && quarter > endQW.quarter) continue;

            const startWeek = (year === startQW.year && quarter === startQW.quarter) ? startQW.week : 1;
            const endWeek = (year === endQW.year && quarter === endQW.quarter) ? endQW.week : 13;

            for (let week = startWeek; week <= endWeek; week++) {
              buckets.push(`${year}-Q${quarter}-W${week.toString().padStart(2, '0')}`);
            }
          }
        }
      } else if (parentDateFilter === 'yearly' || daysDiff > 365) {
        // Generate monthly buckets
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
          buckets.push(current.toISOString());
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        // Generate daily buckets
        const current = new Date(start);
        current.setHours(0, 0, 0, 0);
        while (current <= end) {
          buckets.push(current.toISOString());
          current.setDate(current.getDate() + 1);
        }
      }
      return buckets;
    };



    // Aggregate data by time buckets with type-based aggregation
    const bucketData = new Map();

    rawData.forEach((counter: SiteCounterOccupancyData) => {
      const counterBuckets = new Map();

      counter.data.forEach(point => {
        const bucket = getTimeBucket(point.time_created);
        if (!counterBuckets.has(bucket)) {
          counterBuckets.set(bucket, []);
        }
        counterBuckets.get(bucket).push(point.occupancy);
      });

      // Aggregate based on counter type
      const aggregatedBuckets = new Map();
      counterBuckets.forEach((values, bucket) => {
        let aggregatedValue;

        if (counter.type === true) {
          // Type true: Sum all values
          aggregatedValue = values.reduce((sum: number, val: number) => sum + val, 0);
        } else {
          // Type false: Average all values
            aggregatedValue  = parseFloat(
              (values.reduce((sum: number, val: number) => sum + val, 0) / values.length).toFixed(2)
            );


        }

        aggregatedBuckets.set(bucket, aggregatedValue);
      });

      bucketData.set(counter.name, aggregatedBuckets);
    });

    // Build chart data with all time buckets
    const allBuckets = generateTimeBuckets();
    return allBuckets.map(bucket => {
      const result: any = { time: bucket };
      rawData.forEach((counter: SiteCounterOccupancyData) => {
        const counterData = bucketData.get(counter.name);
        result[counter.name] = counterData?.get(bucket) ?? null;
      });
      return result;
    });
  }, [incidentDateRange, parentDateFilter]);
  //////

  // Process and format data for chart
  const { chartData, availableCounters, counterTypes, hasValidData } = useMemo(() => {
    if (!occupancyData || occupancyLoading || occupancyError) {
      return { chartData: [], availableCounters: [], counterTypes: {} };
    }

    // Extract counter information
    const counters = occupancyData.map(c => c.name);
    const types: Record<string, boolean> = {};
    occupancyData.forEach(counter => {
      types[counter.name] = counter.type;
    });

    const hasData = occupancyData.some(counter => counter.data && counter.data.length > 0);

    if (!hasData) {
      return {
        chartData: [],
        availableCounters: counters.sort(),
        counterTypes: types,
        hasValidData: false
      };
    }

    // Aggregate the minute data based on selected time frame
    const aggregatedData = aggregateMinuteData(occupancyData);

    // Format data for chart with proper time labels and stacking
    const chartDataPoints = aggregatedData.map(dataPoint => {
      let timeLabel: string;

      // Format time label based on date range and time period
      const daysDiff = incidentDateRange ?
        Math.ceil((new Date(incidentDateRange.end).getTime() - new Date(incidentDateRange.start).getTime()) / (1000 * 60 * 60 * 24)) :
        0;
      if (parentDateFilter === 'daily' || daysDiff <= 1) {
        // Daily view - show full date with hours
        const date = new Date(dataPoint.time);
        const dateStr = date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0');
        const timeStr = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        timeLabel = dateStr + ' ' + timeStr;
      }
      else if (parentDateFilter === 'quarterly') {
        // Quarterly view - time is already in format "2025-Q1-W01"
        timeLabel = dataPoint.time;
      } else if (parentDateFilter === 'yearly' || daysDiff > 365) {
        // Yearly view - show months
        const date = new Date(dataPoint.time);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        timeLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      } else {
        // Weekly/Monthly view - show day names with dates
        const date = new Date(dataPoint.time);
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayOfWeek = days[date.getDay()];
        const dayOfMonth = date.getDate();
        timeLabel = `${dayOfWeek}-${dayOfMonth}`;
      }

      const chartItem: any = {
        time: dataPoint.time,
        timeLabel
      };

      // Get counter values for this time point
      const counterValues: Record<string, number> = {};
      counters.forEach(counterName => {
        if (dataPoint[counterName] !== undefined && dataPoint[counterName] !== null) {
          counterValues[counterName] = dataPoint[counterName];
        }
      });

      // Apply chart type logic (normal vs stacked)
      if (chartType === 'stacked') {
        const lineCounters = selectedCounters.filter(name => counterDisplayTypes[name] === 'line');
        const barCounters = selectedCounters.filter(name => counterDisplayTypes[name] === 'bar');

        // Bars: split into positive and negative series
        barCounters.forEach(counterName => {
          if (counterValues[counterName] !== undefined) {
            const value = counterValues[counterName];
            chartItem[`bar_${counterName}_original`] = value;

            // Split into positive and negative bars
            if (value >= 0) {
              chartItem[`bar_${counterName}_positive`] = value;
              chartItem[`bar_${counterName}_negative`] = null;
            } else {
              chartItem[`bar_${counterName}_positive`] = null;
              chartItem[`bar_${counterName}_negative`] = value;
            }
          }
        });

        // Lines: separate cumulative stacking for positive and negative
        let cumulativePositive = 0;
        let cumulativeNegative = 0;

        lineCounters.forEach(counterName => {
          if (counterValues[counterName] !== undefined) {
            const value = counterValues[counterName];
            chartItem[`line_${counterName}_original`] = value;

            if (value >= 0) {
              cumulativePositive += value;
              chartItem[`line_${counterName}`] = cumulativePositive;
            } else {
              cumulativeNegative += value;
              chartItem[`line_${counterName}`] = cumulativeNegative;
            }
          }
        });
      } else {
        // Normal mode: individual values
        Object.entries(counterValues).forEach(([counterName, value]) => {
          const displayType = counterDisplayTypes[counterName] || (types[counterName] ? 'bar' : 'line');
          if (displayType === 'bar') {
            chartItem[`bar_${counterName}`] = value;
            chartItem[`bar_${counterName}_original`] = value;

          } else {
            chartItem[`line_${counterName}`] = value;
            chartItem[`line_${counterName}_original`] = value;
          }
        });
      }

      return chartItem;
    });

    return {
      chartData: chartDataPoints,
      availableCounters: counters.sort(),
      counterTypes: types,
      hasValidData: true
    };
  }, [occupancyData, occupancyLoading, occupancyError, chartType, selectedCounters, counterDisplayTypes, aggregateMinuteData, incidentDateRange, parentDateFilter]);

  // Initialize counter display types
  useEffect(() => {
    const initialTypes: Record<string, DisplayType> = {};
    availableCounters.forEach(counter => {
      if (!(counter in counterDisplayTypes)) {
        initialTypes[counter] = 'line';
      }
    });

    if (Object.keys(initialTypes).length > 0) {
      setCounterDisplayTypes(prev => ({ ...prev, ...initialTypes }));
    }
  }, [availableCounters, counterTypes]);

  // Auto-select all counters when they change
  useEffect(() => {
    if (availableCounters.length > 0 && selectedCounters.length === 0 && Object.keys(counterDisplayTypes).length > 0) {
      setSelectedCounters(availableCounters);
    }
  }, [availableCounters, selectedCounters.length, counterDisplayTypes]);

  // Chart configurations
  const { lineConfigs, barConfigs } = useMemo(() => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

    const lineCounters = selectedCounters.filter(name => counterDisplayTypes[name] === 'line');
    const barCounters = selectedCounters.filter(name => counterDisplayTypes[name] === 'bar');

    const lines = showLines ? lineCounters.map((name, index) => ({
      key: `line_${name}`,
      name,
      color: colors[index % colors.length],
    })) : [];

    const bars = showBars ? barCounters.flatMap((name, index): Array<{
      key: string;
      name: string;
      color: string;
      stackId: string | undefined;
      originalCounter: string;
    }> => {

      const color = colors[(index + lines.length) % colors.length];

      if (chartType === 'stacked') {
        // Create two bar configs: one for positive, one for negative
        return [
          {
            key: `bar_${name}_positive`,
            name: name,
            color: color,
            stackId: 'barStackPositive',
            originalCounter: name,
          },
          {
            key: `bar_${name}_negative`,
            name: name,
            color: color,
            stackId: 'barStackNegative',
            originalCounter: name,
          }
        ];
      } else {
        // Normal mode: single bar
        return [{
          key: `bar_${name}`,
          name,
          color: color,
          stackId: undefined,
          originalCounter: name,
        }];
      }
    }) : [];

    return { lineConfigs: lines, barConfigs: bars };
  }, [selectedCounters, counterDisplayTypes, showLines, showBars, chartType]);

  const handleLegendClick = (e: any) => {
    const dataKey = e.dataKey;
    if (!dataKey) return;

    // Extract the base counter name (remove _positive/_negative suffix)
    const baseKey = dataKey.replace(/_positive$|_negative$/, '');

    setHiddenCounters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(baseKey)) {
        newSet.delete(baseKey);
      } else {
        newSet.add(baseKey);
      }
      return newSet;
    });
  };

  const CustomLegend = ({ payload }: any) => {
    // Filter out duplicate entries (keep only one per counter)
    const uniquePayload = payload.reduce((acc: any[], entry: any) => {
      const baseName = entry.dataKey.replace(/_positive$|_negative$/, '');

      if (!acc.find(item => {
        const itemBaseName = item.dataKey.replace(/_positive$|_negative$/, '');
        return itemBaseName === baseName;
      })) {
        acc.push({ ...entry, dataKey: baseName });
      }
      return acc;
    }, []);

    return (
      <div className="flex flex-wrap items-center justify-center gap-1 px-4 py-3">
        {uniquePayload.map((entry: any, index: number) => {
          const isHidden = hiddenCounters.has(entry.dataKey);
          return (
            <div
              key={`legend-${index}`}
              onClick={() => handleLegendClick({ dataKey: entry.dataKey })}
              className={`flex cursor-pointer items-center gap-1 px-3 py-1.5 transition-all ${isHidden ? 'opacity-40 hover:opacity-60' : 'hover:bg-gray-50'
                }`}
            >
              <div
                className="h-3 w-3"
                style={{ backgroundColor: entry.color }}
              />
              <span className={`text-sm ${isHidden ? 'line-through' : ''} text-gray-700`}>
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Event handlers
  const handleSiteChange = (siteId: string) => {
    setSelectedSite(siteId);
    setSelectedCounters([]);
    setCounterDisplayTypes({});
  };

  const handleCounterToggle = (counterName: string) => {
    setSelectedCounters(prev =>
      prev.includes(counterName)
        ? prev.filter(name => name !== counterName)
        : [...prev, counterName]
    );
  };

  const handleDisplayTypeChange = (counterName: string, displayType: DisplayType) => {
    setCounterDisplayTypes(prev => ({
      ...prev,
      [counterName]: displayType
    }));
  };



  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;



    return (
      <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          const counterName = entry.dataKey.replace(/^(line_|bar_)/, '').replace(/_positive$|_negative$/, '');

          let originalValue = entry.value;
          if (chartType === 'stacked') {
            const originalKey = `${entry.dataKey}_original`;
            if (entry.payload && entry.payload[originalKey] !== undefined) {
              originalValue = entry.payload[originalKey];
            }
          }

          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium">{originalValue}</span>
            </div>
          );
        })}

      </div>
    );
  };


  return (
    <div className="space-y-4 w-full">
      {/* Controls */}


      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mt-5 ">
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Counter Analytics</h3>
     
          <div >

            {/* Single Row with Site, Counters, and Chart Type */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {/* Site Selection */}
              <div className="relative flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Site:</span>
                <CustomDropdown
                  options={sites.map(site => ({ label: site.name, value: site.id }))}
                  value={selectedSite}
                  onChange={(value) => handleSiteChange(value)}
                  placeholder="Select Site"
                  width="min-w-48"
                  className="min-w-48"
                />
              </div>
              {/* Counter Selection */}
              <CounterDropdown
                counters={availableCounters}
                selectedCounters={selectedCounters}
                counterDisplayTypes={counterDisplayTypes}
                onCounterToggle={handleCounterToggle}
                onDisplayTypeChange={handleDisplayTypeChange}
                onSelectAll={() => setSelectedCounters(availableCounters)}
                onUnselectAll={() => setSelectedCounters([])}
                disabled={!selectedSite || occupancyLoading}
                autoApply={counterAutoApply}
                onAutoApplyChange={setCounterAutoApply}
              />

              {/* Chart Type */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Stacked:</span>
                <button
                  onClick={() => setChartType(chartType === 'normal' ? 'stacked' : 'normal')}
                  className={`w-8 h-4 rounded-full border-2 transition-colors ${chartType === 'stacked'
                    ? 'bg-teal-600 border-teal-600'
                    : 'bg-gray-200 border-gray-300'
                    }`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${chartType === 'stacked' ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                </button>
              </div>

             

              {sitesApiResponse.loading && (
                <span className="text-sm text-gray-500">Loading sites...</span>
              )}
            </div>
          </div>
        </div>

        {!selectedSite ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Select a site to view occupancy data</p>
            </div>
          </div>
        ) : occupancyLoading ? (
          <Loading />

        ) : occupancyError ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-red-400 mx-auto mb-2" />
              <p className="text-red-600">Error loading occupancy data</p>
              <p className="text-sm text-gray-500 mt-1">{occupancyError.message}</p>
            </div>
          </div>
        ) : selectedCounters.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Select counters to view data</p>
            </div>
          </div>
        ) : !hasValidData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mt-1">The counters exist but contain no data</p>
              <p className="text-gray-600">No data available for the selected time period</p>

            </div>
          </div>
        ) : (
          <div className="h-96 overflow-x-auto">
            <div style={{ minWidth: Math.max(800, chartData.length * 50) + 'px', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  key={`chart-${chartType}`}

                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />

                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  />

                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <ReferenceLine y={0} stroke="#000" strokeWidth={0.3} />

                  {/* Render bars */}
                  {showBars && barConfigs.map(config => (
                    <Bar
                      key={config.key}
                      dataKey={config.key}
                      fill={config.color}
                      name={config.name}
                      stackId={config.stackId}
                      hide={hiddenCounters.has(`bar_${config.originalCounter}`)}
                      barSize={chartType === 'normal' ? 20 : undefined}
                    />
                  ))}

                  {showLines && lineConfigs.map(config => (
                    <Line
                      key={config.key}
                      type="monotone"
                      dataKey={config.key}
                      stroke={config.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: config.color }}
                      name={config.name}
                      connectNulls={false}
                      hide={hiddenCounters.has(config.key)}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}