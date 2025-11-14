
import React, { useState } from "react";
import { CounterData } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, BarChart3 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

interface ShowCountersProps {
    counters: CounterData[];
    onDeleteCounter: (counterId: string) => void;
    onEditCounter: (counter: CounterData) => void;
    onViewChart?: (counter: CounterData) => void;
    getCameraName?: (cameraId: string) => string;
}

const ShowCounters: React.FC<ShowCountersProps> = ({
    counters,
    onDeleteCounter,
    onEditCounter,
    onViewChart,
    getCameraName,
}) => {
    const [deleteDialog, setDeleteDialog] = useState({ open: false, counterId: "" });

    // Helper function to format reset schedule
    const formatResetSchedule = (counter: CounterData) => {
        if (!counter.reset_time) return "Resets after reporting";

        const { recurrence, time, days_of_week, day_of_month, month_and_day } = counter.reset_time;

        switch (recurrence) {
            case "daily":
                return `Daily at ${time}`;

            case "weekly":
                if (days_of_week && days_of_week.length > 0) {
                    const dayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                    const dayName = dayNames[days_of_week[0]] || "Unknown";
                    return `${dayName} at ${time}`;
                }
                return `Weekly at ${time}`;

            case "monthly":
                if (day_of_month) {
                    return `${day_of_month}th at ${time}`;
                }
                return `Monthly at ${time}`;

            case "yearly":
                if (month_and_day) {
                    const [month, day] = month_and_day.split('-');
                    const monthNames = [
                        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ];
                    const monthName = monthNames[parseInt(month)] || "Unknown";
                    return `${monthName} ${parseInt(day)} at ${time}`;
                }
                return `Yearly at ${time}`;

            default:
                return "-";
        }
    };

    // Helper function to format reporting time
    const formatReportingTime = (counter: CounterData) => {
        if (!counter.reporting_time) return "-";

        const { interval_value, interval_unit } = counter.reporting_time;

        if (!interval_value || !interval_unit) return "-";

        const unitDisplay = {
            minute: interval_value === 1 ? "min" : "mins",
            hour: interval_value === 1 ? "hour" : "hours",
            day: interval_value === 1 ? "day" : "days",
            week: interval_value === 1 ? "week" : "weeks"
        };

        return `Every ${interval_value} ${unitDisplay[interval_unit] || interval_unit}`;
    };

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {counters.map((counter) => (
                <div
                    key={counter.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <h3
                                className="text-base font-semibold text-gray-900 truncate"
                                title={counter.name}
                            >
                                {counter.name}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {onViewChart && (
                                <Button
                                    size="sm"
                                    onClick={() => onViewChart(counter)}
                                    variant="ghost"
                                    className="rounded-full h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                                    title="View Analytics"
                                >
                                    <BarChart3 className="h-4 w-4" />
                                </Button>
                            )}

                            <Button
                                size="sm"
                                onClick={() => onEditCounter(counter)}
                                variant="ghost"
                                className="rounded-full h-8 w-8 p-0 hover:bg-gray-100 text-gray-600"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => setDeleteDialog({ open: true, counterId: counter.id })}
                                size="sm"
                                variant="ghost"
                                className="rounded-full h-8 w-8 p-0 hover:bg-red-100"
                            >
                                <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        <div>
                            <span className="block text-xs font-medium text-teal-600">Objects to count</span>
                            <p className="text-sm text-gray-700">
                                {[
                                    counter.countPeople && "Total No. of Person",
                                    counter.countVehicle && "Total No. of Vehicle"
                                ].filter(Boolean).join(", ") || "None"}
                            </p>
                        </div>

                        <div>
                            <span className="block text-xs font-medium text-teal-600">Sub-Class Objects to count</span>
                            <p className="text-sm text-gray-700">
                                {[
                                    counter.peopleSubCategory && counter.peopleSubCategory.trim() !== "" ? counter.peopleSubCategory : null,
                                    counter.vehicleSubCategory && counter.vehicleSubCategory.trim() !== "" ? counter.vehicleSubCategory : null
                                ].filter(Boolean).join(", ") || "-"}
                            </p>
                        </div>

                        {(counter.maxAllowed != null && counter.maxAllowed > 0) && (
                            <div>
                                <span className="block text-xs font-medium text-teal-600">Max Allowed</span>
                                <p className="text-sm text-gray-700">
                                    {counter.maxAllowed} {counter.countPeople ? "people" : "vehicles"}
                                </p>
                            </div>
                        )}

                        <div>
                            <span className="block text-xs font-medium text-teal-600">Camera's</span>
                            <p className="text-sm text-gray-700">
                                {counter.cameras && counter.cameras.length > 0 && getCameraName
                                    ? counter.cameras.map(getCameraName).join(', ')
                                    : "-"}
                            </p>
                        </div>

                        {/* Reporting Schedule Section */}
                        <div>
                            <span className="block text-xs font-medium text-teal-600">Reporting Schedule</span>
                            <p className="text-sm text-gray-700">
                                {formatReportingTime(counter)}
                            </p>
                        </div>

                        {/* Reset Schedule Section */}
                        <div>
                            <span className="block text-xs font-medium text-teal-600">Reset Schedule</span>
                            <p className="text-sm text-gray-700">
                                {formatResetSchedule(counter)}
                            </p>
                        </div>
                    </div>
                </div>
            ))}

            <ConfirmationDialog
                open={deleteDialog.open}
                title="Delete Counter"
                description="Are you sure you want to delete this counter?"
                primaryButtonText="Delete"
                secondaryButtonText="Cancel"
                onClose={() => setDeleteDialog({ open: false, counterId: "" })}
                onConfirm={() => {
                    onDeleteCounter(deleteDialog.counterId);
                    setDeleteDialog({ open: false, counterId: "" });
                }}
                isDanger={true}
            />
        </div>
    );
};

export default ShowCounters;