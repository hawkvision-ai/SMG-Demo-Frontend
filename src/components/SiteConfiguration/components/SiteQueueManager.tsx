import mediaImg from "@/assets/icons/media.svg";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import {
  useClearQueue,
  useGetCamerasBySite,
  useGetSiteMediaStatus,
  useRemoveFromQueue,
  useSyncWithEdge,
  useUpdateVideoMetadata,
} from "@/hooks/useApi";
import { formatDateTimeISO } from "@/lib/utils";
import { formatDuration, formatVideoMetadata } from "@/utils/formatTime";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  CircleFadingPlusIcon,
  History,
  Hourglass,
  Minus,
  Plus,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MediaStatus, SiteData } from "../types";
import MediaQueueLogs from "./MediaLogs/MediaQueueLogs";
import SectionWrapper from "./SectionWrapper";

interface MediaFile {
  id: string;
  url: string;
  name: string;
  status: MediaStatus;
  globalPosition?: number;
  cameraId: string;
  userEmail?: string;
  lastMessage?: string;
  duration?: number;
  size?: string;
  createdAt?: string; // Original UTC timestamp
  createdAtFormatted?: string; // Formatted time in user's timezone
  createdAtTimestamp?: number; // Timestamp for sorting
  completedAt?: string | null; // Original UTC timestamp for completion (can be null)
  completedAtFormatted?: string; // Formatted completion time in user's timezone
  completedAtTimestamp?: number; // Timestamp for sorting
}

interface SiteQueueManagerProps {
  siteId: string;
  site: SiteData;
}

type SortField =
  | "name"
  | "camera"
  | "duration"
  | "status"
  | "position"
  | "ranBy"
  | "createdAt"
  | "completedAt";
type SortOrder = "asc" | "desc";

// Helper function to convert minutes:seconds to total seconds
const convertTimeToSeconds = (timeString: string): number | null => {
  if (!timeString) return null;

  // Handle format like "5:30" or "05:30"
  const parts = timeString.split(":");
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);

    if (!isNaN(minutes) && !isNaN(seconds) && seconds < 60) {
      return minutes * 60 + seconds;
    }
  }

  // Handle just seconds (backwards compatibility)
  const totalSeconds = parseFloat(timeString);
  if (!isNaN(totalSeconds) && totalSeconds > 0) {
    return totalSeconds;
  }

  return null;
};

// Helper function to format bytes to human readable format
const formatBytes = (bytes: number | string | null | undefined) => {
  if (!bytes) return undefined;
  const numBytes = typeof bytes === "string" ? parseFloat(bytes) : bytes;
  if (isNaN(numBytes) || numBytes === 0) return undefined;

  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(numBytes) / Math.log(1024));
  return `${Math.round((numBytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
};

export default function SiteQueueManager({ siteId }: SiteQueueManagerProps) {
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [confirmRunAll, setConfirmRunAll] = useState(false);
  const [confirmClearQueue, setConfirmClearQueue] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState<Set<string>>(new Set());
  const [editingDuration, setEditingDuration] = useState<string | null>(null);
  const [editDurationValue, setEditDurationValue] = useState<string>("");
  const [showLogs, setShowLogs] = useState(false);

  // Sorting states
  const [queueSortField, setQueueSortField] = useState<SortField>("createdAt");
  const [queueSortOrder, setQueueSortOrder] = useState<SortOrder>("asc");
  const [availableSortField, setAvailableSortField] = useState<SortField>("name");
  const [availableSortOrder, setAvailableSortOrder] = useState<SortOrder>("asc");

  const { data: cameras, execute: fetchCameras } = useGetCamerasBySite();
  const { execute: fetchMediaStatus } = useGetSiteMediaStatus();
  const { execute: syncWithEdge } = useSyncWithEdge();
  const { execute: removeFromQueue } = useRemoveFromQueue();
  const { execute: clearQueue } = useClearQueue();
  const { execute: updateVideoMetadata } = useUpdateVideoMetadata();
  const { user } = useAuth();

  const fetchCamerasData = useCallback(() => {
    if (siteId) {
      fetchCameras(siteId);
    }
  }, [siteId, fetchCameras]);

  const updateMediaStatus = useCallback(async () => {
    try {
      const status = await fetchMediaStatus(siteId, user?.timezone || "UTC");

      // Filter queued items first and sort them by creation time (oldest first)
      const queuedItems = status
        .filter((item) => item.status === "queued")
        .sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB; // Ascending order (oldest first)
        });

      const transformed = status.map((item) => {
        // Position is based on creation time order - earlier created items get lower position numbers
        const globalPosition =
          item.status === "queued"
            ? queuedItems.findIndex((qItem) => qItem.media_url === item.media_url) + 1
            : undefined;

        // Get just the filename from the URL
        const { name } = formatVideoMetadata(item.media_url);

        return {
          id: `${item.camera_id}-${item.media_url}`,
          url: item.media_url,
          name: name,
          status: item.status as MediaStatus,
          globalPosition,
          cameraId: item.camera_id,
          userEmail: item.user_email,
          lastMessage: item.last_message ?? undefined,
          duration: item.duration_seconds,
          size: formatBytes(item.size_bytes),
          createdAt: item.created_at,
          createdAtFormatted: formatDateTimeISO(item.created_at),
          createdAtTimestamp: new Date(item.created_at).getTime(), // Add timestamp for sorting
          completedAt: item.completed_at,
          completedAtFormatted: item.completed_at
            ? formatDateTimeISO(item.completed_at)
            : undefined,
          completedAtTimestamp: item.completed_at
            ? new Date(item.completed_at).getTime()
            : undefined, // Add timestamp for sorting
        };
      });

      setMediaList(transformed);
    } catch (error) {
      console.error("Error fetching media status:", error);
    }
  }, [siteId, user?.timezone]);

  useEffect(() => {
    fetchCamerasData();
  }, []);

  useEffect(() => {
    updateMediaStatus();
    const interval = setInterval(updateMediaStatus, 120000);
    return () => clearInterval(interval);
  }, []);

  // Separate queued and available media
  const queuedMedia = useMemo(() => {
    return mediaList.filter((file) => file.status === "queued" || file.status === "running");
  }, [mediaList]);

  const availableMedia = useMemo(() => {
    return mediaList.filter((file) => file.status === "ready" || file.status === "failed");
  }, [mediaList]);

  // Since camera filtering is not implemented, use all media
  const filteredQueuedMedia = queuedMedia;
  const filteredAvailableMedia = availableMedia;

  // Sorting functions
  const sortMedia = useCallback(
    (media: MediaFile[], sortField: SortField, sortOrder: SortOrder) => {
      return [...media].sort((a, b) => {
        let aValue, bValue;

        switch (sortField) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "camera":
            const aCameraName = cameras?.find((c) => c.id === a.cameraId)?.name || a.cameraId;
            const bCameraName = cameras?.find((c) => c.id === b.cameraId)?.name || b.cameraId;
            aValue = aCameraName.toLowerCase();
            bValue = bCameraName.toLowerCase();
            break;
          case "duration":
            aValue = a.duration || 0;
            bValue = b.duration || 0;
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "position":
            aValue = a.globalPosition || 999999;
            bValue = b.globalPosition || 999999;
            break;
          case "ranBy":
            aValue = (a.userEmail || "").toLowerCase();
            bValue = (b.userEmail || "").toLowerCase();
            break;
          case "createdAt":
            aValue = a.createdAtTimestamp || 0;
            bValue = b.createdAtTimestamp || 0;
            break;
          case "completedAt":
            aValue = a.completedAtTimestamp || 0;
            bValue = b.completedAtTimestamp || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    },
    [cameras],
  );

  const sortedQueuedMedia = useMemo(() => {
    return sortMedia(filteredQueuedMedia, queueSortField, queueSortOrder);
  }, [filteredQueuedMedia, queueSortField, queueSortOrder, sortMedia]);

  const sortedAvailableMedia = useMemo(() => {
    return sortMedia(filteredAvailableMedia, availableSortField, availableSortOrder);
  }, [filteredAvailableMedia, availableSortField, availableSortOrder, sortMedia]);

  // Sort handlers
  const handleQueueSort = (field: SortField) => {
    if (queueSortField === field) {
      setQueueSortOrder(queueSortOrder === "asc" ? "desc" : "asc");
    } else {
      setQueueSortField(field);
      setQueueSortOrder("asc");
    }
  };

  const handleAvailableSort = (field: SortField) => {
    if (availableSortField === field) {
      setAvailableSortOrder(availableSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAvailableSortField(field);
      setAvailableSortOrder("asc");
    }
  };

  const executeRunAll = async () => {
    try {
      await syncWithEdge({
        siteId,
        media_url: "-1",
        userEmail: user?.email || "",
      });
    } catch (error) {
      console.error("Failed to run all media:", error);
    } finally {
      await updateMediaStatus();
      setConfirmRunAll(false);
    }
  };

  const executeRemoveFromQueue = async (url: string, cameraId: string) => {
    try {
      await removeFromQueue(siteId, cameraId, url);
    } catch (error) {
      console.error("Failed to remove from queue:", error);
    } finally {
      await updateMediaStatus();
    }
  };

  const executeAddToQueue = async (url: string, cameraId: string) => {
    try {
      await syncWithEdge({
        siteId,
        media_url: url,
        userEmail: user?.email || "",
        camId: cameraId,
      });
    } catch (error) {
      console.error("Failed to add to queue:", error);
    } finally {
      await updateMediaStatus();
    }
  };

  const executeClearQueue = async () => {
    try {
      await clearQueue(siteId);
    } catch (error) {
      console.error("Failed to clear queue:", error);
    } finally {
      await updateMediaStatus();
      setConfirmClearQueue(false);
    }
  };
  //     if (editingDuration === file.id) {
  //         // If already editing, save the changes
  //         const newDuration = convertTimeToSeconds(editDurationValue);
  //         if (newDuration !== null) {
  //             // Update metadata on the server
  //             updateVideoMetadata(file.id, { duration: newDuration })
  //                 .then(() => {
  //                     toast.success('Duration updated successfully');
  //                     setEditingDuration(null);
  //                     setEditDurationValue('');
  //                     updateMediaStatus(); // Refresh media status
  //                 })
  //                 .catch((error) => {
  //                     console.error('Error updating duration:', error);
  //                     toast.error('Failed to update duration');
  //                 });
  //         } else {
  //             toast.error('Invalid duration format');
  //         }
  //     } else {
  //         // Start editing
  //         setEditingDuration(file.id);
  //         setEditDurationValue(formatSecondsToTime(file.duration || 0));
  //     }
  // };

  const SortIcon = ({
    field,
    currentField,
    currentOrder,
  }: {
    field: SortField;
    currentField: SortField;
    currentOrder: SortOrder;
  }) => {
    if (field !== currentField) {
      return <ChevronUp className="h-3 w-3 text-gray-400" />;
    }
    return currentOrder === "asc" ? (
      <ChevronUp className="h-3 w-3 text-gray-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-gray-600" />
    );
  };

  const TableHeader = ({
    field,
    label,
    currentField,
    currentOrder,
    onSort,
    width,
    className = "",
  }: {
    field: SortField;
    label: string;
    currentField: SortField;
    currentOrder: SortOrder;
    onSort: (field: SortField) => void;
    width?: string;
    className?: string;
  }) => (
    <th
      className={`cursor-pointer px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <SortIcon field={field} currentField={currentField} currentOrder={currentOrder} />
      </div>
    </th>
  );

  // If showing logs, render the logs component
  if (showLogs) {
    return <MediaQueueLogs siteId={siteId} onBack={() => setShowLogs(false)} />;
  }

  // Custom action component for the logs button
  const customActionComponent = (
    <button
      type="button"
      onClick={() => setShowLogs(true)}
      className="flex items-center gap-2 rounded-md border border-gray-500 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
    >
      <History className="h-4 w-4" />
      View Logs
    </button>
  );

  return (
    <TooltipProvider>
      <SectionWrapper
        entityName="Media Queue Management"
        iconSrc={mediaImg}
        customActionComponent={customActionComponent}
        height="73vh"
      >
        <div
          className="grid min-h-[60vh] grid-cols-1 gap-4 lg:grid-cols-2"
          style={{ height: "auto" }}
        >
          {/* Media Queue Section */}
          <div className="flex flex-col">
            <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex h-6 items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Hourglass className="h-4 w-4" />
                    Media Queue ({sortedQueuedMedia.length})
                  </h3>
                  {sortedQueuedMedia.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setConfirmClearQueue(true)}
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 hover:border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Clear entire Playlist</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div
                className="flex-1 overflow-auto"
                style={{ scrollbarGutter: "stable", maxHeight: "calc(70vh - 120px)" }}
              >
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100">
                    <tr>
                      <TableHeader
                        field="position"
                        label="Pos"
                        currentField={queueSortField}
                        currentOrder={queueSortOrder}
                        onSort={handleQueueSort}
                        className="w-[4vw]"
                      />
                      <TableHeader
                        field="name"
                        label="Video Name"
                        currentField={queueSortField}
                        currentOrder={queueSortOrder}
                        onSort={handleQueueSort}
                        className="w-[20vw]"
                      />
                      <TableHeader
                        field="camera"
                        label="Camera"
                        currentField={queueSortField}
                        currentOrder={queueSortOrder}
                        onSort={handleQueueSort}
                        className="w-[12vw]"
                      />
                      <TableHeader
                        field="duration"
                        label="Duration"
                        currentField={queueSortField}
                        currentOrder={queueSortOrder}
                        onSort={handleQueueSort}
                        className="w-[6vw]"
                      />
                      <TableHeader
                        field="ranBy"
                        label="Ran by"
                        currentField={queueSortField}
                        currentOrder={queueSortOrder}
                        onSort={handleQueueSort}
                        className="w-[10vw]"
                      />
                      <TableHeader
                        field="status"
                        label="Status"
                        currentField={queueSortField}
                        currentOrder={queueSortOrder}
                        onSort={handleQueueSort}
                        className="w-[6vw]"
                      />
                      <TableHeader
                        field="createdAt"
                        label="Queued At"
                        currentField={queueSortField}
                        currentOrder={queueSortOrder}
                        onSort={handleQueueSort}
                        className="w-[10vw]"
                      />
                      <th className="w-[4vw] px-3 py-2 text-left text-xs font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sortedQueuedMedia.length > 0 ? (
                      sortedQueuedMedia.map((file) => (
                        <tr key={file.id} className="h-10 transition-colors hover:bg-gray-50">
                          <td className="px-3 py-2 text-center" style={{ width: "4vw" }}>
                            {file.status === "queued" && file.globalPosition && (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-600">
                                {file.globalPosition}
                              </span>
                            )}
                            {file.status === "running" && (
                              <RotateCw className="mx-auto h-4 w-4 animate-spin text-blue-600" />
                            )}
                          </td>
                          <td className="px-3 py-2" style={{ width: "15vw", maxWidth: "15vw" }}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="cursor-pointer truncate text-xs hover:text-blue-600"
                                  onClick={() => window.open(file.url, "_blank")}
                                >
                                  {file.name}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm">
                                <div className="text-xs">
                                  <div className="font-medium">{file.name}</div>
                                  <div className="mt-1 text-gray-300">Click to open video</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="truncate px-3 py-2" style={{ width: "12vw" }}>
                            {cameras?.find((c) => c.id === file.cameraId)?.name || file.cameraId}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ width: "6vw" }}>
                            {file.duration === -1 ? (
                              editingDuration === file.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="text"
                                    value={editDurationValue}
                                    onChange={(e) => setEditDurationValue(e.target.value)}
                                    className="h-6 w-16 px-1 text-xs"
                                    placeholder="5:30"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const durationInSeconds =
                                          convertTimeToSeconds(editDurationValue);
                                        if (durationInSeconds && durationInSeconds > 0) {
                                          updateVideoMetadata(file.cameraId, file.url, {
                                            duration: durationInSeconds,
                                          })
                                            .then(() => {
                                              toast.success("Duration updated successfully");
                                              updateMediaStatus();
                                              setEditingDuration(null);
                                              setEditDurationValue("");
                                            })
                                            .catch((err) => {
                                              console.error(err);
                                              toast.error("Failed to update duration");
                                            });
                                        } else {
                                          toast.error("Please enter a valid duration (e.g., 5:30)");
                                        }
                                      } else if (e.key === "Escape") {
                                        setEditingDuration(null);
                                        setEditDurationValue("");
                                      }
                                    }}
                                  />
                                  <Button
                                    onClick={() => {
                                      const durationInSeconds =
                                        convertTimeToSeconds(editDurationValue);
                                      if (durationInSeconds && durationInSeconds > 0) {
                                        updateVideoMetadata(file.cameraId, file.url, {
                                          duration: durationInSeconds,
                                        })
                                          .then(() => {
                                            toast.success("Duration updated successfully");
                                            updateMediaStatus();
                                            setEditingDuration(null);
                                            setEditDurationValue("");
                                          })
                                          .catch((err) => {
                                            console.error(err);
                                            toast.error("Failed to update duration");
                                          });
                                      } else {
                                        toast.error("Please enter a valid duration (e.g., 5:30)");
                                      }
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 hover:border-green-200 hover:bg-green-50"
                                  >
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setEditingDuration(null);
                                      setEditDurationValue("");
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 hover:border-red-200 hover:bg-red-50"
                                  >
                                    <X className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex cursor-pointer items-center justify-center"
                                      onClick={() => {
                                        setEditingDuration(file.id);
                                        setEditDurationValue("");
                                      }}
                                    >
                                      <AlertTriangle className="h-4 w-4 text-red-600" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Click to set duration manually (format: mm:ss)
                                  </TooltipContent>
                                </Tooltip>
                              )
                            ) : (
                              formatDuration(file.duration || 0)
                            )}
                          </td>
                          <td className="truncate px-3 py-2" style={{ width: "10vw" }}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate text-xs">
                                  {file.userEmail ? file.userEmail.split("@")[0] : "-"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {file.userEmail || "No user information"}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-3 py-2" style={{ width: "6vw" }}>
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs ${
                                file.status === "queued"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {file.status}
                            </span>
                          </td>
                          <td className="px-3 py-2" style={{ width: "10vw" }}>
                            <span className="text-xs">{file.createdAtFormatted || "-"}</span>
                          </td>
                          <td className="px-3 py-2" style={{ width: "4vw" }}>
                            {file.status === "queued" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => executeRemoveFromQueue(file.url, file.cameraId)}
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 hover:border-red-200 hover:bg-red-50"
                                  >
                                    <Minus className="h-3 w-3 text-red-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove from Playlist</TooltipContent>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Hourglass className="h-8 w-8 text-gray-400" />
                            <span>No videos in queue</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Available to Add Section */}
          <div className="flex flex-col">
            <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-1">
                <div className="flex h-10 items-center justify-between">
                  <h3 className="flex h-6 items-center text-sm font-semibold text-gray-900">
                    <CircleFadingPlusIcon className="h-4 w-4" />
                    Available to Add ({sortedAvailableMedia.length})
                  </h3>
                </div>
              </div>

              <div
                className="flex-1 overflow-auto"
                style={{ scrollbarGutter: "stable", maxHeight: "57vh" }}
              >
                <table className="w-full text-xs">
                  <thead className="sticky top-0 h-12 border-b border-gray-200 bg-gray-100">
                    <tr>
                      <TableHeader
                        field="name"
                        label="Video Name"
                        currentField={availableSortField}
                        currentOrder={availableSortOrder}
                        onSort={handleAvailableSort}
                        className="w-[19vw]"
                      />
                      <TableHeader
                        field="camera"
                        label="Camera"
                        currentField={availableSortField}
                        currentOrder={availableSortOrder}
                        onSort={handleAvailableSort}
                        className="w-[10vw]"
                      />
                      <TableHeader
                        field="duration"
                        label="Duration"
                        currentField={availableSortField}
                        currentOrder={availableSortOrder}
                        onSort={handleAvailableSort}
                        className="w-[6vw]"
                      />
                      <TableHeader
                        field="completedAt"
                        label="Last Ran Completed"
                        currentField={availableSortField}
                        currentOrder={availableSortOrder}
                        onSort={handleAvailableSort}
                        className="w-[14vw]"
                      />
                      <th className="w-[4vw] px-3 py-2 text-left text-xs font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sortedAvailableMedia.length > 0 ? (
                      sortedAvailableMedia.map((file) => (
                        <tr
                          key={file.id}
                          className={`h-10 transition-colors ${
                            file.status === "failed"
                              ? "border-red-200 bg-red-50 hover:bg-red-100"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-3 py-2" style={{ width: "19vw", maxWidth: "19vw" }}>
                            {" "}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="cursor-pointer truncate text-xs hover:text-blue-600"
                                  onClick={() => window.open(file.url, "_blank")}
                                >
                                  {file.name}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm">
                                <div className="text-xs">
                                  <div className="font-medium">{file.name}</div>
                                  <div className="mt-1 text-gray-300">Click to open video</div>
                                  {file.status === "failed" && file.lastMessage && (
                                    <div className="mt-2 border-t border-gray-600 pt-2">
                                      <div className="font-medium text-red-400">Error:</div>
                                      <div className="mt-1">{file.lastMessage}</div>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="truncate px-3 py-2" style={{ width: "12vw" }}>
                            {cameras?.find((c) => c.id === file.cameraId)?.name || file.cameraId}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ width: "6vw" }}>
                            {file.duration === -1 ? (
                              editingDuration === file.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="text"
                                    value={editDurationValue}
                                    onChange={(e) => setEditDurationValue(e.target.value)}
                                    className="h-6 w-16 px-1 text-xs"
                                    placeholder="5:30"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const durationInSeconds =
                                          convertTimeToSeconds(editDurationValue);
                                        if (durationInSeconds && durationInSeconds > 0) {
                                          updateVideoMetadata(file.cameraId, file.url, {
                                            duration: durationInSeconds,
                                          })
                                            .then(() => {
                                              toast.success("Duration updated successfully");
                                              updateMediaStatus();
                                              setEditingDuration(null);
                                              setEditDurationValue("");
                                            })
                                            .catch((err) => {
                                              console.error(err);
                                              toast.error("Failed to update duration");
                                            });
                                        } else {
                                          toast.error("Please enter a valid duration (e.g., 5:30)");
                                        }
                                      } else if (e.key === "Escape") {
                                        setEditingDuration(null);
                                        setEditDurationValue("");
                                      }
                                    }}
                                  />
                                  <Button
                                    onClick={() => {
                                      const durationInSeconds =
                                        convertTimeToSeconds(editDurationValue);
                                      if (durationInSeconds && durationInSeconds > 0) {
                                        updateVideoMetadata(file.cameraId, file.url, {
                                          duration: durationInSeconds,
                                        })
                                          .then(() => {
                                            toast.success("Duration updated successfully");
                                            updateMediaStatus();
                                            setEditingDuration(null);
                                            setEditDurationValue("");
                                          })
                                          .catch((err) => {
                                            console.error(err);
                                            toast.error("Failed to update duration");
                                          });
                                      } else {
                                        toast.error("Please enter a valid duration (e.g., 5:30)");
                                      }
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 hover:border-green-200 hover:bg-green-50"
                                  >
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setEditingDuration(null);
                                      setEditDurationValue("");
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 hover:border-red-200 hover:bg-red-50"
                                  >
                                    <X className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex cursor-pointer items-center justify-center"
                                      onClick={() => {
                                        setEditingDuration(file.id);
                                        setEditDurationValue("");
                                      }}
                                    >
                                      <AlertTriangle className="h-4 w-4 text-red-600" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Click to set duration manually (format: mm:ss)
                                  </TooltipContent>
                                </Tooltip>
                              )
                            ) : loadingMetadata.has(file.url) ? (
                              <div className="h-3 w-8 animate-pulse rounded bg-gray-200"></div>
                            ) : (
                              formatDuration(file.duration || 0)
                            )}
                          </td>
                          <td className="px-3 py-2" style={{ width: "14vw" }}>
                            <span className="text-xs">{file.completedAtFormatted || "-"}</span>
                          </td>
                          <td className="px-3 py-2" style={{ width: "4vw" }}>
                            <Button
                              onClick={() => executeAddToQueue(file.url, file.cameraId)}
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0 hover:border-green-200 hover:bg-green-50"
                            >
                              <Plus className="h-3 w-3 text-green-600" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <CircleFadingPlusIcon className="h-8 w-8 text-gray-400" />
                            <span>No videos available to add</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Dialogs */}
        {confirmRunAll && (
          <ConfirmationDialog
            open={confirmRunAll}
            onClose={() => setConfirmRunAll(false)}
            onConfirm={executeRunAll}
            title="Add all to Playlist"
            description={`This will add ${mediaList.filter((f) => f.status === "ready" || f.status === "failed").length} video files to Playlist. Continue?`}
          />
        )}
        {confirmClearQueue && (
          <ConfirmationDialog
            open={confirmClearQueue}
            onClose={() => setConfirmClearQueue(false)}
            onConfirm={executeClearQueue}
            title="Clear Playlist"
            description="This will remove all video from the Playlist. Do you want to continue?"
          />
        )}
      </SectionWrapper>
    </TooltipProvider>
  );
}
