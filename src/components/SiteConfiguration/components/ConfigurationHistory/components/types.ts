// Types for audit logs
export interface PhysicalAttributes {
  stream_url: string;
}

export interface AnonymisationControls {
  people: {
    face: boolean;
    full_body: boolean;
  };
  numberplate: boolean;
}

export interface HvUsecaseParameter {
  uc_name: string;
  parameters: {
    name: string;
    value: number | string;
  }[];
}

export interface EdgeStatusDiff {
  edge_status: string;
  edge_error: string;
}

export interface CameraData {
  _id: string;
  name: string;
  camera_ip: string;
  edge_device_id: string;
  site_id: string;
  customer_id: string;
  height: number;
  width: number;
  location_tags: string[];
  usecase_ids: string[];
  physical_attributes: PhysicalAttributes;
  camera_image_url: string;
  media_history: string[];
  default_media: string | null;
  calibration: any | null;
  video_url?: string;
  site_name?: string;
}

export interface SiteData {
  _id: string;
  customer_id: string;
  edge_device_id: string;
  staff_count: number;
  no_of_vehicle: number;
  name: string;
  city: string;
  country: string;
  address: string | null;
  cameras: string[];
  manager: string | null;
  site_image_url: string | null;
  func_tags: string[];
  last_sync: string | null;
  last_sync_configs: any | null;
  last_heartbeat: string | null;
  edge_status: string | null;
  edge_status_updated_at: string | null;
  edge_error: string | null;
  last_edge_status_msg: EdgeStatusDiff | null;
  is_offline?: boolean;
  real_edge_device_id: string;
  anonymisation_controls?: AnonymisationControls;
  automation_edge_id?: string | null;
  real_last_heartbeat?: string | null;
  automation_last_heartbeat?: string | null;
  id?: string;
  is_offline_real?: boolean;
  hv_usecase_parameters?: HvUsecaseParameter[];
}

export interface FunctionalTagData {
  _id: string;
  name: string;
  site_id: string;
  usecases: {
    [key: string]: {
      objects: [string, boolean][];
      parameters: FunctionalTagParameter[];
    };
  };
}

export interface FunctionalTagParameter {
  id: string;
  type: "range" | "dropdown";
  int_params?: number | number[] | string[];
  unit?: string;
}

export interface UsecaseData {
  name: string;
  count_notify: boolean;
  customer_id: string;
  site_id: string;
  func_tag: string;
  func_tag_name: string;
  camera_id: string;
  objects: [string, boolean][];
  parameters: FunctionalTagParameter[];
}

export interface NotificationConfigData {
  _id: string;
  user_id: string;
  site_id: string;
  subscriptions: {
    [key: string]: string[];
  };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CameraInfo {
  camera_id: string;
  camera_name: string;
}

export interface LocationTagData {
  _id: string;
  name: string;
  site_id: string;
  site_name: string;
  cameras: CameraInfo[];
}

// Counter Types
export interface CounterReportingTime {
  minutes?: number;
  interval_value?: number;
  interval_unit?: string;
}

export interface CounterResetTime {
  recurrence: "daily" | "weekly" | "monthly" | "yearly";
  time: string;
  days_of_week: number[] | null;
  day_of_month: number | null;
  month_and_day: { month: number; day: number } | null;
}

export interface CounterCurrentValue {
  in: number;
  out: number;
  occupancy: number;
}

export interface CounterData {
  _id: string;
  site_id: string;
  name: string;
  countPeople: boolean;
  peopleSubCategory: string;
  countVehicle: boolean;
  vehicleSubCategory: string;
  triggerCondition: string | null;
  maxAllowed: number;
  notifyEnabled: boolean;
  cameras: string[];
  visible: boolean;
  reporting_time: CounterReportingTime;
  reset_time: CounterResetTime;
  current_value: CounterCurrentValue;
}

interface BaseAuditLogEntry {
  _id: string;
  entity_type: string;
  site_name: string;
  changed_by: string;
  timestamp: string;
  changes: string;
}

export interface CameraAuditLogEntry extends BaseAuditLogEntry {
  entity_type: "camera";
  camera_name: string;
  old_data: CameraData | null;
  new_data: CameraData | null;
}

export interface SiteAuditLogEntry extends BaseAuditLogEntry {
  entity_type: "site";
  camera_name?: string;
  old_data: SiteData | null;
  new_data: SiteData | null;
}

export interface FunctionalTagAuditLogEntry extends BaseAuditLogEntry {
  entity_type: "functional_tag";
  camera_name?: string;
  old_data: FunctionalTagData | null;
  new_data: FunctionalTagData | null;
}

export interface UsecaseAuditLogEntry extends BaseAuditLogEntry {
  entity_type: "usecase";
  camera_name: string;
  old_data: UsecaseData | null;
  new_data: UsecaseData | null;
}

export interface NotificationConfigAuditLogEntry extends BaseAuditLogEntry {
  entity_type: "notification_config";
  camera_name: null;
  old_data: NotificationConfigData | null;
  new_data: NotificationConfigData | null;
}

export interface LocationTagAuditLogEntry extends BaseAuditLogEntry {
  entity_type: "location_tag";
  camera_name: null;
  old_data: LocationTagData | null;
  new_data: LocationTagData | null;
}

export interface CounterAuditLogEntry extends BaseAuditLogEntry {
  entity_type: "counter";
  camera_name: null;
  old_data: CounterData | null;
  new_data: CounterData | null;
}

export type AuditLogEntry =
  | CameraAuditLogEntry
  | SiteAuditLogEntry
  | FunctionalTagAuditLogEntry
  | UsecaseAuditLogEntry
  | NotificationConfigAuditLogEntry
  | LocationTagAuditLogEntry
  | CounterAuditLogEntry;

export interface AuditLogResponse {
  data: AuditLogEntry[];
  count: number;
}

// UI Component Types
export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  sortable?: boolean;
  filterable?: boolean;
  width: number;
  resizable: boolean;
}

export interface FilterState {
  searchQuery: string;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  changes: string[];
  user: string[];
  site: string[];
  camera: string[];
}

// Transformed data for UI display
export interface ConfigurationHistoryItem {
  id: string;
  timestamp: string;
  changes: string;
  user: {
    name: string;
    initials: string;
  };
  site: string;
  camera: string;
  entity_type:
    | "site"
    | "camera"
    | "functional_tag"
    | "usecase"
    | "notification_config"
    | "location_tag"
    | "counter";
  old_data:
    | SiteData
    | CameraData
    | FunctionalTagData
    | UsecaseData
    | NotificationConfigData
    | LocationTagData
    | CounterData
    | null;
  new_data:
    | SiteData
    | CameraData
    | FunctionalTagData
    | UsecaseData
    | NotificationConfigData
    | LocationTagData
    | CounterData
    | null;
}
