
import React, { useState, useRef, useCallback } from "react";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import TableHeaderDropdown from "./TableHeaderDropdown";
import DateFilter from "./DateFilter";
import type { EventData, ColumnConfig, EventFilters, DateFilterEnum } from "@/api/types";
import Loading from "@/components/Loading";

interface EventTableProps {
  data: EventData[];
  isTableLoading: boolean;
  isHeaderLoading: boolean;
  columns: ColumnConfig[];
  onColumnResize: (columnKey: string, width: number) => void;
  onColumnReorder: (fromIndex: number, toIndex: number) => void;
  filters: EventFilters;
  onFilterChange: (filterType: keyof EventFilters, values: string[]) => void;
  onDateRangeChange: (range: { start: string; end: string } | null) => void;
  onDateFilterChange: (dateFilter: DateFilterEnum) => void;
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;
  headerData: {
    sites: string[];
    cameras: string[];
    useCases: string[];
    locationTags: string[];
    functionalTags: string[];
    actions: string[];
    statuses: string[];
    severities: string[];
    comments: string[];
    actionsTaken: string[];
    mailReceivers: string[];
    details: string[];
    extraInfo: string[];
  };
  onRowClick?: (event: any) => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (sortOrder: "asc" | "desc") => void;
  onColumnSort?: (column: string, direction: 'asc' | 'desc') => void;
  columnSort?: { column: string; direction: 'asc' | 'desc' } | null;
}

const EventTable: React.FC<EventTableProps> = ({
  data,
  isTableLoading,
  isHeaderLoading,
  columns,
  onColumnResize,
  onColumnReorder,
  filters,
  onFilterChange,
  onDateRangeChange,
  onDateFilterChange,
  autoApply,
  onAutoApplyChange,
  headerData,
  onRowClick,
  sortOrder,
  onSortOrderChange,
  onColumnSort,
  columnSort
}) => {
  const [dragState, setDragState] = useState<{
    draggedColumn: number | null;
    dragOverColumn: number | null;
  }>({ draggedColumn: null, dragOverColumn: null });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const resizeRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null);

  const handleDropdownToggle = useCallback((dropdownId: string, isOpen: boolean) => {
    setOpenDropdown(isOpen ? dropdownId : null);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, columnKey: string, currentWidth: number) => {
      e.preventDefault();
      e.stopPropagation();

      resizeRef.current = { column: columnKey, startX: e.clientX, startWidth: currentWidth };

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeRef.current) return;
        const newWidth = Math.max(
          10,
          resizeRef.current.startWidth + e.clientX - resizeRef.current.startX,
        );
        onColumnResize(resizeRef.current.column, newWidth);
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onColumnResize],
  );

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragState((prev) => ({ ...prev, draggedColumn: index }));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragState((prev) => ({ ...prev, dragOverColumn: index }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (dragState.draggedColumn !== null && dragState.draggedColumn !== dropIndex) {
        onColumnReorder(dragState.draggedColumn, dropIndex);
      }
      setDragState({ draggedColumn: null, dragOverColumn: null });
    },
    [dragState.draggedColumn, onColumnReorder],
  );

  const handleRowClick = (event: any) => {
    if (onRowClick) {
      onRowClick(event);
    }
  };

  const getFilterData = useCallback(
    (columnKey: string) => {
      const filterMap = {
        site_name: {
          options: headerData.sites,
          selected: filters.sites,
          key: "sites" as keyof EventFilters,
        },
        camera_name: {
          options: headerData.cameras,
          selected: filters.cameras,
          key: "cameras" as keyof EventFilters,
        },
        uc_type: {
          options: headerData.useCases,
          selected: filters.useCases,
          key: "useCases" as keyof EventFilters,
        },
        severity: {
          options: headerData.severities,
          selected: filters.severities,
          key: "severities" as keyof EventFilters,
        },
        status: {
          options: headerData.statuses,
          selected: filters.statuses,
          key: "statuses" as keyof EventFilters,
        },
        action_status: {
          options: headerData.actions,
          selected: filters.actions,
          key: "actions" as keyof EventFilters,
        },
        location_tags: {
          options: headerData.locationTags,
          selected: filters.locationTags,
          key: "locationTags" as keyof EventFilters,
        },
        functional_tag: {
          options: headerData.functionalTags,
          selected: filters.functionalTags,
          key: "functionalTags" as keyof EventFilters,
        },
        comments: {
          options: headerData.comments,
          selected: filters.comments,
          key: "comments" as keyof EventFilters,
        },
        action_taken: {
          options: headerData.actionsTaken,
          selected: filters.actionsTaken,
          key: "actionsTaken" as keyof EventFilters,
        },
        mail_receivers: {
          options: headerData.mailReceivers,
          selected: filters.mailReceivers,
          key: "mailReceivers" as keyof EventFilters,
        },
        details: {
          options: headerData.details,
          selected: filters.details,
          key: "details" as keyof EventFilters,
        },
       extra_info: {
  options: headerData.extraInfo,
  selected: filters.extraInfo,
  key: "extraInfo" as keyof EventFilters,
},

      };
      return (
        filterMap[columnKey as keyof typeof filterMap] || {
          options: [],
          selected: [],
          key: "sites" as keyof EventFilters,
        }
      );
    },
    [headerData, filters],
  );

  const filterableColumns = [
    "site_name",
    "camera_name",
    "uc_type",
    "severity",
    "status",
    "action_status",
    "location_tags",
    "functional_tag",
    "comments",
    "action_taken",
    "mail_receivers",
    "details",
    "extra_info",
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
      <div className="h-[calc(100vh-180px)] overflow-x-auto overflow-y-auto">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 z-10 bg-gray-200">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={`relative border-r border-b border-gray-100 px-3 py-2 text-left select-none last:border-r-0 ${dragState.draggedColumn === index ? "opacity-50" : ""
                    } ${dragState.dragOverColumn === index ? "bg-blue-50" : ""}`}
                  draggable={!isHeaderLoading}
                  onDragStart={(e) => !isHeaderLoading && handleDragStart(e, index)}
                  onDragOver={(e) => !isHeaderLoading && handleDragOver(e, index)}
                  onDragLeave={() =>
                    !isHeaderLoading && setDragState((prev) => ({ ...prev, dragOverColumn: null }))
                  }
                  onDrop={(e) => !isHeaderLoading && handleDrop(e, index)}
                  onDragEnd={() =>
                    !isHeaderLoading && setDragState({ draggedColumn: null, dragOverColumn: null })
                  }
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 flex-shrink-0 cursor-move text-gray-400" />
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      {column.key === "time_created" ? (
                        <div className="flex items-center gap-1">
                          <span
                            className="whitespace-nowrap text-gray-700 cursor-pointer hover:text-gray-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              const dateFilterButton = e.currentTarget.parentElement?.querySelector('.date-filter-container div');
                              if (dateFilterButton) {
                                (dateFilterButton as HTMLElement).click();
                              }
                            }}
                          >
                            {column.label}
                          </span>
                          <DateFilter
                            dateRange={filters.dateRange}
                            dateFilter={filters.dateFilter}
                            onDateRangeChange={onDateRangeChange}
                            onDateFilterChange={onDateFilterChange}
                            isActive={filters.dateRange !== null || filters.dateFilter !== null}
                            autoApply={autoApply}
                            onAutoApplyChange={onAutoApplyChange}
                          />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
                            }}
                            className="flex-shrink-0 rounded p-1 transition-colors hover:bg-gray-100"
                            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
                          >
                            {sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-gray-600" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-gray-600" />
                            )}
                          </button>
                        </div>
                      ) : filterableColumns.includes(column.key) ? (
                        (() => {
                          const filterData = getFilterData(column.key);
                          return (
                            <TableHeaderDropdown
                              label={column.label}
                              options={filterData.options}
                              selectedValues={filterData.selected}
                              onSelectionChange={(values) => onFilterChange(filterData.key, values)}
                              isActive={filterData.selected.length > 0}
                              autoApply={autoApply}
                              onAutoApplyChange={onAutoApplyChange}
                              dependentOptions={headerData.cameras}
                              selectedSites={filters.sites}
                              columnKey={column.key}
                              isDisabled={isHeaderLoading}
                              isOpen={openDropdown === column.key}
                              onToggle={(isOpen) => handleDropdownToggle(column.key, isOpen)}
                              sortConfig={columnSort}
                              onSort={onColumnSort}
                            />
                          );
                        })()
                      ) : (
                        <span className="text-gray-700">{column.label}</span>
                      )}
                    </div>
                  </div>
                  {column.resizable && !isHeaderLoading && (
                    <div
                      className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 hover:opacity-50"
                      onMouseDown={(e) => handleMouseDown(e, column.key, column.width)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white">
            {isTableLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8">
                  <div className="flex justify-center items-center mt-20">
                    <Loading />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <span>No events found matching your criteria.</span>
                    <span className="text-xs text-gray-400">Try adjusting your filters above.</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.event_id}
                  className="h-8 cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
                  onClick={() => handleRowClick(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        width: column.width,
                        minWidth: column.width,
                        maxWidth: column.width,
                      }}
                      className="overflow-hidden border-r border-gray-100 px-3 py-1 text-gray-900 last:border-r-0"
                    >
                      {(column.key === "location_tags" ||
                        column.key === "functional_tag" ||
                        column.key === "comments" ||
                        column.key === "action_taken" ||
                        column.key === "mail_receivers") &&
                        Array.isArray(row[column.key]) ? (
                        <div
                          className={`flex max-w-full flex-wrap gap-1 ${column.key === "comments" || column.key === "action_taken" ? "max-h-12 overflow-y-auto" : ""}`}
                        >
                          {row[column.key].map((tag: string, tagIndex: number) => (
                            <span
                              key={tagIndex}
                              className="inline-block truncate rounded bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700"
                              title={tag}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : column.key === "details" ? (
                        <div className="flex max-w-full flex-wrap gap-1 max-h-12 overflow-y-auto">
                          {Array.isArray(row.details) && row.details.length > 0 ? (
                            // Handle array details (like PPE violations) with gray background
                            row.details.map((detail: string, detailIndex: number) => (
                              <span
                                key={detailIndex}
                                className="inline-block  truncate rounded bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700"
                                title={detail}
                              >
                                {detail}
                              </span>
                            ))
                          ) : row.details && typeof row.details === 'object' && !Array.isArray(row.details) ? (
                            // Handle object details (like vehicle_count) with gray background
                            Object.entries(row.details).map(([key, value], entryIndex) => (
                              <span
                                key={entryIndex}
                                className="inline-block max-w-[200px] truncate rounded bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700"
                                title={`${key}: ${value}`}
                              >
                                {key}: {value}
                              </span>
                            ))
                          ) : (
                            // Handle empty or null details
                            <span className="block truncate text-gray-500">
                              N/A
                            </span>
                          )}
                        </div>
              ) : column.key === "extra_info" ? (
  <div className="flex max-w-full flex-wrap gap-1 max-h-12 overflow-y-auto">
    {row.extra_info && typeof row.extra_info === 'object' ? (
      Object.entries(row.extra_info).map(([key, value], entryIndex) => (
        <span
          key={entryIndex}
          className="inline-block max-w-[200px] truncate rounded bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700"
          title={`${key}: ${value}`}
        >
          {key}: {value}
        </span>
      ))
    ) : (
     <span className="block truncate bg-gray-100  py-0.5 px-1 rounded-md">
        N/A
        </span>
    )}
  </div>

                      ) : column.key === "time_created" ? (
                        <span className="whitespace-nowrap">
                          {row[column.key]
                            ? (() => {
                              const [date, time] = row[column.key].split(" ");
                              const [hour, minute, secondsRaw] = time.split(":");
                              const seconds = secondsRaw ? secondsRaw.split('.')[0] : '00';
                              const h = parseInt(hour);
                              const ampm = h >= 12 ? "PM" : "AM";
                              const hour12 = h % 12 || 12;
                              return (
                                <>
                                  <span className="font-bold">{date}</span>{" "}
                                  <span className="text-xs text-gray-500">
                                    {`${hour12.toString().padStart(2, "0")}:${minute}:${seconds} ${ampm}`}
                                  </span>
                                </>
                              );
                            })()
                            : "N/A"}
                        </span>
                      ) :

                        (
                          <span className="block truncate" title={row[column.key]?.toString()}>
                            {column.key === "action_status"
                              ? row[column.key] || ""
                              : row[column.key] || "-"}
                          </span>
                        )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventTable;