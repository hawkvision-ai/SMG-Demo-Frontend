import { Button } from "@/components/ui/button";
import { useUploadSiteImage } from "@/hooks/useApi";
import { Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

interface AutomatedFrameSelectionProps {
  videoUrl: string;
  localVideoUrl?: string;
  onSnapshotUrl: (url: string) => void;
  siteId: string;
  disabled?: boolean;
  onUploadStatusChange?: (isUploading: boolean) => void;
  onManualUploadMode?: (isManual: boolean) => void;
}

const isFrameBlack = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let totalBrightness = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 40) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const averageBrightness = totalBrightness / (pixelCount / 10);
  return averageBrightness < 15;
};

export const AutomatedFrameSelector: React.FC<AutomatedFrameSelectionProps> = ({
  videoUrl,
  localVideoUrl,
  onSnapshotUrl,
  disabled = false,
  onUploadStatusChange,
  onManualUploadMode,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isUploadingSnapshot, setIsUploadingSnapshot] = useState(false);
  const [useLocalSource] = useState(!!localVideoUrl);
  const [extractionProgress, setExtractionProgress] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef<number>(0);

  const { execute: uploadSiteImage } = useUploadSiteImage();

  const EXTRACTION_TIMESTAMPS = [2, 5, 10, 15];
  const MAX_ATTEMPTS = EXTRACTION_TIMESTAMPS.length;
  const EXTRACTION_TIMEOUT = 15000;

  const getErrorMessage = (error: any) => {
    if (error?.target?.error?.code) {
      switch (error.target.error.code) {
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          return "Video codec not compatible with browser video player. Your video is uploaded, upload the camera snapshot manually.";
        case MediaError.MEDIA_ERR_DECODE:
          return "Video codec not compatible with browser video player. The video format cannot be decoded.";
        case MediaError.MEDIA_ERR_NETWORK:
          return "Network error while loading video. Please check your connection and try again.";
        case MediaError.MEDIA_ERR_ABORTED:
          return "Video loading was interrupted. Please try again.";
        default:
          return "Video codec not compatible with browser video player. Please try a different video format.";
      }
    }

    const errorMessage = error?.message || error?.toString() || "";
    if (
      errorMessage.toLowerCase().includes("format") ||
      errorMessage.toLowerCase().includes("codec") ||
      errorMessage.toLowerCase().includes("unsupported")
    ) {
      return "Video codec not compatible with browser video player. Please use MP4 format with H.264 codec.";
    }

    return "Video codec not compatible with browser video player";
  };

  useEffect(() => {
    if (videoUrl || localVideoUrl) {
      setFrameUrl(null);
      attemptsRef.current = 0;
      setExtractionProgress("");

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [videoUrl, localVideoUrl]);

  useEffect(() => {
    if (disabled) return;
    if (!videoUrl && !localVideoUrl) return;
    if (frameUrl) return;

    const sourceUrl = useLocalSource ? localVideoUrl : videoUrl;
    if (!sourceUrl) return;

    const video = videoRef.current;
    if (!video) return;

    console.log("Starting automatic frame extraction from:", sourceUrl);

    timeoutRef.current = setTimeout(() => {
      console.log("Automatic extraction timeout reached");
      setExtractionProgress("");
      onManualUploadMode?.(true);
      toast.error("Automatic snapshot extraction timed out. Please capture manually.", {
        duration: 5000,
      });
    }, EXTRACTION_TIMEOUT);

    const attemptFrameCapture = async (timestamp: number) => {
      return new Promise<boolean>((resolve) => {
        console.log(
          `Attempting frame capture at ${timestamp}s (attempt ${attemptsRef.current + 1}/${MAX_ATTEMPTS})`,
        );

        const handleSeeked = async () => {
          await new Promise((r) => setTimeout(r, 150));

          const canvas = canvasRef.current;
          if (!canvas || !video.videoWidth || !video.videoHeight) {
            console.log("Canvas or video dimensions not ready");
            resolve(false);
            return;
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            console.log("Could not get canvas context");
            resolve(false);
            return;
          }

          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            if (isFrameBlack(canvas)) {
              console.log(`Frame at ${timestamp}s is black/blank, will retry with next timestamp`);
              resolve(false);
              return;
            }

            canvas.toBlob(
              async (blob) => {
                if (!blob) {
                  console.log("Failed to create blob from canvas");
                  resolve(false);
                  return;
                }

                console.log("Successfully captured frame, uploading...");
                setIsUploadingSnapshot(true);
                onUploadStatusChange?.(true);

                try {
                  const file = new File([blob], `snapshot-${Date.now()}.jpg`, {
                    type: "image/jpeg",
                  });
                  const response = await uploadSiteImage(file);
                  const uploadedUrl = response.url || canvas.toDataURL("image/jpeg", 0.9);

                  setFrameUrl(uploadedUrl);
                  onSnapshotUrl(uploadedUrl);
                  setExtractionProgress("");

                  if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                  }

                  toast.success("Snapshot captured successfully!");
                  resolve(true);
                } catch (error) {
                  console.error("Failed to upload snapshot:", error);
                  resolve(false);
                } finally {
                  setIsUploadingSnapshot(false);
                  onUploadStatusChange?.(false);
                }
              },
              "image/jpeg",
              0.9,
            );
          } catch (error) {
            console.error("Error drawing video frame:", error);
            resolve(false);
          }
        };

        video.addEventListener("seeked", handleSeeked, { once: true });
        video.currentTime = timestamp;
      });
    };

    const tryMultipleTimestamps = async () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        attemptsRef.current = i;
        const timestamp = EXTRACTION_TIMESTAMPS[i];

        setExtractionProgress(`Extracting frame... (attempt ${i + 1}/${MAX_ATTEMPTS})`);

        const success = await attemptFrameCapture(timestamp);

        if (success) {
          console.log("Frame extraction successful!");
          return;
        }

        await new Promise((r) => setTimeout(r, 300));
      }

      console.log("All automatic extraction attempts failed");
      setExtractionProgress("");
      onManualUploadMode?.(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      toast.error("Could not automatically extract snapshot. Please capture manually.", {
        duration: 5000,
      });
    };

    const handleLoadedData = async () => {
      console.log("Video loadeddata event fired");

      if (video.readyState < 3) {
        console.log("Video not ready yet, waiting...");
        return;
      }

      if (!video.videoWidth || !video.videoHeight) {
        console.log("Video dimensions not available yet");
        return;
      }

      if (!video.duration || isNaN(video.duration)) {
        console.log("Video duration not available yet");
        return;
      }

      console.log(
        `Video ready: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`,
      );

      await new Promise((r) => setTimeout(r, 200));

      setLoading(false);
      setVideoDuration(video.duration);
      setSelectedTime(video.duration * 0.15);
      setIsVideoReady(true);
      setExtractionProgress("Preparing video...");

      tryMultipleTimestamps();
    };

    const handleError = (e: any) => {
      console.error("Video loading error:", e);
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      setLoading(false);
      onManualUploadMode?.(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    setLoading(true);
    setError(null);

    video.pause();
    video.removeAttribute("src");
    video.load();

    video.src = sourceUrl;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.muted = true;

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);

    video.load();

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [disabled, videoUrl, localVideoUrl, useLocalSource, frameUrl]);

  const captureAndUpdateCanvasSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || !isVideoReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    video.currentTime = selectedTime;

    await new Promise<void>((resolve) => {
      const seekTimeout = setTimeout(() => {
        console.warn("Seek timed out");
        resolve();
      }, 5000);

      const handleSeeked = () => {
        clearTimeout(seekTimeout);
        resolve();
      };

      video.addEventListener("seeked", handleSeeked, { once: true });

      if (Math.abs(video.currentTime - selectedTime) < 0.1) {
        clearTimeout(seekTimeout);
        resolve();
      }
    });

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setFrameUrl(dataUrl);
    return dataUrl;
  };

  const uploadSnapshot = async () => {
    if (!canvasRef.current) return;

    try {
      setIsUploadingSnapshot(true);
      onUploadStatusChange?.(true);

      const dataUrl = await captureAndUpdateCanvasSnapshot();
      if (!dataUrl) throw new Error("Failed to generate preview");

      canvasRef.current.toBlob(
        async (blob) => {
          if (!blob) {
            toast.error("Failed to create snapshot blob");
            return;
          }

          try {
            const file = new File([blob], "snapshot.jpg", { type: "image/jpeg" });
            const response = await uploadSiteImage(file);
            const uploadedUrl = response.url || dataUrl;

            onSnapshotUrl(uploadedUrl);
            toast.success("Snapshot captured successfully!");
          } catch (err) {
            console.error("Upload error:", err);
            toast.error("Upload failed, using local preview");
          }
        },
        "image/jpeg",
        0.9,
      );
    } catch (err) {
      console.error("Error in uploadSnapshot:", err);
      toast.error("Failed to upload snapshot");
    } finally {
      setIsUploadingSnapshot(false);
      onUploadStatusChange?.(false);
    }
  };

  const handleManualUpload = async (file: File) => {
    try {
      setIsUploadingSnapshot(true);
      onUploadStatusChange?.(true);

      const response = await uploadSiteImage(file);
      const uploadedUrl = response.url;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setFrameUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      onSnapshotUrl(uploadedUrl);
      toast.success("Snapshot uploaded successfully!");
    } catch (err) {
      console.error("Manual upload error:", err);
      toast.error("Failed to upload snapshot");
    } finally {
      setIsUploadingSnapshot(false);
      onUploadStatusChange?.(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleManualUpload(file);
    } else {
      toast.error("Please select a valid image file");
    }
  };

  const handleSliderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setSelectedTime(newTime);
    await captureAndUpdateCanvasSnapshot();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full space-y-4">
      <video ref={videoRef} className="hidden" playsInline crossOrigin="anonymous" preload="auto" />

      <canvas ref={canvasRef} className="hidden" />

      <div className="aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {disabled ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-gray-500">
            Upload a new video to edit snapshot
          </div>
        ) : (
          <>
            {loading || (isUploadingSnapshot && !frameUrl) ? (
              <div className="flex h-full flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-500">
                  {extractionProgress ||
                    (isUploadingSnapshot ? "Uploading snapshot..." : "Loading video...")}
                </span>
              </div>
            ) : error ? (
              frameUrl ? (
                <img
                  src={frameUrl}
                  alt="Uploaded snapshot"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                  <div className="mb-3 max-w-md text-red-500">{error}</div>
                  <div className="mt-2 mb-4 max-w-md text-xs text-gray-500">
                    Supported formats: MP4 (H.264), WebM (VP8/VP9), OGG (Theora)
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-teal-600 text-white hover:bg-teal-700"
                    disabled={isUploadingSnapshot}
                  >
                    {isUploadingSnapshot ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Snapshot Manually"
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )
            ) : frameUrl ? (
              <img src={frameUrl} alt="Selected frame" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                {isVideoReady ? "Select a frame from the video" : "Preparing video..."}
              </div>
            )}
          </>
        )}
      </div>

      {!disabled && error && frameUrl && (
        <div className="flex justify-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-gray-200 bg-gray-50"
            disabled={isUploadingSnapshot}
          >
            {isUploadingSnapshot ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Change Snapshot"
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {!disabled && !error && isVideoReady && videoDuration > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Start</span>
            <span>{formatTime(selectedTime)}</span>
            <span>End: {formatTime(videoDuration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={videoDuration}
            step={0.1}
            value={selectedTime}
            onChange={handleSliderChange}
            onMouseUp={captureAndUpdateCanvasSnapshot}
            onTouchEnd={captureAndUpdateCanvasSnapshot}
            className="w-full"
            disabled={disabled || loading || isUploadingSnapshot}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={uploadSnapshot}
              className="w-full bg-teal-600 text-white hover:bg-teal-700"
              disabled={disabled || loading || isUploadingSnapshot}
            >
              {isUploadingSnapshot ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading Snapshot...
                </>
              ) : (
                "Capture Frame"
              )}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full border-gray-200 bg-gray-50"
              disabled={isUploadingSnapshot}
            >
              {isUploadingSnapshot ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Snapshot Manually"
              )}
            </Button>
          </div>
        </div>
      )}

      {!disabled && !error && !isVideoReady && (
        <div className="flex justify-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-gray-200 bg-gray-50"
            disabled={isUploadingSnapshot}
          >
            {isUploadingSnapshot ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Snapshot Manually"
            )}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
