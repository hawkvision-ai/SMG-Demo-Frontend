import { TicketTableEntry } from "@/api/types";
import { ArrowUp, Clock } from "lucide-react";
import React, { useMemo, useState } from "react";
import DateFilter from "./DateFilter";
import TableHeaderDropdown from "./TableHeaderDropdown";

interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

export interface TicketFilters {
  ticketIds: string[];
  subjects: string[];
  reporters?: string[]; // Added reporters filter
  statuses: string[];
  categories: string[];
  priorities: string[];
  agents: string[];
  dateRange: { start: string; end: string } | null;
}

interface TicketTableWithFiltersProps {
  allTickets: TicketTableEntry[]; // All unfiltered tickets for dropdown options
  displayTickets: TicketTableEntry[]; // Filtered tickets for display
  onTicketClick: (ticket: TicketTableEntry) => void;
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
}

const TicketTableWithFilters: React.FC<TicketTableWithFiltersProps> = ({
  allTickets,
  displayTickets,
  onTicketClick,
  filters,
  onFiltersChange,
}) => {
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [autoApplyStates, setAutoApplyStates] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const getStatusBadge = (status: string): React.ReactElement => {
    const getStatusStyle = (status: string): string => {
      switch (status) {
        case "Open":
          return "bg-gray-100 text-gray-700 border border-gray-200";
        case "Done":
          return "bg-blue-100 text-green-700 border border-gray-200 bg-green-100";
        case "Work in progress":
          return "bg-blue-100 text-blue-700 border border-blue-200";
        case "Reopened":
          return "bg-gray-100 text-gray-700 border border-gray-200";
        case "Pending":
          return "bg-blue-100 text-blue-700 border border-blue-200";
        case "Closed":
          return "bg-gray-100 text-gray-700 border border-gray-200";
        default:
          return "bg-gray-100 text-gray-700 border border-gray-200";
      }
    };

    return (
      <span
        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${getStatusStyle(status)}`}
      >
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string): React.ReactElement => {
    const getPriorityDot = (priority: string): string => {
      switch (priority) {
        case "Critical":
          return "bg-red-500";
        case "High":
          return "bg-red-500";
        case "Medium":
          return "bg-yellow-500";
        case "Low":
          return "bg-green-500";
        default:
          return "bg-gray-500";
      }
    };

    return (
      <div className="flex items-center">
        <div className={`mr-1.5 h-1.5 w-1.5 rounded-full ${getPriorityDot(priority)}`}></div>
        <span className="text-xs font-medium text-gray-900">{priority}</span>
      </div>
    );
  };

  const handleTicketClick = (
    ticket: TicketTableEntry,
    e: React.MouseEvent<HTMLTableRowElement>,
  ): void => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest(".dropdown-container") ||
      target.closest(".date-filter-container")
    ) {
      return;
    }
    onTicketClick(ticket);
  };

  const handleDropdownToggle = (columnKey: string, isOpen: boolean) => {
    // Close all other dropdowns when opening a new one
    if (isOpen) {
      setOpenDropdowns({ [columnKey]: true });
    } else {
      setOpenDropdowns((prev) => ({
        ...prev,
        [columnKey]: false,
      }));
    }
  };

  const handleAutoApplyChange = (columnKey: string, autoApply: boolean) => {
    setAutoApplyStates((prev) => ({
      ...prev,
      [columnKey]: autoApply,
    }));
  };

  const handleFilterChange = (filterType: keyof TicketFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [filterType]: value,
    });
  };

  const handleSort = (column: string, direction: "asc" | "desc") => {
    if (column === "") {
      setSortConfig(null);
    } else {
      setSortConfig({ column, direction });
    }
  };

  // Apply sorting to display tickets
  const sortedTickets = useMemo(() => {
    if (!sortConfig) return displayTickets;

    return [...displayTickets].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortConfig.column) {
        case "key":
          aValue = a.key;
          bValue = b.key;
          break;
        case "summary":
          aValue = a.summary || "";
          bValue = b.summary || "";
          break;
        case "reporter":
          aValue = a.created_by?.name || "Unknown Reporter";
          bValue = b.created_by?.name || "Unknown Reporter";
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "category":
          aValue = a.enriched?.issue_type || "General";
          bValue = b.enriched?.issue_type || "General";
          break;
        case "priority":
          aValue = a.priority;
          bValue = b.priority;
          break;
        case "assignee":
          aValue =
            typeof a.assignee === "object"
              ? a.assignee?.name || a.assignee?.email || "Unknown User"
              : a.assignee || "-";
          bValue =
            typeof b.assignee === "object"
              ? b.assignee?.name || b.assignee?.email || "Unknown User"
              : b.assignee || "-";
          break;
        case "updated":
          aValue = a.updated;
          bValue = b.updated;
          break;
        default:
          return 0;
      }

      const comparison = aValue.localeCompare(bValue);
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [displayTickets, sortConfig]);

  // Extract unique values from ALL tickets (not filtered) for dropdown options
  const getUniqueTicketIds = () => [...new Set(allTickets.map((t) => t.key))];
  const getUniqueSubjects = () => [...new Set(allTickets.map((t) => t.summary || "No Summary"))];
  const getUniqueReporters = () => {
    const reporters = allTickets.map((t) => {
      if (!t.created_by) return "Unknown Reporter";
      return t.created_by.name || "Unknown Reporter";
    });
    return [...new Set(reporters)];
  };
  const getUniqueStatuses = () => [...new Set(allTickets.map((t) => t.status))];
  const getUniqueCategories = () => [
    ...new Set(allTickets.map((t) => t.enriched?.issue_type || "General")),
  ];
  const getUniquePriorities = () => [...new Set(allTickets.map((t) => t.priority))];
  const getUniqueAgents = () => {
    const agents = allTickets.map((t) => {
      if (!t.assignee) return "-";
      if (typeof t.assignee === "object") {
        return t.assignee.name || t.assignee.email || "Unknown User";
      }
      return t.assignee;
    });
    return [...new Set(agents)];
  };

  if (sortedTickets.length === 0) {
    return (
      <div className="flex h-[calc(100vh-240px)] items-center justify-center rounded border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center text-center text-gray-500">
          <Clock className="mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium">No tickets found</p>
          <p className="text-xs">No tickets available, try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-240px)] flex-col overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
      {/* Table Container with fixed height and scrolling */}
      <div className="flex-1 overflow-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-24" />
            <col className="w-48" />
            <col className="w-32" />
            <col className="w-24" />
            <col className="w-32" />
            <col className="w-20" />
            <col className="w-32" />
            <col className="w-40" />
            <col className="w-20" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-gray-100">
            <tr className="border-b border-gray-200">
              <th className="relative px-2 py-2 text-left text-xs font-medium text-gray-600">
                <div className="dropdown-container flex items-center justify-between">
                  <TableHeaderDropdown
                    label="Ticket Id"
                    options={getUniqueTicketIds()}
                    selectedValues={filters.ticketIds}
                    onSelectionChange={(values) => handleFilterChange("ticketIds", values)}
                    isActive={filters.ticketIds.length > 0}
                    autoApply={autoApplyStates.ticketIds || false}
                    onAutoApplyChange={(autoApply) => handleAutoApplyChange("ticketIds", autoApply)}
                    columnKey="key"
                    isOpen={openDropdowns.ticketIds || false}
                    onToggle={(isOpen) => handleDropdownToggle("ticketIds", isOpen)}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </div>
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-medium text-gray-600">
                <div className="dropdown-container flex items-center justify-between">
                  <TableHeaderDropdown
                    label="Subject"
                    options={getUniqueSubjects()}
                    selectedValues={filters.subjects}
                    onSelectionChange={(values) => handleFilterChange("subjects", values)}
                    isActive={filters.subjects.length > 0}
                    autoApply={autoApplyStates.subjects || false}
                    onAutoApplyChange={(autoApply) => handleAutoApplyChange("subjects", autoApply)}
                    columnKey="summary"
                    isOpen={openDropdowns.subjects || false}
                    onToggle={(isOpen) => handleDropdownToggle("subjects", isOpen)}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </div>
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-medium text-gray-600">
                <div className="dropdown-container flex items-center justify-between">
                  <TableHeaderDropdown
                    label="Reporter"
                    options={getUniqueReporters()}
                    selectedValues={filters.reporters || []}
                    onSelectionChange={(values) => handleFilterChange("reporters", values)}
                    isActive={(filters.reporters || []).length > 0}
                    autoApply={autoApplyStates.reporters || false}
                    onAutoApplyChange={(autoApply) => handleAutoApplyChange("reporters", autoApply)}
                    columnKey="reporter"
                    isOpen={openDropdowns.reporters || false}
                    onToggle={(isOpen) => handleDropdownToggle("reporters", isOpen)}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </div>
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-medium text-gray-600">
                <div className="dropdown-container flex items-center justify-between">
                  <TableHeaderDropdown
                    label="Status"
                    options={getUniqueStatuses()}
                    selectedValues={filters.statuses}
                    onSelectionChange={(values) => handleFilterChange("statuses", values)}
                    isActive={filters.statuses.length > 0}
                    autoApply={autoApplyStates.statuses || false}
                    onAutoApplyChange={(autoApply) => handleAutoApplyChange("statuses", autoApply)}
                    columnKey="status"
                    isOpen={openDropdowns.statuses || false}
                    onToggle={(isOpen) => handleDropdownToggle("statuses", isOpen)}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </div>
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-medium text-gray-600">
                <div className="dropdown-container flex items-center justify-between">
                  <TableHeaderDropdown
                    label="Category"
                    options={getUniqueCategories()}
                    selectedValues={filters.categories}
                    onSelectionChange={(values) => handleFilterChange("categories", values)}
                    isActive={filters.categories.length > 0}
                    autoApply={autoApplyStates.categories || false}
                    onAutoApplyChange={(autoApply) =>
                      handleAutoApplyChange("categories", autoApply)
                    }
                    columnKey="category"
                    isOpen={openDropdowns.categories || false}
                    onToggle={(isOpen) => handleDropdownToggle("categories", isOpen)}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </div>
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-medium text-gray-600">
                <div className="dropdown-container flex items-center justify-between">
                  <TableHeaderDropdown
                    label="Priority"
                    options={getUniquePriorities()}
                    selectedValues={filters.priorities}
                    onSelectionChange={(values) => handleFilterChange("priorities", values)}
                    isActive={filters.priorities.length > 0}
                    autoApply={autoApplyStates.priorities || false}
                    onAutoApplyChange={(autoApply) =>
                      handleAutoApplyChange("priorities", autoApply)
                    }
                    columnKey="priority"
                    isOpen={openDropdowns.priorities || false}
                    onToggle={(isOpen) => handleDropdownToggle("priorities", isOpen)}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </div>
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-medium text-gray-600">
                <div className="dropdown-container flex items-center justify-between">
                  <TableHeaderDropdown
                    label="Agent"
                    options={getUniqueAgents()}
                    selectedValues={filters.agents || []}
                    onSelectionChange={(values) => handleFilterChange("agents", values)}
                    isActive={(filters.agents || []).length > 0}
                    autoApply={autoApplyStates.agents || false}
                    onAutoApplyChange={(autoApply) => handleAutoApplyChange("agents", autoApply)}
                    columnKey="assignee"
                    isOpen={openDropdowns.agents || false}
                    onToggle={(isOpen) => handleDropdownToggle("agents", isOpen)}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </div>
              </th>
              <th className="relative px-2 py-2 text-left text-xs font-medium text-gray-600">
                <div className="dropdown-container flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <span
                      className="cursor-pointer hover:text-gray-900"
                      onClick={() => handleDropdownToggle("dateRange", !openDropdowns.dateRange)}
                    >
                      Last update
                    </span>
                    <button
                      onClick={() =>
                        handleSort(
                          "updated",
                          sortConfig?.column === "updated" && sortConfig?.direction === "asc"
                            ? "desc"
                            : "asc",
                        )
                      }
                      className="rounded p-0.5 transition-colors hover:bg-gray-200"
                      title={`Sort by date ${sortConfig?.column === "updated" && sortConfig?.direction === "asc" ? "descending" : "ascending"}`}
                    >
                      <ArrowUp
                        className={`h-3 w-3 transition-transform duration-200 ${
                          sortConfig?.column === "updated"
                            ? sortConfig?.direction === "asc"
                              ? "rotate-0 text-teal-600"
                              : "rotate-180 text-teal-600"
                            : "rotate-180 text-gray-400"
                        }`}
                      />
                    </button>

                    <DateFilter
                      dateRange={filters.dateRange}
                      onDateRangeChange={(range) => handleFilterChange("dateRange", range)}
                      isActive={!!filters.dateRange}
                      autoApply={autoApplyStates.dateRange || false}
                      onAutoApplyChange={(autoApply) =>
                        handleAutoApplyChange("dateRange", autoApply)
                      }
                      isOpen={openDropdowns.dateRange || false}
                      onToggle={(isOpen) => handleDropdownToggle("dateRange", isOpen)}
                    />
                  </div>
                </div>
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedTickets.map((ticket) => (
              <tr
                key={ticket.key}
                className="cursor-pointer transition-colors hover:bg-gray-50"
                onClick={(e) => handleTicketClick(ticket, e)}
              >
                <td className="px-2 py-2 text-xs font-medium text-gray-900">{ticket.key}</td>
                <td className="px-2 py-2">
                  <div className="max-w-xs truncate text-xs text-gray-900">
                    {ticket.summary || "No Summary"}
                  </div>
                </td>
                <td className="px-2 py-2 text-xs text-gray-900">
                  {ticket.created_by?.name || "Unknown Reporter"}
                </td>
                <td className="px-2 py-2">{getStatusBadge(ticket.status)}</td>
                <td className="px-2 py-2 text-xs text-gray-900">
                  {ticket.enriched?.issue_type || "General"}
                </td>
                <td className="px-2 py-2">{getPriorityBadge(ticket.priority)}</td>
                <td className="px-2 py-2 text-xs text-gray-900">
                  {ticket.assignee
                    ? typeof ticket.assignee === "object"
                      ? ticket.assignee.name || ticket.assignee.email || "Unknown User"
                      : ticket.assignee
                    : "-"}
                </td>
                <td className="px-2 py-2 text-xs text-gray-500">
                  {new Date(ticket.updated).toLocaleDateString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </td>
                <td className="px-2 py-2">
                  <button
                    className="text-xs font-medium text-blue-600 underline hover:text-blue-800"
                    title="View Details"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTicketClick(ticket);
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TicketTableWithFilters;
