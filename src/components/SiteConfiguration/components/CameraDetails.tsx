import { SiteResponse } from "@/api/types";
import camImg from "@/assets/icons/camera.svg";
import placeHolderImage from "@/assets/image.jpg";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import Loading from "@/components/Loading";
import { getEdgeStatusText } from "@/components/SiteConfiguration/components/SiteCard";
import { TagInput } from "@/components/SiteConfiguration/ROI/TagInput";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import {
  useCreateUseCase,
  useDeleteFuncTagFromROI,
  useDeleteUseCase,
  useGetCameraLocationTags,
  useGetFunctionalTagsBySite,
  useGetRoisByCamera,
  useGetSite,
  useGetSiteMediaStatus,
  useGetUseCasesByCamera,
  useSyncWithEdge,
  useUpdateCamera,
  useUpdateRoi,
} from "@/hooks/useApi";
import { validateLocationTagName } from "@/utils/inputValidation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import ConfigureBoundariesModal from "../ROI/ConfigureBoundariesModal";
import ROIDefinitionModal from "../ROI/ROIDefinitionModal";
import { CameraData, MediaStatus } from "../types";
import AddCameraModal from "./AddCameraModal";
import { AssignFunctionalTagDialog } from "./AssignFunctionalTagDialog";
import CameraCalibrationModal from "./Camera/CameraCalibrationModal";
import QueueManager from "./Camera/QueueManager";
import { ListBox } from "./ListBox";
import SectionWrapper from "./SectionWrapper";
////Boundary imports
import { useGetCountersBySite, useGetEdgesByRoi } from "@/hooks/useApi";
import { BoundariesViewOnlyPanel, ROIDetailsPanel } from "../ROI/ROIDetailsPanel";

// Media Status enum
// export enum MediaStatus {
//   QUEUED = "queued",
//   RUNNING = "running",
//   FAILED = "failed",
//   READY = "ready"
// }

interface MediaFile {
  id: string;
  url: string;
  duration?: string;
  size?: string;
  name?: string;
  status: MediaStatus;
  globalPosition?: number;
  lastRan?: string;
  queuedAt?: string;
  ranBy?: string;
  lastMessage?: string;
  cameraId: string;
}

interface CameraDetailsProps {
  cameraId: string;
  siteId: string;
  camera?: CameraData;
  onCameraUpdate?: (updatedCamera: CameraData) => void;
  onBackToList?: () => void;
  onRefreshCameraList: () => void;
}

// Remove transformMediaHistory function since it's not used
export default function CameraDetails({
  cameraId,
  siteId,
  camera,
  onRefreshCameraList,
}: CameraDetailsProps) {
  const { env } = useEnv();
  const [showROIModal, setShowROIModal] = useState(false);
  const [showEditCameraModal, setShowEditCameraModal] = useState(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false); // New state for calibration modal
  const [rois, setRois] = useState<any[]>([]);
  const [currentCamera, setCurrentCamera] = useState<CameraData | null>(null);
  const [selectedROI, setSelectedROI] = useState<any | null>(null);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [useCases, setUseCases] = useState<any[]>([]);

  // Functional tag dialog states
  const [showFuncTagPrompt, setShowFuncTagPrompt] = useState(false); // for assign (first tag)
  const [pendingROI, setPendingROI] = useState<any | null>(null);
  const [selectedFuncTagsForROI, setSelectedFuncTagsForROI] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightCalibrationButton, setHighlightCalibrationButton] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Edit tag dialog states
  const [editRoi, setEditRoi] = useState<any | null>(null);
  const [assignTagDialogOpen, setAssignTagDialogOpen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [syncOverrideConfirmOpen, setSyncOverrideConfirmOpen] = useState(false);
  const [syncWaitMessage, setSyncWaitMessage] = useState(false);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [siteToSync, setSiteToSync] = useState<SiteResponse | null>(null);

  // Media status handling
  const { execute: fetchMediaStatus } = useGetSiteMediaStatus();
  const [transformedMediaList, setTransformedMediaList] = useState<MediaFile[]>([]);

  // State for tag dropdown
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);
  const tagInputContainerRef = useRef<HTMLDivElement>(null);

  //state for boundary configs
  const [showBoundariesModal, setShowBoundariesModal] = useState(false);
  const [useCaseViewMode, setUseCaseViewMode] = useState<"use-cases" | "boundaries">("use-cases");

  // Memoized setTransformedMediaList
  const memoizedSetTransformedMediaList = useCallback((mediaList: MediaFile[]) => {
    setTransformedMediaList(mediaList);
  }, []);

  // Fetch and transform media status
  const { user } = useAuth();
  const updateMediaStatus = useCallback(async () => {
    try {
      console.log(user?.timezone, "User Timezone");

      const status = await fetchMediaStatus(siteId, user?.timezone || "UTC");
      console.log(status, "Media Status from API");

      // First, sort all queued items by their position in the entire site
      const queuedItems = status.filter((item) => item.status === "queued");

      // Transform the media status
      const transformed = status
        .filter((item) => item.camera_id === cameraId)
        .map((item) => {
          // Find global position if the item is queued
          const globalPosition =
            item.status === "queued"
              ? queuedItems.findIndex((qItem) => qItem.media_url === item.media_url) + 1
              : undefined;

          // Helper function to format bytes to human readable format
          const formatBytes = (bytes: number | string | null | undefined) => {
            if (!bytes) return undefined;
            const numBytes = typeof bytes === "string" ? parseFloat(bytes) : bytes;
            if (isNaN(numBytes) || numBytes === 0) return undefined;

            const sizes = ["B", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(numBytes) / Math.log(1024));
            return `${Math.round((numBytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
          };

          // Helper function to format duration seconds to human readable format
          const formatDuration = (seconds: number | string | null | undefined) => {
            if (!seconds) return undefined;
            const numSeconds = typeof seconds === "string" ? parseFloat(seconds) : seconds;
            if (isNaN(numSeconds) || numSeconds === 0) return undefined;

            const hours = Math.floor(numSeconds / 3600);
            const minutes = Math.floor((numSeconds % 3600) / 60);
            const secs = Math.floor(numSeconds % 60);

            if (hours > 0) {
              return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
            } else {
              return `${minutes}:${secs.toString().padStart(2, "0")}`;
            }
          };

          return {
            id: `${item.camera_id}-${item.media_url}`,
            url: item.media_url,
            name: item.media_url.split("/").pop() || "Unnamed video",
            status: item.status as MediaStatus,
            globalPosition,
            cameraId: item.camera_id,
            lastMessage: item.last_message ?? undefined,
            lastRan: item.completed_at || undefined,
            queuedAt: item.created_at,
            ranBy: item.user_email,
            duration: formatDuration(item.duration_seconds),
            size: formatBytes(item.size_bytes),
          };
        });

      memoizedSetTransformedMediaList(transformed);
    } catch (error) {
      console.error("Error fetching media status:", error);
      toast.error("Failed to fetch media status");
    }
  }, [siteId, cameraId, memoizedSetTransformedMediaList]);

  // Add effect to fetch media status
  useEffect(() => {
    updateMediaStatus();

    // Set up polling interval
    const intervalId = setInterval(updateMediaStatus, 60000); // Poll every 5 seconds

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // API hooks
  const {
    data: apiRois,
    loading: roisLoading,
    error: roisError,
    execute: fetchRois,
  } = useGetRoisByCamera(cameraId);

  const {
    data: apiUseCases,
    loading: useCasesLoading,
    error: useCasesError,
    execute: fetchUseCases,
  } = useGetUseCasesByCamera(cameraId);

  ///boundaries hooks
  const { data: counters, execute: fetchCounters } = useGetCountersBySite();
  const { data: existingEdges, execute: fetchEdges } = useGetEdgesByRoi();

  const { execute: updateCameraApi } = useUpdateCamera();
  const { execute: createUseCase } = useCreateUseCase();
  const { execute: updateRoiApi } = useUpdateRoi();
  const { execute: deleteUseCase } = useDeleteUseCase();
  const { execute: syncWithEdge, error: syncError } = useSyncWithEdge();

  const { data: availableFunctionalTags = [] } = useGetFunctionalTagsBySite(siteId);
  const { data: locationTagsData, loading: loadingTags } = useGetCameraLocationTags(siteId || "");

  const { execute: deleteFuncTagFromROI } = useDeleteFuncTagFromROI();
  // Add these hooks near the top of the component with other hooks
  const {
    // data: siteData,
    execute: fetchSite,
  } = useGetSite(siteId); // Assuming you have a useGetSite hook

  //boundaries useEffect
  useEffect(() => {
    if (siteId) {
      fetchCounters(siteId);
    }
  }, [siteId]);

  useEffect(() => {
    if (selectedROI && !selectedROI.id.startsWith("temp-")) {
      fetchEdges(selectedROI.id);
    }
  }, [selectedROI]);

  // Add polling for site data
  useEffect(() => {
    const interval = setInterval(
      async () => {
        await fetchSite();
      },
      2 * 60 * 1000,
    ); // 2 minutes

    return () => clearInterval(interval);
  }, [siteId]);

  //BOundaries  functions

  const generateBoundariesData = (selectedROI: any, existingEdges: any[], counters: any[]) => {
    if (!selectedROI) return [];

    const generateBoundaryNames = (coordinatesLength: number): string[] => {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const names: string[] = [];
      for (let i = 0; i < coordinatesLength; i++) {
        const current = alphabet[i % alphabet.length];
        const next = alphabet[(i + 1) % coordinatesLength];
        names.push(`${current}${next}`);
      }
      return names;
    };

    const boundaries = generateBoundaryNames(selectedROI.coordinates.length);
    return boundaries.map((boundary) => {
      const inwardConfigs =
        existingEdges?.filter(
          (edge) => edge.boundary_name === boundary && edge.direction === "inward",
        ) || [];
      const outwardConfigs =
        existingEdges?.filter(
          (edge) => edge.boundary_name === boundary && edge.direction === "outward",
        ) || [];

      const mapConfigToDisplay = (config: any) => {
        if (config.action === "notify") {
          return { label: config.notify_condition || "Notify", type: "notify" as const };
        }
        const counter = counters?.find((c) => c.id === config.counter_id);
        return {
          label: counter ? counter.name : config.counter_id || "Counter",
          type: config.action as "increment" | "decrement",
        };
      };

      return {
        boundary,
        inward: inwardConfigs.map(mapConfigToDisplay),
        outward: outwardConfigs.map(mapConfigToDisplay),
      };
    });
  };

  const hasBoundariesConfigured = (boundariesData: any[]) => {
    return boundariesData.some(
      (boundary) => boundary.inward.length > 0 || boundary.outward.length > 0,
    );
  };

  // Add these useMemo hooks
  const boundariesData = useMemo(() => {
    if (!selectedROI) return [];
    return generateBoundariesData(selectedROI, existingEdges || [], counters || []);
  }, [selectedROI, existingEdges, counters]);

  const boundariesConfigured = useMemo(() => {
    return hasBoundariesConfigured(boundariesData);
  }, [boundariesData]);

  // Handle camera sync with edge
  // Handle camera sync with edge
  // Updated handleSyncWithEdge function with site status checks

  // const getHeartbeatStatus = (lastHeartbeat: string | undefined): "active" | "inactive" | "missing" => {
  //   // If no heartbeat data is available
  //   if (!lastHeartbeat) return "missing";

  //   try {
  //     // Debug mode - set to true to see logs, false for production
  //     const DEBUG = false;

  //     // The backend is sending timestamps in UTC format but without the 'Z' suffix
  //     // Need to handle the microseconds format (6 digits after decimal) vs milliseconds (3 digits)

  //     // Clean up the timestamp format
  //     let cleanHeartbeat = lastHeartbeat;

  //     // Check if it has microseconds (6 digits after decimal) and convert to milliseconds (3 digits)
  //     if (lastHeartbeat.includes('.') && !lastHeartbeat.endsWith('Z')) {
  //       const parts = lastHeartbeat.split('.');
  //       const baseTime = parts[0];
  //       let fraction = parts[1];

  //       // If it's microseconds format (6 digits), convert to milliseconds (3 digits)
  //       if (fraction.length > 3) {
  //         fraction = fraction.substring(0, 3);
  //       }

  //       // Rebuild the timestamp with 'Z' to explicitly mark it as UTC
  //       cleanHeartbeat = `${baseTime}.${fraction}Z`;
  //     } else if (!lastHeartbeat.endsWith('Z')) {
  //       // If no decimal but also no Z, add the Z
  //       cleanHeartbeat = `${lastHeartbeat}Z`;
  //     }

  //     // Parse the timestamp as UTC
  //     const heartbeatTime = new Date(cleanHeartbeat);

  //     // Check if the date is valid
  //     if (isNaN(heartbeatTime.getTime())) {
  //       console.warn("Invalid heartbeat timestamp:", lastHeartbeat);
  //       return "missing";
  //     }

  //     // Get current time in UTC
  //     const currentTime = new Date();

  //     if (DEBUG) {
  //       console.log("Original heartbeat:", lastHeartbeat);
  //       console.log("Cleaned heartbeat:", cleanHeartbeat);
  //       console.log("Parsed heartbeat time:", heartbeatTime.toISOString());
  //       console.log("Current time:", currentTime.toISOString());
  //     }

  //     // Calculate the difference in milliseconds
  //     const timeDifference = currentTime.getTime() - heartbeatTime.getTime();

  //     if (DEBUG) {
  //       console.log("Time difference (ms):", timeDifference);
  //       console.log("Time difference (minutes):", timeDifference / (60 * 1000));
  //     }

  //     // Configuration for timeout
  //     const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes in milliseconds

  //     // Return "active" if within threshold time
  //     return timeDifference < ACTIVE_THRESHOLD_MS ? "active" : "inactive";
  //   } catch (error) {
  //     console.error("Error processing heartbeat time:", error);
  //     return "missing";
  //   }
  // };

  // Add these useMemo hooks near your other hooks and state declarations
  // const heartbeatStatus = useMemo(() => {
  //   return getHeartbeatStatus(siteData?.last_heartbeat);
  // }, [siteData?.last_heartbeat]);

  // const isDeviceOffline = useMemo(() => {
  //   return heartbeatStatus === "inactive" || heartbeatStatus === "missing";
  // }, [heartbeatStatus]);

  // Replace the existing handleSyncWithEdge function with this updated version
  // const handleSyncWithEdge = async () => {

  //   console.log(heartbeatStatus);

  //   if (!currentCamera || !siteData) return;

  //   // Check if the device is offline based on heartbeat status
  //   if (isDeviceOffline) {
  //     toast.error(heartbeatStatus === "missing"
  //       ? "No heartbeat information available. Camera cannot be synced."
  //       : "Device is offline. Camera cannot be synced.");
  //     return;
  //   }

  //   // Check if any of the use cases require calibration
  //   const requiresCalibration = useCases.some(uc =>
  //     ['Near_Miss', 'Speeding'].includes(uc.name) && !currentCamera.calibration
  //   );

  //   if (requiresCalibration) {
  //     toast.error(`Camera calibration must be set before running with ${useCases
  //       .filter(uc => ['Near_Miss', 'Speeding'].includes(uc.name) && !currentCamera.calibration)
  //       .map(uc => uc.name)
  //       .join(' or ')} use cases`);

  //     // Highlight the calibration button
  //     setHighlightCalibrationButton(true);

  //     // Auto-reset the highlight after 3 seconds
  //     setTimeout(() => {
  //       setHighlightCalibrationButton(false);
  //     }, 3000);

  //     return;
  //   }

  //   // Check edge status to determine sync behavior
  //   const edgeStatus = siteData.edge_status;

  //   setSiteToSync(siteData);

  //   if (edgeStatus === EdgeStatus.CONFIG_RECEIVED) {
  //     setSyncWaitMessage(true);
  //     return;
  //   }

  //   // Check for active pipeline states
  //   const activeStates = [
  //     EdgeStatus.PIPELINE_STARTING,
  //     EdgeStatus.PIPELINE_RUNNING,
  //     EdgeStatus.CAMERAS_CONNECTED
  //   ];

  //   // if (edgeStatus && [EdgeStatus.PIPELINE_STARTING, EdgeStatus.CAMERAS_CONNECTED, EdgeStatus.PIPELINE_RUNNING].includes(edgeStatus)) {
  //   //   // Need confirmation to overwrite current configs
  //   //   if (!window.confirm("The device is already running. Are you sure you want to overwrite the current configuration?")) {
  //   //     return;
  //   //   }
  //   // }

  //   if (activeStates.includes(siteData.edge_status as EdgeStatus)) {
  //     setSyncOverrideConfirmOpen(true);
  //     return;
  //   }

  //   // Proceed with sync if all checks pass
  //   performSync();
  // };

  const performSync = async () => {
    if (!siteToSync) return;

    try {
      setIsSyncing(true);
      setSyncOverrideConfirmOpen(false);
      await syncWithEdge({ siteId: siteId, camId: cameraId });
      onRefreshCameraList?.();

      // Refresh site data after sync
      await fetchSite();
    } catch (error) {
      console.error("Failed to sync camera with edge:", error);
      setSyncErrorMessage(syncError?.message || "Failed to sync camera with edge");
    } finally {
      setIsSyncing(false);
      setSiteToSync(null);
    }
  };

  // Handle camera calibration
  const handleCameraCalibration = () => {
    setShowCalibrationModal(true);
  };

  // Handle calibration save
  const handleSaveCalibration = async (calibrationData: any) => {
    if (!currentCamera) return;

    try {
      setLoading(true);
      const { media_history, ...cameraWithoutMediaHistory } = currentCamera as any;
      await updateCameraApi(cameraId, {
        ...cameraWithoutMediaHistory,
        calibration: JSON.stringify(calibrationData),
      });

      setCurrentCamera({
        ...currentCamera,
        calibration: calibrationData,
      });

      onRefreshCameraList?.();
    } catch (error) {
      console.error("Failed to update camera calibration:", error);
      toast.error("Failed to update camera calibration");
    } finally {
      setLoading(false);
      setShowCalibrationModal(false);
    }
  };

  // Create a combined custom action component with both MediaSelector and calibration button
  const customActionComponent = (
    <div className="flex items-center justify-end gap-4">
      <QueueManager
        cameraId={cameraId}
        onAddMedia={onRefreshCameraList}
        refetchMedia={updateMediaStatus}
        mediaList={transformedMediaList}
        siteId={siteId}
      />
      <Button
        onClick={handleCameraCalibration}
        className={`ml-4 rounded-lg px-4 py-2 text-white transition ${
          highlightCalibrationButton
            ? "z-1 scale-100 transform animate-pulse bg-teal-700 shadow-lg hover:bg-teal-700"
            : "bg-teal-700 hover:bg-teal-700"
        }`}
        style={highlightCalibrationButton ? { transform: "scale(1.1)" } : {}}
      >
        {currentCamera?.calibration ? "View Camera Calibration" : "Set Camera Calibration"}
      </Button>
      {/* <Button
        onClick={handleSyncWithEdge}
        disabled={isSyncing || isDeviceOffline || siteData?.edge_status?.toLowerCase() === "configure received"}
        className={`ml-4 rounded-lg px-4 py-2 text-white transition ${isDeviceOffline ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        title={
          heartbeatStatus === "missing"
            ? "No heartbeat information available"
            : heartbeatStatus === "inactive"
              ? "Device is offline (no recent heartbeat)"
              : siteData?.edge_status?.toLowerCase() === "configure received"
                ? "Configuration is being processed"
                : ""
        }
      >
        {isSyncing ? (
          <span className="flex items-center">
            Syncing <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
          </span>
        ) : heartbeatStatus !== "active" ? (
          heartbeatStatus === "missing" ? "Device Offline" : "Device Offline"
        ) : ["pipeline starting", "camera connected", "pipeline running"].includes(siteData?.edge_status?.toLowerCase() || "") ? (
          "Reconfigure Camera"
        ) : (
          "Run Camera"
        )}
      </Button> */}
    </div>
  );

  function getTagNamesByIds(tagIds: string[]): string {
    return tagIds
      .map((id) => availableFunctionalTags.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }

  const tagMap = useMemo(
    () => Object.fromEntries(availableFunctionalTags.map((t) => [t.id, t])),
    [availableFunctionalTags],
  );

  // Initialize camera data
  useEffect(() => {
    if (camera) {
      setCurrentCamera(camera);
    } else {
      setCurrentCamera({
        id: cameraId,
        name: "Camera " + cameraId,
        locationTags: [],
        imageUrl: "",
        camera_ip: "",
      });
    }
  }, [camera, cameraId]);

  useEffect(() => {
    function updateSize() {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        setImageSize({
          width: rect.width,
          height: rect.height,
        });
      }
    }

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Resize observer to update image roi size dynamically
  useEffect(() => {
    if (!imageRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const rect = entry.contentRect;
        setImageSize({
          width: rect.width,
          height: rect.height,
        });
      }
    });

    observer.observe(imageRef.current);

    return () => observer.disconnect();
  }, []);

  // Fetch ROIs
  useEffect(() => {
    if (cameraId) {
      fetchRois().catch((error) => {
        console.error("Failed to fetch ROIs:", error);
        toast.error("Failed to load ROIs");
      });
    }
  }, [cameraId]);

  // Fetch UseCases
  useEffect(() => {
    if (cameraId) {
      fetchUseCases().catch((error) => {
        console.error("Failed to fetch UseCases:", error);
        toast.error("Failed to load UseCases");
      });
    }
  }, [cameraId]);

  // Update local state from API
  useEffect(() => {
    if (apiRois) setRois(apiRois);
  }, [apiRois]);

  useEffect(() => {
    if (apiUseCases) setUseCases(apiUseCases);
  }, [apiUseCases]);

  // Filter use cases by selected ROI only (don't filter by calibration requirement)
  const filteredUseCases = selectedROI
    ? useCases.filter((uc: any) => (uc.rois || []).includes(selectedROI.id))
    : [];

  // Tag Editing Logic with Enhanced Dropdown Support
  const toggleTagEditing = () => {
    if (isEditingTags) {
      handleSaveLocationTags();
      // Reset dropdown states when saving
      setShowTagDropdown(false);
      setSelectedSuggestionIndex(-1);
      setIsTagInputFocused(false);
    }
    setIsEditingTags(!isEditingTags);
    setTagInput("");
  };

  const handleSaveLocationTags = async () => {
    if (!currentCamera) return;
    try {
      await updateCameraApi(cameraId, {
        location_tags: currentCamera.locationTags,
      });
      onRefreshCameraList?.(); // <- ensure parent reloads list from API
    } catch (error) {
      console.error("Failed to update location tags:", error);
      toast.error("Failed to update location tags");
    }
  };

  // Enhanced tag input with dropdown support
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Handle comma/hash immediate addition
    if (value.includes(",") || value.includes("#")) {
      const newTag = value.replace(/[,#]/g, "").trim();

      // Validate the tag before adding
      if (newTag) {
        const validationError = validateLocationTagName(newTag);
        if (validationError) {
          toast.error(validationError);
          setTagInput("");
          setShowTagDropdown(false);
          setSelectedSuggestionIndex(-1);
          return;
        }

        // Check for duplicate tag name (case-sensitive)
        if (currentCamera && currentCamera.locationTags.includes(newTag)) {
          toast.error("A location tag with this name already exists");
          setTagInput("");
          setShowTagDropdown(false);
          setSelectedSuggestionIndex(-1);
          return;
        }

        // Check if tag exists in available tags (case-insensitive check for existing tags)
        const existsInAvailableTags = availableTags.some(
          (tag) => tag.toLowerCase() === newTag.toLowerCase(),
        );

        if (currentCamera) {
          if (
            existsInAvailableTags &&
            !currentCamera.locationTags.some((tag) => tag.toLowerCase() === newTag.toLowerCase())
          ) {
            // Tag exists in system but not in current camera tags, allow adding
            handleLocationTagsChange([...currentCamera.locationTags, newTag]);
          } else if (!existsInAvailableTags) {
            // New tag, allow adding
            handleLocationTagsChange([...currentCamera.locationTags, newTag]);
          }
        }
      }
      setTagInput("");
      setShowTagDropdown(false);
      setSelectedSuggestionIndex(-1);
    } else {
      setTagInput(value);
      setSelectedSuggestionIndex(-1); // Reset selection on new input
      // Show dropdown when typing
      if (value.trim()) {
        setShowTagDropdown(true);
      }
    }
  };

  // Enhanced keyboard navigation with dropdown support
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      let tagToAdd: string | null = null;

      // If there's a selected suggestion, use it
      if (selectedSuggestionIndex >= 0 && filteredTags.length > 0) {
        tagToAdd = filteredTags[selectedSuggestionIndex];
      } else if (filteredTags.length > 0) {
        // If no selection but there are filtered results, add the first one
        tagToAdd = filteredTags[0];
      } else if (tagInput.trim()) {
        // If no filtered results but there's input, add the input as new tag
        tagToAdd = tagInput.trim();
      }

      // Validate before adding
      if (tagToAdd) {
        const validationError = validateLocationTagName(tagToAdd);
        if (validationError) {
          toast.error(validationError);
          setTagInput("");
          setShowTagDropdown(false);
          setSelectedSuggestionIndex(-1);
          return;
        }

        // Check for duplicate tag name (case-insensitive)
        if (
          currentCamera &&
          currentCamera.locationTags.some((tag) => tag.toLowerCase() === tagToAdd.toLowerCase())
        ) {
          toast.error("A location tag with this name already exists");
          setTagInput("");
          setShowTagDropdown(false);
          setSelectedSuggestionIndex(-1);
          return;
        }

        if (
          currentCamera &&
          !currentCamera.locationTags.some((tag) => tag.toLowerCase() === tagToAdd.toLowerCase())
        ) {
          handleLocationTagsChange([...currentCamera.locationTags, tagToAdd]);
        }
      }

      setTagInput("");
      setShowTagDropdown(false);
      setSelectedSuggestionIndex(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredTags.length > 0) {
        setSelectedSuggestionIndex((prev) => (prev < filteredTags.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredTags.length > 0) {
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : filteredTags.length - 1));
      }
    } else if (e.key === "Escape") {
      setShowTagDropdown(false);
      setIsTagInputFocused(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // New focus handlers for dropdown
  const handleTagInputFocus = () => {
    setIsTagInputFocused(true);
    if (tagInput.trim() || availableTags.length > 0) {
      setShowTagDropdown(true);
    }
    setSelectedSuggestionIndex(-1);
  };

  const handleTagInputBlur = () => {
    // Delay hiding dropdown to allow for clicks
    setTimeout(() => {
      setIsTagInputFocused(false);
      setShowTagDropdown(false);
      setSelectedSuggestionIndex(-1);
    }, 150);
  };

  // Add tag from dropdown selection
  const addTagFromDropdown = (tag: string) => {
    // Validate before adding
    const validationError = validateLocationTagName(tag);
    if (validationError) {
      toast.error(validationError);
      setTagInput("");
      setShowTagDropdown(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    // Check for duplicate tag name (case-insensitive)
    if (
      currentCamera &&
      currentCamera.locationTags.some(
        (existingTag) => existingTag.toLowerCase() === tag.toLowerCase(),
      )
    ) {
      toast.error("A location tag with this name already exists");
      setTagInput("");
      setShowTagDropdown(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    if (
      currentCamera &&
      !currentCamera.locationTags.some(
        (existingTag) => existingTag.toLowerCase() === tag.toLowerCase(),
      )
    ) {
      handleLocationTagsChange([...currentCamera.locationTags, tag]);
    }
    setTagInput("");
    setShowTagDropdown(false);
    setSelectedSuggestionIndex(-1);
  };

  // Existing functions (unchanged)
  const handleLocationTagsChange = (newTags: string[]) => {
    if (currentCamera) {
      const updatedCamera = { ...currentCamera, locationTags: newTags };
      setCurrentCamera(updatedCamera);
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (currentCamera) {
      handleLocationTagsChange(currentCamera.locationTags.filter((tag) => tag !== tagToRemove));
    }
  };

  // Enhanced filtering logic - filter by items that START with the typed letters
  const availableTags = locationTagsData?.camera_location_tags || [];
  const filteredTags = availableTags.filter(
    (tag) =>
      tag.toLowerCase().startsWith(tagInput.toLowerCase()) &&
      currentCamera &&
      !currentCamera.locationTags.includes(tag),
  );

  // Helper function to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const matchLength = query.length;
    const matchedPart = text.substring(0, matchLength);
    const remainingPart = text.substring(matchLength);

    return (
      <span>
        <span className="font-medium text-gray-500">{matchedPart}</span>
        <span className="font-bold text-black">{remainingPart}</span>
      </span>
    );
  };
  // ROI click handler
  const handleSelectROI = (roi: any) => {
    // Reset edit dialog state
    setEditRoi(null);
    setAssignTagDialogOpen(false);

    if (!roi.func_tag_ids || roi.func_tag_ids.length === 0) {
      setPendingROI(roi);
      setShowFuncTagPrompt(true);
      setSelectedROI(null);
    } else {
      setSelectedROI(roi);
    }
  };

  useEffect(() => {
    function updateSize() {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        setImageSize({
          width: rect.width,
          height: rect.height,
        });
      }
    }

    updateSize(); // initial call
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const fullViewROI = useMemo(() => {
    return rois.find((r) => r.name?.toLowerCase() === "full view");
  }, [rois]);

  // Edit ROI handler
  const handleEditROI = (roi: any) => {
    // Reset assign dialog state
    setPendingROI(null);
    setShowFuncTagPrompt(false);

    setEditRoi(roi);
    setAssignTagDialogOpen(true);
    setSelectedFuncTagsForROI([]);
  };

  // Modal close handler
  const handleCloseROIModal = () => {
    setShowROIModal(false);
    fetchRois();
  };

  const handleAddUseCase = async (type: string, tag: any) => {
    if (!selectedROI) return;

    // Check for calibration requirement for Near_Miss and Speeding use cases
    if ((type === "Near_Miss" || type === "Speeding") && !currentCamera?.calibration) {
      toast.error(`Camera calibration must be set before adding ${type} use case`);

      // Highlight the calibration button
      setHighlightCalibrationButton(true);

      // Auto-reset the highlight after 3 seconds
      setTimeout(() => {
        setHighlightCalibrationButton(false);
      }, 3000);

      return;
    }

    // Prevent duplicate type across different tags for same ROI
    const hasSameType = filteredUseCases.some(
      (uc) => uc.name === type && uc.rois.includes(selectedROI.id),
    );

    if (hasSameType) {
      toast.error(`Only one '${type}' use case can be added per ROI.`);
      return;
    }

    try {
      await createUseCase({
        name: type,
        func_tag: tag.id,
        func_tag_name: tag.name,
        rois: [selectedROI.id],
        camera_id: cameraId,
        count_notify: true,
        type: type,
        site_id: siteId,
      });
      fetchUseCases();
    } catch (err) {
      console.error("create use-case failed", err);
    }
  };

  // In CameraDetails.tsx - Update the handleDeleteFuncTag function
  const handleDeleteFuncTag = async (tagId: string) => {
    if (!editRoi) return;

    // Check for associated use cases
    const associatedUseCases = useCases.filter(
      (uc) => uc.rois.includes(editRoi.id) && uc.func_tag === tagId,
    );

    if (associatedUseCases.length > 0) {
      toast.error("Remove all use cases for this tag before deleting it.");
      return;
    }

    try {
      // Make API call
      await deleteFuncTagFromROI(tagId, editRoi.id);

      // Refresh data from server to ensure consistency
      await fetchRois();

      // Optimistically update the UI first
      setEditRoi((prev: any) => ({
        // Add type annotation here
        ...prev,
        func_tag_ids: prev.func_tag_ids.filter((id: string) => id !== tagId), // Add type here
      }));

      // Update the global ROIs list
      setRois((prev) =>
        prev.map((roi) =>
          roi.id === editRoi.id
            ? { ...roi, func_tag_ids: roi.func_tag_ids.filter((id: string) => id !== tagId) }
            : roi,
        ),
      );
    } catch (error) {
      toast.error("Failed to remove tag");
    }
  };

  const roiTagIds: string[] = selectedROI?.func_tag_ids ?? [];

  const tagsForROI = roiTagIds.map((id) => tagMap[id]).filter(Boolean);

  // one entry per (type,tag) - show all options
  const typeTagPairs = useMemo(
    () =>
      tagsForROI.flatMap((tag) => Object.keys(tag.usecases ?? {}).map((type) => ({ type, tag }))),
    [tagsForROI, apiRois],
  );

  const existingUseCaseIds = new Set(filteredUseCases.map((uc) => `${uc.name}:${uc.func_tag}`));

  // Error and loading
  const isLoading = !currentCamera || roisLoading || useCasesLoading;

  if (roisError || useCasesError) {
    return (
      <div className="flex h-120 flex-col items-center justify-center rounded-xl bg-gray-100 p-2.5 shadow-md">
        <p className="mb-2 text-center text-red-500">Error loading camera details</p>
        <Button
          onClick={() => {
            fetchRois();
            fetchUseCases();
          }}
          className="rounded bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <SectionWrapper
      entityName={currentCamera?.name || ""}
      iconSrc={camImg}
      customActionComponent={customActionComponent}
      height="80vh"
    >
      {isLoading ? (
        <Loading />
      ) : (
        <div className="mt-6 flex flex-col gap-6 overflow-hidden lg:h-[70vh] lg:flex-row">
          {/* Left: ROI List */}
          <div className="w-full lg:w-3/12">
            <ListBox
              title="Regions of Interest"
              placeholder="ROI"
              items={rois}
              getItemLabel={(roi) => {
                const tagNames = getTagNamesByIds(roi.func_tag_ids || []);
                return tagNames
                  ? `${roi.name || `ROI ${roi.id}`} (${tagNames})`
                  : `${roi.name || `ROI ${roi.id}`}`;
              }}
              getItemId={(roi) => roi.id}
              selectedItem={selectedROI}
              onItemClick={handleSelectROI}
              onAdd={() => setShowROIModal(true)}
              className="h-[60vh] lg:h-full"
              onEdit={handleEditROI}
            />
          </div>

          {/* Center: Camera Image & Tags */}
          <div className="flex w-full flex-col lg:h-full lg:w-6/12">
            {/* Image Container - Fixed aspect ratio and responsive */}
            <div className="relative flex min-h-[200px] flex-1 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
              <div className="relative flex h-full w-full items-center justify-center p-4">
                <div className="relative flex h-full max-h-full w-full items-center justify-center">
                  <img
                    ref={imageRef}
                    src={currentCamera.imageUrl || placeHolderImage}
                    alt="Camera View"
                    className="block h-auto max-h-full w-auto max-w-full object-contain"
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                    onLoad={() => {
                      if (imageRef.current) {
                        const rect = imageRef.current.getBoundingClientRect();
                        setImageSize({
                          width: rect.width,
                          height: rect.height,
                        });
                      }
                    }}
                    onError={(e) => {
                      e.currentTarget.src = placeHolderImage;
                    }}
                  />

                  {/* SVG overlay for ROI polygons */}
                  {imageSize.width > 0 && imageSize.height > 0 && (
                    <svg
                      className="pointer-events-auto absolute"
                      style={{
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: `${imageSize.width}px`,
                        height: `${imageSize.height}px`,
                        maxWidth: "100%",
                        maxHeight: "100%",
                      }}
                      viewBox={`-5 -5 ${imageSize.width + 10} ${imageSize.height + 10}`}
                      preserveAspectRatio="xMidYMid meet"
                      onClick={() => {
                        if (fullViewROI) {
                          handleSelectROI(fullViewROI);
                        }
                      }}
                    >
                      {(selectedROI
                        ? [selectedROI]
                        : rois.filter((r) => r.name?.toLowerCase() !== "full view")
                      ).map((roi) => {
                        const points = roi.coordinates
                          ?.map((pt: any) => `${pt.x * imageSize.width},${pt.y * imageSize.height}`)
                          .join(" ");

                        const centerX =
                          roi.coordinates.reduce((sum: number, pt: any) => sum + pt.x, 0) /
                          roi.coordinates.length;
                        const centerY =
                          roi.coordinates.reduce((sum: number, pt: any) => sum + pt.y, 0) /
                          roi.coordinates.length;

                        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

                        return (
                          <g
                            key={roi.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectROI(roi);
                            }}
                            className="cursor-pointer"
                          >
                            <polygon
                              points={points}
                              fill="rgba(239, 68, 68, 0.2)"
                              stroke="#dc2626"
                              strokeWidth="2"
                              className="transition-colors duration-200 hover:fill-red-300/30"
                            />

                            {/* ADD POINT LABELS - Only show for selected ROI */}
                            {selectedROI &&
                              selectedROI.id === roi.id &&
                              roi.coordinates?.map((coord: any, index: number) => (
                                <g key={`point-${index}`}>
                                  {/* Point circle */}
                                  <circle
                                    cx={coord.x * imageSize.width}
                                    cy={coord.y * imageSize.height}
                                    r="12"
                                    fill="#FCD34D"
                                    stroke="#dc2626"
                                    strokeWidth="2"
                                  />
                                  {/* Point label */}
                                  <text
                                    x={coord.x * imageSize.width}
                                    y={coord.y * imageSize.height}
                                    fontSize="10"
                                    fill="#000000"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontWeight="bold"
                                  >
                                    {alphabet[index % alphabet.length]}
                                  </text>
                                </g>
                              ))}

                            <text
                              x={centerX * imageSize.width}
                              y={centerY * imageSize.height}
                              fontSize="14"
                              fill="#ffffff"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontWeight="bold"
                              className="drop-shadow-lg"
                              style={{
                                textShadow: "0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)",
                              }}
                            >
                              {roi.name || `ROI ${roi.id}`}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Location Tags Section - Fixed height with proper z-index */}
            <div className="relative z-10 mt-4 flex-shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex h-40 flex-col p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-800">Location Tags</h3>
                  <Button
                    onClick={toggleTagEditing}
                    className="rounded-md px-3 py-1 text-sm font-medium text-teal-700 transition-colors duration-150 hover:bg-teal-50 hover:text-teal-800"
                  >
                    {isEditingTags ? "Save" : "Edit Tags"}
                  </Button>
                </div>

                <div className="flex-1 overflow-visible">
                  {isEditingTags ? (
                    <div className="space-y-2">
                      <div className="relative z-20" ref={tagInputContainerRef}>
                        {/* Dropdown rendered above the input */}
                        {showTagDropdown && (tagInput.trim() || availableTags.length > 0) && (
                          <div
                            className="ring-opacity-5 absolute z-[60] mb-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black"
                            style={{ bottom: "100%" }}
                          >
                            {filteredTags.length > 0 ? (
                              <>
                                <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                                  Matching Tags
                                </div>
                                {filteredTags.map((tag, index) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 focus:outline-none ${
                                      selectedSuggestionIndex === index
                                        ? "border-l-2 border-teal-500 bg-teal-100"
                                        : index === 0 && selectedSuggestionIndex === -1
                                          ? "bg-teal-25 border-l-2 border-teal-400 bg-gray-100"
                                          : "hover:bg-teal-50"
                                    }`}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      addTagFromDropdown(tag);
                                    }}
                                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                  >
                                    <span
                                      className={`h-2 w-2 rounded-full ${
                                        selectedSuggestionIndex === index
                                          ? "bg-teal-600"
                                          : index === 0 && selectedSuggestionIndex === -1
                                            ? "bg-teal-500"
                                            : "bg-gray-400"
                                      }`}
                                    />
                                    <span className="flex-1">{highlightMatch(tag, tagInput)}</span>
                                    {(selectedSuggestionIndex === index ||
                                      (index === 0 && selectedSuggestionIndex === -1)) && (
                                      <span className="text-xs font-medium text-teal-600">↵</span>
                                    )}
                                  </button>
                                ))}
                              </>
                            ) : tagInput.trim() ? (
                              <div className="px-3 py-3 text-sm">
                                <div className="mb-1 text-gray-500">
                                  Press Enter to add new tag:
                                </div>
                                <div className="flex items-center gap-2 font-medium text-gray-700">
                                  <span className="h-2 w-2 rounded-full bg-blue-500" />"
                                  {tagInput.trim()}"
                                  <span className="ml-auto text-xs font-medium text-blue-600">
                                    ↵
                                  </span>
                                </div>
                              </div>
                            ) : (
                              availableTags.length > 0 && (
                                <>
                                  <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                                    All Available Tags
                                  </div>
                                  {availableTags
                                    .filter((tag) => !currentCamera.locationTags.includes(tag))
                                    .slice(0, 8)
                                    .map((tag) => (
                                      <button
                                        key={tag}
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          addTagFromDropdown(tag);
                                        }}
                                      >
                                        <span className="h-2 w-2 rounded-full bg-gray-400" />
                                        {tag}
                                      </button>
                                    ))}
                                  {availableTags.filter(
                                    (tag) => !currentCamera.locationTags.includes(tag),
                                  ).length > 8 && (
                                    <div className="border-t border-gray-100 px-3 py-2 text-center text-xs text-gray-500">
                                      +
                                      {availableTags.filter(
                                        (tag) => !currentCamera.locationTags.includes(tag),
                                      ).length - 8}{" "}
                                      more tags...
                                    </div>
                                  )}
                                </>
                              )
                            )}
                          </div>
                        )}
                        <TagInput
                          tags={currentCamera.locationTags}
                          tagInput={tagInput}
                          onTagInputChange={handleTagInputChange}
                          onRemoveTag={removeTag}
                          disabled={false}
                          onTagInputKeyDown={handleTagInputKeyDown}
                          onTagInputFocus={handleTagInputFocus}
                          onTagInputBlur={handleTagInputBlur}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 overflow-y-auto">
                      {currentCamera.locationTags.length > 0 ? (
                        currentCamera.locationTags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full border border-teal-200 bg-teal-100 px-3 py-1 text-sm font-medium text-teal-800 transition-colors duration-150 hover:bg-teal-200"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500 italic">No location tags</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Use Cases List */}
          {/* <div className="w-full lg:w-3/12">
            <ListBox
              title="Use Cases"
              items={typeTagPairs}
              placeholder="Use Case"
              isMultiSelect
              selectedItems={typeTagPairs.filter((pair) =>
                existingUseCaseIds.has(`${pair.type}:${pair.tag.id}`),
              )}
              getItemId={({ type, tag }) => `${type}:${tag.id}`}
              getItemLabel={({ type, tag }) => `${tag.name}: ${type}`}
              onItemClick={async ({ type, tag }) => {
                const exists = filteredUseCases.find(
                  (uc: any) => uc.name === type && uc.func_tag === tag.id,
                );

                if (exists) {
                  try {
                    await deleteUseCase(exists.id);
                    fetchUseCases();
                  } catch (err) {
                    toast.error("Failed to delete use case");
                  }
                } else {
                  handleAddUseCase(type, tag);
                }
              }}
              className="h-[60vh] lg:h-full"
              emptyStateMessage={
                roiTagIds.length === 0
                  ? "Select a functional tag to view use cases"
                  : "No use cases"
              }
            />
          </div> */}
          <ROIDetailsPanel
            selectedROI={selectedROI}
            useCaseViewMode={useCaseViewMode}
            onSetUseCaseViewMode={setUseCaseViewMode}
            onSetupBoundaries={() => setShowBoundariesModal(true)}
            isEmpty={
              useCaseViewMode === "use-cases"
                ? roiTagIds.length === 0 || typeTagPairs.length === 0
                : !selectedROI || !boundariesConfigured
            }
            emptyStateMessage={
              useCaseViewMode === "use-cases"
                ? roiTagIds.length === 0
                  ? "Select a functional tag to view use cases"
                  : "No use cases"
                : undefined
            }
          >
            {useCaseViewMode === "use-cases" ? (
              <ListBox
                title=""
                items={typeTagPairs}
                placeholder="Use Case"
                isMultiSelect
                selectedItems={typeTagPairs.filter((pair) =>
                  existingUseCaseIds.has(`${pair.type}:${pair.tag.id}`),
                )}
                getItemId={({ type, tag }) => `${type}:${tag.id}`}
                getItemLabel={({ type, tag }) => `${tag.name}: ${type}`}
                onItemClick={async ({ type, tag }) => {
                  const exists = filteredUseCases.find(
                    (uc: any) => uc.name === type && uc.func_tag === tag.id,
                  );
                  if (exists) {
                    try {
                      await deleteUseCase(exists.id);
                      fetchUseCases();
                    } catch (err) {
                      toast.error("Failed to delete use case");
                    }
                  } else {
                    handleAddUseCase(type, tag);
                  }
                }}
                className="h-[90%] border-0 p-0 shadow-none"
                emptyStateMessage=""
              />
            ) : (
              <BoundariesViewOnlyPanel
                selectedROI={selectedROI}
                boundariesData={boundariesData}
                onEditBoundaries={() => setShowBoundariesModal(true)}
              />
            )}
          </ROIDetailsPanel>

          {/* All the existing modals remain the same */}
          {/* Functional Tag Dialog for Assigning First Tag */}
          {pendingROI && (
            <AssignFunctionalTagDialog
              open={showFuncTagPrompt}
              onClose={() => {
                setShowFuncTagPrompt(false);
                setSelectedFuncTagsForROI([]);
                setPendingROI(null);
                setSelectedROI(null);
              }}
              tags={availableFunctionalTags}
              assignedTagIds={[]}
              selected={selectedFuncTagsForROI}
              setSelected={setSelectedFuncTagsForROI}
              onAssign={async (selectedIds: string[]) => {
                if (!pendingROI) return;
                setLoading(true);
                try {
                  await updateRoiApi(pendingROI.id, {
                    ...pendingROI,
                    func_tag_ids: selectedIds,
                  });
                  setShowFuncTagPrompt(false);
                  setSelectedFuncTagsForROI([]);
                  setPendingROI(null);
                  fetchRois();
                } catch (err) {
                  toast.error("Failed to update tag(s)");
                } finally {
                  setLoading(false);
                }
              }}
              mode="assign"
              loading={loading}
              onDelete={handleDeleteFuncTag}
            />
          )}

          {/* Functional Tag Dialog for Editing/Adding More Tags */}
          {editRoi && (
            <AssignFunctionalTagDialog
              open={assignTagDialogOpen}
              onClose={() => {
                setAssignTagDialogOpen(false);
                setEditRoi(null);
                setSelectedFuncTagsForROI([]);
                setSelectedROI(null);
              }}
              tags={availableFunctionalTags}
              assignedTagIds={editRoi.func_tag_ids || []}
              selected={selectedFuncTagsForROI}
              setSelected={setSelectedFuncTagsForROI}
              onAssign={async (selectedIds: string[]) => {
                if (!editRoi) return;
                setLoading(true);
                try {
                  const allTagIds = Array.from(
                    new Set([...(editRoi.func_tag_ids || []), ...selectedIds]),
                  );
                  await updateRoiApi(editRoi.id, {
                    ...editRoi,
                    func_tag_ids: allTagIds,
                  });
                  setAssignTagDialogOpen(false);
                  setEditRoi(null);
                  setSelectedFuncTagsForROI([]);
                  fetchRois();
                } catch (err) {
                  toast.error("Failed to update tag(s)");
                } finally {
                  setLoading(false);
                }
              }}
              onDelete={handleDeleteFuncTag}
              mode="add"
              loading={loading}
            />
          )}

          {/* ROI Modal */}
          {showROIModal && (
            <ROIDefinitionModal
              cameraId={cameraId}
              onClose={handleCloseROIModal}
              onSave={handleCloseROIModal}
              imageUrl={currentCamera.imageUrl || placeHolderImage}
              cameraName={camera?.name || ""}
              siteId={siteId}
            />
          )}

          {/* Edit Camera Modal */}
          {showEditCameraModal && (
            <AddCameraModal
              open={showEditCameraModal}
              onClose={() => setShowEditCameraModal(false)}
              onComplete={onRefreshCameraList}
              editCamera={currentCamera}
              siteId={siteId}
              env={env}
            />
          )}

          {/* Camera Calibration Modal */}
          {showCalibrationModal && (
            <CameraCalibrationModal
              cameraName={currentCamera.name}
              onClose={() => setShowCalibrationModal(false)}
              onSave={handleSaveCalibration}
              initialConfig={
                currentCamera?.calibration ? JSON.parse(currentCamera?.calibration) : null
              }
              cameraId={cameraId}
              imageUrl={currentCamera?.imageUrl || placeHolderImage}
            />
          )}

          {/* Boundaries Modal */}
          {showBoundariesModal && selectedROI && (
            <ConfigureBoundariesModal
              open={showBoundariesModal}
              onClose={() => setShowBoundariesModal(false)}
              roi={selectedROI}
              siteId={siteId}
              onSave={() => {
                setShowBoundariesModal(false);
                if (selectedROI?.id) {
                  fetchEdges(selectedROI.id);
                }
              }}
              imageUrl={currentCamera?.imageUrl || placeHolderImage}
            />
          )}
        </div>
      )}

      <ConfirmationDialog
        open={syncOverrideConfirmOpen}
        title="Override Current Process"
        description={
          siteToSync
            ? `The edge device is currently ${getEdgeStatusText(siteToSync.edge_status).toLowerCase()}. 
      Sending new configuration now may interrupt the current process. 
      Are you sure you want to override?`
            : "Are you sure you want to override the current process?"
        }
        primaryButtonText="Override and Sync"
        onClose={() => {
          setSyncOverrideConfirmOpen(false);
          setSiteToSync(null);
        }}
        onConfirm={performSync}
      />

      {/* Wait Message Dialog */}
      <ConfirmationDialog
        open={syncWaitMessage}
        title="Configuration Processing"
        description={
          siteToSync
            ? `The edge device is currently processing the configuration. 
      Please wait until the process completes before syncing again.`
            : "Please wait for the current configuration to be processed."
        }
        primaryButtonText="OK"
        onClose={() => {
          setSyncWaitMessage(false);
          setSiteToSync(null);
        }}
        onConfirm={() => {
          setSyncWaitMessage(false);
          setSiteToSync(null);
        }}
      />

      {/* Error Message Dialog */}
      <ConfirmationDialog
        open={!!syncErrorMessage}
        title="Sync Error"
        description={syncErrorMessage || "An error occurred during sync."}
        primaryButtonText="OK"
        onClose={() => {
          setSyncErrorMessage(null);
          setSiteToSync(null);
          setIsSyncing(false);
        }}
        onConfirm={() => {
          setSyncErrorMessage(null);
          setSiteToSync(null);
          setIsSyncing(false);
        }}
      />
    </SectionWrapper>
  );
}
