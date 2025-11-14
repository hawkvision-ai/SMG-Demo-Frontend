import React, { useState } from "react";
import { MapPin, AlertTriangle, Clock } from "lucide-react";
import TableHeaderDropdown from "./TableHeaderDropdown";
import DateFilter from "./DateFilter";
import type { EventData, ColumnConfig, EventFilters, DateFilterEnum } from "@/api/types";
import Loading from "@/components/Loading";
import eventSnapshot from "@/assets/preview.jpg";

interface EventTilesViewProps {
    data: EventData[];
    isTableLoading: boolean;
    isHeaderLoading: boolean;
    columns: ColumnConfig[];
    filters: EventFilters;
    onFilterChange: (filterType: keyof EventFilters, values: string[]) => void;
    onDateRangeChange: (range: { start: string; end: string } | null) => void;
    onDateFilterChange: (dateFilter: DateFilterEnum) => void;
    autoApply: boolean;
    onAutoApplyChange: (autoApply: boolean) => void;
    headerData: {
        sites: { id: string; name: string }[];
        cameras: { id: string; name: string }[];
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
    };
    onRowClick?: (event: any) => void;
    sortOrder: "asc" | "desc";
    onSortOrderChange: (sortOrder: "asc" | "desc") => void;
}

const EventTilesView: React.FC<EventTilesViewProps> = ({
    data,
    isTableLoading,
    isHeaderLoading,
    filters,
    onFilterChange,
    onDateRangeChange,
    onDateFilterChange,
    autoApply,
    onAutoApplyChange,
    headerData,
    onRowClick,
}) => {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const handleDropdownToggle = (dropdownId: string, isOpen: boolean) => {
        setOpenDropdown(isOpen ? dropdownId : null);
    };

    const handleTileClick = (event: any) => {
        if (onRowClick) {
            onRowClick(event);
        }
    };

    const getFilterData = (filterType: string) => {
        const filterMap = {
            sites: {
                options: headerData.sites,
                selected: filters.sites,
                key: "sites" as keyof EventFilters,
            },
            cameras: {
                options: headerData.cameras,
                selected: filters.cameras,
                key: "cameras" as keyof EventFilters,
            },
            useCases: {
                options: headerData.useCases,
                selected: filters.useCases,
                key: "useCases" as keyof EventFilters,
            },
            severities: {
                options: headerData.severities,
                selected: filters.severities,
                key: "severities" as keyof EventFilters,
            },
            statuses: {
                options: headerData.statuses,
                selected: filters.statuses,
                key: "statuses" as keyof EventFilters,
            },
            actions: {
                options: headerData.actions,
                selected: filters.actions,
                key: "actions" as keyof EventFilters,
            },
            locationTags: {
                options: headerData.locationTags,
                selected: filters.locationTags,
                key: "locationTags" as keyof EventFilters,
            },
        };
        return filterMap[filterType as keyof typeof filterMap] || {
            options: [],
            selected: [],
            key: "sites" as keyof EventFilters,
        };
    };



    const getStatusColor = (status: string) => {
        switch (status) {
            case "Logged":
                return "border-blue-200 bg-blue-100 text-blue-800";
            case "Notified":
                return "border-indigo-200 bg-indigo-100 text-indigo-800";
            case "Seen":
                return "border-purple-200 bg-purple-100 text-purple-800";
            case "Invalid":
                return "border-red-200 bg-red-100 text-red-800";
            default:
                return "border-gray-200 bg-gray-100 text-gray-800";
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case "critical":
                return "border-red-200 bg-red-100 text-red-600";
            case "high":
                return "border-yellow-200 bg-yellow-100 text-yellow-600";
            case "low":
                return "border-green-200 bg-green-100 text-green-600";
            default:
                return "border-gray-200 bg-gray-100 text-gray-600";
        }
    };


    const formatTime = (timeString: string) => {
        if (!timeString) return "No Time";

        if (timeString.includes(' ') && timeString.split(' ').length > 2) {
            const parts = timeString.split(' ');
            timeString = `${parts[0]}, ${parts[1]}`;
        }

        const timePart = timeString.split(' ')[1];
        if (timePart) {
            const hour = parseInt(timePart.split(':')[0]);
            const period = hour < 12 ? 'AM' : 'PM';
            return `${timeString} ${period}`;
        }


        return timeString;
    };

    return (
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
            {/* Filter Header */}
            <div className=" p-3">
                <div className="flex flex-wrap items-center gap-4 text-sm">


                    {/* Site Filter */}
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                        
                        <TableHeaderDropdown
                            label="Sites"
                            options={getFilterData("sites").options}
                            selectedValues={getFilterData("sites").selected}
                            onSelectionChange={(values) => onFilterChange("sites", values)}
                            isActive={filters.sites.length > 0}
                            autoApply={autoApply}
                            onAutoApplyChange={onAutoApplyChange}
                            dependentOptions={headerData.cameras}
                            selectedSites={filters.sites}
                            columnKey="sites"
                            isDisabled={isHeaderLoading}
                            isOpen={openDropdown === "sites"}
                            onToggle={(isOpen) => handleDropdownToggle("sites", isOpen)}
                        />
                    </div>

                    {/* Camera Filter */}
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                        <TableHeaderDropdown
                            label="Cameras"
                            options={getFilterData("cameras").options}
                            selectedValues={getFilterData("cameras").selected}
                            onSelectionChange={(values) => onFilterChange("cameras", values)}
                            isActive={filters.cameras.length > 0}
                            autoApply={autoApply}
                            onAutoApplyChange={onAutoApplyChange}
                            dependentOptions={headerData.cameras}
                            selectedSites={filters.sites}
                            columnKey="cameras"
                            isDisabled={isHeaderLoading}
                            isOpen={openDropdown === "cameras"}
                            onToggle={(isOpen) => handleDropdownToggle("cameras", isOpen)}
                        />
                    </div>



                    {/* Use Case Filter */}
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                        <TableHeaderDropdown
                            label=" Use Cases"
                            options={getFilterData("useCases").options}
                            selectedValues={getFilterData("useCases").selected}
                            onSelectionChange={(values) => onFilterChange("useCases", values)}
                            isActive={filters.useCases.length > 0}
                            autoApply={autoApply}
                            onAutoApplyChange={onAutoApplyChange}
                            columnKey="useCases"
                            isDisabled={isHeaderLoading}
                            isOpen={openDropdown === "useCases"}
                            onToggle={(isOpen) => handleDropdownToggle("useCases", isOpen)}
                        />
                    </div>

                    {/* Location Tags Filter */}
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                        <TableHeaderDropdown
                            label="Location Tags"
                            options={getFilterData("locationTags").options}
                            selectedValues={getFilterData("locationTags").selected}
                            onSelectionChange={(values) => onFilterChange("locationTags", values)}
                            isActive={filters.locationTags.length > 0}
                            autoApply={autoApply}
                            onAutoApplyChange={onAutoApplyChange}
                            columnKey="locationTags"
                            isDisabled={isHeaderLoading}
                            isOpen={openDropdown === "locationTags"}
                            onToggle={(isOpen) => handleDropdownToggle("locationTags", isOpen)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                        <TableHeaderDropdown
                            label="Status"
                            options={getFilterData("statuses").options}
                            selectedValues={getFilterData("statuses").selected}
                            onSelectionChange={(values) => onFilterChange("statuses", values)}
                            isActive={filters.statuses.length > 0}
                            autoApply={autoApply}
                            onAutoApplyChange={onAutoApplyChange}
                            columnKey="statuses"
                            isDisabled={isHeaderLoading}
                            isOpen={openDropdown === "statuses"}
                            onToggle={(isOpen) => handleDropdownToggle("statuses", isOpen)}
                        />
                    </div>

                    {/* Severity Filter */}
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                        <TableHeaderDropdown
                            label="Severity"
                            options={getFilterData("severities").options}
                            selectedValues={getFilterData("severities").selected}
                            onSelectionChange={(values) => onFilterChange("severities", values)}
                            isActive={filters.severities.length > 0}
                            autoApply={autoApply}
                            onAutoApplyChange={onAutoApplyChange}
                            columnKey="severities"
                            isDisabled={isHeaderLoading}
                            isOpen={openDropdown === "severities"}
                            onToggle={(isOpen) => handleDropdownToggle("severities", isOpen)}
                        />
                    </div>


                    {/* Date Filter */}
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                        <span className="text-gray-700 font-medium">Date:</span>
                        <DateFilter
                            dateRange={filters.dateRange}
                            dateFilter={filters.dateFilter}
                            onDateRangeChange={onDateRangeChange}
                            onDateFilterChange={onDateFilterChange}
                            isActive={filters.dateRange !== null || filters.dateFilter !== null}
                            autoApply={autoApply}
                            onAutoApplyChange={onAutoApplyChange}
                        />
                    </div>
                </div>
            </div>

            {/* Tiles Grid */}
            <div className="p-4 h-[calc(100vh-235px)] overflow-x-auto overflow-y-auto">
                {isTableLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loading />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center text-gray-500">
                        <AlertTriangle className="w-12 h-12 text-gray-300" />
                        <div>
                            <p className="text-lg font-medium">No events found</p>
                            <p className="text-sm">Try adjusting your filters to see more results</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                        {data.map((event, index) => (
                            <div
                                key={event.event_id || index}
                                className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow h-64"
                                onClick={() => handleTileClick(event)}
                            >
                                {/* Full background image */}
                                <img
                                    src={event.media_link}
                                    alt="Event snapshot"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = eventSnapshot;
                                        e.currentTarget.onerror = null;
                                    }}
                                />


                                {/* Content overlay */}
                                <div className="absolute inset-0  flex flex-col justify-between text-white">
                                    {/* Top content */}
                                    <div className="flex flex-row gap-2 p-4">
                                        {/* <div className="text-xs opacity-90 mb-1">{event.camera_name || 'No Camera'}</div> */}
                                        <div className="text-xs opacity-90 font-bold bg-[#FFEF8A] rounded-lg px-2 py-1 text-black ">{event.uc_type || 'No Use Case'}</div>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-lg ${getStatusColor(event.status || "Unknown")}`}>
                                            {event.status || "Unknown"}
                                        </span>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-lg ${getSeverityColor(event.severity || "Unknown")}`}>
                                            {event.severity || "Unknown"}
                                        </span>
                                    </div>

                                    {/* Bottom content */}
                                    <div className="bg-black/40 py-1 px-2">
                                        <div className="text-md mb-0.5 font-bold  text-white ">{event.site_name || 'No Site'}</div>
                                        <div className="flex items-center gap-2 text-xs text-white mb-1">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {(event.location_tags && event.location_tags.length > 0)
                                                    ? (Array.isArray(event.location_tags)
                                                        ? event.location_tags.join(', ')
                                                        : event.location_tags)
                                                    : 'No location tags'
                                                }
                                            </div>
                                            <span className="text-white opacity-60">|</span>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(event.time_created)}
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventTilesView;