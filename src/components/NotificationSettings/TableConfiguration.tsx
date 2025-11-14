import { BellRing, BellOff, X, Info, Save, Trash2, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AlertTypeValue } from '@/api/types';

// Updated interface to match the new data structure
interface LocationTag {
    location_tag: string;
}

interface TableConfigurationProps {
    displayLocationTags: string[];
    locationTags: LocationTag[]; // Updated to use simplified LocationTag interface
    subscriptions: Record<string, AlertTypeValue[]>;
    handleAlertTypeToggle: (locationTag: string, type: AlertTypeValue) => void;
    isEditMode: 'view' | 'edit';
    onSave?: () => void;
    onCancel?: () => void;
    lastSavedSubscriptions?: Record<string, AlertTypeValue[]>;
    onRemoveLocationTag?: (locationTag: string) => void;
}

export const TableConfiguration = ({
    displayLocationTags,
    subscriptions,
    handleAlertTypeToggle,
    isEditMode,
    onSave,
    onCancel,
    lastSavedSubscriptions = {},
    onRemoveLocationTag
}: TableConfigurationProps) => {

    const handleCancel = () => {
        // Reset subscriptions to last saved state
        if (lastSavedSubscriptions) {
            Object.keys(lastSavedSubscriptions).forEach(tagId => {
                const currentSubs = subscriptions[tagId] || [];
                const savedSubs = lastSavedSubscriptions[tagId] || [];

                // Reset each subscription to its last saved state
                currentSubs.forEach(alertType => {
                    if (!savedSubs.includes(alertType)) {
                        handleAlertTypeToggle(tagId, alertType);
                    }
                });

                savedSubs.forEach(alertType => {
                    if (!currentSubs.includes(alertType)) {
                        handleAlertTypeToggle(tagId, alertType);
                    }
                });
            });
        }
        
        // Call onCancel if provided
        if (onCancel) {
            onCancel();
        }
    };

    // Quick action handlers for column headers
    const handleColumnToggle = (alertType: AlertTypeValue, isChecked: boolean) => {
        if (isEditMode === 'view') return;

        displayLocationTags.forEach(tagId => {
            const isCurrentlySelected = subscriptions[tagId]?.includes(alertType);
            
            if (isChecked && !isCurrentlySelected) {
                // Select this alert type for this location tag
                handleAlertTypeToggle(tagId, alertType);
            } else if (!isChecked && isCurrentlySelected) {
                // Deselect this alert type for this location tag
                handleAlertTypeToggle(tagId, alertType);
            }
        });
    };

    // Check if all location tags have this alert type selected
    const isAllSelected = (alertType: AlertTypeValue) => {
        return displayLocationTags.every(tagId => 
            subscriptions[tagId]?.includes(alertType)
        );
    };

    const isAlertTypeSelected = (locationTag: string, alertType: AlertTypeValue) => {
        return subscriptions[locationTag]?.includes(alertType) || false;
    };

    const alertTypeConfig: Record<AlertTypeValue, {
        label: string;
        color: string;
        useCases: string[];
    }> = {
        critical: {
            label: 'Critical',
            color: 'red',
            useCases: ['Fire detection', 'Man down incidents'],
        },
        high: {
            label: 'High',
            color: 'orange',
            useCases: ['Near miss events', 'Speeding violations', 'Intrusion exclusion'],
        },
        low: {
            label: 'Low',
            color: 'gray',
            useCases: ['PPE violations', 'Vehicle queuing', 'General monitoring'],
        }
    };

    // Filter out location tags with no alert types in view mode
    const filteredDisplayTags = isEditMode === 'edit'
        ? displayLocationTags
        : displayLocationTags.filter(tag => subscriptions[tag]?.length > 0);

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-between items-center border-b border-gray-200 py-2">
                <h2 className="text-lg font-semibold text-gray-900">Alert Configuration</h2>
                {isEditMode === 'edit' && onSave && (
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
                        >
                            <Save className="w-4 h-4" />
                            Save
                        </button>
                    </div>
                )}
            </div>
            <table className="w-full border-collapse">
                {/* Table Header */}
                <thead>
                    <tr className="border-b-1 border-gray-200">
                        <th className="text-left py-2 px-2 font-semibold text-gray-700 bg-gray-50">
                            Location Tag
                        </th>
                        {Object.entries(alertTypeConfig).map(([type, config]) => (
                            <th key={type} className="text-center py-2 px-2 font-semibold text-gray-700 bg-gray-50 relative">
                                <div className="flex items-center justify-center gap-2">
                                    <span>{config.label}</span>

                                    {/* Tooltip using proper component */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="text-xs">
                                                Use cases: {config.useCases.join(', ')}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>

                                    {/* Single Checkbox for Select All/Deselect All - Only show in edit mode */}
                                    {isEditMode === 'edit' && (
                                        <div className="flex items-center ml-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => handleColumnToggle(type as AlertTypeValue, !isAllSelected(type as AlertTypeValue))}
                                                        className={`flex items-center justify-center w-4 h-4 border-2 rounded transition-colors ${
                                                            isAllSelected(type as AlertTypeValue)
                                                                ? 'border-green-500 bg-green-500 hover:bg-green-600'
                                                                : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                                                        }`}
                                                    >
                                                        {isAllSelected(type as AlertTypeValue) && (
                                                            <Check className="w-3 h-3 text-white" />
                                                        )}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {isAllSelected(type as AlertTypeValue) 
                                                        ? `Disable ${config.label} for all`
                                                        : `Enable ${config.label} for all`
                                                    }
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                    {displayLocationTags.map(tagId => {
                        // Since we only have location tag strings now, create a simple object
                        const tag = { location_tag: tagId };

                        return (
                            <tr key={tag.location_tag} className="border-b border-gray-100 hover:bg-gray-50">
                                {/* Location Tag Column */}
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                                                {tag.location_tag.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{tag.location_tag}</div>
                                                {/* Remove camera count since we don't have that data anymore */}
                                                <div className="text-sm text-gray-500">Location</div>
                                            </div>
                                        </div>
                                        {isEditMode === 'edit' && onRemoveLocationTag && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => onRemoveLocationTag(tag.location_tag)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Remove location tag
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </td>

                                {/* Alert Type Columns */}
                                {Object.entries(alertTypeConfig).map(([type, config]) => (
                                    <td key={type} className="py-4 px-4 text-center">
                                        <button
                                            onClick={() => handleAlertTypeToggle(tag.location_tag, type as AlertTypeValue)}
                                            disabled={isEditMode === 'view'}
                                            className={`p-2 rounded-lg transition-all ${isEditMode === 'view' ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                                                }`}
                                        >
                                            {isAlertTypeSelected(tag.location_tag, type as AlertTypeValue) ? (
                                                <BellRing className={`w-5 h-5 ${config.color === 'red' ? 'text-red-600' :
                                                    config.color === 'orange' ? 'text-orange-600' :
                                                        'text-gray-600'
                                                    }`} />
                                            ) : (
                                                <BellOff className="w-5 h-5 text-gray-300" />
                                            )}
                                        </button>
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {displayLocationTags.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    {isEditMode === 'edit'
                        ? 'No location tags available for this user.'
                        : 'Select a user to see their notification settings.'
                    }
                </div>
            )}
        </div>
    );
};