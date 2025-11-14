import { Ticket, TicketTableEntry } from "@/api/types";
import Loading from "@/components/Loading";
import { useAuth } from "@/context/AuthContext";
import { useGetTicketsByCustomer } from "@/hooks/useApi";
import { FilterX, Plus, Search, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import CreateTicketModal from "../components/CreateTicketModal";
import TicketDetailModal from "../components/TicketDetailModal";
import TicketTableWithFilters, { TicketFilters } from "../components/TicketTableWithFilters";

// Pagination interface
interface PaginationState {
  currentPage: number;
  pageSize: number;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

// Main Dashboard Component
const DashboardComponent: React.FC = () => {
  // Get current user
  const {
    data: apiTickets,
    loading: apiLoading,
    error: apiError,
    execute: fetchTickets,
  } = useGetTicketsByCustomer();

  const [allTickets, setAllTickets] = useState<TicketTableEntry[]>([]); // Keep original unfiltered data
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketTableEntry | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 20,
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filters, setFilters] = useState<TicketFilters>({
    ticketIds: [], // These are EXCLUDED values
    subjects: [], // These are EXCLUDED values
    reporters: [], // Add this line - it was missing
    statuses: [], // These are EXCLUDED values
    categories: [], // These are EXCLUDED values
    priorities: [], // These are EXCLUDED values
    agents: [], // These are EXCLUDED values
    dateRange: null,
  });

  // Initial fetch on component mount
  useEffect(() => {
    fetchTickets();
  }, []);

  // Auto-refresh every 30 seconds when modal is not open
  useEffect(() => {
    if (!showDetailModal && !showCreateModal) {
      const interval = setInterval(() => {
        console.log("Dashboard: Auto-refreshing tickets...");
        fetchTickets();
      }, 10000); // 10 seconds

      return () => clearInterval(interval);
    }
  }, [showDetailModal, showCreateModal]);

  useEffect(() => {
    if (apiTickets) {
      // Map API response to TicketTableEntry format
      const mappedTickets: TicketTableEntry[] = apiTickets.map((ticket: Ticket) => ({
        key: ticket.key,
        id: ticket.id,
        project_key: ticket.project_key,
        summary: ticket.summary,
        description: ticket.description,
        priority: ticket.priority,
        labels: ticket.labels,
        status: ticket.status,
        assignee: ticket.assignee,
        reporter: ticket.reporter,
        created: ticket.created,
        updated: ticket.updated,
        custom_fields: ticket.custom_fields,
        comments: ticket.comments,
        enriched: ticket.enriched,
        attachments: ticket.attachments || [],
        created_by: ticket.created_by,
      }));
      setAllTickets(mappedTickets); // Store all tickets without filtering
      // Mark initial load as complete
      setIsInitialLoad(false);
    }
  }, [apiTickets]);

  // Filter and sort tickets - This creates the filtered view for display
  const filteredTickets = useMemo(() => {
    let filtered = [...allTickets];

    // Apply search term filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.key?.toLowerCase().includes(search) ||
          ticket.summary?.toLowerCase().includes(search) ||
          ticket.description?.toLowerCase().includes(search),
      );
    }

    // Apply column filters - EXCLUSION-based logic (filter OUT items in the arrays)
    if (filters.ticketIds.length > 0) {
      filtered = filtered.filter((ticket) => !filters.ticketIds.includes(ticket.key));
    }

    if (filters.subjects.length > 0) {
      filtered = filtered.filter((ticket) => {
        const subject = ticket.summary || "No Summary";
        return !filters.subjects.includes(subject);
      });
    }

    // ADD THIS REPORTERS FILTER - This was missing completely
    if (filters.reporters && filters.reporters.length > 0) {
      filtered = filtered.filter((ticket) => {
        const reporterName = ticket.created_by?.name || "Unknown Reporter";
        return !filters.reporters!.includes(reporterName);
      });
    }

    if (filters.statuses.length > 0) {
      filtered = filtered.filter((ticket) => !filters.statuses.includes(ticket.status));
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter((ticket) => {
        const category = ticket.enriched?.issue_type || "General";
        return !filters.categories.includes(category);
      });
    }

    if (filters.priorities.length > 0) {
      filtered = filtered.filter((ticket) => !filters.priorities.includes(ticket.priority));
    }

    if (filters.agents.length > 0) {
      filtered = filtered.filter((ticket) => {
        let agentName = "-";
        if (ticket.assignee) {
          if (typeof ticket.assignee === "object") {
            agentName = ticket.assignee.name || ticket.assignee.email || "Unknown User";
          } else {
            agentName = ticket.assignee;
          }
        }
        return !filters.agents.includes(agentName);
      });
    }

    // Apply date range filter with proper date handling
    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
      filtered = filtered.filter((ticket) => {
        // Parse the ticket's updated timestamp
        const ticketDate = new Date(ticket.updated);

        // Create start and end dates for comparison
        const startDate =
          filters.dateRange && filters.dateRange.start
            ? new Date(filters.dateRange.start + "T00:00:00.000")
            : null;
        const endDate =
          filters.dateRange && filters.dateRange.end
            ? new Date(filters.dateRange.end + "T23:59:59.999")
            : null;

        // Compare dates
        if (startDate && ticketDate < startDate) return false;
        if (endDate && ticketDate > endDate) return false;
        return true;
      });
    }

    // Sort by created date (newest first) - this will be overridden by table sorting if active
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return dateB - dateA;
    });
  }, [allTickets, searchTerm, filters]);

  // Calculate pagination data
  const paginationData: PaginationData = useMemo(() => {
    const totalCount = filteredTickets.length;
    const totalPages = Math.ceil(totalCount / pagination.pageSize);
    
    return {
      currentPage: pagination.currentPage,
      totalPages,
      totalCount,
      pageSize: pagination.pageSize,
    };
  }, [filteredTickets.length, pagination]);

  // Get paginated tickets for display
  const paginatedTickets = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, pagination]);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [searchTerm, filters]);

  const handleTicketClick = (ticket: TicketTableEntry) => {
    setSelectedTicket(ticket);
    setShowDetailModal(true);
  };

  const closeModals = async () => {
    // Close the modal after successful action
    setShowCreateModal(false);
    setShowDetailModal(false);

    // Refresh the tickets list
    await fetchTickets();
  };

  const handleCreateTicket = async (ticketData: any) => {
    try {
      console.log("Creating ticket:", ticketData);
      await fetchTickets();
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating ticket:", error);
    }
  };

  const handleFiltersChange = (newFilters: TicketFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      ticketIds: [],
      subjects: [],
      reporters: [], // Add this line
      statuses: [],
      categories: [],
      priorities: [],
      agents: [],
      dateRange: null,
    });
    setSearchTerm("");
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ currentPage: 1, pageSize });
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await fetchTickets();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    // Check if search term has actual content
    const hasSearchTerm = searchTerm.trim() !== "";

    // Check each filter explicitly
    const hasColumnFilters =
      filters.ticketIds.length > 0 ||
      filters.subjects.length > 0 ||
      (filters.reporters && filters.reporters.length > 0) || // Add this line
      filters.statuses.length > 0 ||
      filters.categories.length > 0 ||
      filters.priorities.length > 0 ||
      filters.agents.length > 0 ||
      (filters.dateRange !== null && filters.dateRange !== undefined);

    return hasSearchTerm || hasColumnFilters;
  }, [filters, searchTerm]);

  // Only show loading spinner during initial load, not during polling
  if (apiLoading && isInitialLoad) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900">Error loading tickets</p>
          <p className="mt-1 text-sm text-gray-600">{apiError?.message || "An error occurred"}</p>
          <button
            onClick={() => fetchTickets()}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header - Fixed at top */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#275E59]">
            Tickets ({paginationData.totalCount})
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Search Tickets"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-56 rounded border border-gray-300 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Create Ticket Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center whitespace-nowrap rounded bg-teal-700 px-3 py-1.5 text-xs text-white transition-colors hover:bg-teal-900"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Ticket
          </button>
        </div>
      </div>

      {/* Main Content - Flexible container with fixed height table */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <TicketTableWithFilters
            allTickets={allTickets}
            displayTickets={paginatedTickets}
            onTicketClick={handleTicketClick}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>

        {/* Pagination Footer - Fixed at bottom with proper spacing */}
        <div className="mt-4 flex-shrink-0 rounded bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Left: Action Icons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                className={`rounded p-1.5 transition-colors ${
                  hasActiveFilters
                    ? 'text-teal-600 hover:bg-gray-200 hover:text-gray-800'
                    : 'cursor-not-allowed text-gray-400'
                }`}
                title="Clear all filters"
              >
                <FilterX className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={handleRefreshData}
                disabled={isInitialLoad || isRefreshing}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-800 disabled:opacity-50"
                title="Refresh data"
              >
                {isInitialLoad || isRefreshing ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Right: Controls Group */}
            <div className="flex items-center gap-4">
              {/* Page Size Control */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-700">Show</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs"
                >
                  {[10, 20, 50, 100].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              {/* Records Count */}
              <div className="text-xs text-gray-700">
                {paginationData.totalCount.toLocaleString()} Records
              </div>

              {/* Pagination Controls */}
              {paginationData.totalPages > 1 && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={paginationData.currentPage === 1}
                    className="flex items-center justify-center rounded border border-gray-300 bg-white p-1 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="First Page"
                  >
                    <div className="flex items-center">
                      <ChevronLeft className="h-3 w-3" />
                      <ChevronLeft className="-ml-0.5 h-3 w-3" />
                    </div>
                  </button>

                  <button
                    onClick={() => handlePageChange(paginationData.currentPage - 1)}
                    disabled={paginationData.currentPage === 1}
                    className="flex items-center justify-center rounded border border-gray-300 bg-white p-1 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>

                  <div className="mx-2 flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max={paginationData.totalPages}
                      value={paginationData.currentPage}
                      onChange={(e) => {
                        const page = Number(e.target.value);
                        if (page >= 1 && page <= paginationData.totalPages) {
                          handlePageChange(page);
                        }
                      }}
                      className="w-12 rounded border border-gray-300 px-1.5 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <span className="text-xs text-gray-600">
                      of {paginationData.totalPages.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePageChange(paginationData.currentPage + 1)}
                    disabled={paginationData.currentPage === paginationData.totalPages}
                    className="flex items-center justify-center rounded border border-gray-300 bg-white p-1 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Next Page"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>

                  <button
                    onClick={() => handlePageChange(paginationData.totalPages)}
                    disabled={paginationData.currentPage === paginationData.totalPages}
                    className="flex items-center justify-center rounded border border-gray-300 bg-white p-1 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Last Page"
                  >
                    <div className="flex items-center">
                      <ChevronRight className="h-3 w-3" />
                      <ChevronRight className="-ml-0.5 h-3 w-3" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTicketModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSubmit={handleCreateTicket}
        onRefetch={() => {
          console.log("Dashboard: Manual refetch requested...");
          fetchTickets();
        }}
      />

      <TicketDetailModal
        ticketKey={selectedTicket?.key || null}
        isOpen={showDetailModal}
        onClose={closeModals}
        onRefetch={() => {
          console.log("Dashboard: Manual refetch requested...");
          fetchTickets();
        }}
      />
    </div>
  );
};

/**
 * Main Support component that renders the ticket dashboard
 */
const Support: React.FC = () => {
  const { user } = useAuth();

  // Loading state while user data is being fetched
  if (!user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  // Render the dashboard for all users
  return <DashboardComponent />;
};

export default Support;