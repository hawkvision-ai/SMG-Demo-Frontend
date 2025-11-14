// API Endpoint Constants based on OpenAPI spec
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    SEND_OTP: "/auth/forgot-password",
    RESET_PASSWORD: "auth/reset-password",
    SET_PASSWORD: "/auth/new-password",
  },

  CUSTOMERS: {
    LIST: "/customers/",
    CREATE: "/customers/",
    GET: (id: string) => `/customers/${id}`,
    UPDATE: (id: string) => `/customers/${id}`, // Fixed from customerscustomer
    DELETE: (id: string) => `/customers/${id}`,
    GET_BY_CUSTOMER: (customerId: string) => `/customers/${customerId}/sites-cameras`,
    SYNC_ALLOWED_UCS: (customerId: string) => `/customers/${customerId}/sync-allowed-ucs`,
    UPDATE_SNAPSHOT_VIDEO: (customerId: string) => `/customers/${customerId}/is_snapshot`,
  },

  USERS: {
    UPDATE: (id: string) => `/user/${id}`,
    SAVE: "/user/user-preference",
    GET: (customerId: string, userId: string) => `/user/user-preference/${customerId}/${userId}`,
    CREATE_CONSUMER: "/user/create-user",
    LIST_CONSUMERS: (customerId: string) => `/user/users/${customerId}`,
    GET_ALL_SITES: (customerId: string) => `/user/sites/${customerId}`,
    UPDATE_CONSUMER: (user_id: string) => `/user/users/${user_id}`,
    DELETE_CONSUMER: (user_id: string, current_user_id: string) =>
      `/user/users/${user_id}?current_user_id=${current_user_id}`,
  },

  SITES: {
    LIST: "/sites/",
    CREATE: "/sites/",
    GET: (id: string) => `/sites/${id}`,
    UPDATE: (id: string) => `/sites/${id}`,
    DELETE: (id: string) => `/sites/${id}`,
    BY_CUSTOMER: (customerId: string, timezone: string, userId?: string) =>
      `/sites/by-customer/${customerId}?timezone=${timezone}${userId ? `&user_id=${userId}` : ""}`,
    UPLOAD_IMAGE: "/sites/upload-image",
    PUSH_TO_EDGE: (siteId: string, camId?: string, userEmail?: string, mediaUrl?: string) =>
      `media-queue/add?site_id=${siteId}&camera_id=${camId ?? "-1"}&user_email=${userEmail ?? ""}&media_url=${mediaUrl ?? ""}`,
    REMOVE_FROM_QUEUE: (siteId: string, cameraId: string, mediaUrl: string) =>
      `media-queue/remove?site_id=${siteId}&camera_id=${cameraId}&media_url=${mediaUrl}`,
    MEDIA_STATUS: "/sites/sites/media-status",
    REAL_SYNC_WITH_EDGE: (siteId: string) => `/sites/${siteId}/push-usecases`,
    CLEANUP_QUEUE: (siteId: string) => `/media-queue/cleanup-site/${siteId}`,
    GET_SITE_LOCATION_TAGS: (siteId: string) => `/sites/${siteId}/camera-location-tags`,
    GET_SITE_SYSTEM_LOGS: (siteId: string) => `/sites${siteId}/system-logs/download`,
  },

  CAMERAS: {
    LIST: "/cameras/",
    CREATE: "/cameras/",
    GET: (id: string) => `/cameras/${id}`,
    UPLOAD_VIDEO: "/cameras/upload-video",
    UPDATE: (id: string) => `/cameras/${id}`,
    DELETE: (id: string) => `/cameras/${id}`,
    BY_CUSTOMER: (customerId: string) => `/cameras/by-customer/${customerId}`,
    BY_SITE: (siteId: string) => `/cameras/by-site/${siteId}`,
    FILTER_BY_TAG: (tag: string) => `/cameras/filter-by-tag/${tag}`,
    MEDIA: (id: string) => `/cameras/${id}/media-history`,
    SET_MEDIA: (id: string) => `/cameras/${id}/set-camera-ip`,
    UPDATE_METADATA: "/cameras/video-metadata/update",
  },

  USECASES: {
    LIST: "/usecases/",
    CREATE: "/usecases/",
    GET: (id: string) => `/usecases/${id}`,
    DELETE: (id: string) => `/usecases/${id}`,
    BY_CAMERA: (cameraId: string) => `/usecases/by-camera/${cameraId}`,
  },

  ROIS: {
    LIST: "/rois/",
    CREATE: "/rois/",
    GET: (id: string) => `/rois/${id}`,
    UPDATE: (id: string) => `/rois/${id}`,
    DELETE: (id: string) => `/rois/${id}`,
    DELETE_FUNC_TAG: (tagId: string, roiId: string) => `/rois/func-tag/${roiId}/${tagId}`,
    BY_CAMERA: (cameraId: string) => `/rois/by-camera/${cameraId}`,
  },

  EDGES: {
    CREATE: () => `/edges/`,
    GET_BY_ROI: (roiId: string) => `/edges/${roiId}`,
    UPDATE: (edgeId: string) => `/edges/${edgeId}`,
    DELETE: (edgeId: string) => `/edges/${edgeId}`,
  },

  COUNTERS: {
    LIST: "/counters",
    CREATE: "/counters/",
    GET: (id: string) => `/counters/${id}`,
    UPDATE: (id: string) => `/counters/${id}`,
    DELETE: (id: string) => `/counters/${id}`,
    BY_SITE: (siteId: string) => `/counters/site/${siteId}`,
    GET_SITE_OCCUPANCY: "/counters/counter-reports",
  },

  EVENTS: {
    GET: (id: string) => `/events${id}`,
    // UPDATE: (eventId: string) => `/events/${eventId}`,
    FLAG: (id: string, valid: boolean) =>
      `/events/event/${id}/flag/${valid.toString().toLowerCase()}`,
    COMMENT: (id: string) => `/events/${id}/comment`,
    VIEW: (id: string) => `/events/${id}/seen`,
    RESOLVE: (id: string) => `/events/event/${id}/resolve`,
    UPDATE_STATUS: (id: string) => `/events/${id}/status`,
    SUMMARY: "/events/summary",
    TABLE: "/events/table",
    HEADER: "/events/header",
    EXPORT: "/events/events/export",
    MODAL_EVENTS: "/events/event/site",
    UPDATE_STATUS_LOGS: (id: string) => `/events/${id}/status_logs`,
  },

  ACTION: {
    CREATE: `/actions/`,
    UPDATE: (actionId: string) => `/actions/${actionId}`,
    GET: (actionId: string) => `/actions/${actionId}`,
  },

  ANALYTICS: {
    STATUS_COUNT: "/analytics/status-count",
    TABLE: "/analytics/table",
  },

  FUNCTIONAL_TAGS: {
    CREATE: "/functional-tags/",
    EDIT: (tagId: string) => `/functional-tags/${tagId}`,
    BY_SITE: (siteId: string) => `/functional-tags/by-site/${siteId}`,
  },

  SUMMARY: {
    GET: "/summary/analytics-summary",
    COMBINED_EVENTS: "/summary/events/combined",
    MONITORING_DATA: "/summary/monitoring-data",
    CAMERA_HEALTH: "/summary/camera-health",
    SITE_LAST_HEARTBEAT: "/summary/site-last-heartbeat",
    CUSTOMER_EVENT_ANALYTICS: "/summary/customers/event-analytics",
  },

  NOTIFICATIONS: {
    GET_USER_CONFIG: (siteId: string) => `/notifications/user-configs?site_id=${siteId}`,
    UPDATE_USER_CONFIG: (siteId: string) => `/notifications/user-configs/${siteId}`,
    GET_CUSTOMER_ADMINS: (customerId: string, siteId: string) =>
      `/notifications/customer-admins?customer_id=${customerId}&site_id=${siteId}`,
    CREATE_CONFIG: "/notifications/create-config",
  },

  JIRA: {
    CREATE_ISSUE: "/jira/create",
    GET_ISSUE: (issueId: string) => `/jira/ticket/${issueId}`,
    GET_ALL_ISSUES: () => "/jira/tickets",
    UPDATE_ISSUE: (issueId: string) => `/jira/update/${issueId}`,
    GET_COMMENT_BY_ISSUE: (issueKey: string) => `/jira/comments/${issueKey}`,
    CREATE_COMMENT: (issueKey: string) => `/jira/comment/${issueKey}`,
    TRANSITION_ISSUE: (issueKey: string) => `/jira/transition/${issueKey}`,
  },

  LOCATION_TAGS: {
    CREATE: "/location-tags/",
    GET: (site_id: string) => `/location-tags/by-site/${site_id}`,
    UPDATE: (tag_id: string) => `/location-tags/${tag_id}`,
    DELETE: (tag_id: string) => `/location-tags/${tag_id}`,
  },

  CONFIGURATION_HISTORY: {
    GET: () => `/config-history/`,
    GET_MEDIA_RUN_LOGS: (siteId: string) => `/config-history/media-run-logs/${siteId}`,
  },
};
