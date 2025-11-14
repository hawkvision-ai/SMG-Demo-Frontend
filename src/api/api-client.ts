import { AuditLogResponse } from "@/components/SiteConfiguration/components/ConfigurationHistory/components/types";
import { SECRETS } from "@/config/secrets";
import { sanitizeFilename } from "@/lib/utils";
import { clearAllUserData } from "@/utils/browserStorage";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { API_ENDPOINTS } from "./endpoints";
import {
  ActionRequest,
  ActionResponse,
  AllSite,
  AnalyticsTableQueryParams,
  AnalyticsTableResponse,
  ApiComment,
  CameraResponse,
  CameraSchema,
  CombinedEventsResponse,
  ConsumerUser,
  CounterData,
  CreateCommentData,
  CreateCommentResponse,
  CreateConsumerData,
  CreateCounterInput,
  CreateLocationTagInput,
  CreateNotificationConfigRequest,
  CreateNotificationConfigResponse,
  CreateTicket,
  CustomerAdmin,
  CustomerEventAnalyticsResponse,
  CustomerResponse,
  CustomerSchema,
  DeleteUserResponse,
  EventHeaderParams,
  EventHeaderResponse,
  EventResponse,
  EventSiteFilterParams,
  EventSiteResponse,
  EventSummary,
  EventTableFilters,
  EventTableResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  FunctionalTagResponse,
  FunctionalTagSchema,
  GetActionResponse,
  GetUserPreferencesResponse,
  LocationTag,
  LocationTagResponse,
  LocationTagSiteResponse,
  LoginRequest,
  LoginResponse,
  MediaRunLogsResponse,
  MediaStatusResponse,
  MonitoringDataResponse,
  RefreshTokenResponse,
  RegisterRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ROIResponse,
  ROISchema,
  ROIUpdate,
  SaveUserPreferencesSchema,
  SetPasswordRequest,
  SetPasswordResponse,
  SiteCamera,
  SiteCounterOccupancyData,
  SiteLastHeartbeatResponse,
  SiteResponse,
  SiteSchema,
  StatusCountResponse,
  StatusEnum,
  SyncAllowedUseCasesResponse,
  SyncWithEdgeParams,
  SyncWithEdgeRealParams,
  SystemLogExport,
  TicketStatusEnum,
  TicketTableEntry,
  TimeEnum,
  TransitionResponse,
  UpdateActionRequest,
  UpdateActionResponse,
  UpdateEventStatusLogsResponse,
  UpdateEventStatusResponse,
  UpdateLocationTagInput,
  UpdateSnapshotVideoRequest,
  UpdateSnapshotVideoResponse,
  UpdateTicket,
  UpdateUserSchema,
  UseCaseResponse,
  UseCaseSchema,
  UserNotificationConfig,
} from "./types";
class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.axiosInstance = axios.create({
      baseURL,
      ...config,
      headers: {
        "ngrok-skip-browser-warning": "true", // 👈 Add this line
        ...(config?.headers || {}),
      },
    });

    // Request interceptor for adding auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("authToken");
        if (token) {
          config.headers.Authorization = `bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const errorData = error.response.data;

          if (errorData && errorData.detail) {
            console.log("Error detail:", errorData.detail);

            if (Array.isArray(errorData.detail)) {
              const errorMessages = errorData.detail.map(
                (errItem: any) =>
                  `${errItem.loc?.join(".") || "Error"}: ${errItem.msg || "Unknown error"}`,
              );
              return Promise.reject(new Error(errorMessages.join("; ")));
            } else if (typeof errorData.detail === "string") {
              return Promise.reject(new Error(errorData.detail));
            } else {
              return Promise.reject(new Error(JSON.stringify(errorData.detail)));
            }
          } else if (errorData && errorData.message) {
            return Promise.reject(new Error(errorData.message));
          } else if (typeof errorData === "string") {
            return Promise.reject(new Error(errorData));
          } else {
            const statusText = error.response.statusText || "Unknown error";
            const status = error.response.status || "Error";
            return Promise.reject(new Error(`${status}: ${statusText}`));
          }
        }

        // Network errors or other issues
        return Promise.reject(error);
      },
    );
  }

  // Authentication
  async register(email: string, password: string): Promise<any> {
    const registerData: RegisterRequest = {
      email,
      password,
    };

    const response = await this.axiosInstance.post(API_ENDPOINTS.AUTH.REGISTER, registerData);
    return response.data;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const loginData: LoginRequest = {
      username,
      password,
    };

    const response: AxiosResponse<LoginResponse> = await this.axiosInstance.post(
      API_ENDPOINTS.AUTH.LOGIN,
      loginData,
    );

    // Store the token in localStorage for future requests
    if (response.data.access_token) {
      localStorage.setItem("authToken", response.data.access_token);
    }

    return response.data;
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response: AxiosResponse<RefreshTokenResponse> = await this.axiosInstance.post(
      API_ENDPOINTS.AUTH.REFRESH,
      { refresh_token: refreshToken }, // Send as body
    );

    if (response.data.access_token) {
      localStorage.setItem("authToken", response.data.access_token);
    }
    return response.data;
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const forgotData: ForgotPasswordRequest = { email };

    const response: AxiosResponse<ForgotPasswordResponse> = await this.axiosInstance.post(
      API_ENDPOINTS.AUTH.SEND_OTP,
      forgotData,
    );

    return response.data;
  }

  async resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response: AxiosResponse<ResetPasswordResponse> = await this.axiosInstance.post(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      request,
    );

    return response.data;
  }

  async CreateNewAccount(request: SetPasswordRequest): Promise<SetPasswordResponse> {
    const response: AxiosResponse<SetPasswordResponse> = await this.axiosInstance.post(
      API_ENDPOINTS.AUTH.SET_PASSWORD,
      request,
    );
    return response.data;
  }

  async logout(): Promise<void> {
    // Just remove tokens from localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    clearAllUserData();
  }

  // Users

  async updateUser(userId: string, data: UpdateUserSchema): Promise<UpdateUserSchema> {
    const response = await this.axiosInstance.put(API_ENDPOINTS.USERS.UPDATE(userId), data);
    return response.data;
  }

  async saveUserPreferences(data: SaveUserPreferencesSchema): Promise<SaveUserPreferencesSchema> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.USERS.SAVE, data);
    return response.data;
  }

  async getUserPreferences(
    customerId: string,
    userId: string,
  ): Promise<GetUserPreferencesResponse> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.USERS.GET(customerId, userId));
    return response.data;
  }

  // Customers
  async listCustomers(): Promise<CustomerResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.CUSTOMERS.LIST);
    return response.data;
  }

  async createCustomer(data: CustomerSchema): Promise<CustomerResponse> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.CUSTOMERS.CREATE, data);
    return response.data;
  }

  async getCustomer(id: string): Promise<CustomerResponse> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.CUSTOMERS.GET(id));
    return response.data;
  }

  async updateCustomer(
    customerId: string,
    data: Partial<CustomerSchema>,
  ): Promise<CustomerResponse> {
    const response = await this.axiosInstance.put(API_ENDPOINTS.CUSTOMERS.UPDATE(customerId), data);
    return response.data;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.axiosInstance.delete(API_ENDPOINTS.CUSTOMERS.DELETE(customerId));
  }

  /**
   * Sync allowed use cases from admin DB to customer DB
   * @param Customer ID
   */
  async syncAllowedUseCases(customerId: string): Promise<SyncAllowedUseCasesResponse> {
    const response = await this.axiosInstance.get<SyncAllowedUseCasesResponse>(
      API_ENDPOINTS.CUSTOMERS.SYNC_ALLOWED_UCS(customerId),
    );
    return response.data;
  }

  async updateSnapshotVideoConfig(
    customerId: string,
    data: UpdateSnapshotVideoRequest,
  ): Promise<UpdateSnapshotVideoResponse> {
    const response = await this.axiosInstance.put(
      API_ENDPOINTS.CUSTOMERS.UPDATE_SNAPSHOT_VIDEO(customerId),
      data,
    );
    return response.data;
  }

  // Sites
  async listSites(): Promise<SiteResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.SITES.LIST);
    return response.data;
  }

  async createSite(data: SiteSchema): Promise<SiteResponse> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.SITES.CREATE, data);
    return response.data;
  }

  async getSitesByCustomer(
    customerId: string,
    timezone: string,
    userId?: string,
  ): Promise<SiteResponse[]> {
    const response = await this.axiosInstance.get(
      API_ENDPOINTS.SITES.BY_CUSTOMER(customerId, timezone, userId),
    );
    return response.data;
  }

  async getSite(siteId: string): Promise<SiteResponse> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.SITES.GET(siteId));
    return response.data;
  }

  async updateSite(siteId: string, data: Partial<SiteSchema>): Promise<SiteResponse> {
    const response = await this.axiosInstance.put(API_ENDPOINTS.SITES.UPDATE(siteId), data);
    return response.data;
  }

  async deleteSite(siteId: string): Promise<void> {
    await this.axiosInstance.delete(API_ENDPOINTS.SITES.DELETE(siteId));
  }

  async uploadSiteImage(file: File): Promise<any> {
    // Sanitize the filename
    const safeFileName = sanitizeFilename(file.name);

    // Recreate the file with the sanitized name
    const sanitizedFile = new File([file], safeFileName, {
      type: file.type,
      lastModified: file.lastModified,
    });

    const formData = new FormData();
    formData.append("file", sanitizedFile);

    const response = await this.axiosInstance.post(API_ENDPOINTS.SITES.UPLOAD_IMAGE, formData, {
      headers: {
        Accept: "application/json", // Let axios set Content-Type for FormData
      },
    });

    return response.data;
  }

  // curl -X 'POST' \  'http://127.0.0.1:8000/sites/upload-image' \  -H 'accept: application/json' \  -H 'Content-Type: multipart/form-data' \  -F 'file=@WhatsApp Image 2025-03-30 at 7.07.02 PM.jpeg;type=image/jpeg'

  async removeFromMediaQueue(siteId: string, cameraId: string, mediaUrl: string): Promise<void> {
    await this.axiosInstance.delete(
      API_ENDPOINTS.SITES.REMOVE_FROM_QUEUE(siteId, cameraId, mediaUrl),
    );
  }

  async clearMediaQueue(siteId: string): Promise<void> {
    await this.axiosInstance.delete(API_ENDPOINTS.SITES.CLEANUP_QUEUE(siteId));
  }

  async createPushUseCase(params: SyncWithEdgeParams): Promise<any> {
    const response = await this.axiosInstance.post(
      API_ENDPOINTS.SITES.PUSH_TO_EDGE(
        params.siteId,
        params.camId,
        params.userEmail,
        params.media_url,
      ),
    );
    return response.data;
  }

  async realSyncWithEdge(params: SyncWithEdgeRealParams): Promise<any> {
    const response = await this.axiosInstance.post(
      API_ENDPOINTS.SITES.REAL_SYNC_WITH_EDGE(params.siteId),
    );
    return response.data;
  }

  // Cameras
  async listCameras(): Promise<CameraResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.CAMERAS.LIST);
    return response.data;
  }

  async createCamera(data: CameraSchema): Promise<CameraResponse> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.CAMERAS.CREATE, data);
    return response.data;
  }

  async getCamera(cameraId: string): Promise<CameraResponse> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.CAMERAS.GET(cameraId));
    return response.data;
  }

  async updateCamera(cameraId: string, data: Partial<CameraSchema>): Promise<CameraResponse> {
    const response = await this.axiosInstance.put(API_ENDPOINTS.CAMERAS.UPDATE(cameraId), data);
    return response.data;
  }

  async uploadCameraVideo(file: File): Promise<any> {
    const safeFileName = sanitizeFilename(file.name);

    const response = await this.axiosInstance.post(
      `${API_ENDPOINTS.CAMERAS.UPLOAD_VIDEO}?filename=${encodeURIComponent(safeFileName)}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": file.type, // correct MIME type
        },
      },
    );

    return response.data;
  }

  async deleteCamera(cameraId: string): Promise<void> {
    await this.axiosInstance.delete(API_ENDPOINTS.CAMERAS.DELETE(cameraId));
  }

  async addMediaHistory(cameraId: string, url: string): Promise<void> {
    return (await this.axiosInstance.patch(API_ENDPOINTS.CAMERAS.MEDIA(cameraId), url)).data;
  }

  async deleteMediaHistory(cameraId: string, url: string): Promise<void> {
    await this.axiosInstance.delete(API_ENDPOINTS.CAMERAS.MEDIA(cameraId), {
      data: url,
    });
  }

  async setMediaHistory(cameraId: string, url: string): Promise<void> {
    await this.axiosInstance.patch(API_ENDPOINTS.CAMERAS.SET_MEDIA(cameraId), url);
  }

  async updateVideoMetadata(
    cameraId: string,
    videoUrl: string,
    metadata: { duration: number },
  ): Promise<void> {
    await this.axiosInstance.patch(API_ENDPOINTS.CAMERAS.UPDATE_METADATA, {
      camera_id: cameraId,
      media_url: videoUrl,
      duration_seconds: metadata.duration,
      size_bytes: undefined, // Optional field, not provided in this implementation
    });
  }

  async getCamerasByCustomer(customerId: string): Promise<CameraResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.CAMERAS.BY_CUSTOMER(customerId));
    return response.data;
  }

  async getCamerasBySite(siteId: string): Promise<CameraResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.CAMERAS.BY_SITE(siteId));
    return response.data;
  }

  async getCamerasByTag(tag: string): Promise<CameraResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.CAMERAS.FILTER_BY_TAG(tag));
    return response.data;
  }

  // Use Cases
  async listUseCases(): Promise<UseCaseResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.USECASES.LIST);
    return response.data;
  }

  async createUseCase(data: UseCaseSchema): Promise<UseCaseResponse> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.USECASES.CREATE, data);
    return response.data;
  }

  async getUseCase(useCaseId: string): Promise<UseCaseResponse> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.USECASES.GET(useCaseId));
    return response.data;
  }

  async deleteUseCase(useCaseId: string): Promise<void> {
    await this.axiosInstance.delete(API_ENDPOINTS.USECASES.DELETE(useCaseId));
  }

  async getUseCasesByCamera(cameraId: string): Promise<UseCaseResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.USECASES.BY_CAMERA(cameraId));
    return response.data;
  }

  // ROIs
  async listRois(): Promise<ROIResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.ROIS.LIST);
    return response.data;
  }

  async createRoi(data: ROISchema): Promise<ROIResponse> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.ROIS.CREATE, data);
    return response.data;
  }

  async getRoi(roiId: string): Promise<ROIResponse> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.ROIS.GET(roiId));
    return response.data;
  }

  async updateRoi(roiId: string, data: ROIUpdate): Promise<ROIResponse> {
    const response = await this.axiosInstance.put(API_ENDPOINTS.ROIS.UPDATE(roiId), data);
    return response.data;
  }

  async deleteRoi(roiId: string): Promise<void> {
    await this.axiosInstance.delete(API_ENDPOINTS.ROIS.DELETE(roiId));
  }

  async getRoisByCamera(cameraId: string): Promise<ROIResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.ROIS.BY_CAMERA(cameraId));
    return response.data;
  }

  async deleteFuncTagFromROI(tagId: string, roiId: string): Promise<any> {
    const response = await this.axiosInstance.delete(
      API_ENDPOINTS.ROIS.DELETE_FUNC_TAG(tagId, roiId),
    );
    return response.data;
  }

  ////Boundary conditions  CURD
  async createEdge(edgeData: any): Promise<any> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.EDGES.CREATE(), edgeData);
    return response.data;
  }

  async getEdgesByRoi(roiId: string): Promise<any[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.EDGES.GET_BY_ROI(roiId));
    return response.data;
  }

  async updateEdge(edgeId: string, edgeData: any): Promise<any> {
    const response = await this.axiosInstance.put(API_ENDPOINTS.EDGES.UPDATE(edgeId), edgeData);
    return response.data;
  }

  async deleteEdge(edgeId: string): Promise<string> {
    const response = await this.axiosInstance.delete(API_ENDPOINTS.EDGES.DELETE(edgeId));
    return response.data;
  }

  async getSiteCounterOccupancy(
    siteId: string,
    fromDate?: string,
    toDate?: string,
    userTimezone?: string,
  ): Promise<SiteCounterOccupancyData[]> {
    const params: any = {
      site_id: siteId,
    };
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    if (userTimezone) params.user_timezone = userTimezone;

    const response = await this.axiosInstance.get(API_ENDPOINTS.COUNTERS.GET_SITE_OCCUPANCY, {
      params,
    });
    return response.data;
  }

  /**
   * Get media status for all URLs of a site with camera id
   * @param siteId The site ID to get media status for
   */
  async getSiteMediaStatus(siteId: string, timezone: string): Promise<MediaStatusResponse[]> {
    const response = await this.axiosInstance.get(
      `${API_ENDPOINTS.SITES.MEDIA_STATUS}?site_id=${siteId}&timezone=${timezone}`,
    );
    return response.data;
  }

  // Counters
  async listCounters(): Promise<CounterData[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.COUNTERS.LIST);
    return response.data;
  }

  async createCounter(data: CreateCounterInput): Promise<CounterData> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.COUNTERS.CREATE, data);
    return response.data;
  }

  async getCounter(counterId: string): Promise<CounterData> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.COUNTERS.GET(counterId));
    return response.data;
  }

  async updateCounter(counterId: string, data: Partial<CounterData>): Promise<CounterData> {
    const response = await this.axiosInstance.put(API_ENDPOINTS.COUNTERS.UPDATE(counterId), data);
    return response.data;
  }

  async deleteCounter(counterId: string): Promise<void> {
    await this.axiosInstance.delete(API_ENDPOINTS.COUNTERS.DELETE(counterId));
  }

  async getCountersBySite(siteId: string, timezone?: string): Promise<CounterData[]> {
    const params = timezone ? { timezone } : {};
    const response = await this.axiosInstance.get(API_ENDPOINTS.COUNTERS.BY_SITE(siteId), {
      params,
    });
    return response.data;
  }

  // Events
  /**
   * Get a specific event by ID
   * @param id Event ID
   * @param timezone User timezone (optional)
   */
  async getEvent(id: string, timezone?: string): Promise<EventResponse> {
    const params = timezone ? { timezone } : {};
    const response = await this.axiosInstance.get(API_ENDPOINTS.EVENTS.GET(id), { params });
    return response.data;
  }

  /**
   * Flag an event as valid/invalid
   * @param id Event ID
   * @param valid Whether the event is valid
   */
  async flagEvent(id: string, valid: boolean): Promise<void> {
    const url = API_ENDPOINTS.EVENTS.FLAG(id, valid);
    const response = await this.axiosInstance.patch(url);
    return response.data;
  }

  /**
   * Get event summary data
   */
  async getEventSummary(): Promise<EventSummary> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.EVENTS.SUMMARY);
    return response.data;
  }

  /**
   * Mark an event as viewed
   * @param id Event ID
   */
  async viewEvent(id: string): Promise<void> {
    const url = API_ENDPOINTS.EVENTS.VIEW(id);
    const response = await this.axiosInstance.patch(url);
    return response.data;
  }

  async addCommentToEvent(
    id: string,
    text: string,
    user: string,
    timezone?: string,
  ): Promise<void> {
    const url = API_ENDPOINTS.EVENTS.COMMENT(id);
    const commentData = {
      text,
      user,
      timestamp: new Date().toISOString(),
    };

    const params = timezone ? { timezone } : {};

    const response = await this.axiosInstance.patch(url, commentData, { params });
    return response.data;
  }

  /**
   * Update an event's status
   * @param id Event ID
   * @param status New status
   */
  async updateEventStatus(id: string, status: StatusEnum): Promise<UpdateEventStatusResponse> {
    const url = API_ENDPOINTS.EVENTS.UPDATE_STATUS(id);
    const response = await this.axiosInstance.patch(`${url}?status=${status}`);
    return response.data;
  }

  /**
   * Update new status_logs endpoint
   * @param eventId Event ID
   * @param status New status
   * @param userId User ID making the change
   */
  async updateEventStatusLogs(
    eventId: string,
    status: StatusEnum,
    userId: string,
  ): Promise<UpdateEventStatusLogsResponse> {
    const url = API_ENDPOINTS.EVENTS.UPDATE_STATUS_LOGS(eventId);
    const response = await this.axiosInstance.put(`${url}?status=${status}&user_id=${userId}`);
    return response.data;
  }

  /**
   * Resolve an event
   * @param id Event ID
   * @param data Optional resolution data
   */
  async resolveEvent(id: string): Promise<void> {
    const url = API_ENDPOINTS.EVENTS.RESOLVE(id);
    const response = await this.axiosInstance.put(url);
    return response.data;
  }

  /**
   * Get event header data (sites, cameras, use cases, etc.)
   * Matches: GET /events/header
   */
  async getEventHeader(
    customer_id: string,
    site_ids?: string | null,
    camera_ids?: string | null,
  ): Promise<EventHeaderResponse> {
    const params: EventHeaderParams = {
      customer_id,
    };

    // Add optional comma-separated site IDs
    if (site_ids) {
      params.site_ids = site_ids;
    }

    // Add optional comma-separated camera IDs
    if (camera_ids) {
      params.camera_ids = camera_ids;
    }

    const response = await this.axiosInstance.get(API_ENDPOINTS.EVENTS.HEADER, { params });
    return response.data;
  }

  /**
   * Get filtered table events data
   * Matches: GET /events/table with exact parameter mapping
   */
  async getFilteredTableEvents(options?: EventTableFilters): Promise<EventTableResponse> {
    const params: any = {
      // Pagination (required)
      customer_id: options?.customer_id || null,
      timezone: options?.timezone || null,
      page_no: options?.page_no || 1,
      page_size: options?.page_size || null,

      // Sorting
      sort_order: options?.sort_order || "desc",
      env: options?.env || null,
      user_id: options?.user_id || null,
    };

    // Date filtering - exact API parameter names
    if (options?.date_filter) {
      params.date_filter = options.date_filter;
    }
    if (options?.from_date) {
      params.from_date = options.from_date;
    }
    if (options?.to_date) {
      params.to_date = options.to_date;
    }

    // Sites: frontend array → backend 'site_ids' (singular) comma-separated
    if (options?.site_ids && Array.isArray(options.site_ids) && options.site_ids.length > 0) {
      params.site_ids = options.site_ids.join(",");
    }

    // Cameras: frontend array → backend 'camera_ids' (plural) comma-separated
    if (options?.camera_ids && Array.isArray(options.camera_ids) && options.camera_ids.length > 0) {
      params.camera_ids = options.camera_ids.join(",");
    }

    // Use Cases: frontend array → backend 'uc_types' (plural) comma-separated
    if (options?.uc_types && Array.isArray(options.uc_types) && options.uc_types.length > 0) {
      params.uc_types = options.uc_types.join(",");
    }

    // Severities: frontend array → backend 'severity' (singular) comma-separated
    if (options?.severities && Array.isArray(options.severities) && options.severities.length > 0) {
      params.severity = options.severities.join(",");
    }

    // Statuses: frontend array → backend 'status' (singular) comma-separated
    if (options?.statuses && Array.isArray(options.statuses) && options.statuses.length > 0) {
      params.status = options.statuses.join(",");
    }

    // Action Statuses: frontend array → backend 'action_status' (singular) comma-separated
    if (
      options?.action_statuses &&
      Array.isArray(options.action_statuses) &&
      options.action_statuses.length > 0
    ) {
      params.action_status = options.action_statuses.join(",");
    }

    // Location Tags: frontend array → backend 'location_tags' (plural) comma-separated
    if (
      options?.location_tags &&
      Array.isArray(options.location_tags) &&
      options.location_tags.length > 0
    ) {
      params.location_tags = options.location_tags.join(",");
    }

    if (options?.last_event_id) {
      params.last_event_id = options.last_event_id;
    }

    const response = await this.axiosInstance.get(API_ENDPOINTS.EVENTS.TABLE, { params });
    return response.data;
  }

  /**
   * Fetches event IDs for a site with optional filtering
   * @param options Filter parameters for the API call
   * @returns Promise resolving to the event site response with total count and event IDs
   */
  async getEventsBySite(options?: EventSiteFilterParams): Promise<EventSiteResponse> {
    const params = {
      date_filter: options?.date_filter,
      from_date: options?.from_date,
      to_date: options?.to_date,
      site_id: options?.site_id,
      camera_id: options?.camera_id,
      severity: options?.severity,
      action_status: options?.action_status,
      status: options?.status,
      uc_type: options?.uc_type,
      page_no: options?.page_no || 1,
      page_size: options?.page_size || 8,
      sort_order: options?.sort_order || "desc",
      timezone: options?.timezone,
    };

    // Using the MODAL_EVENTS endpoint instead of EVENTS.SITE
    const response = await this.axiosInstance.get(API_ENDPOINTS.EVENTS.MODAL_EVENTS, { params });
    return response.data;
  }

  // Actions
  async createAction(data: ActionRequest): Promise<ActionResponse> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.ACTION.CREATE, data);
    return response.data;
  }

  // Update Action Status
  async updateAction(
    actionId: string,
    actionData: UpdateActionRequest,
  ): Promise<UpdateActionResponse> {
    const url = API_ENDPOINTS.ACTION.UPDATE(actionId);
    const response = await this.axiosInstance.put(url, actionData);
    return response.data;
  }

  // Get Action Details
  async getAction(actionId: string, timezone?: string): Promise<GetActionResponse> {
    const params = timezone ? { timezone } : {};
    const url = API_ENDPOINTS.ACTION.GET(actionId);
    const response = await this.axiosInstance.get(url, { params });
    return response.data;
  }

  /**
   * Get Analytics
   * @param time Time period (week, month, quarter, year, max)
   * @param siteId Site ID
   * @param ucType Optional use case type
   */
  async getEventStatusCount(
    time: TimeEnum,
    siteId: string,
    // ucType?: string | null,
  ): Promise<StatusCountResponse> {
    const params: any = {
      time,
      site_id: siteId,
    };

    // if (ucType) params.uc_type = ucType;

    const response = await this.axiosInstance.get(API_ENDPOINTS.ANALYTICS.STATUS_COUNT, { params });
    return response.data;
  }

  /**
   * Get Analytics Table data
   * @param params - Query parameters for analytics table
   * @returns Analytics table response from API with all time periods
   */
  async getAnalyticsTable(params: AnalyticsTableQueryParams): Promise<AnalyticsTableResponse> {
    const response = await this.axiosInstance.get<AnalyticsTableResponse>(
      API_ENDPOINTS.ANALYTICS.TABLE,
      { params },
    );
    return response.data;
  }

  // Add these methods to the existing ApiClient class
  // Functional Tags
  async createFunctionalTag(data: FunctionalTagSchema): Promise<FunctionalTagResponse> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.FUNCTIONAL_TAGS.CREATE, data);
    return response.data;
  }

  async editFunctionalTag(
    tagId: string,
    data: Record<string, any>,
  ): Promise<FunctionalTagResponse> {
    const response = await this.axiosInstance.patch(
      API_ENDPOINTS.FUNCTIONAL_TAGS.EDIT(tagId),
      data,
    );
    return response.data;
  }

  async getFunctionalTagsBySite(siteId: string): Promise<FunctionalTagResponse[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.FUNCTIONAL_TAGS.BY_SITE(siteId));
    return response.data;
  }

  // * Get Customer Event Analytics Data
  // * @param customerId - The customer ID to get event analytics for
  // */

  // * Get Customer Event Analytics Data
  // * @param customerId - The customer ID to get event analytics for
  // */

  async getCustomerEventAnalytics(
    customerId: string,
    env?: string,
    user_id?: string,
  ): Promise<CustomerEventAnalyticsResponse> {
    if (!customerId) {
      throw new Error("Customer ID is required to fetch customer event analytics");
    }

    const url = API_ENDPOINTS.SUMMARY.CUSTOMER_EVENT_ANALYTICS;
    const params = {
      customer_id: customerId,
      ...(env && { env }),
      ...(user_id && { user_id }),
    };

    const response = await this.axiosInstance.get(url, { params });
    return response.data;
  }

  /**
   * Get Combined Events Data
   * @param customerId - The customer ID to get combined events for
   * @param siteId - Optional site ID to filter by specific site
   * @param timezone - Optional timezone parameter
   */
  async getCombinedEvents(
    customerId: string,
    timezone?: string,
    env?: string,
    user_id?: string,
  ): Promise<CombinedEventsResponse> {
    if (!customerId) {
      throw new Error("Customer ID is required to fetch combined events");
    }
    const url = API_ENDPOINTS.SUMMARY.COMBINED_EVENTS;
    const params: any = { customer_id: customerId };
    if (env) {
      params.env = env;
    }
    if (timezone) {
      params.timezone = timezone;
    }
    if (user_id) {
      params.user_id = user_id;
    }
    const response = await this.axiosInstance.get(url, { params });
    return response.data;
  }

  /**
   * Get Site Last Heartbeat
   * @param siteId - The site ID to get last heartbeat for
   * @param timezone - Optional IANA timezone name, e.g., 'Asia/Kolkata'
   */
  async getSiteLastHeartbeat(
    siteId: string,
    timezone?: string,
    env?: string,
  ): Promise<SiteLastHeartbeatResponse> {
    if (!siteId) {
      throw new Error("Site ID is required to fetch site last heartbeat");
    }

    const url = API_ENDPOINTS.SUMMARY.SITE_LAST_HEARTBEAT;
    const params = {
      site_id: siteId,
      ...(timezone && { timezone }),
      ...(env && { env }),
    };

    const response = await this.axiosInstance.get(url, { params });
    return response.data;
  }

  /**
   * Get Monitoring Data
   * @param customerId - The customer ID to get monitoring data for
   */
  async getMonitoringData(
    customerId: string,
    timezone?: string,
    env?: string,
    user_id?: string,
  ): Promise<MonitoringDataResponse> {
    if (!customerId) {
      throw new Error("Customer ID is required to fetch monitoring data");
    }

    const url = API_ENDPOINTS.SUMMARY.MONITORING_DATA;
    const params = {
      customer_id: customerId,
      ...(timezone && { timezone }),
      ...(env && { env }),
      ...(user_id && { user_id }),
    };

    const response = await this.axiosInstance.get(url, { params });
    return response.data;
  }

  /**
   * Get Camera Health Data by Customer
   * @param customerId - The customer ID to get camera health data for
   */
  async getCameraHealth(
    customerId: string,
    timezone?: string,
    env?: string,
    user_id?: string,
  ): Promise<CameraResponse> {
    if (!customerId) {
      throw new Error("Customer ID is required to fetch camera health data");
    }

    const url = API_ENDPOINTS.SUMMARY.CAMERA_HEALTH;
    const params = {
      customer_id: customerId,
      ...(timezone && { timezone }),
      ...(env && { env }),
      ...(user_id && { user_id }),
    };

    const response = await this.axiosInstance.get(url, { params });
    return response.data;
  }

  async getUserNotificationConfig(siteId: string): Promise<UserNotificationConfig> {
    const response = await this.axiosInstance.get(
      API_ENDPOINTS.NOTIFICATIONS.GET_USER_CONFIG(siteId),
    );
    return response.data;
  }

  async updateUserNotificationConfig(
    siteId: string,
    config: Partial<UserNotificationConfig>,
  ): Promise<UserNotificationConfig> {
    const response = await this.axiosInstance.put(
      API_ENDPOINTS.NOTIFICATIONS.UPDATE_USER_CONFIG(siteId),
      config,
    );
    return response.data;
  }

  async getCustomerAdmins(customerId: string, siteId: string): Promise<CustomerAdmin[]> {
    const response = await this.axiosInstance.get(
      API_ENDPOINTS.NOTIFICATIONS.GET_CUSTOMER_ADMINS(customerId, siteId),
    );
    return response.data.data;
  }

  async createUpdateNotificationConfigs(
    configData: CreateNotificationConfigRequest,
  ): Promise<CreateNotificationConfigResponse> {
    const response = await this.axiosInstance.post(
      API_ENDPOINTS.NOTIFICATIONS.CREATE_CONFIG,
      configData,
    );
    return response.data;
  }

  async getCameraLocationTags(siteId: string): Promise<LocationTagSiteResponse> {
    const response = await this.axiosInstance.get(
      API_ENDPOINTS.SITES.GET_SITE_LOCATION_TAGS(siteId),
    );
    return response.data;
  }

  // System Logs
  async downloadSystemLogs(
    siteId: string,
    userId: string,
    format: SystemLogExport = "csv",
    env?: string, // Add env parameter
  ): Promise<Blob> {
    const response = await this.axiosInstance.get(
      API_ENDPOINTS.SITES.GET_SITE_SYSTEM_LOGS(siteId),
      {
        params: {
          user_id: userId,
          format,
          ...(env && { env }), // Add env to params if provided
        },
        responseType: "blob",
      },
    );
    return response.data;
  }

  /* ------------------------------------------------------------------- *
   *  Consumer related api_calls
   * ------------------------------------------------------------------- */

  async getConsumerData(customerId: string): Promise<ConsumerUser[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.USERS.LIST_CONSUMERS(customerId));
    return response.data;
  }

  // Create a new consumer user
  async createConsumer(consumerData: CreateConsumerData): Promise<ConsumerUser> {
    const response = await this.axiosInstance.post(
      API_ENDPOINTS.USERS.CREATE_CONSUMER,
      consumerData,
    );
    return response.data;
  }

  async getSites(customerId: string): Promise<AllSite[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.USERS.GET_ALL_SITES(customerId));
    return response.data;
  }

  async updateConsumer(
    user_id: string,
    data: Partial<UpdateUserSchema>,
  ): Promise<UpdateUserSchema> {
    const response = await this.axiosInstance.put(
      API_ENDPOINTS.USERS.UPDATE_CONSUMER(user_id),
      data,
    );
    return response.data;
  }

  async deleteUser(user_id: string, current_user_id: string): Promise<DeleteUserResponse> {
    const response = await this.axiosInstance.delete(
      API_ENDPOINTS.USERS.DELETE_CONSUMER(user_id, current_user_id),
    );
    return response.data;
  }

  /* ------------------------------------------------------------------- *
   *  Ticketing system apis for users
   * ------------------------------------------------------------------- */
  async createTicket(data: CreateTicket): Promise<{ message: string; ticketId: string }> {
    const formData = new FormData();

    // Create a copy of data without attachments for JSON serialization
    const ticketDataForJson = { ...data };
    delete ticketDataForJson.attachments;

    // Append the ticket data as JSON
    formData.append("payload", JSON.stringify(ticketDataForJson));

    // Handle attachments - use "files" instead of "attachments"
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach((file: File, index: number) => {
        // Ensure we're working with actual File objects
        if (file instanceof File) {
          // Change from "attachments" to "files" to match API spec
          formData.append("files", file);
        } else {
          console.warn(`Attachment at index ${index} is not a File object:`, file);
        }
      });
    }
    const response = await this.axiosInstance.post(API_ENDPOINTS.JIRA.CREATE_ISSUE, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  }

  async getTicket(ticketId: string, userId: string): Promise<TicketTableEntry> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.JIRA.GET_ISSUE(ticketId), {
      params: {
        user_id: userId,
      },
    });
    return response.data;
  }

  async getAllTickets(userId: string): Promise<TicketTableEntry[]> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.JIRA.GET_ALL_ISSUES(), {
      params: {
        user_id: userId,
      },
    });
    return response.data;
  }

  async updateTicket(issueKey: string, data: UpdateTicket): Promise<{ message: string }> {
    const formData = new FormData();

    // Create a copy of data without attachments for JSON serialization
    const ticketDataForJson = { ...data };
    delete ticketDataForJson.attachments;

    // Append the ticket data as JSON
    formData.append("payload", JSON.stringify(ticketDataForJson));

    // Handle attachments - use "files" to match API spec
    if (data.attachments && data.attachments.length > 0) {
      // Validate file count
      if (data.attachments.length > 5) {
        throw new Error("Maximum 5 attachments allowed");
      }

      data.attachments.forEach((file: File, index: number) => {
        // Ensure we're working with actual File objects
        if (file instanceof File) {
          // Check file size (25MB = 25 * 1024 * 1024 bytes)
          if (file.size > 25 * 1024 * 1024) {
            throw new Error(`File "${file.name}" exceeds 25MB limit`);
          }
          // Use "files" to match API specification
          formData.append("files", file);
        } else {
          console.warn(`Attachment at index ${index} is not a File object:`, file);
        }
      });
    }

    // Debug logging (remove in production)
    console.log("Update FormData contents:");
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    const response = await this.axiosInstance.patch(
      API_ENDPOINTS.JIRA.UPDATE_ISSUE(issueKey),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  }

  async getSitesCamerasByCustomer(customerId: string): Promise<SiteCamera> {
    const response = await this.axiosInstance.get(
      API_ENDPOINTS.CUSTOMERS.GET_BY_CUSTOMER(customerId),
    );
    return response.data;
  }

  async getCommentsByIssue(issueKey: string, userId: string): Promise<ApiComment[]> {
    const response = await this.axiosInstance.get(
      API_ENDPOINTS.JIRA.GET_COMMENT_BY_ISSUE(issueKey),
      {
        params: {
          user_id: userId,
        },
      },
    );
    return response.data;
  }

  async createComment(issueKey: string, data: CreateCommentData): Promise<CreateCommentResponse> {
    // Check if we have files to upload
    const hasFiles = data.attachments && data.attachments.length > 0;

    if (hasFiles) {
      // Use FormData for multipart/form-data when files are present
      const formData = new FormData();

      // Append required fields
      formData.append("user_id", data.user_id);
      formData.append("role", data.user_role);
      formData.append("comment_text", data.comment_text);

      // Append attachments
      data.attachments?.forEach((file: File) => {
        if (file instanceof File) {
          formData.append("files", file);
        } else {
          console.warn("Invalid file object:", file);
        }
      });

      const response = await this.axiosInstance.post(
        API_ENDPOINTS.JIRA.CREATE_COMMENT(issueKey),
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    } else {
      // Use URLSearchParams for application/x-www-form-urlencoded when no files
      const formData = new URLSearchParams();
      formData.append("user_id", data.user_id);
      formData.append("role", data.user_role);
      formData.append("comment_text", data.comment_text);

      const response = await this.axiosInstance.post(
        API_ENDPOINTS.JIRA.CREATE_COMMENT(issueKey),
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      return response.data;
    }
  }

  async transitionIssue(
    issueKey: string,
    targetStatus: TicketStatusEnum,
  ): Promise<TransitionResponse> {
    const response = await this.axiosInstance.post(
      API_ENDPOINTS.JIRA.TRANSITION_ISSUE(issueKey),
      null, // No body needed
      {
        params: {
          target_status: targetStatus, // Pass as query parameter
        },
      },
    );
    return response.data;
  }

  async getLocationTagsBySite(siteId: string): Promise<LocationTagResponse> {
    const response = await this.axiosInstance.get(API_ENDPOINTS.LOCATION_TAGS.GET(siteId));
    return response.data;
  }

  async createLocationTag(tagData: CreateLocationTagInput): Promise<LocationTag> {
    const response = await this.axiosInstance.post(API_ENDPOINTS.LOCATION_TAGS.CREATE, tagData);
    return response.data;
  }

  async updateLocationTag(tagId: string, tagData: UpdateLocationTagInput): Promise<LocationTag> {
    const response = await this.axiosInstance.put(
      API_ENDPOINTS.LOCATION_TAGS.UPDATE(tagId),
      tagData,
    );
    return response.data;
  }

  async deleteLocationTag(tagId: string): Promise<void> {
    await this.axiosInstance.delete(API_ENDPOINTS.LOCATION_TAGS.DELETE(tagId));
  }

  async getConfigurationHistory(customerId?: string, timezone?: string): Promise<AuditLogResponse> {
    const params: any = {};
    if (customerId) params.customer_id = customerId;
    if (timezone) params.timezone = timezone;

    const response = await this.axiosInstance.get(API_ENDPOINTS.CONFIGURATION_HISTORY.GET(), {
      params: Object.keys(params).length ? params : undefined,
    });
    return response.data;
  }

  async getMediaRunLogs(siteId: string, timezone?: string): Promise<MediaRunLogsResponse> {
    const params: any = {};
    if (timezone) params.timezone = timezone;

    const response = await this.axiosInstance.get(
      API_ENDPOINTS.CONFIGURATION_HISTORY.GET_MEDIA_RUN_LOGS(siteId),
      {
        params: Object.keys(params).length ? params : undefined,
      },
    );
    return response.data;
  }
}
console.log("ENV");
console.log(import.meta.env.VITE_API_BASE_URL);

// Optional: Create and export a singleton instance
export const apiClient = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || SECRETS.FALLBACK_BACKEND_URL,
);

export default ApiClient;
