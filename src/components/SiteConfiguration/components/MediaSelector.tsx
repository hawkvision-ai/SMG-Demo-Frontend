import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Upload, Loader2, Video, CheckCircle2, Trash2, X, Film, AlertCircle } from "lucide-react";
import { useUploadVideoUrl } from "@/hooks/useApi";
import { useUploadCameraVideo } from "@/hooks/useUploadCameraVideo";
import {
  useAddMediaHistory,
  useSetMediaHistory,
  useDeleteMediaHistory,
} from "@/hooks/useApi";
import { toast } from "react-hot-toast";

interface MediaSelectorProps {
  selectedMedia: string | null;
  onMediaSelect: (media: string | null) => void;
  mediaList?: string[];
  placeholder?: string;
  onConfirmSelect?: (media: string) => void;
  onAddMedia?: (file: File) => void;
  cameraId: string;
  refetchCameras?: () => void;
  defaultMedia: string | "";
}

const MediaSelector: React.FC<MediaSelectorProps> = ({
  selectedMedia,
  onMediaSelect,
  mediaList = [],
  placeholder = "Select Test Media",
  onConfirmSelect,
  onAddMedia,
  cameraId,
  refetchCameras,
  defaultMedia
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState<string | null>(selectedMedia);
  const [addingNewMedia, setAddingNewMedia] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoPlaybackError, setVideoPlaybackError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Media history hooks
  const { execute: addMediaHistory } = useAddMediaHistory();
  const { execute: setDefaultMedia } = useSetMediaHistory();
  const { execute: deleteMediaHistory } = useDeleteMediaHistory();
  
  // Upload hooks
  const { execute: getUploadUrl } = useUploadVideoUrl();
  const { execute: uploadCameraVideo, loading: isUploadingVideo } = useUploadCameraVideo();
  
  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) && 
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);
  
  useEffect(() => {
    setLocalSelected(selectedMedia);
    setVideoPlaybackError(null); // Reset error when selection changes
  }, [selectedMedia]);
  
  // Extract and decode filename from URL
  const getFilenameFromUrl = (url: string): string => {
    try {
      // Extract the filename part from the URL
      const urlParts = url.split('/');
      const encodedFilename = urlParts[urlParts.length - 1].split('?')[0];
      
      // Decode URI components to remove %20 and other encoded characters
      const decodedFilename = decodeURIComponent(encodedFilename);
      
      return decodedFilename;
    } catch (error) {
      console.error("Error decoding filename:", error);
      return url.split('/').pop() || "Unknown file";
    }
  };
  
  // Function to compare URLs properly (normalize URLs before comparison)
  const areUrlsEqual = (url1: string | null, url2: string | null): boolean => {
    if (url1 === null || url2 === null) return false;
    
    try {
      // Normalize URLs by removing query parameters and decoding
      const normalize = (url: string) => {
        return decodeURIComponent(url.split('?')[0]);
      };
      
      return normalize(url1) === normalize(url2);
    } catch (error) {
      console.error("Error comparing URLs:", error);
      return url1 === url2;
    }
  };
  
  const handleMediaClick = (media: string) => {
    if (!addingNewMedia) {
      setLocalSelected(media);
      setVideoPlaybackError(null); // Reset error when selecting new media
    }
  };
  
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video playback error:", e);
    setVideoPlaybackError("Video codec not compatible with browser player - video uploaded successfully and can be set as default");
  };
  
  const handleConfirm = async () => {
    if (localSelected) {
      onMediaSelect(localSelected);
      onConfirmSelect?.(localSelected);
      
      // Set as primary media if it's different from current default
      if (!areUrlsEqual(defaultMedia, localSelected)) {
        try {
          await setDefaultMedia(cameraId, localSelected);
          // Refresh camera list after setting primary media
          if (refetchCameras) {
            refetchCameras();
          }
        } catch (error) {
          console.error("Failed to set as default media:", error);
          toast.error("Failed to set as default media");
        }
      }
      
      setIsDropdownOpen(false);
    }
  };
  
  const handleDeleteMedia = async (url: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the click from propagating to the parent
    
    try {
      await deleteMediaHistory(cameraId, url);
      if (areUrlsEqual(selectedMedia, url)) {
        onMediaSelect(null);
      }
      if (areUrlsEqual(localSelected, url)) {
        setLocalSelected(null);
      }
      
      // Refresh camera list after deleting media
      if (refetchCameras) {
        refetchCameras();
      }
    } catch (error) {
      console.error("Failed to delete media:", error);
      toast.error("Failed to delete media");
    }
  };
  
  const handleAddMediaClick = () => {
    setAddingNewMedia(true);
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      try {
        // Get upload URL
        const res = await getUploadUrl(file);
        
        // Upload video
        await uploadCameraVideo(file, res.url.upload_url, setVideoUploadProgress);
        
        // Get the final URL without query params
        const uploadedUrl = res.url.upload_url.split("?")[0];
        
        // Add to media history
        await addMediaHistory(cameraId, uploadedUrl);
        
        // Add to parent component's list and update UI
        if (onAddMedia) {
          onAddMedia(file);
        }
        
        // Auto-select the newly uploaded media
        setLocalSelected(uploadedUrl);
        
        setIsUploading(false);
        setAddingNewMedia(false);
        setPreviewUrl(null);
        setVideoUploadProgress(0);
        setVideoPlaybackError(null); // Reset error for new upload
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Refresh camera list after adding media
        if (refetchCameras) {
          refetchCameras();
        }
        
      } catch (error) {
        console.error("Failed to upload media:", error);
        toast.error("Failed to upload media");
        setIsUploading(false);
        setAddingNewMedia(false);
        setPreviewUrl(null);
        setVideoUploadProgress(0);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };
  
  const handleCancelAdd = () => {
    setAddingNewMedia(false);
    setPreviewUrl(null);
    setIsUploading(false);
    setVideoUploadProgress(0);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Custom scrollbar styles as a separate element
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap flex items-center gap-1">
          <Video className="w-4 h-4" />
          Test Media:
        </label>
        <div className="relative w-full">
          <button
            ref={buttonRef}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`
              flex items-center justify-between w-full px-4 py-2 text-sm border rounded-md transition-colors
              ${addingNewMedia 
                ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }
              ${isDropdownOpen ? 'bg-gray-50 border-gray-400' : 'bg-white'}
            `}
            disabled={addingNewMedia}
            aria-expanded={isDropdownOpen}
          >
            <span className="flex items-center gap-2 truncate">
              {defaultMedia ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="truncate">{getFilenameFromUrl(defaultMedia)}</span>
                  {areUrlsEqual(selectedMedia, defaultMedia) && (
                    <span className="ml-1 text-xs text-green-600 flex-shrink-0">(Default)</span>
                  )}
                </>
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform flex-shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          
          {isDropdownOpen && (
            <div 
              ref={dropdownRef}
              className="absolute z-50 w-[600px] left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
            >
              <div className="flex flex-col md:flex-row">
                {/* Header for small screens */}
                <div className="md:hidden p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-sm font-medium">Select Test Media</h3>
                  <button 
                    onClick={() => setIsDropdownOpen(false)}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              
                {/* Left - Options + Add Button */}
                <div className={`w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col md:max-h-[360px] ${
                  addingNewMedia ? 'bg-gray-50' : ''
                }`}>
                  <div className="p-2 bg-gray-50 border-b border-gray-200 hidden md:flex justify-between items-center">
                    <h3 className="text-xs font-medium text-gray-600">Available Media</h3>
                    <span className="text-xs text-gray-500">{mediaList.length} items</span>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {mediaList.length > 0 ? (
                      mediaList.map((media) => (
                        <div
                          key={media}
                          onClick={() => handleMediaClick(media)}
                          className={`
                            px-4 py-3 text-sm cursor-pointer transition-colors relative group
                            ${addingNewMedia
                              ? 'opacity-50 cursor-not-allowed'
                              : areUrlsEqual(localSelected, media)
                                ? "bg-teal-50 text-teal-700 border-l-4 border-teal-600"
                                : "text-gray-700 hover:bg-gray-50"
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate mr-6">
                              <Film size={16} className="flex-shrink-0 text-gray-500" />
                              <span className="truncate">
                                {getFilenameFromUrl(media)}
                              </span>
                              {areUrlsEqual(media, defaultMedia) && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                                  Default
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => handleDeleteMedia(media, e)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-full"
                              title="Delete media"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-sm text-gray-500 flex flex-col items-center justify-center">
                        <Film size={24} className="mb-2 text-gray-400" />
                        <p>No media available</p>
                        <p className="text-xs text-gray-400 mt-1">Upload a video to get started</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Add Test Media Button */}
                  {!addingNewMedia && (
                    <div className="p-3 border-t border-gray-200">
                      <button
                        onClick={handleAddMediaClick}
                        className={`
                          w-full px-4 py-2 text-sm rounded transition-colors flex items-center justify-center gap-2
                          ${addingNewMedia
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                          }
                        `}
                        disabled={addingNewMedia}
                      >
                        <Upload className="w-4 h-4" />
                        Add Test Media
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Right - Playback Area */}
                <div className="w-full md:w-2/3 p-4 flex flex-col items-center">
                  {addingNewMedia ? (
                    <>
                      <div className="w-full h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center mb-4">
                        {isUploading || isUploadingVideo ? (
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Uploading video...</p>
                            {videoUploadProgress > 0 && (
                              <div className="mt-2 w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-teal-600 transition-all"
                                  style={{ width: `${videoUploadProgress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ) : previewUrl ? (
                          <video
                            src={previewUrl}
                            className="w-full h-full object-contain rounded"
                            controls
                            autoPlay
                            muted
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Select a video file to upload</p>
                            <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI, WEBM, FLV, WMV, MPEG, MKV supported</p>
                            <button
                              onClick={handleAddMediaClick}
                              className="mt-4 px-4 py-1.5 text-sm border border-teal-600 text-teal-600 rounded hover:bg-teal-50 transition-colors"
                            >
                              Browse Files
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end w-full gap-2">
                        <button
                          onClick={handleCancelAdd}
                          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                          disabled={isUploading || isUploadingVideo}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : localSelected ? (
                    <>
                      <div className="w-full h-64 rounded-lg overflow-hidden mb-4 bg-gray-800 flex items-center justify-center relative">
                        {videoPlaybackError ? (
                          <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-orange-300">
                            <AlertCircle className="w-8 h-8 text-orange-600 mb-3" />
                            <div className="text-orange-800 font-medium mb-2">Video Playback Error</div>
                            <div className="text-sm text-orange-700 mb-4 max-w-xs">
                              {videoPlaybackError}
                            </div>
                            <div className="text-xs text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                              ✓ Video uploaded successfully
                            </div>
                          </div>
                        ) : (
                          <video
                            key={localSelected}
                            src={localSelected}
                            className="w-full h-full object-contain"
                            controls
                            autoPlay
                            muted
                            onError={handleVideoError}
                          />
                        )}
                      </div>
                      <div className="flex flex-col md:flex-row justify-between w-full gap-2 items-center">
                        <div className="text-sm text-gray-500 overflow-hidden text-ellipsis w-full md:w-2/3">
                          <p className="truncate" title={localSelected}>
                            {getFilenameFromUrl(localSelected)}
                          </p>
                        </div>
                        <button
                          onClick={handleConfirm}
                          className={`
                            w-full md:w-auto mt-2 md:mt-0 px-6 py-2 text-sm rounded transition-colors flex items-center justify-center gap-2
                            ${areUrlsEqual(localSelected, defaultMedia)
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-teal-600 text-white hover:bg-teal-700'
                            }
                          `}
                          disabled={areUrlsEqual(localSelected, defaultMedia)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {areUrlsEqual(localSelected, defaultMedia) ? 'Already Default' : 'Set as Default'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-64 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center text-gray-500">
                      <Video className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm mb-2">Select a media to preview</p>
                      <p className="text-xs text-gray-400">Choose from the list or upload a new one</p>
                    </div>
                  )}
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp4, .avi, .mov, .mkv, .webm, .flv, .wmv, .mpeg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaSelector;