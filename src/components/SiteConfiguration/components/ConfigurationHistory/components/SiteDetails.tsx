import { Bell, Camera, Clock, Hash, MapPin, Tag } from "lucide-react";
import React from "react";
import type {
  CameraData,
  CameraInfo,
  ConfigurationHistoryItem,
  CounterData,
  FunctionalTagData,
  FunctionalTagParameter,
  LocationTagData,
  NotificationConfigData,
  SiteData,
  UsecaseData,
} from "./types";

interface SiteDetailsProps {
  selectedItem: ConfigurationHistoryItem;
  onBack: () => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const hasChanged = (oldVal: any, newVal: any): boolean => {
  if (typeof oldVal === "object" && typeof newVal === "object") {
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  }
  return oldVal !== newVal;
};

const formatArrayValue = (value: any): string => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }
  return value?.toString() || "N/A";
};

const formatBooleanValue = (value: any): string => {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return value?.toString() || "N/A";
};

const safeValue = (value: any, fallback: string = "N/A"): any => {
  if (value === null || value === undefined) {
    return fallback;
  }
  return value;
};

const formatParameterValue = (param: FunctionalTagParameter): string => {
  if (!param.int_params) return "N/A";
  if (Array.isArray(param.int_params)) {
    return param.int_params.join(", ");
  }
  return param.int_params.toString();
};

// ============================================================================
// SPECIALIZED RENDER FUNCTIONS
// ============================================================================

const renderCameraList = (
  cameras: CameraInfo[] | undefined,
  isChanged: boolean,
  isOld: boolean,
) => {
  if (!cameras || cameras.length === 0) {
    return <span className="text-sm text-gray-500">No cameras assigned</span>;
  }

  return (
    <div className="space-y-2">
      {cameras.map((camera, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
            isChanged && !isOld
              ? "border-green-300 bg-green-50"
              : isChanged && isOld
                ? "border-red-300 bg-red-50"
                : "border-gray-200 bg-gray-50"
          }`}
        >
          <Camera className="h-4 w-4 text-gray-600" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{camera.camera_name}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const renderSubscriptions = (subscriptions: any, isChanged: boolean, isOld: boolean) => {
  if (!subscriptions || Object.keys(subscriptions).length === 0) {
    return <span className="text-sm text-gray-500">No subscriptions configured</span>;
  }

  return (
    <div className="space-y-2">
      {Object.entries(subscriptions).map(([cameraName, severities]: [string, any]) => (
        <div
          key={cameraName}
          className={`rounded-lg border p-3 ${
            isChanged && !isOld
              ? "border-green-300 bg-green-50"
              : isChanged && isOld
                ? "border-red-300 bg-red-50"
                : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <Camera className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">{cameraName}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.isArray(severities) &&
              severities.map((severity: string, idx: number) => (
                <span
                  key={idx}
                  className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
                    severity === "critical"
                      ? "bg-red-100 text-red-800"
                      : severity === "high"
                        ? "bg-orange-100 text-orange-800"
                        : severity === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {severity.toUpperCase()}
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const renderHvParams = (params: any, isChanged: boolean, isOld: boolean) => {
  if (!params || params.length === 0) {
    return <span className="text-sm text-gray-500">No parameters configured</span>;
  }

  return (
    <div className="space-y-3">
      {params.map((usecase: any, idx: number) => (
        <div
          key={idx}
          className={`rounded-lg border p-3 ${
            isChanged && !isOld
              ? "border-green-300 bg-green-50"
              : isChanged && isOld
                ? "border-red-300 bg-red-50"
                : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="mb-2 text-sm font-medium text-gray-900">{usecase.uc_name}</div>
          <div className="space-y-1">
            {usecase.parameters.map((param: any, paramIdx: number) => (
              <div key={paramIdx} className="text-xs text-gray-700">
                <span className="font-medium">{param.name}:</span> <span>{param.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const renderFunctionalTagUseCases = (usecases: any, isChanged: boolean, isOld: boolean) => {
  if (!usecases || Object.keys(usecases).length === 0) {
    return <span className="text-sm text-gray-500">No use cases configured</span>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(usecases).map(([usecaseName, usecaseData]: [string, any]) => (
        <div
          key={usecaseName}
          className={`rounded-lg border p-3 ${
            isChanged && !isOld
              ? "border-green-300 bg-green-50"
              : isChanged && isOld
                ? "border-red-300 bg-red-50"
                : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="mb-2 text-sm font-medium text-gray-900">{usecaseName}</div>

          {usecaseData.objects && usecaseData.objects.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 text-xs font-semibold text-gray-600">Objects:</div>
              <div className="flex flex-wrap gap-1">
                {usecaseData.objects.map((obj: [string, boolean], idx: number) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                      obj[1] ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {obj[0]}
                    {obj[1] && <span className="text-green-600">✓</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {usecaseData.parameters && usecaseData.parameters.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold text-gray-600">Parameters:</div>
              <div className="space-y-2">
                {usecaseData.parameters.map((param: FunctionalTagParameter, idx: number) => (
                  <div key={idx} className="rounded border border-gray-200 bg-white p-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">{param.id}</span>
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        {param.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="font-medium">Value:</span>
                      <span className="font-mono">{formatParameterValue(param)}</span>
                      {param.unit && <span className="text-gray-500">({param.unit})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const renderUsecaseObjects = (objects: [string, boolean][]) => {
  if (!objects || objects.length === 0) {
    return <span className="text-sm text-gray-500">No objects configured</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {objects.map((obj: [string, boolean], idx: number) => (
        <span
          key={idx}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
            obj[1] ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {obj[0]}
          {obj[1] && <span className="text-green-600">✓</span>}
        </span>
      ))}
    </div>
  );
};

const renderUsecaseParameters = (parameters: FunctionalTagParameter[]) => {
  if (!parameters || parameters.length === 0) {
    return <span className="text-sm text-gray-500">No parameters configured</span>;
  }

  return (
    <div className="space-y-2">
      {parameters.map((param: FunctionalTagParameter, idx: number) => (
        <div key={idx} className="rounded border border-gray-200 bg-gray-50 p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">{param.id}</span>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {param.type}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">Value:</span>
            <span className="font-mono">{formatParameterValue(param)}</span>
            {param.unit && <span className="text-gray-500">({param.unit})</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// COMPARISON RENDERERS
// ============================================================================

const useCounterComparison = (oldData: any, newData: any) => {
  const oldCounter = oldData as CounterData | null;
  const newCounter = newData as CounterData | null;

  const formatReportingTime = (reportingTime: any): string => {
    if (!reportingTime) return "N/A";
    if (reportingTime.minutes) return `${reportingTime.minutes} minutes`;
    if (reportingTime.interval_value && reportingTime.interval_unit) {
      return `${reportingTime.interval_value} ${reportingTime.interval_unit}`;
    }
    return "N/A";
  };

  const formatResetTime = (resetTime: any): string => {
    if (!resetTime) return "N/A";
    const parts = [resetTime.recurrence, `at ${resetTime.time}`];
    if (resetTime.days_of_week) {
      parts.push(`(Days: ${resetTime.days_of_week.join(", ")})`);
    }
    if (resetTime.day_of_month) {
      parts.push(`(Day: ${resetTime.day_of_month})`);
    }
    return parts.join(" ");
  };

  return [
    {
      label: "Counter Name",
      oldValue: oldCounter?.name || "N/A",
      newValue: newCounter?.name || "N/A",
      type: "text",
    },
    {
      label: "Site Name",
      oldValue: oldCounter?.site_id || "N/A",
      newValue: newCounter?.site_id || "N/A",
      type: "text",
    },
    {
      label: "Count People",
      oldValue: formatBooleanValue(oldCounter?.countPeople),
      newValue: formatBooleanValue(newCounter?.countPeople),
      type: "text",
    },
    {
      label: "People Sub Category",
      oldValue: oldCounter?.peopleSubCategory || "None",
      newValue: newCounter?.peopleSubCategory || "None",
      type: "text",
    },
    {
      label: "Count Vehicle",
      oldValue: formatBooleanValue(oldCounter?.countVehicle),
      newValue: formatBooleanValue(newCounter?.countVehicle),
      type: "text",
    },
    {
      label: "Vehicle Sub Category",
      oldValue: oldCounter?.vehicleSubCategory || "None",
      newValue: newCounter?.vehicleSubCategory || "None",
      type: "text",
    },
    {
      label: "Trigger Condition",
      oldValue: oldCounter?.triggerCondition || "None",
      newValue: newCounter?.triggerCondition || "None",
      type: "text",
    },
    {
      label: "Max Allowed",
      oldValue: safeValue(oldCounter?.maxAllowed, "0"),
      newValue: safeValue(newCounter?.maxAllowed, "0"),
      type: "text",
    },
    {
      label: "Notify Enabled",
      oldValue: formatBooleanValue(oldCounter?.notifyEnabled),
      newValue: formatBooleanValue(newCounter?.notifyEnabled),
      type: "text",
    },
    {
      label: "Cameras",
      oldValue: formatArrayValue(oldCounter?.cameras),
      newValue: formatArrayValue(newCounter?.cameras),
      type: "text",
    },
    {
      label: "Visible",
      oldValue: formatBooleanValue(oldCounter?.visible),
      newValue: formatBooleanValue(newCounter?.visible),
      type: "text",
    },
    {
      label: "Reporting Time",
      oldValue: formatReportingTime(oldCounter?.reporting_time),
      newValue: formatReportingTime(newCounter?.reporting_time),
      type: "text",
    },
    {
      label: "Reset Time",
      oldValue: formatResetTime(oldCounter?.reset_time),
      newValue: formatResetTime(newCounter?.reset_time),
      type: "text",
    },
    {
      label: "Current Occupancy",
      oldValue: safeValue(oldCounter?.current_value?.occupancy, "0"),
      newValue: safeValue(newCounter?.current_value?.occupancy, "0"),
      type: "text",
    },
    {
      label: "Current In Count",
      oldValue: safeValue(oldCounter?.current_value?.in, "0"),
      newValue: safeValue(newCounter?.current_value?.in, "0"),
      type: "text",
    },
    {
      label: "Current Out Count",
      oldValue: safeValue(oldCounter?.current_value?.out, "0"),
      newValue: safeValue(newCounter?.current_value?.out, "0"),
      type: "text",
    },
  ];
};

const useNotificationConfigComparison = (oldData: any, newData: any) => {
  const oldConfig = oldData as NotificationConfigData | null;
  const newConfig = newData as NotificationConfigData | null;

  return [
    {
      label: "Site Name",
      oldValue: oldConfig?.site_id || "N/A",
      newValue: newConfig?.site_id || "N/A",
      type: "text",
    },
    {
      label: "Subscriptions",
      oldValue: oldConfig?.subscriptions || {},
      newValue: newConfig?.subscriptions || {},
      type: "subscriptions",
    },
  ];
};

const useLocationTagComparison = (oldData: any, newData: any) => {
  const oldTag = oldData as LocationTagData | null;
  const newTag = newData as LocationTagData | null;

  return [
    {
      label: "Tag Name",
      oldValue: oldTag?.name || "N/A",
      newValue: newTag?.name || "N/A",
      type: "text",
    },
    {
      label: "Site Name",
      oldValue: oldTag?.site_name || "N/A",
      newValue: newTag?.site_name || "N/A",
      type: "text",
    },
    {
      label: "Cameras",
      oldValue: oldTag?.cameras || [],
      newValue: newTag?.cameras || [],
      type: "camera_list",
    },
  ];
};

const useUsecaseComparison = (oldData: any, newData: any) => {
  const oldUsecase = oldData as UsecaseData | null;
  const newUsecase = newData as UsecaseData | null;

  return [
    {
      label: "Usecase Name",
      oldValue: oldUsecase?.name || "N/A",
      newValue: newUsecase?.name || "N/A",
      type: "text",
    },
    {
      label: "Usecase Type",
      oldValue: (oldUsecase as any)?.type || "N/A",
      newValue: (newUsecase as any)?.type || "N/A",
      type: "text",
    },
    {
      label: "Site Name",
      oldValue: oldUsecase?.site_id || "N/A",
      newValue: newUsecase?.site_id || "N/A",
      type: "text",
    },
    {
      label: "Functional Tag",
      oldValue: oldUsecase?.func_tag_name || "N/A",
      newValue: newUsecase?.func_tag_name || "N/A",
      type: "text",
    },
    {
      label: "Camera Name",
      oldValue: oldUsecase?.camera_id || "N/A",
      newValue: newUsecase?.camera_id || "N/A",
      type: "text",
    },
    {
      label: "ROIs",
      oldValue: formatArrayValue((oldUsecase as any)?.rois),
      newValue: formatArrayValue((newUsecase as any)?.rois),
      type: "text",
    },
    {
      label: "Count Notify",
      oldValue: formatBooleanValue(oldUsecase?.count_notify),
      newValue: formatBooleanValue(newUsecase?.count_notify),
      type: "text",
    },
    {
      label: "Objects",
      oldValue: oldUsecase?.objects || [],
      newValue: newUsecase?.objects || [],
      type: "usecase_objects",
    },
    {
      label: "Parameters",
      oldValue: oldUsecase?.parameters || [],
      newValue: newUsecase?.parameters || [],
      type: "usecase_parameters",
    },
  ];
};

const useSiteComparison = (oldData: any, newData: any) => {
  const oldSite = oldData as SiteData | null;
  const newSite = newData as SiteData | null;

  const fields = [
    {
      label: "Site Name",
      oldValue: oldSite?.name || "N/A",
      newValue: newSite?.name || "N/A",
      type: "text",
    },
    {
      label: "Country",
      oldValue: oldSite?.country || "N/A",
      newValue: newSite?.country || "N/A",
      type: "text",
    },
    {
      label: "City",
      oldValue: oldSite?.city || "N/A",
      newValue: newSite?.city || "N/A",
      type: "text",
    },
    {
      label: "Address",
      oldValue: oldSite?.address || "N/A",
      newValue: newSite?.address || "N/A",
      type: "text",
    },
    {
      label: "Manager",
      oldValue: oldSite?.manager || "N/A",
      newValue: newSite?.manager || "N/A",
      type: "text",
    },
    {
      label: "Staff Count",
      oldValue: safeValue(oldSite?.staff_count, "0"),
      newValue: safeValue(newSite?.staff_count, "0"),
      type: "text",
    },
    {
      label: "Number of Vehicles",
      oldValue: safeValue(oldSite?.no_of_vehicle, "0"),
      newValue: safeValue(newSite?.no_of_vehicle, "0"),
      type: "text",
    },
    {
      label: "Edge Device ID",
      oldValue: oldSite?.edge_device_id || "N/A",
      newValue: newSite?.edge_device_id || "N/A",
      type: "text",
    },
    {
      label: "Real Edge Device ID",
      oldValue: oldSite?.real_edge_device_id || "N/A",
      newValue: newSite?.real_edge_device_id || "N/A",
      type: "text",
    },
    {
      label: "Automation Edge ID",
      oldValue: oldSite?.automation_edge_id || "N/A",
      newValue: newSite?.automation_edge_id || "N/A",
      type: "text",
    },
    {
      label: "Cameras",
      oldValue: formatArrayValue(oldSite?.cameras),
      newValue: formatArrayValue(newSite?.cameras),
      type: "text",
    },
    {
      label: "Functional Tags",
      oldValue: formatArrayValue(oldSite?.func_tags),
      newValue: formatArrayValue(newSite?.func_tags),
      type: "text",
    },
    {
      label: "Is Offline",
      oldValue: formatBooleanValue(oldSite?.is_offline),
      newValue: formatBooleanValue(newSite?.is_offline),
      type: "text",
    },
    {
      label: "Is Offline (Real)",
      oldValue: formatBooleanValue(oldSite?.is_offline_real),
      newValue: formatBooleanValue(newSite?.is_offline_real),
      type: "text",
    },
    {
      label: "Edge Status",
      oldValue: oldSite?.edge_status || "N/A",
      newValue: newSite?.edge_status || "N/A",
      type: "text",
    },
    {
      label: "Edge Error",
      oldValue: oldSite?.edge_error || "N/A",
      newValue: newSite?.edge_error || "N/A",
      type: "text",
    },
    {
      label: "Last Heartbeat",
      oldValue: oldSite?.last_heartbeat || "N/A",
      newValue: newSite?.last_heartbeat || "N/A",
      type: "text",
    },
    {
      label: "Real Last Heartbeat",
      oldValue: oldSite?.real_last_heartbeat || "N/A",
      newValue: newSite?.real_last_heartbeat || "N/A",
      type: "text",
    },
    {
      label: "Automation Last Heartbeat",
      oldValue: oldSite?.automation_last_heartbeat || "N/A",
      newValue: newSite?.automation_last_heartbeat || "N/A",
      type: "text",
    },
    {
      label: "Last Sync",
      oldValue: oldSite?.last_sync || "N/A",
      newValue: newSite?.last_sync || "N/A",
      type: "text",
    },
    {
      label: "Site Image URL",
      oldValue: oldSite?.site_image_url || "N/A",
      newValue: newSite?.site_image_url || "N/A",
      type: "text",
    },
    {
      label: "Anonymisation - Face",
      oldValue: formatBooleanValue(oldSite?.anonymisation_controls?.people?.face),
      newValue: formatBooleanValue(newSite?.anonymisation_controls?.people?.face),
      type: "text",
    },
    {
      label: "Anonymisation - Full Body",
      oldValue: formatBooleanValue(oldSite?.anonymisation_controls?.people?.full_body),
      newValue: formatBooleanValue(newSite?.anonymisation_controls?.people?.full_body),
      type: "text",
    },
    {
      label: "Anonymisation - Number Plate",
      oldValue: formatBooleanValue(oldSite?.anonymisation_controls?.numberplate),
      newValue: formatBooleanValue(newSite?.anonymisation_controls?.numberplate),
      type: "text",
    },
  ];

  if (oldSite?.hv_usecase_parameters || newSite?.hv_usecase_parameters) {
    fields.push({
      label: "HV Usecase Parameters",
      oldValue: oldSite?.hv_usecase_parameters || [],
      newValue: newSite?.hv_usecase_parameters || [],
      type: "hv_params",
    });
  }

  return fields;
};

const useCameraComparison = (oldData: any, newData: any) => {
  const oldCamera = oldData as CameraData | null;
  const newCamera = newData as CameraData | null;

  return [
    {
      label: "Camera Name",
      oldValue: oldCamera?.name || "N/A",
      newValue: newCamera?.name || "N/A",
      type: "text",
    },
    {
      label: "Camera IP",
      oldValue: oldCamera?.camera_ip || "N/A",
      newValue: newCamera?.camera_ip || "N/A",
      type: "text",
    },
    {
      label: "Edge Device ID",
      oldValue: oldCamera?.edge_device_id || "N/A",
      newValue: newCamera?.edge_device_id || "N/A",
      type: "text",
    },
    {
      label: "Site Name",
      oldValue: oldCamera?.site_name || "N/A",
      newValue: newCamera?.site_name || "N/A",
      type: "text",
    },
    {
      label: "Height",
      oldValue: safeValue(oldCamera?.height, "0"),
      newValue: safeValue(newCamera?.height, "0"),
      type: "text",
    },
    {
      label: "Width",
      oldValue: safeValue(oldCamera?.width, "0"),
      newValue: safeValue(newCamera?.width, "0"),
      type: "text",
    },
    {
      label: "Location Tags",
      oldValue: formatArrayValue(oldCamera?.location_tags),
      newValue: formatArrayValue(newCamera?.location_tags),
      type: "text",
    },
    {
      label: "Use Case IDs",
      oldValue: formatArrayValue(oldCamera?.usecase_ids),
      newValue: formatArrayValue(newCamera?.usecase_ids),
      type: "text",
    },
    {
      label: "Stream URL",
      oldValue: oldCamera?.physical_attributes?.stream_url || "N/A",
      newValue: newCamera?.physical_attributes?.stream_url || "N/A",
      type: "text",
    },
    {
      label: "Camera Image URL",
      oldValue: oldCamera?.camera_image_url || "N/A",
      newValue: newCamera?.camera_image_url || "N/A",
      type: "text",
    },
    {
      label: "Video URL",
      oldValue: oldCamera?.video_url || "N/A",
      newValue: newCamera?.video_url || "N/A",
      type: "text",
    },
    {
      label: "Default Media",
      oldValue: oldCamera?.default_media || "N/A",
      newValue: newCamera?.default_media || "N/A",
      type: "text",
    },
    {
      label: "Media History",
      oldValue: formatArrayValue(oldCamera?.media_history),
      newValue: formatArrayValue(newCamera?.media_history),
      type: "text",
    },
  ];
};

const useFunctionalTagComparison = (oldData: any, newData: any) => {
  const oldTag = oldData as FunctionalTagData | null;
  const newTag = newData as FunctionalTagData | null;

  return [
    {
      label: "Tag Name",
      oldValue: oldTag?.name || "N/A",
      newValue: newTag?.name || "N/A",
      type: "text",
    },
    {
      label: "Site ID",
      oldValue: oldTag?.site_id || "N/A",
      newValue: newTag?.site_id || "N/A",
      type: "text",
    },
    {
      label: "Use Cases",
      oldValue: oldTag?.usecases || {},
      newValue: newTag?.usecases || {},
      type: "functional_tag_usecases",
    },
  ];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SiteDetails: React.FC<SiteDetailsProps> = ({ selectedItem, onBack }) => {
  if (!selectedItem) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">No configuration item selected</p>
      </div>
    );
  }

  // Determine entity type
  const entityType = selectedItem.entity_type;
  const isSiteEntity = entityType === "site";
  const isCameraEntity = entityType === "camera";
  const isNotificationConfigEntity = entityType === "notification_config";
  const isLocationTagEntity = entityType === "location_tag";
  const isUsecaseEntity = entityType === "usecase";
  const isCounterEntity = entityType === "counter";

  const oldData = selectedItem.old_data;
  const newData = selectedItem.new_data;

  // Check if this is a deletion or creation
  const isDeleted = oldData && !newData;
  const isCreated = !oldData && newData;

  // Get comparison fields based on entity type
  const comparisonFields = isNotificationConfigEntity
    ? useNotificationConfigComparison(oldData, newData)
    : isLocationTagEntity
      ? useLocationTagComparison(oldData, newData)
      : isUsecaseEntity
        ? useUsecaseComparison(oldData, newData)
        : isCounterEntity
          ? useCounterComparison(oldData, newData)
          : isSiteEntity
            ? useSiteComparison(oldData, newData)
            : isCameraEntity
              ? useCameraComparison(oldData, newData)
              : useFunctionalTagComparison(oldData, newData);

  // Get entity metadata
  const getEntityMetadata = () => {
    const metadata = {
      name: "",
      icon: null as React.ReactNode,
    };

    switch (entityType) {
      case "notification_config":
        metadata.name = "Notification Config";
        metadata.icon = <Bell className="h-5 w-5 text-gray-500" />;
        break;
      case "location_tag":
        metadata.name = "Location Tag";
        metadata.icon = <MapPin className="h-5 w-5 text-gray-500" />;
        break;
      case "usecase":
        metadata.name = "Use Case";
        metadata.icon = <Tag className="h-5 w-5 text-gray-500" />;
        break;
      case "counter":
        metadata.name = "Counter";
        metadata.icon = <Hash className="h-5 w-5 text-gray-500" />;
        break;
      case "site":
        metadata.name = "Site";
        metadata.icon = <MapPin className="h-5 w-5 text-gray-500" />;
        break;
      case "camera":
        metadata.name = "Camera";
        metadata.icon = <Camera className="h-5 w-5 text-gray-500" />;
        break;
      case "functional_tag":
        metadata.name = "Functional Tag";
        metadata.icon = <Tag className="h-5 w-5 text-gray-500" />;
        break;
      default:
        metadata.name = "Unknown";
        metadata.icon = <Tag className="h-5 w-5 text-gray-500" />;
    }

    return metadata;
  };

  const entityMetadata = getEntityMetadata();

  const getChangeTitle = () => {
    if (isDeleted) return `${entityMetadata.name} Deleted`;
    if (isCreated) return `${entityMetadata.name} Created`;
    return `${entityMetadata.name} Details Updated`;
  };

  // Render value based on field type
  const renderFieldValue = (field: any, isOldValue: boolean) => {
    // For deleted items, show oldValue on left panel, for created items show newValue on left panel
    // For updates, show newValue on left (current) and oldValue on right (previous)
    let value;
    if (isDeleted) {
      value = isOldValue ? null : field.oldValue; // Left panel shows old data, right panel shows nothing
    } else if (isCreated) {
      value = isOldValue ? null : field.newValue; // Left panel shows new data, right panel shows nothing
    } else {
      value = isOldValue ? field.oldValue : field.newValue; // Normal comparison
    }

    const changed = hasChanged(field.oldValue, field.newValue);
    const fieldType = field.type || "text";
    const isLongValue = value?.toString().length > 100;

    switch (fieldType) {
      case "subscriptions":
        return renderSubscriptions(value, changed, isOldValue);
      case "hv_params":
        return renderHvParams(value, changed, isOldValue);
      case "camera_list":
        return renderCameraList(value, changed, isOldValue);
      case "functional_tag_usecases":
        return renderFunctionalTagUseCases(value, changed, isOldValue);
      case "usecase_objects":
        return renderUsecaseObjects(value);
      case "usecase_parameters":
        return renderUsecaseParameters(value);
      default:
        return (
          <div
            className={`text-sm ${
              changed && !isDeleted && !isCreated && !isOldValue
                ? "rounded bg-green-100 px-3 py-2 font-medium text-gray-900"
                : changed && !isDeleted && !isCreated && isOldValue
                  ? "rounded bg-red-100 px-3 py-2 font-medium text-gray-900"
                  : "text-gray-900"
            } ${isLongValue ? "break-all" : ""}`}
          >
            {value?.toString() || "N/A"}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/50">
        <div className="mx-auto max-w-full px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <button onClick={onBack} className="transition-colors hover:text-blue-600">
              Configuration History
            </button>
            <span>/</span>
            <span className="font-medium text-gray-900">{getChangeTitle()}</span>
          </nav>

          {/* Configuration Details Bar */}
          <div className="mb-6 py-4">
            <div className="flex items-center gap-8 text-sm">
              {/* Site Info */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">{selectedItem.site}</span>
              </div>
              <span className="h-4 w-px bg-gray-300" />

              {/* Camera Info */}
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">{selectedItem.camera}</span>
              </div>
              <span className="h-4 w-px bg-gray-300" />

              {/* User Info */}
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-200 text-xs font-medium text-purple-800">
                  {selectedItem.user.initials}
                </div>
                <span className="font-medium text-gray-900">{selectedItem.user.name}</span>
              </div>
              <span className="h-4 w-px bg-gray-300" />

              {/* Timestamp */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{selectedItem.timestamp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-auto mx-auto px-6 py-8">
        {/* Comparison View */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* New Values / Current Values */}
          {/* New Values / Current Values */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                {isDeleted ? (
                  <>
                    <span className="text-red-600">Before Deletion</span>
                  </>
                ) : isCreated ? (
                  <>
                    <span className="text-gray-600">After Creation</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-600">New</span>
                    <span className="text-xs font-normal text-gray-500">(Current State)</span>
                  </>
                )}
              </h3>
            </div>
            <div className="max-h-[calc(100vh-300px)] space-y-4 overflow-y-auto p-6">
              {comparisonFields.map((field, index) => {
                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 border-b border-gray-100 pb-4 last:border-0"
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2">
                        <span className="text-sm font-semibold text-gray-900">{field.label}</span>
                      </div>
                      {renderFieldValue(field, false)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Old Values / Previous Values */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                {isDeleted ? (
                  <>
                    <span className="text-gray-400">N/A (Deleted)</span>
                  </>
                ) : isCreated ? (
                  <>
                    <span className="text-gray-400">N/A (Created)</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-600">Old</span>
                    <span className="text-xs font-normal text-gray-500">(Previous State)</span>
                  </>
                )}
              </h3>
            </div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-6">
              {isDeleted || isCreated ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="mb-4 rounded-full bg-gray-100 p-4">
                    {isDeleted ? (
                      <svg
                        className="h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    )}
                  </div>
                  <p className="text-center text-sm font-medium text-gray-700">
                    {isDeleted ? "Entity Deleted" : "New Entity Created"}
                  </p>
                  <p className="mt-1 text-center text-xs text-gray-500">
                    {isDeleted ? "No current data available" : "No previous data available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comparisonFields.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 border-b border-gray-100 pb-4 last:border-0"
                    >
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-gray-900">{field.label}</span>
                        </div>
                        {renderFieldValue(field, true)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteDetails;
