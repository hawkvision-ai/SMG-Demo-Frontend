import { BellRing, BellOff, X, Info, Save, Trash2, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AlertTypeValue, CustomerAdmin } from '@/api/types';

interface LocationTableConfigurationProps {
    displayUsers: string[];
    availableUsers: CustomerAdmin[];
    userSubscriptions: Record<string, AlertTypeValue[]>;
    handleAlertTypeToggle: (userId: string, type: AlertTypeValue) => void;
    isEditMode: 'view' | 'edit';
    onSave?: () => void;
    onCancel?: () => void;
    lastSavedUserSubscriptions?: Record<string, AlertTypeValue[]>;
    onRemoveUser?: (userId: string) => void;
}

export const LocationTableConfiguration = ({
    displayUsers,
    availableUsers,
    userSubscriptions,
    handleAlertTypeToggle,
    isEditMode,
    onSave,
    onCancel,
    lastSavedUserSubscriptions = {},
    onRemoveUser
}: LocationTableConfigurationProps) => {

    const handleCancel = () => {
        // Reset subscriptions to last saved state
        if (lastSavedUserSubscriptions) {
            Object.keys(lastSavedUserSubscriptions).forEach(userId => {
                const currentSubs = userSubscriptions[userId] || [];
                const savedSubs = lastSavedUserSubscriptions[userId] || [];

                // Reset each subscription to its last saved state
                currentSubs.forEach(alertType => {
                    if (!savedSubs.includes(alertType)) {
                        handleAlertTypeToggle(userId, alertType);
                    }
                });

                savedSubs.forEach(alertType => {
                    if (!currentSubs.includes(alertType)) {
                        handleAlertTypeToggle(userId, alertType);
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

        displayUsers.forEach(userId => {
            const isCurrentlySelected = userSubscriptions[userId]?.includes(alertType);
            
            if (isChecked && !isCurrentlySelected) {
                // Select this alert type for this user
                handleAlertTypeToggle(userId, alertType);
            } else if (!isChecked && isCurrentlySelected) {
                // Deselect this alert type for this user
                handleAlertTypeToggle(userId, alertType);
            }
        });
    };

    // Check if all users have this alert type selected
    const isAllSelected = (alertType: AlertTypeValue) => {
        return displayUsers.every(userId => 
            userSubscriptions[userId]?.includes(alertType)
        );
    };

    const isAlertTypeSelected = (userId: string, alertType: AlertTypeValue) => {
        return userSubscriptions[userId]?.includes(alertType) || false;
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
                            User
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
                                                        ? `Disable ${config.label} for all users`
                                                        : `Enable ${config.label} for all users`
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
                    {availableUsers.map(user => {
                        return (
                            <tr key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                                {/* User Column */}
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                        {isEditMode === 'edit' && onRemoveUser && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => onRemoveUser(user.user_id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Remove user
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </td>

                                {/* Alert Type Columns */}
                                {Object.entries(alertTypeConfig).map(([type, config]) => (
                                    <td key={type} className="py-4 px-4 text-center">
                                        <button
                                            onClick={() => handleAlertTypeToggle(user.user_id, type as AlertTypeValue)}
                                            disabled={isEditMode === 'view'}
                                            className={`p-2 rounded-lg transition-all ${isEditMode === 'view' ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                                                }`}
                                        >
                                            {isAlertTypeSelected(user.user_id, type as AlertTypeValue) ? (
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

            {availableUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No users available to configure notifications.
                </div>
            )}
        </div>
    );
};