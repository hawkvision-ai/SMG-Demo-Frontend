import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import {
  useAddMediaHistory,
  useClearQueue,
  useRemoveFromQueue,
  useSyncWithEdge,
  useUpdateVideoMetadata,
  useUploadVideoUrl,
} from "@/hooks/useApi";
import { useUploadCameraVideo } from "@/hooks/useUploadCameraVideo";
import { formatDateTimeISO } from "@/lib/utils";
import { formatDuration, formatVideoMetadata } from "@/utils/formatTime";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  CircleFadingPlusIcon,
  FastForward,
  Hourglass,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { MediaStatus } from "../../types";

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
  duration_seconds?: number;
}

interface VideoMetadata {
  name: string;
  duration?: number;
  isDurationLoading?: boolean;
}

interface QueueManagerProps {
  buttonLabel?: string;
  onAddMedia?: () => void;
  cameraId?: string;
  refetchMedia?: () => void;
  siteId: string;
  mediaList?: MediaFile[];
  mediaStatusFilter?: MediaStatus;
}

type SortField = "name" | "duration" | "status" | "position" | "lastRan" | "queuedAt" | "ranBy";
type SortOrder = "asc" | "desc";

// Helper function to format bytes to human readable format
// const formatBytes = (bytes: number | string | null | undefined) => {
//   if (!bytes) return undefined;
//   const numBytes = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
//   if (isNaN(numBytes) || numBytes === 0) return undefined;

//   const sizes = ['B', 'KB', 'MB', 'GB'];
//   const i = Math.floor(Math.log(numBytes) / Math.log(1024));
//   return `${Math.round(numBytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
// };

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

const QueueManager: React.FC<QueueManagerProps> = ({
  buttonLabel = "Video Playlist",
  onAddMedia,
  cameraId,
  refetchMedia,
  siteId,
  mediaList = [],
}) => {
  const { env } = useEnv();

  // If not in virtual mode, don't render the component
  if (env !== "virtual") return null;

  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [mediaMetadata, setMediaMetadata] = useState<Record<string, VideoMetadata>>({});
  const [confirmRunAll, setConfirmRunAll] = useState(false);
  const [confirmClearQueue, setConfirmClearQueue] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [editingDuration, setEditingDuration] = useState<string | null>(null);
  const [editDurationValue, setEditDurationValue] = useState<string>("");

  // Duration feedback states (similar to AddCameraModal)
  const [showDurationFeedback, setShowDurationFeedback] = useState(false);
  const [durationInput, setDurationInput] = useState("");
  const [isUpdatingDuration, setIsUpdatingDuration] = useState(false);
  const [uploadedVideoForDuration, setUploadedVideoForDuration] = useState<string | null>(null);

  // Sorting states - single table
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();
  const { execute: syncWithEdge } = useSyncWithEdge();
  const { execute: removeFromQueue } = useRemoveFromQueue();
  const { execute: clearQueue } = useClearQueue();

  // API hooks
  const { execute: getUploadUrl } = useUploadVideoUrl();
  const { execute: uploadCameraVideo } = useUploadCameraVideo();
  const { execute: addToMediaHistory, data: addToMediaHistoryData } = useAddMediaHistory();
  const { execute: updateVideoMetadata } = useUpdateVideoMetadata();

  useEffect(() => {
    if (!isOpen) return;

    // Initialize metadata for all media files immediately
    const newMetadata: Record<string, VideoMetadata> = {};

    mediaList.forEach((media) => {
      const { name } = formatVideoMetadata(media.url);
      newMetadata[media.url] = {
        name,
        duration: media.duration_seconds,
        isDurationLoading: false,
      };
    });

    // Update state with the metadata
    setMediaMetadata(newMetadata);
  }, [isOpen, mediaList]);

  const handleAddMedia = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cameraId) return;

    setIsUploading(true);
    setCurrentFileName(file.name);

    try {
      // Get upload URL
      const res = await getUploadUrl(file);

      // Upload video
      await uploadCameraVideo(file, res.url.upload_url, (progress) => {
        setUploadProgress(Math.round(progress));
      });

      // Get the final URL without query params
      const uploadedUrl = res.url.upload_url.split("?")[0];

      // Store the uploaded URL for potential duration update
      setUploadedVideoForDuration(uploadedUrl);

      // Add to media history
      await addToMediaHistory(cameraId, uploadedUrl);

      // Complete the media addition flow only if no warning
      if (!addToMediaHistoryData?.warning) {
        onAddMedia?.();
        refetchMedia?.();
      }
    } catch (error: any) {
      toast.error("The media URL already exists in the media history.");
      setUploadedVideoForDuration(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRunAll = () => {
    const readyFiles = mediaList.filter(
      (file) => file.status === "ready" || file.status === "failed",
    );
    if (readyFiles.length > 0) {
      setConfirmRunAll(true);
    } else {
      toast.error("No videos to run");
    }
  };

  const executeRunAll = async () => {
    await syncWithEdge({
      siteId,
      camId: cameraId,
      userEmail: user?.email || "",
      media_url: "-1",
    });
    refetchMedia?.();
    setConfirmRunAll(false);
  };

  const handleSyncSingleFile = async (url: string) => {
    await syncWithEdge({
      siteId,
      camId: cameraId,
      userEmail: user?.email || "",
      media_url: url,
    });
    refetchMedia?.();
  };

  const handleRemoveFromQueue = async (url: string) => {
    if (!cameraId) return;

    try {
      await removeFromQueue(siteId, cameraId, url);
      refetchMedia?.();
    } catch (error) {
      console.error("Failed to remove from queue:", error);
    }
  };

  const executeClearQueue = async () => {
    try {
      await clearQueue(siteId);
      refetchMedia?.();
    } catch (error) {
      console.error("Failed to clear queue:", error);
    } finally {
      setConfirmClearQueue(false);
    }
  };

  // Status Icon Component
  const StatusIcon = ({ status }: { status: MediaStatus }) => {
    const iconProps = {
      className: "w-4 h-4",
      strokeWidth: 2,
    };

    switch (status) {
      case "running":
        return <RotateCw {...iconProps} className="h-4 w-4 animate-spin" />;
      case "queued":
        return <Hourglass {...iconProps} />;
      case "ready":
        return <CircleFadingPlusIcon {...iconProps} />;
      case "failed":
        return <AlertCircle {...iconProps} />;
    }
  };

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
    width: string;
    className?: string;
  }) => (
    <th
      className={`cursor-pointer px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 ${width} ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <SortIcon field={field} currentField={currentField} currentOrder={currentOrder} />
      </div>
    </th>
  );

  // Check for duration feedback requirement after media upload
  useEffect(() => {
    // Only show duration feedback if there's a warning from addToMediaHistory
    const hasWarning = addToMediaHistoryData?.warning;

    if (hasWarning && uploadedVideoForDuration && !showDurationFeedback) {
      setShowDurationFeedback(true);
      setDurationInput("");
    }
  }, [addToMediaHistoryData, uploadedVideoForDuration, showDurationFeedback]);

  const handleDurationSubmit = async () => {
    if (!cameraId || !uploadedVideoForDuration || !durationInput.trim()) {
      toast.error("Please enter a valid duration");
      return;
    }

    const durationInSeconds = convertTimeToSeconds(durationInput);
    if (!durationInSeconds || durationInSeconds <= 0) {
      toast.error("Please enter a valid duration (e.g., 5:30)");
      return;
    }

    setIsUpdatingDuration(true);
    try {
      await updateVideoMetadata(cameraId, uploadedVideoForDuration, {
        duration: durationInSeconds,
      });

      toast.success("Duration updated successfully");
      setShowDurationFeedback(false);
      setUploadedVideoForDuration(null);
      refetchMedia?.();
    } catch (error) {
      console.error("Failed to update video duration:", error);
      toast.error("Failed to update video duration");
    } finally {
      setIsUpdatingDuration(false);
    }
  };

  const handleDurationSkip = () => {
    setShowDurationFeedback(false);
    setUploadedVideoForDuration(null);
    refetchMedia?.();
  };

  // Update isConfirmDialogOpen whenever any confirm dialog state changes
  useEffect(() => {
    setIsConfirmDialogOpen(confirmRunAll || confirmClearQueue || showDurationFeedback);
  }, [confirmRunAll, confirmClearQueue, showDurationFeedback]);

  // Only allow closing dropdown if no confirmation dialog is open
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        !isConfirmDialogOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isConfirmDialogOpen]);

  // Sorting functions
  const sortMedia = useCallback(
    (media: MediaFile[], sortField: SortField, sortOrder: SortOrder) => {
      return [...media].sort((a, b) => {
        let aValue, bValue;

        switch (sortField) {
          case "name":
            aValue = a.name?.toLowerCase() || "";
            bValue = b.name?.toLowerCase() || "";
            break;
          case "duration":
            aValue = a.duration_seconds || 0;
            bValue = b.duration_seconds || 0;
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "position":
            aValue = a.globalPosition || 999999;
            bValue = b.globalPosition || 999999;
            break;
          case "lastRan":
            aValue = a.lastRan || "";
            bValue = b.lastRan || "";
            break;
          case "queuedAt":
            aValue = a.queuedAt || "";
            bValue = b.queuedAt || "";
            break;
          case "ranBy":
            aValue = a.ranBy || "";
            bValue = b.ranBy || "";
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    },
    [],
  );

  // Combined and sorted media
  const sortedMedia = useMemo(() => {
    return sortMedia(mediaList, sortField, sortOrder);
  }, [mediaList, sortField, sortOrder, sortMedia]);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <>
      <div className="relative inline-block">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".mp4, .avi, .mov, .mkv, .webm, .flv, .wmv, .mpeg"
          onChange={handleFileChange}
        />

        {/* Background blur overlay */}
        {isOpen && (
          <div
            className="bg-opacity-20 fixed inset-0 z-40 backdrop-blur-sm"
            onClick={() => !isConfirmDialogOpen && setIsOpen(false)}
          />
        )}

        <TooltipProvider delayDuration={150}>
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="relative z-50 flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm text-gray-50 shadow-lg transition-all duration-200 hover:border-teal-300 hover:bg-teal-700"
          >
            {buttonLabel}
            {/* <span className="text-xs">▼</span> */}
          </button>

          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full right-0 z-50 mt-2 max-h-[80vh] min-w-[50vw] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleAddMedia}
                        disabled={isUploading}
                        className={`flex min-w-[60px] cursor-pointer flex-col items-center gap-0.5 rounded-md border-none bg-gray-300 px-3 py-2 text-xs font-medium text-teal-700 transition-all duration-200 hover:bg-gray-400 ${isUploading ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        <span className="text-lg leading-none font-bold">+</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add Media</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleRunAll}
                        className="flex items-center gap-2 rounded-md bg-gray-300 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-400"
                      >
                        <FastForward className="h-4 w-4 font-semibold text-teal-700" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Run All Media</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-x-visible overflow-y-auto">
                {isUploading && (
                  <div className="border-b border-gray-50 px-5 py-5">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-14 flex-shrink-0 animate-pulse items-center justify-center rounded-md bg-teal-100 text-xs font-medium text-teal-600">
                        {uploadProgress}%
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 text-sm font-medium text-gray-800">
                          {currentFileName}
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-teal-600 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Single Cumulative Table */}
                <div className="p-4">
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <CircleFadingPlusIcon className="h-4 w-4" />
                        All Media ({sortedMedia.length})
                      </h3>
                    </div>

                    <div className="max-h-[60vh] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 border-b border-gray-200 bg-gray-100">
                          <tr>
                            <TableHeader
                              field="position"
                              label="Pos"
                              currentField={sortField}
                              currentOrder={sortOrder}
                              onSort={handleSort}
                              width="w-12"
                            />
                            <TableHeader
                              field="name"
                              label="Video Name"
                              currentField={sortField}
                              currentOrder={sortOrder}
                              onSort={handleSort}
                              width="w-20"
                            />
                            <TableHeader
                              field="duration"
                              label="Duration"
                              currentField={sortField}
                              currentOrder={sortOrder}
                              onSort={handleSort}
                              width="w-16"
                            />
                            <TableHeader
                              field="status"
                              label="Status"
                              currentField={sortField}
                              currentOrder={sortOrder}
                              onSort={handleSort}
                              width="w-20"
                            />
                            <TableHeader
                              field="lastRan"
                              label="Last Ran"
                              currentField={sortField}
                              currentOrder={sortOrder}
                              onSort={handleSort}
                              width="w-24"
                            />
                            <TableHeader
                              field="queuedAt"
                              label="Queued At"
                              currentField={sortField}
                              currentOrder={sortOrder}
                              onSort={handleSort}
                              width="w-24"
                            />
                            <TableHeader
                              field="ranBy"
                              label="Ran By"
                              currentField={sortField}
                              currentOrder={sortOrder}
                              onSort={handleSort}
                              width="w-20"
                            />
                            <th className="w-16 px-3 py-2 text-left text-xs font-medium text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {sortedMedia.length > 0 ? (
                            sortedMedia.map((file) => {
                              const { name } = formatVideoMetadata(file.url);

                              return (
                                <tr
                                  key={file.id || file.url}
                                  className={`h-12 transition-colors ${
                                    file.status === "failed"
                                      ? "border-red-200 bg-red-50 hover:bg-red-100"
                                      : file.status === "running"
                                        ? "bg-blue-50 hover:bg-blue-100"
                                        : file.status === "queued"
                                          ? "bg-yellow-50 hover:bg-yellow-100"
                                          : "hover:bg-gray-50"
                                  }`}
                                >
                                  <td className="w-12 px-3 py-2 text-center">
                                    {file.status === "queued" && file.globalPosition && (
                                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-600">
                                        {file.globalPosition}
                                      </span>
                                    )}
                                    {file.status === "running" && (
                                      <RotateCw className="mx-auto h-4 w-4 animate-spin text-blue-600" />
                                    )}
                                    {(file.status === "ready" || file.status === "failed") && (
                                      <StatusIcon status={file.status} />
                                    )}
                                  </td>
                                  <td className="w-20 px-3 py-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className="w-24 cursor-pointer truncate text-xs hover:text-blue-600"
                                          onClick={() => window.open(file.url, "_blank")}
                                        >
                                          {name}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-sm">
                                        <div className="text-xs">
                                          <div className="font-medium">{name}</div>
                                          <div className="mt-1 text-gray-300">
                                            Click to open video
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </td>
                                  <td className="w-16 px-3 py-2 text-center">
                                    {file.duration === "-1:-1" ? (
                                      editingDuration === file.url ? (
                                        <div className="flex items-center gap-1">
                                          <Input
                                            type="text"
                                            value={editDurationValue}
                                            onChange={(e) => setEditDurationValue(e.target.value)}
                                            className="h-6 w-20 px-1 text-xs"
                                            placeholder="5:30"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                const durationInSeconds =
                                                  convertTimeToSeconds(editDurationValue);
                                                if (
                                                  durationInSeconds &&
                                                  durationInSeconds > 0 &&
                                                  cameraId
                                                ) {
                                                  updateVideoMetadata(cameraId, file.url, {
                                                    duration: durationInSeconds,
                                                  })
                                                    .then(() => {
                                                      toast.success(
                                                        "Duration updated successfully",
                                                      );
                                                      refetchMedia?.();
                                                      setEditingDuration(null);
                                                      setEditDurationValue("");
                                                    })
                                                    .catch((err) => {
                                                      console.error(err);
                                                      toast.error("Failed to update duration");
                                                    });
                                                } else {
                                                  toast.error(
                                                    "Please enter a valid duration (e.g., 5:30)",
                                                  );
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
                                              if (
                                                durationInSeconds &&
                                                durationInSeconds > 0 &&
                                                cameraId
                                              ) {
                                                updateVideoMetadata(cameraId, file.url, {
                                                  duration: durationInSeconds,
                                                })
                                                  .then(() => {
                                                    toast.success("Duration updated successfully");
                                                    refetchMedia?.();
                                                    setEditingDuration(null);
                                                    setEditDurationValue("");
                                                  })
                                                  .catch((err) => {
                                                    console.error(err);
                                                    toast.error("Failed to update duration");
                                                  });
                                              } else {
                                                toast.error(
                                                  "Please enter a valid duration (e.g., 5:30)",
                                                );
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
                                                setEditingDuration(file.url);
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
                                    ) : file.duration_seconds ? (
                                      formatDuration(file.duration_seconds)
                                    ) : (
                                      file.duration || "-"
                                    )}
                                  </td>
                                  <td className="w-20 px-3 py-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          className={`inline-flex rounded-full px-2 py-1 text-xs ${
                                            file.status === "queued"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : file.status === "running"
                                                ? "bg-blue-100 text-blue-700"
                                                : file.status === "ready"
                                                  ? "bg-green-100 text-green-700"
                                                  : "bg-red-100 text-red-700"
                                          }`}
                                        >
                                          {file.status}
                                        </span>
                                      </TooltipTrigger>
                                      {file.lastMessage && (
                                        <TooltipContent side="top" className="max-w-sm">
                                          <div className="text-xs">
                                            <div className="mt-1 text-gray-300">
                                              Last message: {file.lastMessage}
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </td>
                                  <td className="w-24 px-3 py-2 text-center text-xs text-gray-600">
                                    {formatDateTimeISO(file.lastRan)}
                                  </td>
                                  <td className="w-24 px-3 py-2 text-center text-xs text-gray-600">
                                    {formatDateTimeISO(file.queuedAt)}
                                  </td>
                                  <td className="w-20 px-3 py-2 text-center text-xs text-gray-600">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="w-20 cursor-pointer truncate text-xs">
                                          {file.ranBy || "-"}
                                        </div>
                                      </TooltipTrigger>
                                      {file.ranBy && (
                                        <TooltipContent side="top" className="max-w-sm">
                                          <div className="text-xs">
                                            <div className="font-medium">{file.ranBy}</div>
                                          </div>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </td>
                                  <td className="w-16 px-3 py-2">
                                    <div className="flex gap-1">
                                      {file.status === "queued" && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              onClick={() => handleRemoveFromQueue(file.url)}
                                              size="sm"
                                              variant="outline"
                                              className="h-6 w-6 p-0 hover:border-red-200 hover:bg-red-50"
                                            >
                                              <Minus className="h-3 w-3 text-red-600" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Remove from queue</TooltipContent>
                                        </Tooltip>
                                      )}
                                      {(file.status === "ready" || file.status === "failed") && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              onClick={() => handleSyncSingleFile(file.url)}
                                              size="sm"
                                              variant="outline"
                                              className="h-6 w-6 p-0 hover:border-green-200 hover:bg-green-50"
                                            >
                                              <Plus className="h-3 w-3 text-green-600" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Add to Queue</TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center gap-2">
                                  <CircleFadingPlusIcon className="h-8 w-8 text-gray-400" />
                                  <span>No media files found</span>
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
            </div>
          )}
        </TooltipProvider>
      </div>

      {/* Confirmation Dialogs */}
      {confirmRunAll && (
        <ConfirmationDialog
          open={confirmRunAll}
          onClose={() => setConfirmRunAll(false)}
          onConfirm={executeRunAll}
          title="Run All Media"
          description="Are you sure you want to run all media files? This action cannot be undone."
        />
      )}
      {confirmClearQueue && (
        <ConfirmationDialog
          open={confirmClearQueue}
          onClose={() => setConfirmClearQueue(false)}
          onConfirm={executeClearQueue}
          title="Clear Media Queue"
          description="This will remove all media from the queue. Do you want to continue?"
        />
      )}

      {/* Duration Feedback Dialog - Using Dialog component like AddCameraModal */}
      <Dialog open={showDurationFeedback} onOpenChange={() => {}}>
        <DialogContent className="max-w-md rounded-2xl bg-gray-50 p-6">
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-orange-500" />
            </div>

            <div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">Video Duration Required</h2>
              <p className="mb-4 text-sm text-gray-600">
                Due to codec compatibility issues, we couldn't automatically extract the video
                duration.
              </p>
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                placeholder="5:30"
                className="w-full text-center"
                disabled={isUpdatingDuration}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDurationSubmit();
                  } else if (e.key === "Escape") {
                    handleDurationSkip();
                  }
                }}
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Format: mm:ss (e.g., 5:30 for 5 minutes 30 seconds)
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleDurationSkip}
                disabled={isUpdatingDuration}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={handleDurationSubmit}
                disabled={isUpdatingDuration || !durationInput.trim()}
                className="flex-1 bg-teal-600 text-white hover:bg-teal-700"
              >
                {isUpdatingDuration ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Update
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QueueManager;
