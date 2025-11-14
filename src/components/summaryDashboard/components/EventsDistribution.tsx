import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

type TimePeriod = "1D" | "1W" | "1M" | "1Y";

interface EventsDistributionProps {
  eventAnalyticsData: any;
  analyticsLoading: boolean;
  selectedSite: string;
  timePeriod: TimePeriod;
}

const EventsDistribution: React.FC<EventsDistributionProps> = ({
  eventAnalyticsData,
  analyticsLoading,
  selectedSite,
  timePeriod,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const pieColors: string[] = [
    "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C",
    "#E67E22", "#34495E", "#95A5A6", "#D35400", "#8E44AD"
  ];

  const getApiTimePeriod = (period: TimePeriod): string => {
    const mapping = {
      "1D": "1d",
      "1W": "1w",
      "1M": "1m",
      "1Y": "1y"
    };
    return mapping[period];
  };

  const getDistributionAnalyticsData = () => {
    if (!eventAnalyticsData || !selectedSite) return null;
    const siteData = eventAnalyticsData[selectedSite];
    if (!siteData) return null;
    const apiPeriod = getApiTimePeriod(timePeriod);
    return siteData.analytics[apiPeriod];
  };

  const transformDataForChart = (data: Record<string, number>, category: string) => {
    if (!data || Object.keys(data).length === 0) return [];
    return Object.entries(data).map(([name, count]) => ({
      name,
      count,
      category
    }));
  };

  const calculatePercentages = (data: any[], total: number) => {
    return data.map((item, index) => ({
      ...item,
      value: item.count > 0 ? Math.max(Math.floor((item.count / total) * 100), 1) : 0,
      color: pieColors[index % pieColors.length],
    }));
  };

  const getSeverityColor = (name: string, category: string, defaultColor: string) => {
    if (category === 'severity') {
      switch (name.toLowerCase()) {
        case 'critical': return '#e74c3c';
        case 'low': return '#2ecc71';
        case 'high': return '#f39c12';
        default: return defaultColor;
      }
    }
    return defaultColor;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, count }) => {
    if (count === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="10"
        fontWeight="small"
      >
        {count}
      </text>
    );
  };

  const renderPieChart = (title: string, category: string) => {
    const analyticsData = getDistributionAnalyticsData();
    let chartData = [];
    let categoryTotal = 0;

    if (analyticsData) {
      const rawData = category === 'severity'
        ? analyticsData.severity_counts
        : category === 'status'
          ? analyticsData.status_counts
          : analyticsData.uc_type_counts;

      chartData = transformDataForChart(rawData, category);
      categoryTotal = chartData.reduce((sum: number, item: any) => sum + item.count, 0);
    }

    return (
      <div className="flex-1 rounded-lg bg-white shadow-md flex flex-col h-full overflow-hidden">
        <div className="border-b border-gray-100 px-3 py-2">
          <h3 className="text-sm font-bold text-gray-700 text-center">{title}</h3>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-1 p-3 min-h-0">
          <div className="flex-shrink-0 mx-auto lg:mx-0" style={{ width: '180px', height: '180px' }}>
            {analyticsLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600"></div>
              </div>
            ) : !analyticsData || chartData.length === 0 || categoryTotal === 0 ? (
              <div className="relative h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ name: "No Data", value: 100 }]}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      fill="#f3f4f6"
                      stroke="#e5e7eb"
                      strokeWidth={2}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="text-sm">No Data</div>
                  </div>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={calculatePercentages(chartData, categoryTotal)}
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={15}
                    dataKey="value"
                    isAnimationActive={false}
                    onMouseEnter={(data) => setHoveredSlice(`${category}-${data.name}`)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    {chartData.filter((entry: any) => entry.count > 0)
                      .map((entry: any, index: number) => {
                        const isHovered = hoveredSlice === `${category}-${entry.name}`;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={getSeverityColor(entry.name, category, pieColors[index % pieColors.length])}
                            stroke="#f8f9fa"
                            strokeWidth={0.5}
                            style={{
                              cursor: 'pointer',
                              filter: isHovered ? 'brightness(1.1)' : 'none',
                              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                              transformOrigin: 'center',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                          />
                        );
                      })}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${props.payload.count} events (${value}%)`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto lg:max-h-[180px]">
            {chartData.length > 0 && (
              <div className="space-y-1.5">
                {chartData.map((entry: any, index: number) => {
                  const isHovered = hoveredSlice === `${category}-${entry.name}`;
                  return (
                    <div
                      key={entry.name}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${isHovered ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      onMouseEnter={() => setHoveredSlice(`${category}-${entry.name}`)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    >
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: entry.count > 0
                            ? getSeverityColor(entry.name, category, pieColors[index % pieColors.length])
                            : '#e5e7eb'
                        }}
                      />
                      <span className={`text-xs font-medium ${entry.count > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {entry.name.replace(/_/g, ' ')} ({entry.count})
                      </span>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 h-full">
        {renderPieChart("Severity", "severity")}
        {renderPieChart("Status", "status")}
        {renderPieChart("Use Case Types", "uc_type")}
      </div>
    </div>
  );
};

export default EventsDistribution;