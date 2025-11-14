import { useAuth } from "@/context/AuthContext";
import { useGetMediaRunLogs } from "@/hooks/useApi";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Settings } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ColumnSelector from "../ConfigurationHistory/components/ColumnSelector";
import DateFilter from "../ConfigurationHistory/components/DateRangeFilter";
import LogsTable from "./components/LogsTable";
import type { ColumnConfig, FilterState, MediaQueueLogItem } from "./components/types";

type DateFilterEnum = "today" | "this_week" | "this_month" | null;

// Default columns configuration
const defaultColumns: ColumnConfig[] = [
  {
    key: "serial",
    label: "S.No",
    visible: true,
    sortable: false,
    filterable: false,
    width: 80,
    resizable: false,
  },
  {
    key: "logged_at",
    label: "Logged At",
    visible: true,
    sortable: true,
    filterable: false,
    width: 180,
    resizable: true,
  },
  {
    key: "camera_name",
    label: "Camera",
    visible: true,
    sortable: true,
    filterable: true,
    width: 150,
    resizable: true,
  },
  {
    key: "media_url",
    label: "Media",
    visible: true,
    sortable: false,
    filterable: false,
    width: 200,
    resizable: true,
  },
  {
    key: "status",
    label: "Status",
    visible: true,
    sortable: true,
    filterable: true,
    width: 120,
    resizable: true,
  },
  {
    key: "user_email",
    label: "User",
    visible: true,
    sortable: true,
    filterable: true,
    width: 180,
    resizable: true,
  },
  {
    key: "started_at",
    label: "Started At",
    visible: true,
    sortable: true,
    filterable: false,
    width: 180,
    resizable: true,
  },
  {
    key: "completed_at",
    label: "Completed At",
    visible: true,
    sortable: true,
    filterable: false,
    width: 180,
    resizable: true,
  },
  {
    key: "duration_seconds",
    label: "Duration",
    visible: true,
    sortable: true,
    filterable: false,
    width: 120,
    resizable: true,
  },
  {
    key: "message",
    label: "Message",
    visible: true,
    sortable: false,
    filterable: false,
    width: 250,
    resizable: true,
  },
];

// Helper function to get user initials
const getUserInitials = (email: string): string => {
  const parts = email.split("@")[0].split(".");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
};

interface MediaQueueLogsProps {
  siteId: string;
  onBack: () => void;
}

const MediaQueueLogs: React.FC<MediaQueueLogsProps> = ({ siteId, onBack }) => {
  const { user } = useAuth();

  // API hook
  const { data: apiData, loading, execute } = useGetMediaRunLogs(siteId, user?.timezone);

  // State management
  const [data, setData] = useState<MediaQueueLogItem[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [autoApply, setAutoApply] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilterEnum>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
  });

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    dateRange: {
      startDate: null as Date | null,
      endDate: null as Date | null,
    },
    camera_name: [],
    status: [],
    user_email: [],
  });

  // Transform and set data when API data changes
  useEffect(() => {
    if (apiData?.data) {
      const transformedData: MediaQueueLogItem[] = apiData.data.map((entry) => ({
        id: entry._id,
        site_name: entry.site_name,
        camera_name: entry.camera_name,
        media_url: entry.media_url,
        status: entry.status,
        user: {
          email: entry.user_email,
          initials: getUserInitials(entry.user_email),
        },
        message: entry.message,
        started_at: entry.started_at || "",
        completed_at: entry.completed_at || "",
        duration_seconds: entry.duration_seconds,
        logged_at: entry.logged_at,
      }));

      setData(transformedData);
      setPagination((prev) => ({
        ...prev,
        totalCount: apiData.count,
        totalPages: Math.ceil(apiData.count / prev.pageSize),
      }));
    }
  }, [apiData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await execute();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [execute]);

  // Handle filter change
  const handleFilterChange = useCallback((filterType: keyof FilterState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  }, []);

  // Handle date filter
  const handleDateFilterChange = useCallback((filter: DateFilterEnum) => {
    setDateFilter(filter);
    const now = new Date();
    let startDate: Date | null = null;

    switch (filter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "this_week":
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        break;
    }

    setFilters((prev: FilterState) => ({
      ...prev,
      dateRange: {
        startDate,
        endDate: filter ? now : null,
      },
    }));
  }, []);

  // Apply filters and search
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.camera_name.toLowerCase().includes(query) ||
          item.user.email.toLowerCase().includes(query) ||
          item.status.toLowerCase().includes(query) ||
          item.message.toLowerCase().includes(query),
      );
    }

    // Date range filter
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      result = result.filter((item) => {
        const itemDate = new Date(item.logged_at);
        return itemDate >= filters.dateRange.startDate! && itemDate <= filters.dateRange.endDate!;
      });
    }

    // Camera filter
    if (filters.camera_name.length > 0) {
      result = result.filter((item) => filters.camera_name.includes(item.camera_name));
    }

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((item) => filters.status.includes(item.status));
    }

    // User filter
    if (filters.user_email.length > 0) {
      result = result.filter((item) => filters.user_email.includes(item.user.email));
    }

    return result;
  }, [data, filters]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, pagination.currentPage, pagination.pageSize]);

  // Update pagination when filtered data changes
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      totalCount: filteredData.length,
      totalPages: Math.ceil(filteredData.length / prev.pageSize),
      currentPage: 1,
    }));
  }, [filteredData.length]);

  // Get unique values for filters
  const uniqueValues = useMemo(() => {
    return {
      camera_name: Array.from(new Set(data.map((item) => item.camera_name))).sort(),
      status: Array.from(new Set(data.map((item) => item.status))).sort(),
      user_email: Array.from(new Set(data.map((item) => item.user.email))).sort(),
    };
  }, [data]);

  // Handle column changes
  const handleColumnsChange = useCallback((newColumns: any) => {
    setColumns(newColumns);
  }, []);

  // Reset columns to default
  const handleResetColumns = useCallback(() => {
    setColumns(defaultColumns);
  }, []);

  // Get display text for date range
  const getDateRangeDisplayText = useCallback(() => {
    if (dateFilter) {
      switch (dateFilter) {
        case "today":
          return "Today";
        case "this_week":
          return "This Week";
        case "this_month":
          return "This Month";
        default:
          return "All time";
      }
    }

    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
      };

      const start = filters.dateRange.startDate;
      const end = filters.dateRange.endDate;

      if (start.getTime() === end.getTime()) {
        return formatDate(start);
      }

      return `${formatDate(start)} - ${formatDate(end)}`;
    }

    return "All time";
  }, [dateFilter, filters.dateRange.startDate, filters.dateRange.endDate]);

  return (
    <div className="flex w-full flex-col" style={{ height: "87vh" }}>
      {/* Header Navigation */}
      <div className="relative z-60 flex flex-shrink-0 items-center justify-between border-t border-r border-l border-gray-300 bg-white/80 px-2 py-3 pr-4 backdrop-blur-sm">
        {/* Left side */}
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h6 className="p-2 text-sm font-semibold text-gray-900">Media Queue Logs</h6>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Page Size Control */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Show</span>
              <select
                value={pagination.pageSize}
                onChange={(e) =>
                  setPagination((prev) => ({
                    ...prev,
                    pageSize: Number(e.target.value),
                    currentPage: 1,
                    totalPages: Math.ceil(filteredData.length / Number(e.target.value)),
                  }))
                }
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-gray-700">
                of {pagination.totalCount.toLocaleString()} Records
              </span>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="flex items-center justify-center rounded border border-gray-300 bg-white p-1.5 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="First Page"
                >
                  <ChevronLeft className="h-3 w-3" />
                  <ChevronLeft className="-ml-2 h-3 w-3" />
                </button>

                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))
                  }
                  disabled={pagination.currentPage === 1}
                  className="flex items-center justify-center rounded border border-gray-300 bg-white p-1.5 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>

                <div className="mx-3 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={pagination.totalPages}
                    value={pagination.currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= pagination.totalPages) {
                        setPagination((prev) => ({ ...prev, currentPage: page }));
                      }
                    }}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                  <span className="text-gray-600">of {pagination.totalPages}</span>
                </div>

                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))
                  }
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="flex items-center justify-center rounded border border-gray-300 bg-white p-1.5 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Next Page"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>

                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, currentPage: prev.totalPages }))
                  }
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="flex items-center justify-center rounded border border-gray-300 bg-white p-1.5 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Last Page"
                >
                  <ChevronRight className="h-3 w-3" />
                  <ChevronRight className="-ml-2 h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
            title="Refresh data"
          >
            <RotateCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Date filter */}
          {/* <div className="relative">
            <DateFilter
              dateRange={
                filters.dateRange.startDate && filters.dateRange.endDate
                  ? {
                      start: filters.dateRange.startDate.toISOString().split("T")[0],
                      end: filters.dateRange.endDate.toISOString().split("T")[0],
                    }
                  : null
              }
              dateFilter={dateFilter}
              onDateRangeChange={(range: { start: string; end: string } | null) =>
                handleFilterChange("dateRange", {
                  startDate: range ? new Date(range.start) : null,
                  endDate: range ? new Date(range.end) : null,
                })
              }
              onDateFilterChange={handleDateFilterChange}
              isActive={Boolean(
                filters.dateRange.startDate || filters.dateRange.endDate || dateFilter,
              )}
              autoApply={autoApply}
              onAutoApplyChange={setAutoApply}
              displayText={getDateRangeDisplayText()}
            />
          </div> */}

          {/* Column manager */}
          <div className="relative">
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
            </button>

            {showColumnManager && (
              <ColumnSelector
                columns={columns}
                onApply={handleColumnsChange}
                onResetColumns={handleResetColumns}
                onClose={() => setShowColumnManager(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden">
        <LogsTable
          data={paginatedData}
          columns={columns}
          filters={filters}
          uniqueValues={uniqueValues}
          onFilterChange={handleFilterChange}
          pagination={pagination}
          onPaginationChange={setPagination}
          loading={loading}
          autoApply={autoApply}
          onAutoApplyChange={setAutoApply}
        />
      </div>
    </div>
  );
};

export default MediaQueueLogs;
