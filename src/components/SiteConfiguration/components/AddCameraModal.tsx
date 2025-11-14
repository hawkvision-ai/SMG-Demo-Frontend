import { CameraSchema } from "@/api/types";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { TagInput } from "@/components/SiteConfiguration/ROI/TagInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import {
  useCreateCamera,
  useGetCameraLocationTags,
  useUpdateCamera,
  useUpdateVideoMetadata,
  useUploadVideoUrl,
} from "@/hooks/useApi";
import { useUploadCameraVideo } from "@/hooks/useUploadCameraVideo";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { CameraData } from "../types";
import { AutomatedFrameSelector } from "./AutomatedFrameSelector";

const fallbackPreview =
  "https://media.istockphoto.com/id/536557515/photo/secure-metal-industrial-building.jpg?s=612x612&w=0&k=20&c=Tkzye3TdwB5zBQAUVYibzkc_cfAVhf-mZf2I2a_vlcU=";

interface AddCameraModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  editCamera?: CameraData | null;
  siteId?: string;
  env?: "real" | "virtual";
}

const CameraStatusBadge = ({ status }: { status: "idle" | "connecting" | "success" | "error" }) => {
  const COLORS: Record<typeof status, string> = {
    idle: "border-gray-300 bg-gray-100",
    connecting: "border-blue-500 bg-blue-50",
    success: "border-green-500 bg-green-50",
    error: "border-red-500 bg-red-50",
  };
  return (
    <div
      className={`flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border ${COLORS[status]}`}
    />
  );
};

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

const AddCameraModal: React.FC<AddCameraModalProps> = ({
  open,
  onClose,
  onComplete,
  editCamera,
  siteId,
  env,
}) => {
  /* ------------ hooks ------------ */
  const { user } = useAuth();
  const { env: contextEnv } = useEnv();
  // Use prop env if provided, otherwise fall back to context env
  const currentEnv = env || contextEnv;
  const isVirtual = currentEnv === "virtual";

  const { execute: createCamera, data: createCameraData } = useCreateCamera();
  const { execute: updateCamera, data: updateCameraData } = useUpdateCamera();
  const { execute: updateVideoMetadata } = useUpdateVideoMetadata();

  const { execute: getUploadUrl, loading: isGettingUrl } = useUploadVideoUrl();
  const {
    execute: uploadCameraVideo,
    loading: isUploading,
    cancel: cancelUpload,
  } = useUploadCameraVideo();

  // Get existing location tags
  const { data: locationTagsData } = useGetCameraLocationTags(siteId || "");

  // Ref for the tag input container to handle outside clicks
  const tagInputContainerRef = useRef<HTMLDivElement>(null);

  /* ------------ state ------------ */
  const [formData, setFormData] = useState<CameraData>({
    id: "",
    name: "",
    locationTags: [],
    imageUrl: "",
    videoUrl: "",
  });
  const [cameraIp, setCameraIp] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // IP connect status
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [isConnecting, setIsConnecting] = useState(false);

  // video upload
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");

  // snapshot upload
  const [uploadedSnapshotUrl, setUploadedSnapshotUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>("");
  const [isUsingExistingVideo, setIsUsingExistingVideo] = useState(false);

  const [confirmAction, setConfirmAction] = useState<"close" | "submit" | null>(null);
  const [pendingUploadCancel, setPendingUploadCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [hasVideoChanged, setHasVideoChanged] = useState(false);
  const [isManualUploadMode, setIsManualUploadMode] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Validation state
  const [cameraNameError, setCameraNameError] = useState("");

  // Duration feedback states
  const [showDurationFeedback, setShowDurationFeedback] = useState(false);
  const [durationInput, setDurationInput] = useState("");
  const [isUpdatingDuration, setIsUpdatingDuration] = useState(false);
  const [createdCameraId, setCreatedCameraId] = useState<string | null>(null);
  const [uploadedVideoForDuration, setUploadedVideoForDuration] = useState<string | null>(null);

  /* ------------ edit mode populate ------------ */
  // Validation function for camera name
  const validateCameraName = (value: string): string => {
    if (!value.trim()) {
      return ""; // Allow empty for now, required validation handled elsewhere
    }

    const trimmedValue = value.trim();

    // Check if contains at least one letter (a-z or A-Z)
    const hasLetter = /[a-zA-Z]/.test(trimmedValue);
    if (!hasLetter) {
      return "Camera name must contain at least one letter";
    }

    return "";
  };

  useEffect(() => {
    if (editCamera) {
      setFormData({
        ...editCamera,
        videoUrl: editCamera.videoUrl ?? "",
      });
      setCameraIp(editCamera.camera_ip || "");
      if (!isVirtual) {
        setSnapshotUrl(editCamera.imageUrl || null);
        setConnectionStatus(editCamera.imageUrl ? "success" : "idle");
      } else {
        // For virtual mode, handle video upload state
        if (editCamera.default_media) {
          setUploadedVideoUrl(editCamera.default_media);
          setIsUsingExistingVideo(true);
        }
        if (editCamera.imageUrl) {
          setSnapshotUrl(editCamera.imageUrl);
        }
      }
      setHasVideoChanged(false);
      setIsManualUploadMode(false);
      // Reset duration feedback state when opening edit modal
      setShowDurationFeedback(false);
      setCreatedCameraId(null);
      setUploadedVideoForDuration(null);
      setDurationInput("");
      setCameraNameError("");
    } else {
      resetForm();
      // Reset duration feedback state when opening add modal
      setShowDurationFeedback(false);
      setCreatedCameraId(null);
      setUploadedVideoForDuration(null);
      setDurationInput("");
      setCameraNameError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCamera, open, isVirtual]);

  // Handle video state in edit mode for virtual environment
  useEffect(() => {
    if (editCamera && isVirtual) {
      // When in virtual mode in edit mode, use default_media for video source
      if (editCamera.default_media) {
        setUploadedVideoUrl(editCamera.default_media);
        setIsUsingExistingVideo(true);
      }

      if (editCamera.imageUrl) {
        setSnapshotUrl(editCamera.imageUrl);
      }
    }
  }, [editCamera, isVirtual]);

  // Reset form when changing between video and IP modes
  useEffect(() => {
    if (hasVideoChanged && !uploadedSnapshotUrl && isVirtual) {
      // We need to prompt user to capture a snapshot if they've changed the video
      console.log("Video changed but no snapshot captured");
    }
  }, [hasVideoChanged, uploadedSnapshotUrl, isVirtual]);

  // Handle upload cancellation cleanup
  useEffect(() => {
    if (pendingUploadCancel && !isUploading && !isGettingUrl) {
      setPendingUploadCancel(false);
      setIsCancelling(false);
    }
  }, [pendingUploadCancel, isUploading, isGettingUrl]);

  // Check for duration feedback requirement after camera creation/update
  useEffect(() => {
    // Only show duration feedback if there's a warning and we have video content
    const hasWarning = createCameraData?.warning || updateCameraData?.warning;
    const hasVideo = uploadedVideoUrl || (editCamera && editCamera.default_media);

    // Only trigger duration feedback if:
    // 1. There's a warning
    // 2. We're in virtual mode
    // 3. There's video content
    // 4. We're currently submitting (to ensure this is a fresh response)
    // 5. Duration feedback isn't already showing
    if (hasWarning && isVirtual && hasVideo && isSubmitting && !showDurationFeedback) {
      // Set the created camera ID for duration update
      if (createCameraData?.id) {
        setCreatedCameraId(createCameraData.id);
      } else if (editCamera?.id) {
        setCreatedCameraId(editCamera.id);
      }

      // Set the video URL for duration update
      setUploadedVideoForDuration(uploadedVideoUrl || editCamera?.default_media || null);
      setShowDurationFeedback(true);
      setDurationInput("");
      setIsSubmitting(false); // Reset submitting state
    } else if ((createCameraData || updateCameraData) && !hasWarning && isSubmitting) {
      // If camera was created/updated successfully without warning, close any open duration dialog
      setShowDurationFeedback(false);
      setIsSubmitting(false);
      // Complete the camera creation/update flow normally
      onComplete?.();
      onClose();
    }
  }, [
    createCameraData,
    updateCameraData,
    isVirtual,
    uploadedVideoUrl,
    editCamera,
    isSubmitting,
    showDurationFeedback,
  ]);

  const handleDurationSubmit = async () => {
    if (!createdCameraId || !uploadedVideoForDuration || !durationInput.trim()) {
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
      await updateVideoMetadata(createdCameraId, uploadedVideoForDuration, {
        duration: durationInSeconds,
      });

      setShowDurationFeedback(false);
      onComplete?.();
      onClose();
    } catch (error) {
      console.error("Failed to update video duration:", error);
      toast.error("Failed to update video duration");
    } finally {
      setIsUpdatingDuration(false);
    }
  };

  const handleDurationSkip = () => {
    setShowDurationFeedback(false);
    onComplete?.();
    onClose();
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      locationTags: [],
      imageUrl: "",
      videoUrl: "",
    });
    setCameraIp("");
    setTagInput("");
    setSnapshotUrl(null);
    setConnectionStatus("idle");
    setUploadedVideoUrl("");
    setUploadedSnapshotUrl("");
    setVideoUploadProgress(0);
    setIsUsingExistingVideo(false);
    setHasVideoChanged(false);
    setIsManualUploadMode(false);
    setPendingUploadCancel(false);
    setIsCancelling(false);
    setShowTagDropdown(false);
    setCameraNameError("");

    // Clean up video preview URL if it exists
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl("");
    }

    // Cancel any ongoing upload
    if (isGettingUrl || isUploading) {
      cancelUpload();
    }
  };

  /* ------------ tag helpers ------------ */
  /* ------------ Enhanced tag helpers ------------ */
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Handle comma/hash immediate addition
    if (value.includes(",") || value.includes("#")) {
      const newTag = value.replace(/[,#]/g, "").trim();
      if (newTag && !formData.locationTags.includes(newTag)) {
        setFormData({
          ...formData,
          locationTags: [...formData.locationTags, newTag],
        });
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

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // If there's a selected suggestion, use it
      if (selectedSuggestionIndex >= 0 && filteredTags.length > 0) {
        const selectedTag = filteredTags[selectedSuggestionIndex];
        if (!formData.locationTags.includes(selectedTag)) {
          setFormData({
            ...formData,
            locationTags: [...formData.locationTags, selectedTag],
          });
        }
      } else if (filteredTags.length > 0) {
        // If no selection but there are filtered results, add the first one
        const selectedTag = filteredTags[0];
        if (!formData.locationTags.includes(selectedTag)) {
          setFormData({
            ...formData,
            locationTags: [...formData.locationTags, selectedTag],
          });
        }
      } else if (tagInput.trim()) {
        // If no filtered results but there's input, add the input as new tag
        const newTag = tagInput.trim();
        if (!formData.locationTags.includes(newTag)) {
          setFormData({
            ...formData,
            locationTags: [...formData.locationTags, newTag],
          });
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
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleTagInputFocus = () => {
    setShowTagDropdown(true);
    setSelectedSuggestionIndex(-1);
  };

  const handleTagInputBlur = () => {
    // Delay hiding dropdown to allow for clicks
    setTimeout(() => {
      setShowTagDropdown(false);
      setSelectedSuggestionIndex(-1);
    }, 150);
  };

  const addTagFromDropdown = (tag: string) => {
    if (!formData.locationTags.includes(tag)) {
      setFormData({
        ...formData,
        locationTags: [...formData.locationTags, tag],
      });
    }
    setTagInput("");
    setShowTagDropdown(false);
    setSelectedSuggestionIndex(-1);
  };

  const removeTag = (t: string) =>
    setFormData({
      ...formData,
      locationTags: formData.locationTags.filter((x) => x !== t),
    });

  // Enhanced filtering logic - filter by items that START with the typed letters
  const availableTags = locationTagsData?.camera_location_tags || [];
  const filteredTags = availableTags.filter(
    (tag) =>
      tag.toLowerCase().startsWith(tagInput.toLowerCase()) && !formData.locationTags.includes(tag),
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

  /* ------------ IP connect (mock) ------------ */
  const handleConnectCamera = async () => {
    if (!cameraIp.trim()) {
      toast.error("Please enter a camera IP address");
      return;
    }
    setIsConnecting(true);
    setConnectionStatus("idle");
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setSnapshotUrl(fallbackPreview);
      setConnectionStatus("success");
    } catch {
      setConnectionStatus("error");
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle the trim of image
  const trimSasToken = (url: string): string => {
    if (!url) return url;
    // Split by '?' and take only the base URL (before query parameters)
    return url.split("?")[0];
  };

  /* ------------ submit ------------ */
  const handleSubmit = async () => {
    if ((isGettingUrl || isUploading) && !pendingUploadCancel) {
      setConfirmAction("submit");
      return;
    }

    if (!siteId) return toast.error("Site ID missing");
    if (!formData.name.trim()) return toast.error("Camera name required");

    if (!editCamera && !isVirtual && connectionStatus !== "success") {
      return toast.error("Connect to camera first");
    }

    // Check if snapshot is required for virtual mode
    if (isVirtual && (!editCamera || hasVideoChanged)) {
      if (isManualUploadMode && !uploadedSnapshotUrl) {
        return toast.error("Please upload a camera snapshot manually to proceed.");
      }
      if (hasVideoChanged && !uploadedSnapshotUrl && !isManualUploadMode) {
        return toast.error("This media file already exists, Please try another one.");
      }
      if (!isUsingExistingVideo && !uploadedVideoUrl && !editCamera?.default_media) {
        return toast.error("Please upload a video first");
      }
    }

    // Check if no media file has been added for virtual cameras
    if (isVirtual && !editCamera?.default_media) {
      if (!uploadedVideoUrl && !uploadedSnapshotUrl) {
        return toast.error("Please add media before proceeding");
      }
    }

    setIsSubmitting(true);
    try {
      const basePayload = {
        name: formData.name,
        camera_ip: isVirtual ? editCamera?.camera_ip || "" : cameraIp || "",
        video_url: "",
        edge_device_id: "1",
        site_id: siteId,
        customer_id: user?.customer_id || "",
        height: 1080,
        width: 1920,
        is_virtual: isVirtual,
        is_running: true,
        location_tags: formData.locationTags,
        camera_image_url: trimSasToken(uploadedSnapshotUrl || snapshotUrl || fallbackPreview),
        physical_attributes: { stream_url: cameraIp },
        ...(isVirtual && {
          media_history: uploadedVideoUrl
            ? [trimSasToken(uploadedVideoUrl)]
            : editCamera?.media_history?.map((url) => trimSasToken(url)) || [],
        }),
      };

      console.log(basePayload);

      if (formData.id) {
        // For update, don't include rois and usecase_ids
        await updateCamera(formData.id, basePayload);
      } else {
        // For create, include rois and usecase_ids
        const createPayload: CameraSchema = {
          ...basePayload,
          rois: [],
          usecase_ids: [],
        };
        await createCamera(createPayload);
      }

      // Don't close immediately if we might need duration feedback
      if (!isVirtual || !(uploadedVideoUrl || (editCamera && editCamera.default_media))) {
        onComplete?.();
        onClose();
      }
      // If duration feedback is needed, the useEffect will handle showing the dialog
    } catch (err: any) {
      setIsSubmitting(false);
      setIsUsingExistingVideo(false);
      setUploadedSnapshotUrl("");
      setHasVideoChanged(true);
      setVideoPreviewUrl(null);
    } finally {
      if (!isVirtual || !(uploadedVideoUrl || (editCamera && editCamera.default_media))) {
        setIsSubmitting(false);
        setIsUsingExistingVideo(false);
        setUploadedSnapshotUrl("");
        setHasVideoChanged(true);
        setVideoPreviewUrl(null);
      }
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset related states
    setHasVideoChanged(true);
    setUploadedSnapshotUrl("");
    setSnapshotUrl(null);
    setIsUsingExistingVideo(false);
    setIsManualUploadMode(false); // Reset manual upload mode on new video

    // Cleanup existing blob URL if any
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl("");
    }

    try {
      /* ①  Create local preview */
      console.log(
        `Creating blob URL for video: ${file.name} (${file.size} bytes, type: ${file.type})`,
      );
      const localUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(localUrl);

      /* ②  Handle remote upload */
      console.log("Getting upload URL...");
      const res = await getUploadUrl(file);

      console.log("Starting video upload...");
      await uploadCameraVideo(file, res.url.upload_url, setVideoUploadProgress);

      const remoteUrl = res.url.upload_url.split("?")[0];
      console.log(`Upload complete. Remote URL: ${remoteUrl}`);

      setUploadedVideoUrl(remoteUrl);
      // setCameraIp(remoteUrl);
    } catch (err) {
      console.error("Upload error:", err);
      setVideoUploadProgress(0);
      toast.error(`Upload failed"}`);

      // Don't revoke the blob URL here - we might still want to use it
      // for local preview even if remote upload failed
    }
  };

  // Helper function to determine what message to show
  const getVideoModeMessage = () => {
    if (isManualUploadMode && !uploadedSnapshotUrl) {
      return "";
    }
    if (hasVideoChanged && !uploadedSnapshotUrl && !isManualUploadMode) {
      return 'Please wait for the snapshot to be captured automatically, or click "Capture Frame" if needed';
    }
    return null;
  };

  /* ------------ JSX ------------ */
  return (
    <>
      <Dialog
        open={open && !showDurationFeedback}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            if ((isGettingUrl || isUploading) && !pendingUploadCancel && !isCancelling) {
              setConfirmAction("close");
              return;
            }
            resetForm(); // Add resetForm call here
            onClose();
          }
        }}
      >
        <DialogContent className="max-w-4xl rounded-2xl bg-gray-50 p-6">
          <h2 className="mb-4 border-b pb-2 text-xl font-semibold">
            {editCamera ? "Edit Camera" : "Add New Camera"}
          </h2>

          {/* ---------------------------------------------------------------- */}
          {/* two-column layout (form left, video / preview right)             */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* ============ LEFT (form) ============ */}
            <section className="space-y-5">
              {/* camera name ------------------------------------------------- */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Camera Name <span className="text-red-500">*</span>
                </label>
                <Input
                  className={`w-full border ${cameraNameError ? "border-red-500" : "border-gray-200"}`}
                  value={formData.name}
                  placeholder="Warehouse South Gate"
                  maxLength={50}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 50) {
                      setFormData({ ...formData, name: value });
                      const error = validateCameraName(value);
                      setCameraNameError(error);
                    }
                  }}
                  disabled={isSubmitting}
                />
                {cameraNameError && <p className="text-xs text-red-500">{cameraNameError}</p>}
                <p className="text-xs text-gray-500">{formData.name.length}/50 characters</p>
              </div>

              {/* camera source -------------------------------------------- */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {isVirtual ? "Video Upload" : "Camera Source"}
                </label>

                {!isVirtual ? (
                  // Real environment - show only IP/RTSP input
                  <Input
                    className="w-full border border-gray-200"
                    placeholder="rtsp://x.x.x.x/stream"
                    value={cameraIp}
                    onChange={(e) => setCameraIp(e.target.value)}
                    disabled={isSubmitting || isConnecting}
                  />
                ) : (
                  // Virtual environment - show only video upload
                  <>
                    {isUsingExistingVideo && editCamera && !hasVideoChanged && (
                      <div className="mb-2 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 p-2">
                        <span className="text-sm text-blue-700">
                          Using existing video: {editCamera.videoUrl?.split("/").pop() || "Video"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-xs hover:bg-blue-100"
                          onClick={() => {
                            setIsUsingExistingVideo(false);
                            setUploadedSnapshotUrl("");
                            setSnapshotUrl(null);
                            setVideoPreviewUrl("");
                            setUploadedVideoUrl("");
                            setHasVideoChanged(true);
                            setIsManualUploadMode(false);
                          }}
                        >
                          Upload New
                        </Button>
                      </div>
                    )}
                    {(!isUsingExistingVideo || hasVideoChanged) && (
                      <>
                        <Input
                          className="border border-gray-200"
                          type="file"
                          accept=".mp4, .avi, .mov, .mkv, .webm, .flv, .wmv, .mpeg"
                          disabled={
                            isGettingUrl || isUploading || isSubmitting || !!uploadedVideoUrl
                          }
                          onChange={handleVideoFileChange}
                        />

                        {(isGettingUrl || isUploading) && (
                          <div className="h-2.5 w-full rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-teal-600 transition-all"
                              style={{ width: `${videoUploadProgress}%` }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* location tags ---------------------------------------------- */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Location Tags</label>
                <div className="relative" ref={tagInputContainerRef}>
                  <TagInput
                    tags={formData.locationTags}
                    tagInput={tagInput}
                    onTagInputChange={handleTagInputChange}
                    onRemoveTag={removeTag}
                    disabled={isSubmitting}
                    onTagInputKeyDown={handleTagInputKeyDown}
                    onTagInputFocus={handleTagInputFocus}
                    onTagInputBlur={handleTagInputBlur}
                  />

                  {/* Enhanced dropdown with highlighting and keyboard navigation */}
                  {showTagDropdown && (tagInput.trim() || availableTags.length > 0) && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {filteredTags.length > 0 ? (
                        <>
                          <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                            Matching Tags (Use ↑↓ arrows, Enter to select)
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
                                e.preventDefault(); // Prevent blur
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
                              ></span>
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
                          <div className="mb-1 text-gray-500">Press Enter to add new tag:</div>
                          <div className="flex items-center gap-2 font-medium text-gray-700">
                            <span className="h-2 w-2 rounded-full bg-blue-500"></span>"
                            {tagInput.trim()}"
                            <span className="ml-auto text-xs font-medium text-blue-600">↵</span>
                          </div>
                        </div>
                      ) : (
                        availableTags.length > 0 && (
                          <>
                            <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                              All Available Tags
                            </div>
                            {availableTags
                              .filter((tag) => !formData.locationTags.includes(tag))
                              .slice(0, 8) // Limit to first 8 to prevent overwhelming
                              .map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent blur
                                    addTagFromDropdown(tag);
                                  }}
                                >
                                  <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                                  {tag}
                                </button>
                              ))}
                            {availableTags.filter((tag) => !formData.locationTags.includes(tag))
                              .length > 8 && (
                              <div className="border-t border-gray-100 px-3 py-2 text-center text-xs text-gray-500">
                                +
                                {availableTags.filter((tag) => !formData.locationTags.includes(tag))
                                  .length - 8}{" "}
                                more tags...
                              </div>
                            )}
                          </>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* actions ----------------------------------------------------- */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    // Check if there's an ongoing upload
                    if ((isGettingUrl || isUploading) && !pendingUploadCancel && !isCancelling) {
                      setConfirmAction("close");
                    } else {
                      onClose();
                    }
                  }}
                  disabled={isSubmitting || isConnecting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-teal-600 text-white hover:bg-teal-700"
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    !!cameraNameError ||
                    !formData.name.trim() ||
                    // Only disable for new cameras or when video has actually changed
                    (!editCamera &&
                      isVirtual &&
                      ((!uploadedVideoUrl && !isUsingExistingVideo) ||
                        (isManualUploadMode && !uploadedSnapshotUrl) ||
                        (hasVideoChanged && !uploadedSnapshotUrl && !isManualUploadMode)))
                  }
                >
                  Save Camera
                </Button>
              </div>
            </section>

            {/* ============ RIGHT (video & preview) ============ */}
            <section className="flex flex-col items-center gap-4">
              {!isVirtual ? (
                // Real environment - show IP camera connection
                <>
                  {snapshotUrl ? (
                    <img
                      src={snapshotUrl}
                      alt="Snapshot"
                      className="aspect-video w-full rounded-xl border border-gray-200 object-cover"
                    />
                  ) : (
                    <CameraStatusBadge status={connectionStatus} />
                  )}

                  <Button
                    className="w-full bg-teal-600 text-white hover:bg-teal-700"
                    onClick={handleConnectCamera}
                    disabled={isSubmitting || isConnecting || !cameraIp.trim()}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting…
                      </>
                    ) : connectionStatus === "success" ? (
                      "Connected"
                    ) : connectionStatus === "error" ? (
                      "Retry"
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </>
              ) : (
                // Virtual environment - show video upload and frame selector
                <>
                  {uploadedVideoUrl || (isUsingExistingVideo && !hasVideoChanged) ? (
                    <>
                      <AutomatedFrameSelector
                        videoUrl={uploadedVideoUrl || editCamera?.videoUrl || ""}
                        localVideoUrl={videoPreviewUrl || ""}
                        siteId={siteId || ""}
                        onSnapshotUrl={(url) => {
                          console.log("Snapshot received:", url);
                          setUploadedSnapshotUrl(url);
                          setSnapshotUrl(url);
                          if (url) {
                            setHasVideoChanged(false);
                          }
                        }}
                        disabled={!hasVideoChanged && isUsingExistingVideo && !videoPreviewUrl}
                        onUploadStatusChange={(status) => {
                          console.log("Upload status change:", status);
                        }}
                        onManualUploadMode={(isManual) => {
                          console.log("Manual upload mode:", isManual);
                          setIsManualUploadMode(isManual);
                        }}
                      />
                      {getVideoModeMessage() && (
                        <div
                          className={`mt-2 rounded-md border p-2 text-center text-sm ${
                            isManualUploadMode
                              ? "border-orange-200 bg-orange-50 text-orange-700"
                              : "border-yellow-200 bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {getVideoModeMessage()}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
                      {isUploading ? "Uploading video..." : "Upload a video to preview"}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duration Feedback Dialog */}
      <Dialog open={showDurationFeedback} onOpenChange={() => {}}>
        <DialogContent className="max-w-md rounded-2xl bg-gray-50 p-6">
          {/* Hide the default close button */}
          <style>{`
      [data-slot="dialog-content"] > button:last-child {
        display: none !important;
      }
    `}</style>
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
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmationDialog
          open={!!confirmAction}
          title="Confirm Action"
          description={
            confirmAction === "close"
              ? "You have an ongoing upload. Are you sure you want to cancel it and close?"
              : "You have an ongoing upload. Are you sure you want to submit before it completes?"
          }
          primaryButtonText="Confirm"
          secondaryButtonText="Cancel"
          isLoading={isCancelling}
          onClose={() => {
            if (!isCancelling) {
              setConfirmAction(null);
            }
          }}
          onConfirm={async () => {
            const action = confirmAction;

            if (action === "close") {
              setIsCancelling(true);

              try {
                // Cancel uploads
                setPendingUploadCancel(true);
                cancelUpload();

                // Wait a short moment for cancellation to process
                await new Promise((resolve) => setTimeout(resolve, 100));

                // Clean up video preview URL
                if (videoPreviewUrl) {
                  URL.revokeObjectURL(videoPreviewUrl);
                  setVideoPreviewUrl("");
                }

                // Reset ALL upload states
                setVideoUploadProgress(0);
                setUploadedVideoUrl("");
                setIsUsingExistingVideo(false);
                setHasVideoChanged(false);
                setIsManualUploadMode(false);
                setUploadedSnapshotUrl("");
                setSnapshotUrl(null);

                // Close confirmation dialog first
                setConfirmAction(null);

                // Reset form and close modal
                resetForm();
                onClose();
              } catch (error) {
                console.error("Error during cancellation:", error);
                setConfirmAction(null);
                resetForm();
                onClose();
              } finally {
                setIsCancelling(false);
                setPendingUploadCancel(false);
              }
            } else if (action === "submit") {
              // For submit, just proceed with the submission
              setConfirmAction(null);
              handleSubmit();
            }
          }}
        />
      )}
    </>
  );
};

export default AddCameraModal;
