// components/SiteConfiguration/Counter/AddCounterModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateCounter, useUpdateCounter } from "@/hooks/useApi";
import { toast } from "react-hot-toast";
import { Car, Truck, Ship, Bike, Plane, Forklift, Bus, Train } from "lucide-react";
import { timezones } from "@/components/settings/data";
import moment from "moment-timezone";
import { CounterData, CreateCounterInput } from "@/api/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import CustomDropdown, { DropdownOption } from "@/components/CustomDropdown";

interface AddCounterModalProps {
    open: boolean;
    onClose: () => void;
    onComplete?: (counter?: CounterData) => void;
    siteId: string;
    editCounter?: CounterData | null;
}

const AddCounterModal: React.FC<AddCounterModalProps> = ({
    open,
    onClose,
    onComplete,
    editCounter,
    siteId,
}) => {

    const { user } = useAuth();
    const [formData, setFormData] = useState<CreateCounterInput>({
        site_id: siteId,
        name: "",
        countPeople: false,
        peopleSubCategory: "",
        countVehicle: false,
        vehicleSubCategory: "",
        maxAllowed: 0,
        notifyEnabled: false,
        cameras: [],
        visible: true,
        timezone: user?.timezone,
        reporting_time: {
            interval_value: 5,
            interval_unit: "minute"
        },
        reset_time: {
            recurrence: "daily",
            time: "00:00"
        }
    });

    const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>([]);
    const [objectToCount, setObjectToCount] = useState<"people" | "vehicle" | "">("");
    const [hasLimit, setHasLimit] = useState<"yes" | "no" | "">("");
    const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
    const [isSelectDropdownOpen, setIsSelectDropdownOpen] = useState(false);
    const [useSameSchedule, setUseSameSchedule] = useState(false);
    const [initialSnapshot, setInitialSnapshot] = useState<string>("");




    const vehicleOptions = [
        { value: "Car", icon: Car },
        { value: "Motorbike", icon: Bike },
        { value: "Truck", icon: Truck },
        { value: "Aeroplane", icon: Plane },
        { value: "Forklift", icon: Forklift },
        { value: "Boat", icon: Ship },
        { value: "Bus", icon: Bus },
        { value: "Bicycle", icon: Bike },
        { value: "Train", icon: Train }
    ];

    const filteredVehicleOptions = vehicleOptions.filter(option =>
        option.value.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) &&
        !selectedVehicleTypes.includes(option.value)
    );

    // Convert timezone data to dropdown options
    const timezoneOptions: DropdownOption[] = timezones.map(tz => ({
        label: tz.label,
        value: tz.value
    }));

    // Interval unit options
    const intervalUnitOptions: DropdownOption[] = [
        { label: "Min", value: "minute" },
        { label: "Hr", value: "hour" },
        { label: "Day", value: "day" },
        { label: "Week", value: "week" }
    ];

    // Reset recurrence options
    const recurrenceOptions: DropdownOption[] = [
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
        { label: "Monthly", value: "monthly" },
        { label: "Yearly", value: "yearly" }
    ];

    // Day of week options
    const dayOfWeekOptions: DropdownOption[] = [
        { label: "Mon", value: "1" },
        { label: "Tue", value: "2" },
        { label: "Wed", value: "3" },
        { label: "Thu", value: "4" },
        { label: "Fri", value: "5" },
        { label: "Sat", value: "6" },
        { label: "Sun", value: "7" }
    ];

    // Day of month options
    const dayOfMonthOptions: DropdownOption[] = Array.from({ length: 31 }, (_, i) => ({
        label: String(i + 1),
        value: String(i + 1)
    }));

    // Month options
    const monthOptions: DropdownOption[] = [
        { label: "Jan", value: "01" },
        { label: "Feb", value: "02" },
        { label: "Mar", value: "03" },
        { label: "Apr", value: "04" },
        { label: "May", value: "05" },
        { label: "Jun", value: "06" },
        { label: "Jul", value: "07" },
        { label: "Aug", value: "08" },
        { label: "Sep", value: "09" },
        { label: "Oct", value: "10" },
        { label: "Nov", value: "11" },
        { label: "Dec", value: "12" }
    ];

    // Day options for yearly (1-31)
    const yearlyDayOptions: DropdownOption[] = Array.from({ length: 31 }, (_, i) => ({
        label: String(i + 1),
        value: String(i + 1).padStart(2, '0')
    }));

    const { execute: createCounter, loading: createLoading } = useCreateCounter();
    const { execute: updateCounter, loading: updateLoading } = useUpdateCounter();

    // Reset form when modal opens
    useEffect(() => {
        if (editCounter) {
            setFormData({
                site_id: editCounter.site_id,
                name: editCounter.name,
                countPeople: editCounter.countPeople,
                peopleSubCategory: editCounter.peopleSubCategory || "",
                countVehicle: editCounter.countVehicle,
                vehicleSubCategory: editCounter.vehicleSubCategory || "",
                maxAllowed: editCounter.maxAllowed || 0,
                notifyEnabled: editCounter.notifyEnabled,
                cameras: editCounter.cameras || [],
                visible: editCounter.visible,
                timezone: user?.timezone,
                reporting_time: editCounter.reporting_time || {
                    interval_value: 5,
                    interval_unit: "minute"
                },
                reset_time: editCounter.reset_time
            });
            setUseSameSchedule(!editCounter.reset_time);

            // Save initial snapshot for change detection
            const snapshot = JSON.stringify({
                name: editCounter.name,
                countPeople: editCounter.countPeople,
                peopleSubCategory: editCounter.peopleSubCategory || "",
                countVehicle: editCounter.countVehicle,
                vehicleSubCategory: editCounter.vehicleSubCategory || "",
                maxAllowed: editCounter.maxAllowed || 0,
                notifyEnabled: editCounter.notifyEnabled,
                timezone: user?.timezone,
                reporting_time: editCounter.reporting_time,
                reset_time: editCounter.reset_time,
                selectedVehicleTypes: editCounter.vehicleSubCategory ? editCounter.vehicleSubCategory.split(", ") : [],
                objectToCount: editCounter.countPeople ? "people" : editCounter.countVehicle ? "vehicle" : "",
                hasLimit: editCounter.maxAllowed && editCounter.maxAllowed > 0 ? "yes" : "no",
                useSameSchedule: !editCounter.reset_time
            });
            setInitialSnapshot(snapshot);

            // Set object type based on existing data
            if (editCounter.countPeople) {
                setObjectToCount("people");
                setHasLimit(editCounter.maxAllowed && editCounter.maxAllowed > 0 ? "yes" : "no");
            } else if (editCounter.countVehicle) {
                setObjectToCount("vehicle");
                setHasLimit(editCounter.maxAllowed && editCounter.maxAllowed > 0 ? "yes" : "no");
            }

            // Set selected vehicle types from existing data
            if (editCounter.vehicleSubCategory) {
                setSelectedVehicleTypes(editCounter.vehicleSubCategory.split(", "));
            }
        } else {
            // Reset form for new counter
            setFormData({
                site_id: siteId,
                name: "",
                countPeople: false,
                peopleSubCategory: "",
                countVehicle: false,
                vehicleSubCategory: "",
                maxAllowed: 0,
                notifyEnabled: false,
                cameras: [],
                visible: true,
                timezone: user?.timezone,
                reporting_time: {
                    interval_value: 5,
                    interval_unit: "minute"
                },
                reset_time: {
                    recurrence: "daily",
                    time: "00:00"
                }
            });

            setSelectedVehicleTypes([]);
            setObjectToCount("");
            setHasLimit("");
            setVehicleSearchTerm("");

        }
    }, [open, siteId, editCounter]);

    const hasChanged = useMemo(() => {
        if (!editCounter || !initialSnapshot) return false;

        // Helper to remove undefined properties
        const removeUndefined = (obj: any): any => {
            return JSON.parse(JSON.stringify(obj, (key, value) =>
                value === undefined ? null : value
            ));
        };

        const currentSnapshot = JSON.stringify(removeUndefined({
            name: formData.name,
            countPeople: formData.countPeople,
            peopleSubCategory: formData.peopleSubCategory,
            countVehicle: formData.countVehicle,
            vehicleSubCategory: formData.vehicleSubCategory,
            maxAllowed: formData.maxAllowed,
            notifyEnabled: formData.notifyEnabled,
            timezone: formData.timezone,
            reporting_time: formData.reporting_time,
            reset_time: formData.reset_time,
            selectedVehicleTypes,
            objectToCount,
            hasLimit,
            useSameSchedule
        }));

        return currentSnapshot !== initialSnapshot;
    }, [
        formData,
        selectedVehicleTypes,
        objectToCount,
        hasLimit,
        useSameSchedule,
        initialSnapshot,
        editCounter
    ]);

    useEffect(() => {
        if (!isSelectDropdownOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            const dropdownContainer = target.closest('.vehicle-dropdown-container');
            if (!dropdownContainer) {
                setIsSelectDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSelectDropdownOpen]);

    // Handle object type selection
    const handleObjectTypeChange = (value: "people" | "vehicle") => {
        setObjectToCount(value);
        setHasLimit("");

        if (value === "people") {
            setFormData(prev => ({
                ...prev,
                countPeople: true,
                countVehicle: false,
                vehicleSubCategory: "",
                maxAllowed: 0,
                notifyEnabled: false
            }));
            setSelectedVehicleTypes([]);
        } else {
            setFormData(prev => ({
                ...prev,
                countPeople: false,
                countVehicle: true,
                peopleSubCategory: "",
                maxAllowed: 0,
                notifyEnabled: false
            }));
            setVehicleSearchTerm("");
        }
    };

    // Handle limit selection
    const handleLimitChange = (value: "yes" | "no") => {
        setHasLimit(value);

        if (value === "no") {
            setFormData(prev => ({
                ...prev,
                maxAllowed: 0,
                notifyEnabled: false,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Counter name is required");
            return;
        }

        if (!formData.countPeople && !formData.countVehicle) {
            toast.error("Please select an object to count");
            return;
        }

        // Validation for vehicle subcategory
        if (formData.countVehicle && selectedVehicleTypes.length === 0) {
            toast.error("Please select at least one vehicle type");
            return;
        }

        // Validation for limits
        if (hasLimit === "yes" && (!formData.maxAllowed || formData.maxAllowed < 0)) {
            toast.error(`Please enter a valid maximum allowed ${objectToCount}`);
            return;
        }

        try {

            // Validate reset time only if not using same schedule
            if (!useSameSchedule) {
                if (!formData.reset_time.time) {
                    toast.error("Please set reset schedule time");
                    return;
                }

                // Additional validation based on reset schedule type
                switch (formData.reset_time.recurrence) {
                    case "weekly":
                        if (!formData.reset_time.days_of_week?.length) {
                            toast.error("Please select day of week for weekly reset");
                            return;
                        }
                        break;
                    case "monthly":
                        if (!formData.reset_time.day_of_month) {
                            toast.error("Please select day of month for monthly reset");
                            return;
                        }
                        break;
                    case "yearly":
                        if (!formData.reset_time.month_and_day) {
                            toast.error("Please select month and day for yearly reset");
                            return;
                        }
                        break;
                }

                // Convert time from selected timezone to UTC before sending
                const [hours, minutes] = formData.reset_time.time.split(':').map(Number);

                // Create a moment in the user's selected timezone
                const userTime = moment.tz(formData.timezone || "UTC").hour(hours).minute(minutes).second(0).millisecond(0);
                const utcTime = userTime.clone().utc();

                // Update the time in UTC format
                formData.reset_time.time = utcTime.format('HH:mm');

                // For weekly reset, adjust day if UTC conversion crosses date boundary
                if (formData.reset_time.recurrence === "weekly" && formData.reset_time.days_of_week?.length) {
                    const originalDay = formData.reset_time.days_of_week[0];
                    const dayDifference = utcTime.day() - userTime.day();

                    if (dayDifference !== 0) {
                        let adjustedDay = originalDay;
                        if (dayDifference === 1 || dayDifference === -6) {
                            adjustedDay = originalDay === 7 ? 1 : originalDay + 1;
                        } else if (dayDifference === -1 || dayDifference === 6) {
                            adjustedDay = originalDay === 1 ? 7 : originalDay - 1;
                        }
                        formData.reset_time.days_of_week = [adjustedDay];
                    }
                }
            }

            // Prepare payload - exclude maxAllowed if no limit is set
            const payload: CreateCounterInput = { ...formData };
            if (hasLimit !== "yes" || !payload.maxAllowed || payload.maxAllowed <= 0) {
                delete payload.maxAllowed;
            }

            // Set reset_time to null if using same schedule, otherwise keep the processed value
            if (useSameSchedule) {
                payload.reset_time = null;
            }

            // Remove timezone from payload as it's not expected by API
            const { timezone, ...finalPayload } = payload;

            let result;
            if (editCounter) {
                result = await updateCounter(editCounter.id, finalPayload);
            } else {
                result = await createCounter(finalPayload);
            }

            onComplete?.(result);
            onClose();
        } catch (error: any) {
            console.error('Submit error:', error);
            toast.error(error.message || `Failed to ${editCounter ? 'update' : 'create'} counter`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-2xl bg-white p-0 border-0 shadow-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-medium text-gray-900">
                            {editCounter ? "Update Counter" : "Create Counter"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editCounter ? "Update counter settings and configuration" : "Create a new counter with custom settings"}
                        </DialogDescription>
                    </div>
                </DialogHeader>


                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
                    {/* Counter Name */}
                    <div className="space-y-2">
                        <Label htmlFor="counter-name" className="text-base font-medium text-gray-700">
                            Name
                            <span className="text-gray-400 text-sm ml-1">
                                (eg.  Parking area, A entire mall, etc.)
                            </span>
                        </Label>
                        <Input
                            id="counter-name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Lift 1"
                            className="w-64"
                            disabled={createLoading || updateLoading}
                            maxLength={60}
                        />
                    </div>

                    {/* Select Objects to Count */}
                    <div className="space-y-4">
                        <Label className="text-base font-medium text-gray-700">
                            Select objects to count
                        </Label>

                        <div className="space-y-4">
                            {/* People Option */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        value="people"
                                        id="people"
                                        name="objectToCount"
                                        checked={objectToCount === "people"}
                                        onChange={() => handleObjectTypeChange("people")}
                                        className="w-4 h-4 text-black border-2 border-black focus:ring-black focus:border-black accent-black"
                                    />
                                    <Label htmlFor="people" className="text-base font-medium">
                                        Total number of People
                                    </Label>
                                </div>

                                {/* Nested content for People */}
                                {objectToCount === "people" && (
                                    <div className="ml-6 space-y-4">
                                        {/* Is there any limit? */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium text-gray-700">
                                                Is there any limit on total number of People
                                            </Label>

                                            <div className="flex items-center space-x-6">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="people-limit-yes"
                                                        name="hasLimit"
                                                        value="yes"
                                                        checked={hasLimit === "yes"}
                                                        onChange={() => handleLimitChange("yes")}
                                                        className="w-4 h-4 text-black border-2 border-black focus:ring-black focus:border-black accent-black"
                                                    />
                                                    <Label htmlFor="people-limit-yes" className="text-base font-medium">
                                                        Yes
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="people-limit-no"
                                                        name="hasLimit"
                                                        value="no"
                                                        checked={hasLimit === "no"}
                                                        onChange={() => handleLimitChange("no")}
                                                        className="w-4 h-4 text-black border-2 border-black focus:ring-black focus:border-black accent-black"
                                                    />
                                                    <Label htmlFor="people-limit-no" className="text-base font-medium">
                                                        No
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Max Allowed People - Only show if Yes is selected */}
                                        {hasLimit === "yes" && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label className="text-base font-medium text-gray-700">
                                                        Max Allowed
                                                    </Label>
                                                    <div className="flex items-center space-x-2">
                                                        <Input
                                                            type="number"
                                                            value={formData.maxAllowed || ""}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (value === "" || (value.length <= 8 && parseInt(value) >= 0)) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        maxAllowed: value === "" ? 0 : parseInt(value)
                                                                    }));
                                                                }
                                                            }}
                                                            className="w-32"
                                                            min="0"
                                                            max="99999999"
                                                            placeholder="0"
                                                        />
                                                        <span className="text-base text-gray-600">people</span>
                                                    </div>
                                                </div>

                                                {/* Notify Checkbox for People */}
                                                <div className="space-y-3">
                                                    <div className="flex items-start space-x-3">
                                                        <Checkbox
                                                            id="people-notify"
                                                            checked={formData.notifyEnabled}
                                                            onCheckedChange={(checked) =>
                                                                setFormData(prev => ({ ...prev, notifyEnabled: !!checked }))
                                                            }
                                                            className="mt-0.5"
                                                        />
                                                        <div>
                                                            <Label htmlFor="people-notify" className="text-base font-medium">
                                                                Notify
                                                            </Label>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                If the number of people exceeds the maximum allowed limit, you will be notified for overcrowding.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Vehicle Option */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        value="vehicle"
                                        id="vehicle"
                                        name="objectToCount"
                                        checked={objectToCount === "vehicle"}
                                        onChange={() => handleObjectTypeChange("vehicle")}
                                        className="w-4 h-4 text-black border-2 border-black focus:ring-black focus:border-black accent-black"
                                    />
                                    <Label htmlFor="vehicle" className="text-base font-medium">
                                        Total number of Vehicle
                                    </Label>
                                </div>

                                {/* Nested content for Vehicle */}
                                {objectToCount === "vehicle" && (
                                    <div className="ml-6 space-y-4">
                                        {/* Vehicle Types Selection */}
                                        <div className="space-y-3">
                                            <Label className="text-sm text-gray-600">Select Types of Vehicle</Label>
                                            <div className="relative vehicle-dropdown-container">

                                                <div
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white cursor-pointer flex items-center justify-between text-sm"
                                                    onClick={() => setIsSelectDropdownOpen(!isSelectDropdownOpen)}
                                                >
                                                    <div className="flex flex-wrap gap-1">
                                                        {selectedVehicleTypes.length > 0
                                                            ? selectedVehicleTypes.map(type => (
                                                                <span key={type} className="bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                                                                    {type}
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newTypes = selectedVehicleTypes.filter(t => t !== type);
                                                                            setSelectedVehicleTypes(newTypes);
                                                                            setFormData(prev => ({ ...prev, vehicleSubCategory: newTypes.join(", ") }));
                                                                        }}
                                                                        className="text-red-500 hover:text-red-700 text-xs"
                                                                    >×</button>
                                                                </span>
                                                            ))
                                                            : <span className="text-gray-400">Select Vehicle Types...</span>
                                                        }
                                                    </div>
                                                    <span className={`transform transition-transform ${isSelectDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                                                </div>

                                                {isSelectDropdownOpen && (
                                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto text-sm">
                                                        <div className="p-2 border-b border-gray-200">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedVehicleTypes.length === vehicleOptions.length}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            const allTypes = vehicleOptions.map(opt => opt.value);
                                                                            setSelectedVehicleTypes(allTypes);
                                                                            setFormData(prev => ({ ...prev, vehicleSubCategory: allTypes.join(", ") }));
                                                                        } else {
                                                                            setSelectedVehicleTypes([]);
                                                                            setFormData(prev => ({ ...prev, vehicleSubCategory: "" }));
                                                                        }
                                                                    }}
                                                                    className="w-3 h-3 accent-teal-600"
                                                                />
                                                                <span className="text-xs font-medium">Select All</span>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                placeholder="Search..."
                                                                value={vehicleSearchTerm}
                                                                onChange={(e) => setVehicleSearchTerm(e.target.value)}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                        </div>
                                                        {vehicleOptions
                                                            .filter(opt => opt.value.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) && !selectedVehicleTypes.includes(opt.value))
                                                            .map(option => {
                                                                const IconComponent = option.icon;
                                                                return (
                                                                    <div
                                                                        key={option.value}
                                                                        className="px-3 py-1 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                                                                        onClick={() => {
                                                                            const newTypes = [...selectedVehicleTypes, option.value];
                                                                            setSelectedVehicleTypes(newTypes);
                                                                            setFormData(prev => ({ ...prev, vehicleSubCategory: newTypes.join(", ") }));
                                                                            setVehicleSearchTerm("");
                                                                        }}
                                                                    >
                                                                        <IconComponent className="w-3 h-3" />
                                                                        <span>{option.value}</span>
                                                                    </div>
                                                                );
                                                            })
                                                        }
                                                        {filteredVehicleOptions.length === 0 && (
                                                            <div className="px-3 py-1 text-gray-400 text-sm">No vehicle types found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Is there any limit on Vehicle? */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium text-gray-700">
                                                Is there any limit on total number of Vehicle
                                            </Label>

                                            <div className="flex items-center space-x-6">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="vehicle-limit-yes"
                                                        name="hasLimit"
                                                        value="yes"
                                                        checked={hasLimit === "yes"}
                                                        onChange={() => handleLimitChange("yes")}
                                                        className="w-4 h-4 text-black border-2 border-black focus:ring-black focus:border-black accent-black"
                                                    />
                                                    <Label htmlFor="vehicle-limit-yes" className="text-base font-medium">
                                                        Yes
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="vehicle-limit-no"
                                                        name="hasLimit"
                                                        value="no"
                                                        checked={hasLimit === "no"}
                                                        onChange={() => handleLimitChange("no")}
                                                        className="w-4 h-4 text-black border-2 border-black focus:ring-black focus:border-black accent-black"
                                                    />
                                                    <Label htmlFor="vehicle-limit-no" className="text-base font-medium">
                                                        No
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Max Allowed Vehicles - Only show if Yes is selected */}
                                        {hasLimit === "yes" && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label className="text-base font-medium text-gray-700">
                                                        Max Allowed
                                                    </Label>
                                                    <div className="flex items-center space-x-2">
                                                        <Input
                                                            type="number"
                                                            value={formData.maxAllowed || ""}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (value === "" || (value.length <= 8 && parseInt(value) >= 0)) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        maxAllowed: value === "" ? 0 : parseInt(value)
                                                                    }));
                                                                }
                                                            }}
                                                            className="w-32"
                                                            min="0"
                                                            max="99999999"
                                                            placeholder="0"
                                                        />
                                                        <span className="text-base text-gray-600">vehicles</span>
                                                    </div>
                                                </div>

                                                {/* Notify Checkbox for Vehicle */}
                                                <div className="space-y-3">
                                                    <div className="flex items-start space-x-3">
                                                        <Checkbox
                                                            id="vehicle-notify"
                                                            checked={formData.notifyEnabled}
                                                            onCheckedChange={(checked) =>
                                                                setFormData(prev => ({ ...prev, notifyEnabled: !!checked }))
                                                            }
                                                            className="mt-0.5"
                                                        />
                                                        <div>
                                                            <Label htmlFor="vehicle-notify" className="text-base font-medium">
                                                                Notify
                                                            </Label>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                If the number of vehicles exceeds the maximum allowed limit, you will be notified for Over Capacity.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timezone Selection */}
                    {(!editCounter || !useSameSchedule) && (
                        <div className="space-y-2">
                            <Label className="text-sm text-gray-600">Timezone</Label>
                            <CustomDropdown
                                options={timezoneOptions}
                                value={formData.timezone || ""}
                                onChange={(value) =>
                                    setFormData(prev => ({
                                        ...prev,
                                        timezone: value
                                    }))
                                }
                                placeholder="Select timezone"
                                width="w-64"
                                className="w-64"
                            />
                        </div>
                    )}

                    {/* Counter Configuration */}
                    <div className="space-y-3">
                        <h3 className="text-base font-medium text-gray-700">Counter Configuration</h3>

                        {/* Reporting Schedule - Fixed at 5 minutes */}
                        <div className="space-y-2">
                            <Label className="text-sm text-gray-600">Reporting Schedule</Label>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md  border">
                                <span className="text-sm font-sm text-gray-700">5 Minutes</span>
                                <span className="text-xs text-gray-500">(Fixed)</span>
                            </div>
                        </div>

                        {/* Reset Schedule */}
                        <div className="space-y-2">
                            <Label className="text-sm text-gray-600">Reset Schedule</Label>

                            {/* Same as reporting schedule checkbox */}
                            {(!editCounter || useSameSchedule) && (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="useSameSchedule"
                                        checked={useSameSchedule}
                                        onCheckedChange={(checked) => setUseSameSchedule(checked as boolean)}
                                        disabled={!!editCounter}
                                    />
                                    <Label htmlFor="useSameSchedule" className="text-sm font-medium text-gray-700">
                                        Use same as reporting schedule
                                    </Label>
                                </div>
                            )}

                            {/* Only show reset schedule options if NOT using same schedule */}
                            {!useSameSchedule && (
                                <div className="space-y-2">
                                    <CustomDropdown
                                        options={recurrenceOptions}
                                        value={formData.reset_time.recurrence}
                                        onChange={(value: string) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                reset_time: {
                                                    ...prev.reset_time,
                                                    recurrence: value as "daily" | "weekly" | "monthly" | "yearly",
                                                    days_of_week: value === "weekly" ? [1] : undefined,
                                                    day_of_month: value === "monthly" ? 1 : undefined,
                                                    month_and_day: value === "yearly" ? "01-01" : undefined
                                                }
                                            }
                                            ))
                                        }
                                        placeholder="Select reset frequency"
                                        width="w-64"
                                        className="flex-1 [&>div:last-child]:bottom-full [&>div:last-child]:mb-1 [&>div:last-child]:mt-0"

                                    />

                                    {/* Weekly reset options */}
                                    {formData.reset_time.recurrence === "weekly" && (
                                        <div className="flex gap-2">
                                            <CustomDropdown
                                                options={dayOfWeekOptions}
                                                value={String(formData.reset_time.days_of_week?.[0] || 1)}
                                                onChange={(value) =>
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        reset_time: {
                                                            ...prev.reset_time,
                                                            days_of_week: [parseInt(value)]
                                                        }
                                                    }))
                                                }
                                                placeholder="Day"
                                                width="flex-1"
                                                className="flex-1 [&>div:last-child]:bottom-full [&>div:last-child]:mb-1 [&>div:last-child]:mt-0"
                                            />
                                            <Input
                                                type="time"
                                                value={formData.reset_time.time}
                                                onChange={(e) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        reset_time: {
                                                            ...prev.reset_time,
                                                            time: e.target.value
                                                        }
                                                    }));
                                                }}
                                                className="flex-1 h-9"
                                                step="60"
                                            />
                                        </div>
                                    )}

                                    {/* Monthly reset options */}
                                    {formData.reset_time.recurrence === "monthly" && (
                                        <div className="flex gap-2">
                                            <CustomDropdown
                                                options={dayOfMonthOptions}
                                                value={String(formData.reset_time.day_of_month || 1)}
                                                onChange={(value) =>
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        reset_time: {
                                                            ...prev.reset_time,
                                                            day_of_month: parseInt(value)
                                                        }
                                                    }))
                                                }
                                                placeholder="Day"
                                                width="flex-1"
                                                className="flex-1 [&>div:last-child]:bottom-full [&>div:last-child]:mb-1 [&>div:last-child]:mt-0"

                                            />
                                            <Input
                                                type="time"
                                                value={formData.reset_time.time}
                                                onChange={(e) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        reset_time: {
                                                            ...prev.reset_time,
                                                            time: e.target.value
                                                        }
                                                    }));
                                                }}
                                                className="flex-1 h-9"
                                                step="60"
                                            />
                                        </div>
                                    )}

                                    {/* Yearly reset options */}
                                    {formData.reset_time.recurrence === "yearly" && (
                                        <div className="flex gap-2">
                                            <CustomDropdown
                                                options={monthOptions}
                                                value={formData.reset_time.month_and_day?.split('-')[0] || "01"}
                                                onChange={(month) => {
                                                    const currentDay = formData.reset_time.month_and_day?.split('-')[1] || "01";
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        reset_time: {
                                                            ...prev.reset_time,
                                                            month_and_day: `${month.padStart(2, '0')}-${currentDay}`
                                                        }
                                                    }));
                                                }}
                                                placeholder="Month"
                                                width="flex-1"
                                                className="flex-1 [&>div:last-child]:bottom-full [&>div:last-child]:mb-1 [&>div:last-child]:mt-0"
                                            />
                                            <CustomDropdown
                                                options={yearlyDayOptions}
                                                value={formData.reset_time.month_and_day?.split('-')[1] || "01"}
                                                onChange={(day) => {
                                                    const currentMonth = formData.reset_time.month_and_day?.split('-')[0] || "01";
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        reset_time: {
                                                            ...prev.reset_time,
                                                            month_and_day: `${currentMonth}-${day.padStart(2, '0')}`
                                                        }
                                                    }));
                                                }}
                                                placeholder="Day"
                                                width="flex-1"
                                                className="flex-1 [&>div:last-child]:bottom-full [&>div:last-child]:mb-1 [&>div:last-child]:mt-0"
                                            />
                                            <Input
                                                type="time"
                                                value={formData.reset_time.time}
                                                onChange={(e) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        reset_time: {
                                                            ...prev.reset_time,
                                                            time: e.target.value
                                                        }
                                                    }));
                                                }}
                                                className="flex-1 h-9"
                                                step="60"
                                            />
                                        </div>
                                    )}

                                    {/* Daily reset options */}
                                    {formData.reset_time.recurrence === "daily" && (
                                        <Input
                                            type="time"
                                            value={formData.reset_time.time}
                                            onChange={(e) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    reset_time: {
                                                        ...prev.reset_time,
                                                        time: e.target.value
                                                    }
                                                }));
                                            }}
                                            className="w-64 h-9"
                                            step="60"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={createLoading || updateLoading}
                            className="px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createLoading || updateLoading || (!!editCounter && !hasChanged)}
                            className="px-6 bg-teal-600 hover:bg-teal-700 text-white"
                        >
                            {editCounter
                                ? updateLoading ? "Updating..." : "Update"
                                : createLoading ? "Creating..." : "Create"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddCounterModal;