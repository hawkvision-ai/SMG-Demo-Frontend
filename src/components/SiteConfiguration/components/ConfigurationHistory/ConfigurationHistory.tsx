import { useAuth } from "@/context/AuthContext";
import { useGetConfigurationHistory } from "@/hooks/useApi";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Settings } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ColumnSelector from "./components/ColumnSelector";
import DateFilter from "./components/DateRangeFilter";
import HistoryTable from "./components/HistoryTable";
import SiteDetails from "./components/SiteDetails";
import type {
  AuditLogEntry,
  ColumnConfig,
  ConfigurationHistoryItem,
  FilterState,
} from "./components/types";

type ViewState = "history" | "details";
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
    key: "timestamp",
    label: "Timestamp",
    visible: true,
    sortable: true,
    filterable: false,
    width: 200,
    resizable: true,
  },
  {
    key: "changes",
    label: "Changes",
    visible: true,
    sortable: true,
    filterable: true,
    width: 250,
    resizable: true,
  },
  {
    key: "user",
    label: "Changed By",
    visible: true,
    sortable: true,
    filterable: true,
    width: 200,
    resizable: true,
  },
  {
    key: "site",
    label: "Site",
    visible: true,
    sortable: true,
    filterable: true,
    width: 200,
    resizable: true,
  },
  {
    key: "camera",
    label: "Camera",
    visible: true,
    sortable: true,
    filterable: true,
    width: 200,
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

// Transform API data to UI format
const transformAuditLogToHistoryItem = (entry: AuditLogEntry): ConfigurationHistoryItem => {
  return {
    id: entry._id,
    timestamp: entry.timestamp || "",
    changes: entry.changes,
    user: {
      name: entry.changed_by,
      initials: getUserInitials(entry.changed_by),
    },
    site: entry.site_name,
    camera: entry.entity_type === "camera" ? (entry as any).camera_name : "N/A",
    entity_type: entry.entity_type as "site" | "camera",
    old_data: entry.old_data,
    new_data: entry.new_data,
  };
};

const ConfigurationHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // API hook
  const {
    data: apiData,
    loading,
    error,
    execute,
  } = useGetConfigurationHistory(user?.customer_id, user?.timezone);

  // State management
  const [currentView, setCurrentView] = useState<ViewState>("history");
  const [data, setData] = useState<ConfigurationHistoryItem[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [selectedItem, setSelectedItem] = useState<ConfigurationHistoryItem | null>(null);
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
      startDate: null,
      endDate: null,
    },
    changes: [],
    user: [],
    site: [],
    camera: [],
  });

  // Transform and set data when API data changes
  useEffect(() => {
    if (apiData?.data) {
      const transformedData = apiData.data.map(transformAuditLogToHistoryItem);
      const sortedData = transformedData.sort((a: any, b: any) => {
        const dateA = new Date(a.timestamp.replace(" ", "T"));
        const dateB = new Date(b.timestamp.replace(" ", "T"));
        return dateB.getTime() - dateA.getTime();
      });

      setData(sortedData);
    }
  }, [apiData]);

  // Load initial data
  useEffect(() => {
    if (user?.customer_id) {
      execute();
    }
  }, [user?.customer_id]);

  // Calculate filtered data based on current filters
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.changes.toLowerCase().includes(query) ||
          item.user.name.toLowerCase().includes(query) ||
          item.site.toLowerCase().includes(query) ||
          item.camera.toLowerCase().includes(query) ||
          item.timestamp.toLowerCase().includes(query),
      );
    }

    // Apply date range filter
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      filtered = filtered.filter((item) => {
        try {
          const itemTimestamp = item.timestamp.replace(" ", "T");
          const itemDate = new Date(itemTimestamp);

          if (isNaN(itemDate.getTime())) {
            console.warn(`Invalid timestamp: ${item.timestamp}`);
            return false;
          }

          const itemYear = itemDate.getFullYear();
          const itemMonth = itemDate.getMonth();
          const itemDay = itemDate.getDate();
          const itemDateOnly = new Date(itemYear, itemMonth, itemDay);

          const [startYear, startMonth, startDay] = filters.dateRange
            .startDate!.split("-")
            .map(Number);
          const startDate = new Date(startYear, startMonth - 1, startDay);

          const [endYear, endMonth, endDay] = filters.dateRange.endDate!.split("-").map(Number);
          const endDate = new Date(endYear, endMonth - 1, endDay);

          const itemTime = itemDateOnly.getTime();
          const startTime = startDate.getTime();
          const endTime = endDate.getTime();

          return itemTime >= startTime && itemTime <= endTime;
        } catch (error) {
          console.error(`Error filtering date for item:`, item.timestamp, error);
          return false;
        }
      });
    }

    // Apply column filters
    if (filters.changes.length > 0) {
      filtered = filtered.filter((item) => !filters.changes.includes(item.changes));
    }
    if (filters.user.length > 0) {
      filtered = filtered.filter((item) => !filters.user.includes(item.user.name));
    }
    if (filters.site.length > 0) {
      filtered = filtered.filter((item) => !filters.site.includes(item.site));
    }
    if (filters.camera.length > 0) {
      filtered = filtered.filter((item) => !filters.camera.includes(item.camera));
    }

    return filtered;
  }, [data, filters]);

  // Update pagination when filtered data changes
  useEffect(() => {
    setPagination((prev) => {
      const newTotalPages = Math.ceil(filteredData.length / prev.pageSize);
      const newCurrentPage = Math.min(prev.currentPage, Math.max(1, newTotalPages));

      if (
        prev.totalCount === filteredData.length &&
        prev.totalPages === newTotalPages &&
        prev.currentPage === newCurrentPage
      ) {
        return prev;
      }

      return {
        ...prev,
        totalCount: filteredData.length,
        totalPages: newTotalPages,
        currentPage: newCurrentPage,
      };
    });
  }, [filteredData.length]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  // Handle column changes - REMOVED serial column forced visibility
  const handleColumnsChange = useCallback((newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
  }, []);

  // Reset columns to default
  const handleResetColumns = useCallback(() => {
    setColumns(defaultColumns);
  }, []);

  // Handle row click
  const handleRowClick = useCallback((item: ConfigurationHistoryItem) => {
    setSelectedItem(item);
    setCurrentView("details");
  }, []);

  // Handle back navigation
  const handleBackToHistory = useCallback(() => {
    setCurrentView("history");
    setSelectedItem(null);
  }, []);

  // Handle back to Sites navigation
  const handleBackToSites = useCallback(() => {
    navigate("/configure");
  }, [navigate]);

  // Column manager handlers
  const handleColumnManagerToggle = useCallback(() => {
    setShowColumnManager(!showColumnManager);
  }, [showColumnManager]);

  const handleColumnManagerClose = useCallback(() => {
    setShowColumnManager(false);
  }, []);

  // Date range change handler
  const handleDateRangeChange = useCallback((range: { start: string; end: string } | null) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: {
        startDate: range?.start || null,
        endDate: range?.end || null,
      },
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  // Date filter change handler
  const handleDateFilterChange = useCallback((filter: DateFilterEnum) => {
    setDateFilter(filter);
  }, []);

  // Auto apply change handler
  const handleAutoApplyChange = useCallback((autoApply: boolean) => {
    setAutoApply(autoApply);
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPagination((prev) => {
      const newTotalPages = Math.ceil(prev.totalCount / size);
      return {
        ...prev,
        pageSize: size,
        currentPage: 1,
        totalPages: newTotalPages,
      };
    });
  }, []);

  // Refresh handler
  const handleRefreshData = useCallback(() => {
    setIsRefreshing(true);
    execute();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [execute]);

  // Check if date filter is active
  const isDateFilterActive = Boolean(
    filters.dateRange.startDate || filters.dateRange.endDate || dateFilter,
  );

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
      const start = new Date(filters.dateRange.startDate);
      const end = new Date(filters.dateRange.endDate);

      const formatDate = (date: Date) => {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
      };

      if (filters.dateRange.startDate === filters.dateRange.endDate) {
        return formatDate(start);
      }

      return `${formatDate(start)} - ${formatDate(end)}`;
    }

    return "All time";
  }, [dateFilter, filters.dateRange.startDate, filters.dateRange.endDate]);

  if (currentView === "details" && selectedItem) {
    return <SiteDetails selectedItem={selectedItem} onBack={handleBackToHistory} />;
  }

  return (
    <div className="flex w-full flex-col" style={{ height: "87vh" }}>
      {/* Configuration History Navigation */}
      <div className="relative z-60 flex flex-shrink-0 items-center justify-between border-t border-r border-l border-gray-300 bg-white/80 px-2 py-3 pr-4 backdrop-blur-sm">
        {/* Left side */}
        <div className="flex items-center">
          <button
            onClick={handleBackToSites}
            className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h6 className="p-2 text-sm font-semibold text-gray-900">Configuration History</h6>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Page Size Control */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Show</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.currentPage === 1}
                  className="flex items-center justify-center rounded border border-gray-300 bg-white p-1.5 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="First Page"
                >
                  <div className="flex items-center">
                    <ChevronLeft className="h-3 w-3" />
                    <ChevronLeft className="-ml-1 h-3 w-3" />
                  </div>
                </button>

                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
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
                      const page = Number(e.target.value);
                      if (page >= 1 && page <= pagination.totalPages) {
                        handlePageChange(page);
                      }
                    }}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                  <span className="text-sm text-gray-600">
                    of {pagination.totalPages.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="flex items-center justify-center rounded border border-gray-300 bg-white p-1.5 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Next Page"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>

                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="flex items-center justify-center rounded border border-gray-300 bg-white p-1.5 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Last Page"
                >
                  <div className="flex items-center">
                    <ChevronRight className="h-3 w-3" />
                    <ChevronRight className="-ml-1 h-3 w-3" />
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing || loading}
            className="rounded p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
            title="Refresh data"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Date filter */}
          <div className="relative">
            <DateFilter
              dateRange={
                filters.dateRange.startDate && filters.dateRange.endDate
                  ? {
                      start: filters.dateRange.startDate,
                      end: filters.dateRange.endDate,
                    }
                  : null
              }
              dateFilter={dateFilter}
              onDateRangeChange={handleDateRangeChange}
              onDateFilterChange={handleDateFilterChange}
              isActive={isDateFilterActive}
              autoApply={autoApply}
              onAutoApplyChange={handleAutoApplyChange}
              displayText={getDateRangeDisplayText()}
            />
          </div>

          {/* Column manager */}
          <div className="relative">
            <button
              onClick={handleColumnManagerToggle}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Column Manager Dropdown */}
            {showColumnManager && (
              <ColumnSelector
                columns={columns}
                onApply={handleColumnsChange}
                onResetColumns={handleResetColumns}
                onClose={handleColumnManagerClose}
              />
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 flex-shrink-0 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load configuration history. Please try again.
          </p>
        </div>
      )}

      {/* Table Container */}
      <div className="flex-1 overflow-hidden">
        <HistoryTable
          data={filteredData.slice(
            (pagination.currentPage - 1) * pagination.pageSize,
            pagination.currentPage * pagination.pageSize,
          )}
          allData={data}
          columns={columns}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRowClick={handleRowClick}
          loading={loading || isRefreshing}
          startIndex={(pagination.currentPage - 1) * pagination.pageSize}
        />
      </div>
    </div>
  );
};

export default ConfigurationHistory;
