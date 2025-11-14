/* =================================================================== *
 *  Global "types.ts"
 *  ------------------------------------------------------------------ *
 *  All shared DTO / domain types for the React‑client + API layer.    *
 *  Keeps the whole front‑end on a single, canonical set of shapes.    *
 * =================================================================== */

/* ------------------------------------------------------------------- *
 *  Enums
 * ------------------------------------------------------------------- */

export enum SeverityEnum {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ActionStatusEnum {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

/* ------------------------------------------------------------------- *
 *  Helpers
 * ------------------------------------------------------------------- */
export interface Coordinate {
  x: number;
  y: number;
}

/* ------------------------------------------------------------------- *
 *  Auth
 * ------------------------------------------------------------------- */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  customer_id: string;
  name: string;
  industry: string;
  logo: string; // Company logo URL
  customer_name: string;
  // image_url?: string; // 👈 Optional user's profile image
  email: string;
  role?: string;
  phone?: string;
  id: string;
  timezone?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  new_password: string;
  name?: string; // optional
}

export interface ResetPasswordResponse {
  message: string;
}

// New Interface for SignUp
export interface SetPasswordRequest {
  email: string;
  name: string;
  new_password: string;
  otp: string;
  terms_accepted: boolean;
}

export interface SetPasswordResponse {
  message: string;
}

/* ------------------------------------------------------------------- *
 *  Customer
 * ------------------------------------------------------------------- */
export interface CustomerSchema {
  name: string;
  industry: string;
  logo_url: string;
  license_count: number;
  allowed_ucs: string[];
  boundary_usecase?: string[];
  cameras: string[];
  sites: string[];
  super_admins: string[];
  admins: string[];
  consumers: string[];
  created_at?: string;
  is_snapshot?: {
    [key: string]: {
      snapshot: boolean;
      video: boolean;
    };
  };
}

export interface CustomerResponse extends CustomerSchema {
  id: string;
}

/* ------------------------------------------------------------------- *
 *  Customer Snapshot/Video Configuration
 * ------------------------------------------------------------------- */
export interface UpdateSnapshotVideoRequest {
  usecase_name: string;
  snapshot: boolean;
  video: boolean;
}

export interface UpdateSnapshotVideoResponse {
  message: string;
  customer_id: string;
  usecase_name: string;
  snapshot: boolean;
  video: boolean;
}

/* ------------------------------------------------------------------- *
 *  User
 * ------------------------------------------------------------------- */

export interface UpdateUserSchema {
  name?: string;
  phone?: string;
  timezone?: string;
  job_title?: string;
  role?: string;
  sites?: string[];
  location_tags?: string[];
  // image_url: string;
}

export interface SaveUserPreferencesSchema {
  customer_id: string;
  user_id: string;
  event_table_columns: {
    column_order: string[];
    column_visibility: Record<string, boolean>;
    rows_per_page: number;
  };
}

export interface GetUserPreferencesResponse {
  email: string;
  password: string;
  created_at: string;
  otp: string;
  otp_expiry: string;
  name: string;
  customer_id: string;
  phone: string;
  image_url: string | null;
  role: string;
  timeZone: string | null;
  timezone: string;
  user_id: string;
  is_active: boolean;
  event_table_columns: {
    column_order: string[];
    column_visibility: Record<string, boolean>;
    rows_per_page: number;
  };
}

/* ------------------------------------------------------------------- *
 *  Site
 * ------------------------------------------------------------------- */

export enum EdgeStatus {
  REFRESHING_SAS_TOKEN = "refreshing_sas_token",
  CONFIG_RECEIVED = "config_received",
  CONFIG_PARSE_FAILED = "config_parse_failed",
  PIPELINE_STARTING = "pipeline_starting",
  PIPELINE_BUILDING = "pipeline_building",
  PIPELINE_RUNNING = "pipeline_running",
  CAMERAS_CONNECTED = "cameras_connected",
  PIPELINE_TERMINATED = "pipeline_terminated",
  PIPELINE_IDLE = "pipeline_idle",
  MQTT_ERROR = "mqtt_error",
  PIPELINE_START_FAILED = "pipeline_start_failed",
  PIPELINE_BROKEN = "pipeline_broken",
  CAMERA_CONNECTION_FAILED = "camera_connection_failed",
  LOW_DISK_SPACE = "low_disk_space",
  HIGH_CPU_LOAD = "high_cpu_load",
  HIGH_GPU_LOAD = "high_gpu_load",
}

export type EdgeStatusMsg = {
  edge_status: EdgeStatus;
  edge_error: string;
};

export interface RunningUseCase {
  usecase_name: string;
  parameters: any[];
  rois: string[];
}

export interface CameraUseCase {
  camera_name: string;
  usecases: RunningUseCase[];
}

export interface SiteSchema {
  id: string;
  customer_id: string;
  edge_device_id: string;
  staff_count: number;
  no_of_vehicle: number;
  name: string;
  city: string;
  country: string;
  address?: string | null;
  cameras: string[] | null;
  manager?: string | null;
  site_image_url?: string | null;
  func_tags: string[];
  last_sync?: string;
  last_sync_configs?: Record<string, any>;
  last_heartbeat?: string | "";
  edge_status?: EdgeStatus;
  edge_status_updated_at?: string;
  edge_error?: string | null;
  last_edge_status_msg?: EdgeStatusMsg;
  cloud_edge_id?: string;
  real_edge_device_id?: string;
  real_last_heartbeat?: string;
  automation_last_heartbeat?: string;
  anonymisation_controls?: AnonymisationControls;
  running_usecases?: CameraUseCase[];
}

// New interfaces for anonymisation controls
export interface AnonymisationControls {
  people: {
    face: boolean;
    full_body: boolean;
  };
  numberplate: boolean;
}

export interface SiteResponse extends SiteSchema {
  id: string;
}

/* ------------------------------------------------------------------- *
 *  Camera
 * ------------------------------------------------------------------- */
export interface CameraSchema {
  name: string;
  camera_ip: string | null;
  edge_device_id: string;
  site_id: string;
  customer_id: string;
  height: number;
  width: number;
  is_virtual: boolean;
  is_running: boolean;
  location_tags: string[];
  usecase_ids?: string[];
  physical_attributes?: Record<string, any>;
  rois?: string[] | null;
  camera_image_url?: string | null;
  video_url?: string;
  media_history?: string[] | null;
  calibration?: string;
  default_media?: string | null; // URL to default media (image/video)
}

export interface CameraResponse extends CameraSchema {
  id: string;
  warning?: string | null; // Warning message for metadata extraction issues
}

// Response interface for addMediaHistory operation
export interface AddMediaHistoryResponse {
  warning?: string | null; // Warning message for metadata extraction issues
  message?: string;
}

/* ------------------------------------------------------------------- *
 *  USE‑CASE PARAMETER CANONICAL UNION
 * ------------------------------------------------------------------- */
export type ParamKind = "range" | "dropdown";

export interface UseCaseParamBase {
  /**
   * Logical identifier of the parameter – shown in UI.
   * (In legacy payloads this was sometimes called “name” or “id”.)
   */
  id: string;
  type: ParamKind;
  unit?: string;
}

export interface UseCaseParamRange extends UseCaseParamBase {
  id: string;
  type: "range";
  int_params?: [number, number];
  unit?: string;
}

export interface UseCaseParamDropdown extends UseCaseParamBase {
  id: string;
  type: "dropdown";
  int_params?: string[];
  unit?: string;
}

export type UseCaseParam = UseCaseParamRange | UseCaseParamDropdown;

/* ------------------------------------------------------------------- *
 *  Use‑Case Core – shared by DTOs & forms
 * ------------------------------------------------------------------- */
export type UseCaseObject = [name: string, notify: boolean];

export interface UseCaseCore {
  name: string;
  type: string;
  objects: UseCaseObject[];
  parameters: UseCaseParam[];
  count_notify: boolean;
  customer_id: string;
  site_id: string;
  camera_id: string;
  rois: string[];
  func_tag: string;
  func_tag_name: string;
  created_at: string;
  edit_history?: EditEntry[] | null;
  camera?: CameraSchema | null;
}

export interface UseCaseResponse extends UseCaseCore {
  id: string;
}

export interface UseCaseSchema {
  name: string;
  type: string;
  objects?: {}[];
  parameters?: {};
  count_notify: boolean;
  customer_id: string;
  site_id: string;
  camera_id: string;
  rois: string[];
  func_tag: string;
  func_tag_name: string;
  edit_history?: EditEntry[] | null;
  camera?: CameraSchema | null;
}

/* ------------------------------------------------------------------- *
 *  ROI
 * ------------------------------------------------------------------- */
export interface ROISchema {
  camera_id: string;
  name?: string | null;
  coordinates: Coordinate[];
  is_full_view?: boolean;
  func_tag_ids?: string[] | null;
  ucs_running?: string[] | null;
  created_at?: string;
}

export interface ROIResponse extends ROISchema {
  id: string;
}

/* For backwards compatibility with old API helpers */
export type ROICreate = ROISchema;
export type ROIUpdate = Partial<ROISchema>;

/* ------------------------------------------------------------------- *
 *  Events
 * ------------------------------------------------------------------- */
export type ActionTaken = [string | null, string | null]; // [action, timestamp]

export interface EventSchema {
  _id: string;
  site_id: string;
  camera_id: string;
  uc_id: string;
  time_created: string;
  severity: SeverityEnum;
  real_virtual: string;
  count: number;
  media_link: string;
  additional_info: {
    func_tag: string;
    func_tag_name: string;
    uc_type: string;
  };
  time_received: string;
  time_seen?: string | null;
  comments: string[];
  status: StatusEnum;
  action_id: string | null;
  b_video_url?: string | null;
  video_url?: string | null;
}

export interface EventResponse extends EventSchema {
  id: string;
  uc_type: string;
}

export type DateFilterEnum = 
  | 'today' 
  | 'yesterday' 
  | 'last_7_days' 
  | 'last_30_days' 
  | 'last_90_days' 
  | 'last_365_days' 
  | null;
export type SortOrderEnum = "asc" | "desc";
export type StatusEnum = "Logged" | "Notified" | "Seen" | "Invalid" | string;

// Updated type for event table filters to match backend parameters
export interface EventTableFilters {
  // Date filtering
  date_filter?: DateFilterEnum;
  from_date?: string | null;
  to_date?: string | null;

  // Multiple selection filters (arrays on frontend, sent as comma-separated to backend)
  site_ids?: string[] | null;
  camera_ids?: string[] | null;
  uc_types?: string[] | null;
  severities?: string[] | null;
  statuses?: string[] | null;
  action_statuses?: string[] | null;
  location_tags?: string[] | null;
  // Pagination and sorting
  page_no?: number;
  page_size?: number | null;
  sort_order?: SortOrderEnum;

  // Required for API calls
  customer_id?: string;
  timezone?: string | null;
  last_event_id?: string | null;
  env?: string;
  user_id?: string | null;
}

// Header API response structure
export interface EventHeaderResponse {
  Headers: {
    sites: { id: string; name: string }[];
    cameras: { id: string; name: string }[];
    useCases: string[];
    locationTags: string[];
    actions: string[];
    statuses: string[];
    severities: string[];
  };
}

// Header API request parameters
export interface EventHeaderParams {
  customer_id: string; // Required
  site_ids?: string | null; // Comma-separated site IDs
  camera_ids?: string | null; // Comma-separated camera IDs
}

// Frontend state management - simplified for UI
export interface EventFilters {
  sites: string[];
  useCases: string[];
  cameras: string[];
  locationTags: string[];
  functionalTags: string[];
  actions: string[];
  statuses: string[];
  severities: string[];
  comments: string[];
  actionsTaken: string[];
  mailReceivers: string[];
  details: string[];
  dateFilter: DateFilterEnum;
  dateRange: { start: string; end: string } | null;
  extraInfo: string[];
}

// UI column configuration
export interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  resizable: boolean;
  visible: boolean;
}

// Transformed data for table display
export interface EventData {
  Sno: number;
  event_id: string;
  site_id: string;
  site_name: string;
  camera_id: string;
  camera_name: string;
  uc_type: string;
  time_created: string;
  severity: string;
  status: string;
  action_status: string | null;
  location_tags: string[];
  functional_tag: string | null;
  details: string[] | Record<string, any> | null;
  [key: string]: any;
  extra_info?: {
    ppm?: number;
    bbox_width?: number;
    bbox_height?: number;
    [key: string]: any;
  } | null;
}

// Filter parameters interface
export interface EventSiteFilterParams {
  date_filter?: DateFilterEnum | null;
  from_date?: string | null;
  to_date?: string | null;
  site_id?: string | null;
  camera_id?: string | null;
  severity?: string | null;
  action_status?: string | null;
  status?: string | null;
  uc_type?: string | null;
  page_no?: number;
  page_size?: number;
  sort_order?: "asc" | "desc" | null;
  timezone?: string | null;
}

export interface EventSiteResponse {
  total_events: number;
  event_ids: string[];
}

// Updated table entry
export interface EventTableEntry {
  s_no: number;
  event_id: string;
  site_id: string;
  site_name: string;
  camera_id: string;
  camera_name: string;
  uc_type: string;
  time_created: string;
  severity: string;
  status: string;
  action_status: string | null;
  location_tags: string[];
  extra_info?: {
    ppm?: number;
    bbox_width?: number;
    bbox_height?: number;
    [key: string]: any;
  } | null;
}

// Updated table response
export interface EventTableResponse {
  page_no: number;
  page_size: number;
  total_pages: number;
  total_events: number;
  events: EventTableEntry[];
  action_status?: string | null;
}

// Updated table response to match backend response
export interface EventTableResponse {
  page_no: number;
  page_size: number;
  total_pages: number;
  total_events: number;
  events: EventTableEntry[];
}

export interface EventSummary {
  pending_count: number;
  resolved_count: number;
  total_count: number;
  high_risk_count: number;
  low_risk_count: number;
}

/* PATCH helper */
export interface EventUpdate {
  time_ack?: string | null;
  time_action?: string | null;
  actions_taken?: [string, string][] | null;
  flagged?: string;
  status?: string;
}

/* Status logs */
export interface UpdateEventStatusLogsResponse {
  message: string;
  status: string;
}

/* ------------------------------------------------------------------- *
 *  Validation Errors (FastAPI‑style)
 * ------------------------------------------------------------------- */
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}
export interface HTTPValidationError {
  detail: ValidationError[];
}

/* ------------------------------------------------------------------- *
 *  Functional Tags
 * ------------------------------------------------------------------- */
export interface FunctionalTagSchema {
  name: string;
  customer_id: string;
  site_id: string;
  camera_ids?: string[];
  usecases?: Record<string, UseCaseDefinitionInput>;
  created_at?: string;
  usecase_ids?: string[];
}

export interface FunctionalTagResponse extends FunctionalTagSchema {
  id: string;
}

export interface CreateFunctionalTagInput {
  name: string;
  customer_id: string;
  site_id: string;
  camera_ids?: string[];
  func_tags?: string[];
}

/* Inline use‑case definition for functional‑tag creation/edit */
export interface UseCaseDefinitionInput {
  objects: [string, boolean, boolean][];
  parameters: UseCaseParam[];
}

export type UpdateFunctionalTagInput = {
  name?: string;
  usecases?: Record<string, UseCaseDefinitionInput>;
};

/* ------------------------------------------------------------------- *
 *  Misc
 * ------------------------------------------------------------------- */
export interface EditEntry {
  time: string;
  description: string;
}

export interface EventActionResponse {
  event_id: string;
  action: string;
}

export interface EventActionResponse {
  event_id: string;
  action: string;
}

//* ------------------------------------------------------------------- *
//*  Chart Data

// Enums for API parameters
export enum TimeEnum {
  WEEK = "week",
  MONTH = "month",
  QUARTER = "quarter",
  YEAR = "year",
  MAX = "max",
}

// Use case types with null option
export enum UseCaseEnum {
  ALL = "",
  Near_MISS = "Near_Miss",
  WORKER_UNDER_LOAD = "Worker_Under_Load",
  MAN_DOWN = "Man_Down",
  PPE = "PPE",
  SPEEDING = "Speeding",
  INTRUSION_EXCLUSION = "Intrusion_Exclusion",
  FIRE = "Fire",
  PROHIBITED_ITEM = "Prohibited_Item",
}

// Response types for API
export interface StatusCountResponse {
  time_period: string;
  site_id: string;
  uc_type: string | null;
  status_count: StatusCount;
}

export interface StatusCount {
  Received: number;
  Seen: number;
  Inprogress: number;
  Resolved: number;
  Reported: number;
}

// Request params for status count API
export interface StatusCountParams {
  time: TimeEnum;
  site_id: string;
  uc_type?: string | null;
}

// Interface for event action
export interface EventActionResponse {
  event_id: string;
  action: string;
}

// Chart data interfaces
export interface ChartDataItem {
  label: string;
  value: number;
  color: string;
}

export interface ChartData {
  data: ChartDataItem[];
  total: number;
}

// Props interfaces for components
export interface PieChartProps {
  data: ChartData;
  title?: string;
  subtitle?: string;
  isDoughnut?: boolean;
}

export interface TimeFilterProps {
  selectedTime: TimeEnum;
  onTimeChange: (time: TimeEnum) => void;
}

export interface UseCaseFilterProps {
  selectedUseCase: UseCaseEnum | string;
  onUseCaseChange: (useCase: UseCaseEnum | string) => void;
}

// Types for Analytics Dashboard
// Time period enum for better type safety
// Time period enum for better type safety
export enum TimePeriodEnum {
  TODAY = "daily",
  YESTERDAY = "yesterday",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

// API Query Parameters for analytics table endpoint
export interface AnalyticsTableQueryParams {
  user_id: string;
  customer_id: string;
  from_date: string; // YYYY-MM-DD format
  to_date: string; // YYYY-MM-DD format
  time_period?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | null;
  env?: string | null;
  timezone: string;
}

// Base metric structure for all data points
export interface MetricValue {
  absolute: number;
}

export interface EventRecord {
  site: string;
  camera: string;
  use_case: string;
  severity: string;
  status: string;
  location_tags: string[];
  timestamp: string;
  count: number;
}

export interface AggregatedTotals {
  by_use_case: Record<string, number>;
  by_site: Record<string, number>;
  by_camera: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  by_location_tag: Record<string, number>;
}

export interface MetricValue {
  absolute: number;
}

// Individual data point structure for any time period
export interface DateIncidentData {
  date: string;
  events?: EventRecord[]; // New field
  aggregated_totals?: AggregatedTotals; // New field
  uc_types: Record<string, MetricValue>;
  sites: Record<string, MetricValue>;
  cameras: Record<string, MetricValue>;
  severities: Record<string, MetricValue>;
  location_tags: Record<string, MetricValue>;
  statuses: Record<string, MetricValue>;
}

// Quarterly data has a different structure with weeks
export interface QuarterlyData {
  weeks: DateIncidentData[];
}

// Main analytics response structure - updated to support flexible time periods
export interface AnalyticsTableResponse {
  // Current period data - arrays for detailed breakdown
  daily?: DateIncidentData[] | null;
  weekly?: DateIncidentData[] | null;
  monthly?: DateIncidentData[] | null;
  yearly?: DateIncidentData[] | null;

  // Current period data - quarterly can be either format
  quarterly?: DateIncidentData[] | QuarterlyData | null;

  // Previous period data for comparison - arrays (optional for time navigation)
  previous_daily?: DateIncidentData[];
  previous_weekly?: DateIncidentData[];
  previous_monthly?: DateIncidentData[];
  previous_yearly?: DateIncidentData[];

  // Previous period data - quarterly can be either format (optional for time navigation)
  previous_quarterly?: DateIncidentData[] | QuarterlyData;
}

// Helper type for date range navigation
export interface DateRange {
  from_date: string;
  to_date: string;
}

// Time navigation configuration
export interface TimeNavigationConfig {
  currentRange: DateRange;
  previousRange?: DateRange;
  nextRange?: DateRange;
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
}

// Custom date range selection interface
export interface CustomDateRangeSelection {
  from_date: string;
  to_date: string;
  time_period: null; // Always null for custom ranges
  displayFormat: "weekly" | "daily" | "monthly"; // How to display the data
}

// Detailed filters interface for FilterPanel component
export interface DetailedFilters {
  sites: string[];
  cameras: string[];
  useCases: string[];
  severities: string[];
  statuses: string[];
  locationTags: string[];
}

// GroupBy type for analytics grouping
export type GroupBy =
  | "uc_types"
  | "sites"
  | "cameras"
  | "severities"
  | "location_tags"
  | "statuses";

// Option interface for dropdown components
export interface Option {
  id?: string;
  name?: string;
}

// Sort configuration interface
export interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

// Filter data structure for Analytics component
export interface FilterData {
  sites: (string | Option)[];
  cameras: (string | Option)[];
  useCases: (string | Option)[];
  severities: (string | Option)[];
  statuses: (string | Option)[];
  locationTags: (string | Option)[];
  dependentCameras?: Option[];
}

// Dashboard widget interface for drag-drop functionality
export interface DashboardWidget {
  id: string;
  type: "filters" | "chart" | "comparison" | "table" | "summary";
  title: string;
  component: React.ComponentType<any>;
  props?: any;
}

// Chart type definitions
export type ChartType = "stacked" | "grouped";

// Processed chart data interface
export interface ProcessedChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

// Comparison metrics for period-over-period analysis
export interface ComparisonMetrics {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: "up" | "down" | "neutral";
}

// Helper type for accessing different period data - updated to include daily
export type CurrentPeriodKey = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

// Helper type for accessing previous period data - updated to include daily
export type PreviousPeriodKey =
  | "previous_daily"
  | "previous_weekly"
  | "previous_monthly"
  | "previous_quarterly"
  | "previous_yearly";

// Analytics context interface for managing query parameters and navigation
export interface AnalyticsContextState {
  queryParams: AnalyticsTableQueryParams;
  timeNavigation: TimeNavigationConfig;
  isCustomDateRange: boolean;
  isLoading: boolean;
  error: string | null;
}

// Component prop interfaces - updated to support new functionality
export interface FilterPanelProps {
  timePeriod: TimePeriodEnum;
  groupBy: GroupBy;
  onFilterChange: (key: "timePeriod" | "groupBy", value: any) => void;
  onDetailedFilterChange: (filters: DetailedFilters) => void;
  onFilteredDataChange: (data: DateIncidentData[]) => void;
  onClearAll: () => void;
  rawData: AnalyticsTableResponse;
  siteOptions: (string | Option)[];
  cameraOptions: (string | Option)[];
  useCaseOptions: (string | Option)[];
  severityOptions: (string | Option)[];
  statusOptions: (string | Option)[];
  locationTagOptions: (string | Option)[];
  dependentCameraOptions?: Option[];
  selectedSites?: string[];
  autoApply: boolean;
  onAutoApplyChange: (autoApply: boolean) => void;
  detailedFilters?: DetailedFilters;
  isWeightedView: boolean;
  onWeightedViewChange: (weighted: boolean) => void;
  showComparison?: boolean;
  onComparisonToggle?: (show: boolean) => void;
  canShowComparison?: boolean;
  // New props for date range and navigation
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  timeNavigation: TimeNavigationConfig;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  isCustomDateRange: boolean;
  onCustomDateRangeToggle: (isCustom: boolean) => void;
}

export interface IncidentChartProps {
  timePeriod: TimePeriodEnum;
  groupBy: GroupBy;
  filters: DetailedFilters;
  data: DateIncidentData[];
  processedData?: ProcessedChartData | null;
  isWeightedView?: boolean;
  // New props for enhanced functionality
  dateRange?: DateRange;
  isCustomDateRange?: boolean;
}

export interface ComparisonChartProps {
  groupBy: GroupBy;
  previousPeriodData: DateIncidentData[];
  currentPeriodData: DateIncidentData[];
  isWeightedView?: boolean;
  timePeriod: TimePeriodEnum;
  // New props for period comparison
  currentDateRange: DateRange;
  previousDateRange?: DateRange;
}

// Analytics service interface for API calls
export interface AnalyticsService {
  getAnalyticsTable: (params: AnalyticsTableQueryParams) => Promise<AnalyticsTableResponse>;
  calculateDateRanges: (
    timePeriod: TimePeriodEnum | null,
    baseDate?: string,
  ) => {
    current: DateRange;
    previous?: DateRange;
  };
  navigateTimeRange: (
    currentRange: DateRange,
    timePeriod: TimePeriodEnum | null,
    direction: "previous" | "next",
  ) => DateRange;
}

// Hook interface for analytics data management
export interface UseAnalyticsData {
  data: AnalyticsTableResponse | null;
  isLoading: boolean;
  error: string | null;
  queryParams: AnalyticsTableQueryParams;
  timeNavigation: TimeNavigationConfig;
  isCustomDateRange: boolean;
  // Actions
  setQueryParams: (params: Partial<AnalyticsTableQueryParams>) => void;
  setDateRange: (range: DateRange) => void;
  navigatePrevious: () => void;
  navigateNext: () => void;
  toggleCustomDateRange: (isCustom: boolean) => void;
  refetch: () => Promise<void>;
}

// Utility type for extracting data based on time period
export type ExtractDataByPeriod<T extends AnalyticsTableResponse> = T extends { weekly: infer W }
  ? W
  : T extends { daily: infer D }
    ? D
    : T extends { monthly: infer M }
      ? M
      : T extends { yearly: infer Y }
        ? Y
        : T extends { quarterly: infer Q }
          ? Q
          : never;

// Type guard functions
export const isQuarterlyData = (data: any): data is QuarterlyData => {
  return data && typeof data === "object" && "weeks" in data && Array.isArray(data.weeks);
};

export const isDateIncidentDataArray = (data: any): data is DateIncidentData[] => {
  return (
    Array.isArray(data) && data.every((item) => item && typeof item === "object" && "date" in item)
  );
};

//Finish analytics types

// Constants for date manipulation
export const DATE_FORMAT = "YYYY-MM-DD";
export const DISPLAY_DATE_FORMAT = "MMM DD, YYYY";

// Error types for analytics operations
export enum AnalyticsErrorType {
  INVALID_DATE_RANGE = "INVALID_DATE_RANGE",
  API_ERROR = "API_ERROR",
  INVALID_CUSTOMER_ID = "INVALID_CUSTOMER_ID",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
}

export interface AnalyticsError {
  type: AnalyticsErrorType;
  message: string;
  details?: any;
}
// end

/////////Action flow
export interface ActionRequest {
  event_id: string; // Event ID to which the action is related
  action_taken: string; // Description of the action taken
  created_by: string; // User who created the action
  status: string; // Status of the action ("Open", etc.)
}

export interface ActionResponse {
  event_id: string; // The ID of the event to which the action is related
  action: string; // The action taken, which should match what was passed in the request
  status: string;
  action_taken: string; // Description of the action taken
  created_by: string; // User who created the action
  created_at: string; // Timestamp of when the action was created
  id: string; // Unique identifier for the action
}

export interface UpdateActionRequest {
  event_id: string;
  action_taken: string;
  created_by: string;
  status: string;
}

// Response type (assuming you get the updated action back)
export interface UpdateActionResponse {
  event_id: string;
  action: string;
  status: string;
  action_taken: string;
  created_by: string;
  created_at: string;
  id: string;
}

export interface GetActionResponse {
  event_id: string;
  action: string;
  created_by: string;
  status: string;
}

// Add this to your api/types.ts file
export interface UpdateEventStatusRequest {
  status: StatusEnum;
}

export interface UpdateEventStatusResponse {
  success: boolean;
  message?: string;
  event_id?: string;
  status?: StatusEnum;
}

export interface EventAnalyticsTimeRange {
  severity_counts: Record<string, number>;
  status_counts: Record<string, number>;
  uc_type_counts: Record<string, number>;
}

export interface SiteEventAnalytics {
  site_id: string;
  site_name: string;
  "1d": EventAnalyticsTimeRange;
  "1w": EventAnalyticsTimeRange;
  "1m": EventAnalyticsTimeRange;
  "1y": EventAnalyticsTimeRange;
}

export type EventAnalyticsResponse = SiteEventAnalytics[];

export interface CustomerEventAnalyticsResponse {
  _id: string;
  customer_id: string;
  sites: SiteEventAnalytics[];
}

export interface AnalyticsItem {
  name: string;
  count: number;
}

export interface SiteAnalyticsData {
  use_cases: AnalyticsItem[];
  cameras: AnalyticsItem[];
  locations: AnalyticsItem[];
  total_incidents: number;
}

export interface AnalyticsSummaryResponse {
  [siteName: string]: SiteAnalyticsData;
}

export interface CombinedEvent {
  id: string;
  uc_type: string;
  site: string;
  camera: string;
  time_created: string;
  status: "received" | "seen" | "invalid";
  action: "open" | "close";
  critical: boolean;
  overdue: boolean;
  image: string;
  location_tag: string;
}

export type CombinedEventsResponse = CombinedEvent[];

export interface SiteLastHeartbeatResponse {
  site_id: string;
  last_heartbeat: string;
}

export interface MonitoringDataPoint {
  timestamp: string;
  gpu: number | null;
  memory: number | null;
  cpu: number | null;
  fps: number | null;
  gpu_avg: number | null;
}

export interface SiteMonitoringData {
  name: string;
  site_id: string;
  thresholds: {
    danger_line: number;
    warning_line: number;
  };
  average_values: {
    gpu: number;
    memory: number;
    cpu: number;
    fps: number;
    gpu_avg: number;
  };
  data: {
    "1D": MonitoringDataPoint[];
    "1W": MonitoringDataPoint[];
    "1M": MonitoringDataPoint[];
    "1Y": MonitoringDataPoint[];
  };
  last_heartbeat: string;
}

export interface MonitoringDataResponse {
  [siteId: string]: SiteMonitoringData;
}

/* ------------------------------------------------------------------- *
 *  Notification Settings
 * ------------------------------------------------------------------- */
export interface NotificationSubscription {
  location_tags: string[];
  alert_types: AlertTypeValue[];
}

export interface SiteConfiguration {
  site_id: string;
  site_name: string;
  subscriptions: NotificationSubscription[];
  total_subscriptions: number;
}

export interface UserNotificationConfig {
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  site_configurations: SiteConfiguration[];
}

export type AlertTypeValue = "critical" | "high" | "low";

export interface CustomerAdmin {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export interface GetCustomerAdminsResponse {
  data: CustomerAdmin[];
}

export interface CreateNotificationConfigRequest {
  user_id: string;
  site_id: string;
  subscriptions: {
    [locationTag: string]: string[];
  };
}

export interface CreateNotificationConfigResponse {
  message: string;
  data: {
    config_id: string;
    user_id: string;
    site_id: string;
    customer_id: string;
    total_location_tags: number;
    action: string;
    created_by: string;
    user_role: string;
  };
}

export interface SyncWithEdgeParams {
  siteId: string;
  camId?: string;
  userEmail?: string;
  media_url?: string;
}

export interface SyncWithEdgeRealParams {
  siteId: string;
  camId?: string;
  userEmail?: string;
}

export interface MediaStatusResponse {
  camera_id: string;
  media_url: string;
  status: string;
  user_email?: string;
  last_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds?: number;
  width?: number;
  height?: number;
  codec?: string;
  format?: string;
  size_bytes?: number;
  metadata_created_at?: string;
}

// Interface for location tag site response
export interface LocationTagSiteResponse {
  site_id: string;
  camera_location_tags: string[];
}
// Types for event export parameters
export type SystemLogExport = "csv" | "excel";

export interface SystemExportParams {
  site_id: string; // Required parameter (path)
  user_id: string; // Required parameter (path)
  format?: SystemLogExport; // Optional query parameter with default "csv"
}

// Counter reporting time interface
export interface CounterReportingTime {
  interval_value: number;
  interval_unit: "minute" | "hour" | "day" | "week";
}

// Counter reset time interface
export interface CounterResetTime {
  recurrence: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  time: string; // "HH:MM" format
  days_of_week?: number[]; // For weekly recurrence
  day_of_month?: number; // For monthly recurrence
  month_and_day?: string; // For yearly recurrence, "MM-DD" format
}
// Update your counter types to make optional fields actually optional
export interface CounterData {
  id: string;
  name: string;
  countPeople: boolean;
  peopleSubCategory?: string | null;
  countVehicle: boolean;
  vehicleSubCategory?: string | null;
  maxAllowed?: number | null;
  notifyEnabled: boolean;
  cameras: string[];
  visible: boolean;
  reporting_time: CounterReportingTime;
  reset_time: CounterResetTime;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  site_id: string;
}

// Base counter interface with shared properties
export interface CounterBase {
  site_id: string;
  name: string;
  countPeople: boolean;
  peopleSubCategory?: string;
  countVehicle: boolean;
  vehicleSubCategory?: string | null;
  maxAllowed?: number | null;
  notifyEnabled: boolean;
  cameras: string[];
  visible: boolean;
  reporting_time: CounterReportingTime;
  reset_time: CounterResetTime;
  timezone?: string;
}

// Create counter input interface
export interface CreateCounterInput extends CounterBase {}

// Add these new interfaces
export interface EdgeConfig {
  start: {
    x: number;
    y: number;
  };
  end: {
    x: number;
    y: number;
  };
  boundary_name: string;
  direction: "inward" | "outward";
  action: "notify" | "increment" | "decrement";
  counter_id: string | null;
  visible: boolean;
}

export interface UpdateRoiEdgesRequest {
  edges: EdgeConfig[];
}

export interface UpdateRoiEdgesResponse {
  success: boolean;
  message: string;
  roi_id: string;
  edges: EdgeConfig[];
}

/* ------------------------------------------------------------------- *
 *  Consumer Related Types
 * ------------------------------------------------------------------- */

export interface ConsumerUser {
  id: string;
  role: string;
  name: string;
  customer_id: string;
  email: string;
  sites: any[];
  phone: string;
  location_tags: any[];
  job_title: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  avatar: string;
  timezone: string;
}

export interface CreateConsumerData {
  email: string;
  role: string;
  phone: string;
  name: string;
  sites: string[];
  location_tags: string[];
  customer_id: string;
  job_title: string;
}

export interface CreateConsumerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateConsumerData) => void;
  isLoading?: boolean;
  isAdminMode?: boolean; // Add this line
}

export interface AllSite {
  id: string;
  name: string;
  location_tags: string[];
  customer_id: string;
}

export interface ProfilePageProps {
  consumer: ConsumerUser;
  onBack: () => void;
}

export interface TabsHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export interface SearchAndActionBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onCreateClick: () => void;
}

export interface ConsumersTableProps {
  consumers: ConsumerUser[];
  onViewProfile: (consumer: ConsumerUser) => void;
}

export interface DeleteUserResponse {
  message: string;
}

export interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  userType: "consumer" | "admin";
  isDeleting?: boolean;
}

/* ------------------------------------------------------------------- *
 *  Ticketing system types for customer and agent dashboards
 * ------------------------------------------------------------------- */
export enum TicketCategoryEnum {
  BUG = "Bug",
  ASK_A_QUESTION = "Ask a Question",
}

export enum TicketStatusEnum {
  OPEN = "Open",
  IN_PROGRESS = "Work in Progress",
  PENDING = "Pending",
  REOPENED = "Reopened",
  DONE = "Done",
  CLOSED = "Closed",
}

export enum TicketPriorityEnum {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical",
}

export interface CustomFields {
  customfield_10162: string; // Company name
  customfield_10224: string[]; // Site (array of strings)
  customfield_10190: string[]; // Camera/Device (array of strings)
}

export interface TicketDetails {
  due_date: string | null;
  start_date: string | null;
  story_points: number | null;
  original_estimate: string | null;
  time_tracking: Record<string, any>;
  sprint: string | null;
  priority: string;
  parent: string | null;
}

export interface MoreFields {
  components: any[];
  team: string;
  fix_versions: any[];
  original_estimate: string | null;
}

export interface Activity {
  comments: any[];
}

export interface EnrichedData {
  key: string;
  summary: string;
  issue_type: TicketCategoryEnum;
  status: TicketStatusEnum;
  epic: string | null;
  story: string | null;
  details: TicketDetails;
  more_fields: MoreFields;
  activity: Activity;
}

export interface Ticket {
  key: string;
  id: string;
  project_key: string;
  summary: string;
  description: string;
  priority: TicketPriorityEnum;
  labels: string[];
  status: TicketStatusEnum;
  assignee: any | null;
  reporter: string;
  created: string;
  updated: string;
  created_by: CreatedBy;
  custom_fields: CustomFields;
  comments: any[];
  enriched: EnrichedData;
  attachments?: File[];
}

export interface CreatedBy {
  id: string;
  name: string;
  email: string;
  role: string;
  customer_id: string;
}

// Simplified interface for table display
export interface TicketTableEntry {
  key: string;
  id: string;
  summary: string;
  description: string;
  priority: TicketPriorityEnum;
  status: TicketStatusEnum;
  assignee: any | null;
  reporter: string;
  created_by: CreatedBy;
  created: string;
  updated: string;
  custom_fields: CustomFields;
  enriched: EnrichedData;
  comments: any[];
  project_key: string;
  labels: string[];
  attachments?: File[];
}

// For API responses
export interface TicketsResponse {
  tickets: Ticket[];
}

export interface CreateTicket {
  user_id: string;
  customer_id: string;
  summary: string;
  description: string;
  priority: string;
  request_type_name: string;
  sites: string[];
  cameras: string[];
  attachments?: File[]; // Optional for the API call
}

export interface UpdateTicket {
  key: string;
  description?: string;
  attachments?: File[]; // Optional for the API call
  sites?: string[];
  cameras?: string[];
}

export interface SiteCamera {
  [siteName: string]: string[];
}

export interface SitesCamerasResponse {
  sites: SiteCamera;
}

export interface ApiComment {
  id: string;
  author: string;
  body: string;
  created: string;
  updated: string;
  attachments?: File[];
}

export interface CreateCommentData {
  user_id: string;
  comment_text: string;
  attachments?: File[];
  user_role: string;
  // Note: attachments will be added to API later
}

export interface CreateCommentResponse {
  message: string;
  commentId: string;
}

export interface TicketStatusChangeOptions {
  issue_key: string;
  target_status: TicketStatusEnum;
}

export interface TransitionResponse {
  message: string;
  success?: boolean;
}

/* ------------------------------------------------------------------- *
 * Location Tags Related Types
 * ------------------------------------------------------------------- */
export interface Camera {
  camera_id: string;
  camera_name: string;
}

export interface LocationTag {
  _id: string;
  name: string;
  site_id: string;
  site_name?: string;
  cameras?: Camera[];
}

export interface LocationTagResponse {
  site_id: string;
  camera_location_tags: LocationTag[];
}

export interface CreateLocationTagInput {
  name: string;
  site_id: string;
}

export interface UpdateLocationTagInput {
  name: string;
}

// Site counter occupancy data interface
export interface SiteCounterOccupancyData {
  counter_id: string;
  name: string;
  type: boolean;
  data: {
    time_created: string;
    occupancy: number;
  }[];
}

// Parameters for site counter occupancy request
export interface SiteCounterOccupancyParams {
  site_id: string;
  interval_minutes?: number;
  from_time?: string;
  to_time?: string;
}

// Keep your existing interface for backward compatibility if needed
export interface CounterOccupancyData {
  time: string;
  occupancy: number;
  in: number;
  out: number;
}

// Use case configuration sync types
export interface UseCaseConfigurationItem {
  name: string;
  configuration: {
    objects: [string, boolean, boolean][];
    parameters: Array<{
      id: string;
      type: "range" | "dropdown";
      unit?: string;
      default: number | string;
      int_params?:
        | {
            min: number;
            max: number;
          }
        | string[];
    }>;
  };
}

export interface SyncAllowedUseCasesResponse {
  status: string;
  synced_allowed_ucs: {
    unique_id: string;
    allowed_ucs: string[];
    usecase_configurations: UseCaseConfigurationItem[];
  };
}

/* ------------------------------------------------------------------- *
 *  Media Run Logs
 * ------------------------------------------------------------------- */
export interface MediaRunLog {
  _id: string;
  site_id: string;
  camera_id: string;
  site_name: string;
  camera_name: string;
  media_url: string;
  status: string;
  user_email: string;
  message: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  logged_at: string;
}

export interface MediaRunLogsResponse {
  count: number;
  data: MediaRunLog[];
}

export interface MediaRunLogsParams {
  site_id: string;
  timezone?: string;
}
