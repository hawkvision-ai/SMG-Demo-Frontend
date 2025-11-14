import { apiClient } from "@/api/api-client";
import type {
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
  CreateFunctionalTagInput,
  CreateLocationTagInput,
  CreateNotificationConfigRequest,
  CreateNotificationConfigResponse,
  CreateTicket,
  CustomerAdmin,
  CustomerEventAnalyticsResponse,
  CustomerResponse,
  CustomerSchema,
  DeleteUserResponse,
  EventHeaderResponse,
  EventSchema,
  EventSiteFilterParams,
  EventSiteResponse,
  EventTableFilters,
  EventTableResponse,
  ForgotPasswordResponse,
  FunctionalTagResponse,
  GetActionResponse,
  GetUserPreferencesResponse,
  LocationTag,
  LocationTagResponse,
  LocationTagSiteResponse,
  MediaRunLogsResponse,
  MediaStatusResponse,
  MonitoringDataResponse,
  RefreshTokenResponse,
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
} from "@/api/types";
import { AuditLogResponse } from "@/components/SiteConfiguration/components/ConfigurationHistory/components/types";
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLoading } from "../context/LoadingContext"; // Import the loading context

type ApiFunction<T, A extends any[] = []> = (...args: A) => Promise<T>;

export function useApi<T, A extends any[] = []>(apiCall: ApiFunction<T, A>, initialData?: T) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { addLoadingOperation, removeLoadingOperation } = useLoading(); // Use loading context
  const { resetAuth } = useAuth(); // destructure resetAuth

  const execute = useCallback(
    async (...args: A): Promise<T> => {
      setLoading(true);
      addLoadingOperation(); // Add loading operation to global context
      setError(null);
      try {
        const result = await apiCall(...args);
        setData(result);
        return result;
      } catch (err: any) {
        // handle invalid credentials
        const errorMessage = err?.details || err?.message || "An unknown error occurred";
        if (errorMessage === "Invalid authentication credentials") {
          resetAuth?.(); // Reset context
          localStorage.removeItem("authToken"); // Remove stored token
        }

        const error = err instanceof Error ? err : new Error(errorMessage);
        setError(error);
        throw error;
      } finally {
        setLoading(false);
        removeLoadingOperation();
      }
    },
    [apiCall, addLoadingOperation, removeLoadingOperation, resetAuth],
  );

  return { data, loading, error, execute };
}

// Auth hooks
export function useRegister() {
  return useApi<any, [string, string]>((email, password) => apiClient.register(email, password));
}

export function useLogin() {
  return useApi<any, [string, string]>((username, password) => apiClient.login(username, password));
}

export function useRefreshToken() {
  return useApi<RefreshTokenResponse>(() => apiClient.refreshToken());
}

export function useForgotPassword() {
  return useApi<ForgotPasswordResponse, [string]>((email) => apiClient.forgotPassword(email));
}

export function useResetPassword() {
  return useApi<ResetPasswordResponse, [ResetPasswordRequest]>((resetData) =>
    apiClient.resetPassword(resetData),
  );
}

export function useCreateNewAccount() {
  return useApi<SetPasswordResponse, [SetPasswordRequest]>((request) =>
    apiClient.CreateNewAccount(request),
  );
}

export function useUpdateUser() {
  return useApi<UpdateUserSchema, [string, UpdateUserSchema]>((userId, userData) =>
    apiClient.updateUser(userId, userData),
  );
}

export function useSaveUserPreferences() {
  return useApi<SaveUserPreferencesSchema, [SaveUserPreferencesSchema]>((preferencesData) =>
    apiClient.saveUserPreferences(preferencesData),
  );
}

export function useGetUserPreferences() {
  return useApi<GetUserPreferencesResponse, [string, string]>((customerId, userId) =>
    apiClient.getUserPreferences(customerId, userId),
  );
}

// Customer hooks
export function useCustomers() {
  const apiResponse = useApi<CustomerResponse[]>(() => apiClient.listCustomers());

  useEffect(() => {
    apiResponse.execute();
  }, []);

  return apiResponse;
}

export function useCreateCustomer() {
  return useApi<CustomerResponse, [CustomerSchema]>((data) => apiClient.createCustomer(data));
}

export function useGetCustomer(id: string) {
  const apiResponse = useApi<CustomerResponse>(() => apiClient.getCustomer(id));

  useEffect(() => {
    if (id) {
      apiResponse.execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return apiResponse;
}

export function useUpdateCustomer() {
  return useApi<CustomerResponse, [string, Partial<CustomerSchema>]>((customerId, data) =>
    apiClient.updateCustomer(customerId, data),
  );
}

export function useDeleteCustomer() {
  return useApi<void, [string]>((customerId) =>
    toast.promise(apiClient.deleteCustomer(customerId), {
      loading: "Deleting customer...",
      success: "Customer deleted successfully!",
      error: "Failed to delete customer.",
    }),
  );
}

// Sync Allowed Use Cases hook
export function useSyncAllowedUseCases() {
  return useApi<SyncAllowedUseCasesResponse, [string]>((customerId) =>
    apiClient.syncAllowedUseCases(customerId),
  );
}

// Update Snapshot/Video Configuration hook
export function useUpdateSnapshotVideoConfig() {
  return useApi<UpdateSnapshotVideoResponse, [string, UpdateSnapshotVideoRequest]>(
    (customerId, data) => apiClient.updateSnapshotVideoConfig(customerId, data),
  );
}

// Sites hooks
export function useSites() {
  const apiResponse = useApi<SiteResponse[]>(() => apiClient.listSites());

  useEffect(() => {
    apiResponse.execute();
  }, [apiResponse.execute]);

  return apiResponse;
}

export function useGetSitesByCustomer(customerId?: string, userId?: string) {
  const { user } = useAuth();
  const { env } = useEnv();
  const effectiveCustomerId = customerId || user?.customer_id;
  const timeZone = user?.timezone || "UTC";
  const effectiveUserId = userId || "";

  const apiResponse = useApi<SiteResponse[]>(() => {
    if (!effectiveCustomerId) throw new Error("Customer ID is undefined");
    return apiClient.getSitesByCustomer(effectiveCustomerId, timeZone, effectiveUserId);
  });

  useEffect(() => {
    if (effectiveCustomerId) {
      apiResponse.execute();
    }
  }, [effectiveCustomerId, env, effectiveUserId]);

  return apiResponse;
}

export function useCreateSite() {
  const { user } = useAuth();

  return useApi<SiteResponse, [Omit<SiteSchema, "customer_id">]>((siteData) => {
    if (!user?.customer_id) {
      toast.error("Customer ID missing from user");
      throw new Error("Customer ID missing from user");
    }

    const fullPayload: SiteSchema = {
      ...siteData,
      customer_id: user.customer_id,
    };

    return apiClient
      .createSite(fullPayload)
      .then((response) => {
        toast.success("Site created successfully");
        return response;
      })
      .catch((error) => {
        toast.error(error.message || "Failed to create site");
        throw error;
      });
  });
}

export function useGetSite(siteId: string) {
  const apiResponse = useApi<SiteResponse>(() => apiClient.getSite(siteId));

  useEffect(() => {
    if (siteId) {
      apiResponse.execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  return apiResponse;
}

export function useUpdateSite() {
  return useApi<SiteResponse, [string, Partial<SiteSchema>]>(async (siteId, siteData) => {
    try {
      const response = await toast.promise(apiClient.updateSite(siteId, siteData), {
        loading: "Updating site...",
        success: "Site updated successfully!",
      });
      return response;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message;

      // Customize error messages based on backend response
      if (message?.includes("Edge device IDs cannot be the same")) {
        toast.error("Virtual and real edge device IDs cannot be the same.");
      } else if (err?.response?.status === 500) {
        toast.error("Server is down. Please try again later.");
      } else {
        toast.error(message || "An unexpected error occurred.");
      }

      throw err; // rethrow so the hook or caller still knows it failed
    }
  });
}

export function useDeleteSite() {
  return useApi<void, [string]>((siteId) =>
    toast.promise(apiClient.deleteSite(siteId), {
      loading: "Deleting site...",
      success: "Site deleted successfully!",
      error: "Failed to delete site.",
    }),
  );
}

export function useUploadSiteImage() {
  return useApi<any, [File]>((file) =>
    toast.promise(apiClient.uploadSiteImage(file), {
      loading: "Uploading image...",
      success: "Image uploaded successfully!",
      error: "Failed to upload image.",
    }),
  );
}
export function useSyncWithEdge() {
  return useApi<any, [SyncWithEdgeParams]>((params) =>
    toast.promise(apiClient.createPushUseCase(params), {
      loading: "Adding...",
      success: "Added to Playlist",
      error: "Failed to add.",
    }),
  );
}

export function useRealSyncWithEdge() {
  return useApi<any, [SyncWithEdgeRealParams]>((params) =>
    toast.promise(apiClient.realSyncWithEdge(params), {
      loading: "Camera config syncing...",
      success: "Camera config synced successfully!",
      error: "Failed to Sync camera config.",
    }),
  );
}

// Cameras hooks
export function useCameras() {
  const apiResponse = useApi<CameraResponse[]>(() => apiClient.listCameras());

  useEffect(() => {
    apiResponse.execute();
  }, [apiResponse.execute]);

  return apiResponse;
}

export function useGetCamerasByCustomer(customerId: string) {
  const { user } = useAuth();
  const effectiveCustomerId = customerId || user?.customer_id;

  const apiResponse = useApi<CameraResponse[]>(() => {
    if (!effectiveCustomerId) throw new Error("Customer ID is undefined");
    return apiClient.getCamerasByCustomer(effectiveCustomerId);
  });

  useEffect(() => {
    if (effectiveCustomerId) {
      apiResponse.execute();
    }
  }, [effectiveCustomerId]);

  return apiResponse;
}

export function useGetCamerasBySite() {
  const apiResponse = useApi<CameraResponse[], [string]>((siteId) => {
    if (!siteId) throw new Error("Site ID is undefined");
    return apiClient.getCamerasBySite(siteId);
  });

  return apiResponse;
}

export function useGetCamerasByTag(tag: string) {
  const apiResponse = useApi<CameraResponse[]>(() => {
    if (!tag) throw new Error("Tag is undefined");
    return apiClient.getCamerasByTag(tag);
  });

  useEffect(() => {
    if (tag) {
      apiResponse.execute();
    }
  }, [tag]);

  return apiResponse;
}

export function useCreateCamera() {
  return useApi<CameraResponse, [CameraSchema]>((cameraData) =>
    toast.promise(apiClient.createCamera(cameraData), {
      loading: "Creating camera...",
      success: "Camera created successfully!",
      error: "Failed to create camera.",
    }),
  );
}

export function useGetCamera(cameraId: string) {
  const apiResponse = useApi<CameraResponse>(() => apiClient.getCamera(cameraId));

  useEffect(() => {
    if (cameraId) {
      apiResponse.execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  return apiResponse;
}

export function useUpdateCamera() {
  return useApi<CameraResponse, [string, Partial<CameraSchema>]>((cameraId, cameraData) =>
    toast.promise(apiClient.updateCamera(cameraId, cameraData), {
      loading: "Updating camera...",
      success: "Camera updated successfully!",
      error: (error) => {
        const errorMessage =
          error?.response?.data?.detail || error?.message || "Failed to delete user.";
        if (typeof errorMessage === "object") {
          return JSON.stringify(errorMessage);
        }
        return errorMessage;
      },
    }),
  );
}

export function useUploadVideoUrl() {
  return useApi<any, [File]>((file) =>
    toast.promise(apiClient.uploadCameraVideo(file), {
      loading: "Uploading video...",
      error: "Failed to upload video.",
    }),
  );
}

export function useDeleteCamera() {
  return useApi<void, [string]>((cameraId) =>
    toast.promise(apiClient.deleteCamera(cameraId), {
      loading: "Deleting camera...",
      success: "Camera deleted successfully!",
      error: "Failed to delete camera.",
    }),
  );
}

/**
 * Hook to add a media URL to a camera's history.
 */
export function useAddMediaHistory() {
  // Assumes apiClient.addMediaHistory returns a response
  return useApi<any, [string, string]>((cameraId, url) =>
    toast.promise(apiClient.addMediaHistory(cameraId, url), {
      loading: "Adding media...",
      success: "Media added successfully!",
      error: "Failed to add media.",
    }),
  );
  // No useEffect needed as this is a mutation, called manually
}

/**
 * Hook to delete a media URL from a camera's history.
 */
export function useDeleteMediaHistory() {
  // Assumes apiClient.deleteMediaHistory returns void or a simple success indicator
  return useApi<void, [string, string]>((cameraId, url) =>
    toast.promise(apiClient.deleteMediaHistory(cameraId, url), {
      loading: "Deleting media...",
      success: "Media deleted successfully!",
      error: "Failed to delete media.",
    }),
  );
  // No useEffect needed as this is a mutation, called manually
}

/**
 * Hook to set the primary media URL for a camera.
 */
export function useSetMediaHistory() {
  // Assumes apiClient.setMediaHistory returns void or a simple success indicator
  return useApi<void, [string, string]>((cameraId, url) =>
    toast.promise(apiClient.setMediaHistory(cameraId, url), {
      loading: "Setting primary media...",
      success: "Primary media set successfully!",
      error: "Failed to set primary media.",
    }),
  );
  // No useEffect needed as this is a mutation, called manually
}

// Use Cases hooks
export function useUseCases() {
  const apiResponse = useApi<UseCaseResponse[]>(() => apiClient.listUseCases());

  useEffect(() => {
    apiResponse.execute();
  }, [apiResponse.execute]);

  return apiResponse;
}

export function useCreateUseCase() {
  const { user } = useAuth();

  return useApi<UseCaseResponse, [Omit<UseCaseSchema, "customer_id">]>((partialUseCaseData) => {
    if (!user?.customer_id) {
      toast.error("Customer ID missing from user");
      throw new Error("Customer ID missing from user");
    }

    const fullPayload: UseCaseSchema = {
      ...partialUseCaseData,
      customer_id: user.customer_id,
    };

    return toast.promise(apiClient.createUseCase(fullPayload), {
      loading: "Activating use case...",
      success: "Use case activated!",
      error: "Failed to activate use case.",
    });
  });
}

export function useGetUseCase(useCaseId: string) {
  const apiResponse = useApi<UseCaseResponse>(() => apiClient.getUseCase(useCaseId));

  useEffect(() => {
    if (useCaseId) {
      apiResponse.execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCaseId]);

  return apiResponse;
}

export function useDeleteUseCase() {
  return useApi<void, [string]>((useCaseId) =>
    toast.promise(apiClient.deleteUseCase(useCaseId), {
      loading: "Deactivating use case...",
      success: "Use case deactivated!",
      error: "Failed to deactivate use case.",
    }),
  );
}

export function useGetUseCasesByCamera(cameraId: string) {
  const apiResponse = useApi<UseCaseResponse[]>(() => {
    if (!cameraId) throw new Error("Camera ID is undefined");
    return apiClient.getUseCasesByCamera(cameraId);
  });

  useEffect(() => {
    if (cameraId) {
      apiResponse.execute();
    }
  }, [cameraId]);

  return apiResponse;
}

// ROIs hooks
export function useCreateRoi() {
  return useApi<ROIResponse, [ROISchema]>((roiData) =>
    toast.promise(apiClient.createRoi(roiData), {
      loading: "Creating ROI...",
      success: "ROI created successfully!",
      error: "Failed to create ROI.",
    }),
  );
}

export function useGetRoi(roiId: string) {
  const apiResponse = useApi<ROIResponse>(() => apiClient.getRoi(roiId));

  useEffect(() => {
    if (roiId) {
      apiResponse.execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roiId]);

  return apiResponse;
}

export function useUpdateRoi() {
  return useApi<ROIResponse, [string, ROIUpdate]>((roiId, roiData) =>
    toast.promise(apiClient.updateRoi(roiId, roiData), {
      loading: "Updating ROI...",
      success: "ROI updated successfully!",
      error: "Failed to update ROI.",
    }),
  );
}

export function useDeleteRoi() {
  return useApi<void, [string]>((roiId) =>
    toast.promise(apiClient.deleteRoi(roiId), {
      loading: "Deleting ROI...",
      success: "ROI deleted successfully!",
      error: "Failed to delete ROI.",
    }),
  );
}

export function useGetRoisByCamera(cameraId: string) {
  const apiResponse = useApi<ROIResponse[]>(() => {
    if (!cameraId) throw new Error("Camera ID is undefined");
    return apiClient.getRoisByCamera(cameraId);
  });

  useEffect(() => {
    if (cameraId) {
      apiResponse.execute();
    }
  }, [cameraId]);

  return apiResponse;
}

export function useDeleteFuncTagFromROI() {
  return useApi<void, [string, string]>((tagId, roiId) =>
    toast.promise(apiClient.deleteFuncTagFromROI(tagId, roiId), {
      loading: "Removing Function Tag...",
      success: "Function Tag deleted successfully!",
      error: "Failed to delete Function Tag.",
    }),
  );
}

// Boundary condition CURD HOOKS
export function useCreateEdge() {
  return useApi<any, [any]>((edgeData) =>
    toast.promise(apiClient.createEdge(edgeData), {
      loading: "Creating edge...",
      success: "Edge created successfully!",
      error: "Failed to create edge.",
    }),
  );
}

export function useGetEdgesByRoi() {
  return useApi<any[], [string]>((roiId) => apiClient.getEdgesByRoi(roiId));
}

export function useUpdateEdge() {
  return useApi<any, [string, any]>((edgeId, edgeData) =>
    toast.promise(apiClient.updateEdge(edgeId, edgeData), {
      loading: "Updating edge...",
      success: "Edge updated successfully!",
      error: "Failed to update edge.",
    }),
  );
}

export function useDeleteEdge() {
  return useApi<string, [string]>((edgeId) =>
    toast.promise(apiClient.deleteEdge(edgeId), {
      loading: "Deleting edge...",
      success: "Edge deleted successfully!",
      error: "Failed to delete edge.",
    }),
  );
}

export function useGetSiteCounterOccupancy() {
  return useApi<SiteCounterOccupancyData[], [string, string?, string?, string?]>(
    (siteId, fromDate, toDate, userTimezone) =>
      apiClient.getSiteCounterOccupancy(siteId, fromDate, toDate, userTimezone),
  );
}

// =================================================================
// COUNTER HOOKS - Add these to the end of your existing useApi.ts file
// =================================================================

export function useGetCountersBySite() {
  const apiResponse = useApi<CounterData[], [string, string?]>((siteId, timezone) => {
    if (!siteId) throw new Error("Site ID is undefined");
    return apiClient.getCountersBySite(siteId, timezone);
  });

  return apiResponse;
}

export function useCreateCounter() {
  return useApi<CounterData, [CreateCounterInput]>((counterData) => {
    const fullPayload: CreateCounterInput = {
      ...counterData,
    };

    return toast.promise(apiClient.createCounter(fullPayload), {
      loading: "Creating counter...",
      success: "Counter created successfully!",
      error: "Failed to create counter.",
    });
  });
}

export function useUpdateCounter() {
  return useApi<CounterData, [string, Partial<CounterData>]>((counterId, counterData) =>
    toast.promise(apiClient.updateCounter(counterId, counterData), {
      loading: "Updating counter...",
      success: "Counter updated successfully!",
      error: "Failed to update counter.",
    }),
  );
}

export function useDeleteCounter() {
  return useApi<void, [string]>((counterId) =>
    toast.promise(apiClient.deleteCounter(counterId), {
      loading: "Deleting counter...",
      success: "Counter deleted successfully!",
      error: "Failed to delete counter.",
    }),
  );
}

export function useGetEvent() {
  const apiResponse = useApi<EventSchema, [string, string?]>((id: string, timezone?: string) =>
    apiClient.getEvent(id, timezone),
  );
  return apiResponse;
}

// export function useDeleteEvent() {
//   return useApi<any, [string]>((eventId) =>
//     toast.promise(apiClient.deleteEvent(eventId), {
//       loading: "Deleting event...",
//       success: "Event deleted successfully!",
//       error: "Failed to delete event.",
//     }),
//   );
// }

// export function useUpdateEvent() {
//   return useApi<any, [string, EventUpdate]>((eventId, eventData) =>
//     toast.promise(apiClient.updateEvent(eventId, eventData), {
//       loading: "Updating event...",
//       success: "Event updated successfully!",
//       error: "Failed to update event.",
//     }),
//   );
// }

export function useUpdateEventStatusLogs() {
  return useApi<UpdateEventStatusLogsResponse, [string, StatusEnum, string]>(
    (eventId: string, status: StatusEnum, userId: string) =>
      apiClient.updateEventStatusLogs(eventId, status, userId),
  );
}

export function useFlagEvent() {
  return useApi<any, [string, boolean]>((eventId, valid) =>
    toast.promise(apiClient.flagEvent(eventId, valid), {
      loading: `Marking event as ${valid ? "Reported" : "valid"}...`,
      success: `Event marked as ${valid ? "Reported" : "valid"} successfully!`,
      error: `Failed to mark event as ${valid ? "Reported" : "valid"}.`,
    }),
  );
}

// export function useUpdateEventStatus() {
//   return useApi<any, [string, StatusEnum]>((eventId, status) =>
//     toast.promise(apiClient.updateEventStatus(eventId, status), {
//       loading: "Updating event status...",
//       success: "Event status updated successfully!",
//       error: "Failed to update event status.",
//     }),
//   );
// }

export function useGetEventSummary() {
  const apiResponse = useApi<any>(() => apiClient.getEventSummary());

  useEffect(() => {
    apiResponse.execute();
  }, [apiResponse.execute]);

  return apiResponse;
}

/**
 * Hook for fetching event header data (sites, cameras, use cases, etc.)
 * Used for populating filter dropdown options dynamically
 */
export function useGetEventHeader() {
  const { user } = useAuth();

  return useApi<EventHeaderResponse, [string?, string?]>(
    (site_ids?: string, camera_ids?: string) => {
      if (!user?.customer_id) {
        throw new Error("Customer ID is required");
      }

      return apiClient.getEventHeader(user.customer_id, site_ids, camera_ids);
    },
  );
}

// UPDATE YOUR EXISTING useGetFilteredTableEvents HOOK OR ADD THIS:

/**
 * Hook for fetching filtered table events
 * Updated to match exact API specification
 */
export function useGetFilteredTableEvents() {
  const { user } = useAuth();
  const { env } = useEnv();

  return useApi<EventTableResponse, [EventTableFilters?]>((params?: EventTableFilters) => {
    const validParams: EventTableFilters = {
      customer_id: user?.customer_id || "",
      timezone: user?.timezone || "UTC",
      page_no: params?.page_no || 1,
      page_size: params?.page_size || null,
      sort_order: params?.sort_order || "desc",
      env: env,
      user_id: user?.id || null,

      ...params,
    };

    return apiClient.getFilteredTableEvents(validParams);
  });
}

/**
 * Custom hook for fetching event IDs for a site with optional filtering
 * @returns Object with data, loading state, error state, and execute function
 */
export function useGetEventsModal() {
  return useApi<EventSiteResponse, [EventSiteFilterParams?]>((params?: EventSiteFilterParams) => {
    const validParams: EventSiteFilterParams = {
      page_no: params?.page_no || 1,
      page_size: params?.page_size || 8,
      sort_order: params?.sort_order || "desc",
      ...params,
    };
    return apiClient.getEventsBySite(validParams);
  });
}

// View event hook
export function useViewEvent() {
  return useApi<any, [string]>((eventId) => apiClient.viewEvent(eventId));
}

// Resolve event hook
export function useResolveEvent() {
  return useApi<any, [string]>((eventId) =>
    toast.promise(apiClient.resolveEvent(eventId), {
      loading: "Resolving event...",
      success: "Event resolved successfully!",
      error: "Failed to resolve event.",
    }),
  );
}

// Add comment hook

export function useAddCommentToEvent() {
  const { user } = useAuth();
  return useApi<any, [string, string, string?]>((eventId, commentText, timezone?) => {
    return apiClient.addCommentToEvent(
      eventId,
      commentText,
      user?.name || "Current User",
      timezone,
    );
  });
}

export function useGetEventStatusCount() {
  return useApi<StatusCountResponse, [TimeEnum, string]>((time, siteId) =>
    toast.promise(apiClient.getEventStatusCount(time, siteId), {
      loading: "Loading event status data...",
      error: `No event found for ${time}.`,
    }),
  );
}

/**
 * Hook to fetch analytics table data
 * @param params - Query parameters for analytics table
 * @returns API response handler for analytics table data
 * Analytics Dashboard Hook only one
 */
export function useGetAnalyticsTable(params: AnalyticsTableQueryParams) {
  // Use useCallback to memoize the api call function.
  // This prevents it from being recreated on every render, which stops the infinite loop.
  // The dependency array includes params to refetch when parameters change.
  const apiCall = useCallback(() => {
    return apiClient.getAnalyticsTable(params);
  }, [
    params.customer_id,
    params.user_id,
    params.from_date,
    params.to_date,
    params.time_period,
    params.env,
    params.timezone,
  ]); // Added params.env to dependencies

  // Pass the stable, memoized function to useApi
  return useApi<AnalyticsTableResponse, []>(apiCall);
}

// Add these to the existing hooks file

export function useCreateFunctionalTag() {
  const { user } = useAuth();

  return useApi<FunctionalTagResponse, [Omit<CreateFunctionalTagInput, "customer_id">]>(
    (tagData) => {
      if (!user?.customer_id) {
        toast.error("Customer ID missing from user");
        throw new Error("Customer ID missing from user");
      }

      const fullPayload: CreateFunctionalTagInput = {
        ...tagData,
        customer_id: user.customer_id,
      };

      return toast.promise(apiClient.createFunctionalTag(fullPayload), {
        loading: "Creating functional tag...",
        success: "Functional tag created successfully!",
        error: "Failed to create functional tag.",
      });
    },
  );
}

export function useGetFunctionalTagsBySite(siteId: string) {
  const apiResponse = useApi<FunctionalTagResponse[]>(() => {
    if (!siteId) throw new Error("Site ID is undefined");
    return apiClient.getFunctionalTagsBySite(siteId);
  });

  useEffect(() => {
    if (siteId) {
      apiResponse.execute();
    }
  }, [siteId]);

  return apiResponse;
}

// Edit Functional Tag
export function useEditFunctionalTag() {
  // The second parameter type should be a Record<string, any> instead of UpdateFunctionalTagInput
  // This allows sending usecase updates directly to your backend without nesting
  return useApi<FunctionalTagResponse, [string, Record<string, any>]>((tagId, tagData) =>
    toast.promise(apiClient.editFunctionalTag(tagId, tagData), {
      loading: "Updating functional tag...",
      success: "Functional tag updated successfully!",
      error: "Failed to update functional tag.",
    }),
  );
}

// Update Event Status Hook
export function useUpdateEventStatus() {
  return useApi<UpdateEventStatusResponse, [string, StatusEnum]>((eventId, status) =>
    apiClient.updateEventStatus(eventId, status),
  );
}

// Create Action Hook
export function useCreateAction() {
  const { user } = useAuth();

  return useApi<ActionResponse, [ActionRequest]>((actionData) => {
    if (!user?.name) {
      toast.error("Username missing from user");
      throw new Error("Username missing from user");
    }

    // Attach the username to created_by field in the request
    const fullPayload: ActionRequest = {
      ...actionData,
      created_by: user.name, // Assuming `user.username` holds the username
    };

    return apiClient.createAction(fullPayload);
  });
}

// Update Action Hook
export function useUpdateAction() {
  return useApi<UpdateActionResponse, [string, UpdateActionRequest]>((actionId, actionData) =>
    apiClient.updateAction(actionId, actionData),
  );
}

// Hook to fetch an Action

export function useGetAction() {
  const apiResponse = useApi<GetActionResponse, [string, string?]>(
    (actionId: string, timezone?: string) => apiClient.getAction(actionId, timezone),
  );
  return apiResponse;
}

export function useGetCustomerEventAnalytics() {
  const { user } = useAuth();
  return useApi<CustomerEventAnalyticsResponse, [string, string]>(
    (customerId: string, env?: string) =>
      apiClient.getCustomerEventAnalytics(customerId, env, user?.id),
  );
}

// Get Combined Events hook
export function useGetCombinedEvents() {
  const { user } = useAuth();
  return useApi<CombinedEventsResponse, [string, string?, string?]>(
    (customerId: string, timezone?: string, env?: string) =>
      apiClient.getCombinedEvents(customerId, timezone, env, user?.id),
  );
}

// Get Site Last Heartbeat hook
export function useGetSiteLastHeartbeat() {
  return useApi<SiteLastHeartbeatResponse, [string, string?, string?]>(
    (siteId: string, timezone?: string, env?: string) =>
      apiClient.getSiteLastHeartbeat(siteId, timezone, env),
  );
}

// Get Monitoring Data hook
export function useGetMonitoringData() {
  const { user } = useAuth();
  return useApi<MonitoringDataResponse, [string, string?, string?]>(
    (customerId: string, timezone?: string, env?: string) =>
      apiClient.getMonitoringData(customerId, timezone, env, user?.id),
  );
}

/**
 * Get Camera Health hook
 */
export function useGetCameraHealth() {
  const { user } = useAuth();
  return useApi<CameraResponse, [string, string?, string?]>(
    (customerId: string, timezone?: string, env?: string) =>
      apiClient.getCameraHealth(customerId, timezone, env, user?.id),
  );
}

// Notification Settings hooks

export const useGetUserNotificationConfig = (siteId: string) => {
  const apiResponse = useApi<UserNotificationConfig>(() => {
    if (!siteId) throw new Error("Site ID is undefined");
    return apiClient.getUserNotificationConfig(siteId);
  });

  useEffect(() => {
    if (siteId) {
      apiResponse.execute();
    }
  }, [siteId]);

  return apiResponse;
};

export const useGetCustomerAdmins = (siteId?: string) => {
  const { user } = useAuth();
  const apiResponse = useApi<CustomerAdmin[]>(() => {
    if (!user?.customer_id) throw new Error("Customer ID is undefined");
    if (!siteId) throw new Error("Site ID is undefined");
    return apiClient.getCustomerAdmins(user.customer_id, siteId);
  });

  useEffect(() => {
    if (user?.customer_id && siteId) {
      apiResponse.execute();
    }
  }, [user?.customer_id, siteId]);

  return apiResponse;
};

// New hook for creating and updating notification configs
export const useCreateUpdateNotificationConfigs = () => {
  return useApi<CreateNotificationConfigResponse, [CreateNotificationConfigRequest]>((configData) =>
    toast.promise(apiClient.createUpdateNotificationConfigs(configData), {
      loading: "Updating notification configuration...",
      success: "Notification configuration updated!",
      error: "Failed to update notification configuration.",
    }),
  );
};

// New hook for creating and updating notification configs in batch locations
export const useCreateUpdateNotificationConfigsBatch = () => {
  return useApi<CreateNotificationConfigResponse[], [CreateNotificationConfigRequest[]]>(
    (configDataArray) =>
      Promise.all(
        configDataArray.map((config) => apiClient.createUpdateNotificationConfigs(config)),
      ),
  );
};

export function useGetSiteMediaStatus() {
  return useApi<MediaStatusResponse[], [string, string]>((siteId: string, timezone: string) => {
    if (!siteId) {
      throw new Error("Site ID is required to fetch media status");
    }
    return apiClient.getSiteMediaStatus(siteId, timezone || "UTC");
  });
}

// Remove From Queue hook
export function useRemoveFromQueue() {
  return useApi<void, [string, string, string]>(
    (siteId: string, cameraId: string, mediaUrl: string) =>
      toast.promise(apiClient.removeFromMediaQueue(siteId, cameraId, mediaUrl), {
        loading: "Removing media from Playlist...",
        success: "Removed from Playlist",
        error: "Failed to remove media from queue.",
      }),
  );
}

export function useClearQueue() {
  return useApi<void, [string]>((siteId: string) =>
    toast.promise(apiClient.clearMediaQueue(siteId), {
      loading: "Clearing Playlist...",
      success: "Playlist cleared successfully!",
      error: "Failed to clear Playlist.",
    }),
  );
}

// Get Site Location Tags hook
export const useGetCameraLocationTags = (siteId: string) => {
  const apiResponse = useApi<LocationTagSiteResponse>(() => {
    if (!siteId) throw new Error("Site ID is undefined");
    return apiClient.getCameraLocationTags(siteId);
  });

  useEffect(() => {
    if (siteId) {
      apiResponse.execute();
    }
  }, [siteId]);

  return apiResponse;
};

export function useExportSystemLogs() {
  return useApi<{ data: Blob; headers: any }, [string, string, SystemLogExport?, string?]>(
    (site_id: string, user_id: string, format: SystemLogExport = "csv", env?: string) => {
      console.log(
        "Exporting system logs with site_id:",
        site_id,
        "user_id:",
        user_id,
        "format:",
        format,
        "csv:",
        env,
      );
      return apiClient.downloadSystemLogs(site_id, user_id, format, env).then((blob: Blob) => ({
        data: blob,
        headers: {},
      }));
    },
  );
}

// Update Video Metadata hook
export function useUpdateVideoMetadata() {
  return useApi<void, [string, string, { duration: number }]>(
    (cameraId: string, videoUrl: string, metadata: { duration: number }) =>
      toast.promise(apiClient.updateVideoMetadata(cameraId, videoUrl, metadata), {
        loading: "Updating video duration...",
        success: "Video duration updated successfully!",
        error: "Failed to update video duration.",
      }),
  );
}

// // Temporary state storage (will be replaced with API later)
// let countersStore: CounterData[] = [];

// export const useGetCountersBySite = () => {
//   const [data, setData] = useState<CounterData[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const execute = useCallback(async (siteId: string) => {
//     setLoading(true);
//     setError(null);

//     try {
//       // TODO: Replace with API call: apiClient.getCountersBySite(siteId)
//       await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
//       const siteCounters = countersStore.filter(counter => counter.siteId === siteId);
//       setData(siteCounters);
//     } catch (err: any) {
//       setError(err.message || 'Failed to fetch counters');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   return { data, loading, error, execute };
// };

// export const useCreateCounter = () => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const execute = useCallback(async (counterData: CreateCounterInput) => {
//     setLoading(true);
//     setError(null);

//     try {
//       // TODO: Replace with API call: apiClient.createCounter(counterData)
//       await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

//       const newCounter: CounterData = {
//         id: `counter-${Date.now()}`,
//         ...counterData,
//         isActive: true,
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//       };

//       countersStore.push(newCounter);
//       return newCounter;
//     } catch (err: any) {
//       setError(err.message || 'Failed to create counter');
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   return { execute, loading, error };
// };

// export const useUpdateCounter = () => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const execute = useCallback(async (counterId: string, updates: Partial<CreateCounterInput>) => {
//     setLoading(true);
//     setError(null);

//     try {
//       // TODO: Replace with API call: apiClient.updateCounter(counterId, updates)
//       await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay

//       const index = countersStore.findIndex(c => c.id === counterId);
//       if (index !== -1) {
//         // Update the counter with new data
//         countersStore[index] = {
//           ...countersStore[index],
//           ...updates,
//           id: counterId, // Keep the original ID
//           updatedAt: new Date().toISOString(),
//         };
//         return countersStore[index];
//       }
//       throw new Error('Counter not found');
//     } catch (err: any) {
//       setError(err.message || 'Failed to update counter');
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   return { execute, loading, error };
// };

// export const useDeleteCounter = () => {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const execute = useCallback(async (counterId: string) => {
//     setLoading(true);
//     setError(null);

//     try {
//       // TODO: Replace with API call: apiClient.deleteCounter(counterId)
//       await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay

//       countersStore = countersStore.filter(c => c.id !== counterId);
//     } catch (err: any) {
//       setError(err.message || 'Failed to delete counter');
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   return { execute, loading, error };
// };

// Consumer related hooks
export const useGetConsumerData = (consumerId: string) => {
  const { user } = useAuth();
  const apiResponse = useApi<ConsumerUser[]>(() => {
    if (!consumerId) throw new Error("Consumer ID is undefined");
    if (!user?.customer_id) throw new Error("Customer ID is undefined");
    return apiClient.getConsumerData(user?.customer_id);
  });

  useEffect(() => {
    if (consumerId && user?.customer_id) {
      apiResponse.execute();
    }
  }, [consumerId, user?.customer_id]);

  return apiResponse;
};

// Hook to create a new consumer
// Hook to create a new consumer
export const useCreateConsumer = () => {
  const apiResponse = useApi<ConsumerUser>(() => {
    throw new Error("Use execute method with consumer data");
  });

  const createConsumer = async (consumerData: CreateConsumerData) => {
    try {
      // Determine the role type for toast messages
      const isAdmin = consumerData.role === "admin" || consumerData.role === "cust_super_admin";
      const roleType = isAdmin ? "admin" : "consumer";

      const result = await toast.promise(apiClient.createConsumer(consumerData), {
        loading: `Creating ${roleType}...`,
        success: `${roleType.charAt(0).toUpperCase() + roleType.slice(1)} created successfully!`,
        error: `Failed to create ${roleType}.`,
      });
      return result;
    } catch (error) {
      throw error;
    }
  };

  return {
    ...apiResponse,
    createConsumer,
  };
};

export const useGetAllSites = (customerId: string) => {
  const { user } = useAuth();
  const apiResponse = useApi<AllSite[]>(() => {
    if (!customerId) throw new Error("Customer ID is undefined");
    if (!user?.customer_id) throw new Error("Customer ID is undefined");
    return apiClient.getSites(user?.customer_id);
  });

  useEffect(() => {
    if (customerId && user?.customer_id) {
      apiResponse.execute();
    }
  }, [customerId, user?.customer_id]);

  return apiResponse;
};

// Update consumer data hook
export const useUpdateConsumer = () => {
  return useApi<UpdateUserSchema, [string, Partial<UpdateUserSchema>]>((consumerId, consumerData) =>
    toast.promise(apiClient.updateConsumer(consumerId, consumerData), {
      loading: "Updating consumer...",
      success: "Profile updated successfully!",
      error: "Failed to update consumer.",
    }),
  );
};

// Delete consumer hook
export const useDeleteUser = () => {
  return useApi<DeleteUserResponse, [string, string]>((userId, currentUserId) =>
    toast.promise(apiClient.deleteUser(userId, currentUserId), {
      loading: "Deleting user...",
      success: "User deleted successfully!",
      error: (error) => {
        const errorMessage =
          error?.response?.data?.detail || error?.message || "Failed to delete user.";
        if (typeof errorMessage === "object") {
          return JSON.stringify(errorMessage);
        }
        return errorMessage;
      },
    }),
  );
};

/* ------------------------------------------------------------------- *
 *  Ticketing system apis for users
 * ------------------------------------------------------------------- */

export function useCreateTicket() {
  return useApi<any, [CreateTicket]>((data) =>
    toast.promise(apiClient.createTicket(data), {
      loading: "Creating ticket...",
      success: "Ticket created successfully!",
      error: "Failed to create ticket.",
    }),
  );
}

export function useGetTicketsByCustomer() {
  const { user } = useAuth();

  const apiResponse = useApi<TicketTableEntry[]>(() => apiClient.getAllTickets(user?.id || ""));
  return apiResponse;
}

export function useGetTicket(key: string) {
  const { user } = useAuth();

  const apiResponse = useApi<TicketTableEntry>(() => {
    if (!key) throw new Error("Ticket key is required");
    return apiClient.getTicket(key, user?.id || "");
  });

  return apiResponse;
}

export function useUpdateTicket() {
  return useApi<{ message: string }, [string, UpdateTicket]>((issueKey, updateData) =>
    toast.promise(apiClient.updateTicket(issueKey, updateData), {
      loading: "Updating ticket...",
      success: "Ticket updated successfully!",
      error: "Failed to update ticket.",
    }),
  );
}

export function useGetSitesCamerasByCustomer() {
  return useApi<SiteCamera, [string]>((customerId: string) =>
    apiClient.getSitesCamerasByCustomer(customerId),
  );
}

export function useGetCommentsByIssue() {
  const { user } = useAuth();

  return useApi<ApiComment[], [string]>((issueKey: string) =>
    apiClient.getCommentsByIssue(issueKey, user?.id || ""),
  );
}

export function useCreateComment() {
  return useApi<CreateCommentResponse, [string, CreateCommentData]>((issueKey, data) =>
    toast.promise(apiClient.createComment(issueKey, data), {
      loading: "Adding comment...",
      success: "Comment added successfully!",
      error: "Failed to add comment.",
    }),
  );
}

export function useTransitionIssue() {
  return useApi<TransitionResponse, [string, TicketStatusEnum]>(
    (issueKey: string, targetStatus: TicketStatusEnum) =>
      apiClient.transitionIssue(issueKey, targetStatus),
  );
}

// Get all location hook

export const useGetLocationTagsBySite = () => {
  return useApi<LocationTagResponse, [string]>((siteId) => apiClient.getLocationTagsBySite(siteId));
};

export const useCreateLocationTag = () => {
  return useApi<LocationTag, [CreateLocationTagInput]>((tagData) =>
    toast.promise(apiClient.createLocationTag(tagData), {
      loading: "Creating location tag...",
      success: "Location tag created successfully!",
      error: "Failed to create location tag.",
    }),
  );
};

export const useUpdateLocationTag = () => {
  return useApi<LocationTag, [string, UpdateLocationTagInput]>((tagId, tagData) =>
    toast.promise(apiClient.updateLocationTag(tagId, tagData), {
      loading: "Updating location tag...",
      success: "Location tag updated successfully!",
      error: "Failed to update location tag.",
    }),
  );
};

export const useDeleteLocationTag = () => {
  return useApi<void, [string]>((tagId) =>
    toast.promise(apiClient.deleteLocationTag(tagId), {
      loading: "Deleting location tag...",
      success: "Location tag deleted successfully!",
      error: "Failed to delete location tag.",
    }),
  );
};

export const useGetConfigurationHistory = (customerId?: string, timezone?: string) => {
  const apiResponse = useApi<AuditLogResponse>(() => {
    return apiClient.getConfigurationHistory(customerId, timezone);
  });

  useEffect(() => {
    apiResponse.execute();
  }, [customerId, timezone]);

  return apiResponse;
};

export const useGetMediaRunLogs = (siteId: string, timezone?: string) => {
  const apiResponse = useApi<MediaRunLogsResponse>(() => {
    return apiClient.getMediaRunLogs(siteId, timezone);
  });

  useEffect(() => {
    if (siteId) {
      apiResponse.execute();
    }
  }, [siteId, timezone]);

  return apiResponse;
};
