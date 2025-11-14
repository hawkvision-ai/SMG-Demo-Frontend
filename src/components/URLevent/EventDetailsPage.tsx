import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PlusCircle, Clock, User, ChevronDown, VideoOff } from "lucide-react";
import { toast } from "react-hot-toast";

import {
  useGetEvent,
  useViewEvent,
  useAddCommentToEvent,
  useCreateAction,
  useGetAction,
  useUpdateEventStatus,
  useUpdateEventStatusLogs,
  useUpdateAction,
  useGetSite,
  useGetCamera
} from "@/hooks/useApi";
import { EventResponse } from "@/api/types";
import eventSnapshot from "@/assets/preview.jpg";
import { useAuth } from "@/context/AuthContext";
import Loading from "../Loading";
import { formatTime } from "@/utils/formatTime";

/**
 * Enhanced standalone page component to display event details with status history, actions, and comments
 * 
 * Updated Status Flow:
 * 1. Logged/Notified -> Seen (automatic when page loads)
 * 2. Seen -> Invalid (user marks invalid) OR Seen -> take action
 * 3. Invalid -> Seen (user marks valid)
 * 
 * Updated Action Flow:
 * 1. No Action -> Take Action
 * 2. Open Action -> Update Action (edit existing) OR Close Action
 * 3. Closed Action -> Reopen Action
 */
const EventDetailsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // API hooks
  const { execute: fetchEvent, loading: eventLoading } = useGetEvent();
  const { execute: viewEvent } = useViewEvent();
  const { execute: updateEventStatus } = useUpdateEventStatus();
  const { execute: updateEventStatusLogs } = useUpdateEventStatusLogs();
  const { execute: addComment } = useAddCommentToEvent();
  const { execute: createAction } = useCreateAction();
  const { execute: updateAction } = useUpdateAction();
  const { execute: fetchAction } = useGetAction();

  // State for event details
  const [event, setEvent] = useState<EventResponse | null>(null);

  // State for comments and actions
  const [newComment, setNewComment] = useState("");
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [newActionMessage, setNewActionMessage] = useState("");
  const [actionsList, setActionsList] = useState<any[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // State for update action functionality
  const [isEditingAction, setIsEditingAction] = useState(false);
  const [editActionMessage, setEditActionMessage] = useState("");


  // State for dropdowns
  const [isStatusExpanded, setIsStatusExpanded] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(true);

  const [isImageEnlarged, setIsImageEnlarged] = useState(false);
  const [siteInfo, setSiteInfo] = useState(null);
  const [cameraInfo, setCameraInfo] = useState(null);

  const { data: siteData, loading: siteLoading } = useGetSite(event?.site_id || "");
  const { data: cameraData, loading: cameraLoading } = useGetCamera(event?.camera_id || "");


  const [isPlayingVideo, setIsPlayingVideo] = useState(false);


  // Get current status (now a direct string value)
  const getCurrentStatus = () => {
    return event?.status || "Unknown";
  };

  // Get status history from status_logs (reversed to show latest first)
  const getStatusHistory = () => {
    if (!event?.status_logs || !Array.isArray(event.status_logs)) {
      return [];
    }
    return [...event.status_logs].reverse();
  };

  // Helper functions for updated status logic
  const canMarkInvalid = () => {
    return event && event.status === "Seen";
  };

  const canMarkValid = () => {
    return event && event.status === "Invalid";
  };

  const hasOpenAction = () => {
    return actionsList.length > 0 && actionsList.some(action => action.status === "Open");
  };

  const hasClosedAction = () => {
    return actionsList.length > 0 && actionsList.some(action => action.status === "Closed");
  };

  const canCloseAction = () => {
    return hasOpenAction();
  };

  const canReopenAction = () => {
    return hasClosedAction();
  };

  // Fetch the event data when the component mounts or eventId changes
  useEffect(() => {
    if (eventId) {
      loadEventDetails();
    }
  }, [eventId]);

  useEffect(() => {
    if (siteData) {
      setSiteInfo(siteData);
    }
  }, [siteData]);

  useEffect(() => {
    if (cameraData) {
      setCameraInfo(cameraData);
    }
  }, [cameraData]);

  // Update actions list when action data changes
  useEffect(() => {
    if (event?.action_id && Array.isArray(event.action_id) && event.action_id.length > 0) {
      // Fetch all actions
      Promise.all(
        event.action_id.map(actionId =>
          fetchAction(actionId, user?.timezone).catch(err => {
            console.error(`Failed to fetch action ${actionId}:`, err);
            return null;
          })
        )
      ).then(actions => {
        const validActions = actions.filter(action => action !== null);
        setActionsList(validActions);
      });
    } else {
      setActionsList([]);
    }
  }, [event?.action_id]);

  const toggleEnlargedImage = () => {
    setIsImageEnlarged(!isImageEnlarged);
  };

  // Load full event details with status history and timezone
  const loadEventDetails = () => {
    // Reset state
    setNewComment("");
    setNewActionMessage("");
    setIsEditingAction(false);
    setEditActionMessage("");
    setIsPlayingVideo(false);

    // Fetch complete event data with timezone
    fetchEvent(eventId, user?.timezone)
      .then((fullEventData) => {
        if (!fullEventData) {
          navigate("/events");
          return;
        }

        // Update event with full data (including fresh status_logs from API)
        setEvent(fullEventData);

        // Read status directly from fresh API data
        const currentStatus = fullEventData.status || 'Unknown';

        // Always call updateEventStatusLogs API regardless of status
        updateEventStatusLogs(eventId, "Seen", user?.id)
          .catch((err) => console.error("Failed to update status logs:", err));

        // Call updateEventStatus API only when status is Logged or Notified
        if (["Logged", "Notified"].includes(currentStatus)) {
          setIsUpdatingStatus(true); // Add this line

          updateEventStatus(eventId, "Seen", user?.id)
            .then(() => {
              const newStatus = "Seen";

              // Only update the status, don't manually update status_logs
              setEvent((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  status: newStatus
                };
              });
            })
            .catch((err) => {
              console.error("Failed to update event status:", err);
              toast.error("Failed to update event status"); // Add this line
            })
            .finally(() => {
              setIsUpdatingStatus(false); // Add this line
            });
        }

        // Set comments
        if (Array.isArray(fullEventData.comments)) {
          setCommentsList(fullEventData.comments);
        } else {
          setCommentsList([]);
        }
      })
      .catch((err) => {
        console.error("Failed to process event:", err);
      });
  };

  // Handle marking event as invalid
  const handleMarkInvalid = () => {
    if (!event || !canMarkInvalid()) return;

    setIsUpdatingStatus(true); // Add this line

    // Call both APIs
    Promise.all([
      updateEventStatus(eventId, "Invalid", user?.id),
      updateEventStatusLogs(eventId, "Invalid", user?.id)
    ])
      .then(() => {
        const newStatus = "Invalid";

        // Only update the status, don't manually update status_logs
        setEvent((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            status: newStatus
          };
        });
      })
      .catch((error) => {
        console.error("Failed to mark event as invalid:", error);
        toast.error("Failed to mark event as invalid"); // Add this line
      })
      .finally(() => {
        setIsUpdatingStatus(false); // Add this line
      });
  };

  // Handle marking event as valid (from invalid back to seen)
  const handleMarkValid = () => {
    if (!event || !canMarkValid()) return;

    setIsUpdatingStatus(true); // Add this line

    // Call both APIs
    Promise.all([
      updateEventStatus(eventId, "Seen", user?.id),
      updateEventStatusLogs(eventId, "Seen", user?.id)
    ])
      .then(() => {
        const newStatus = "Seen";

        // Only update the status, don't manually update status_logs
        setEvent((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            status: newStatus
          };
        });
      })
      .catch((error) => {
        console.error("Failed to mark event as valid:", error);
      })
      .finally(() => {
        setIsUpdatingStatus(false); // Add this line
      });
  };


  // Handle adding a comment
  const handleAddComment = async () => {
    if (!event || !newComment.trim()) return;

    try {
      await addComment(eventId, newComment.trim(), user?.timezone);
      setNewComment("");

      // Reload event to get fresh comments with timezone-formatted timestamps
      const freshEventData = await fetchEvent(eventId, user?.timezone);

      if (freshEventData) {
        // Update only the comments, don't touch other event data
        setCommentsList(Array.isArray(freshEventData.comments) ? freshEventData.comments : []);
      }

    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  // Handle direct take action (without action required first)
  const handleDirectTakeAction = async () => {
    if (!event || !newActionMessage.trim()) return;

    const actionData = {
      event_id: eventId,
      action_taken: newActionMessage.trim(),
      status: "Open",
      created_by: user?.name || "User",
    };

    try {
      const response = await createAction(actionData);

      if (response && response.id) {
        setNewActionMessage("");

        // Fetch only the newly created action with timezone
        const freshAction = await fetchAction(response.id, user?.timezone);

        if (freshAction) {
          // Add the fresh action to existing list
          setActionsList((prev) => [...prev, freshAction]);
        }
      }
    } catch (err) {
      console.error("Failed to take action:", err);
      toast.error("Failed to take action");
    }
  };
  // Handle closing specific action
  const handleCloseAction = (actionId: string) => {
    const actionToClose = actionsList.find(action => action.id === actionId);
    if (!actionToClose) return;

    const updateData = {
      event_id: actionToClose.event_id,
      action_taken: actionToClose.action_taken,
      created_by: actionToClose.created_by,
      status: "Closed",
    };

    updateAction(actionId, updateData)
      .then((response) => {
        if (response) {
          // Update only status, preserve original created_at time
          setActionsList(prev =>
            prev.map(action =>
              action.id === actionId
                ? { ...action, status: "Closed" }
                : action
            )
          );
        }
      })
      .catch((err) => {
        console.error("Failed to close action:", err);
        toast.error("Failed to close action");
      });
  };

  // Handle reopening specific action
  const handleReopenAction = (actionId: string) => {
    const actionToReopen = actionsList.find(action => action.id === actionId);
    if (!actionToReopen) return;

    const updateData = {
      event_id: actionToReopen.event_id,
      action_taken: actionToReopen.action_taken,
      created_by: actionToReopen.created_by,
      status: "Open",
    };

    updateAction(actionId, updateData)
      .then((response) => {
        if (response) {
          // Update the specific action in the list
          setActionsList(prev =>
            prev.map(action => action.id === actionId ? response : action)
          );
        }
      })
      .catch((err) => {
        console.error("Failed to reopen action:", err);
      });
  };

  const handleBackReport = () => {
    navigate("/home");
  };

  const getEventDetails = (
    ucType: string | undefined,
    additionalInfo: Record<string, any> | undefined
  ): string => {
    if (!ucType || !additionalInfo) return "N/A";

    const normalizedUcType = ucType.toLowerCase();
    const details: string[] = [];

    // Use case specific details
    switch (normalizedUcType) {
      case "ppe":
        const missingItems = additionalInfo.missing_items;
        if (Array.isArray(missingItems) && missingItems.length > 0) {
          details.push(`Missing Items: ${missingItems.join(", ")}`);
        }
        break;

      case "speeding":
        if (additionalInfo.speed !== undefined) {
          details.push(`Speed: ${additionalInfo.speed} km/h`);
        }
        if (additionalInfo.speed_limit !== undefined) {
          details.push(`Speed Limit: ${additionalInfo.speed_limit} km/h`);
        }
        break;

      case "vehicle_queue":
        if (additionalInfo.vehicle_count !== undefined) {
          details.push(`Vehicle Count: ${additionalInfo.vehicle_count}`);
        }
        break;

      case "near_miss":
        if (additionalInfo.margin_distance !== undefined) {
          details.push(`Margin Distance: ${additionalInfo.margin_distance} m`);
        }
        break;

      default:
        break;
    }

    // // Common details (bbox_width, bbox_height, ppm) - show for all use cases if present
    // if (additionalInfo.bbox_width !== undefined) {
    //   details.push(`Bbox Width: ${additionalInfo.bbox_width.toFixed(2)}`);
    // }
    // if (additionalInfo.bbox_height !== undefined) {
    //   details.push(`Bbox Height: ${additionalInfo.bbox_height.toFixed(2)}`);
    // }
    // if (additionalInfo.ppm !== undefined) {
    //   details.push(`PPM: ${additionalInfo.ppm.toFixed(2)}`);
    // }

    // Return as comma-separated string
    return details.length > 0 ? details.join(", ") : "N/A";
  };

  // If event is still loading, show a loading state
  if (eventLoading || !event || siteLoading || cameraLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto p-2 md:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={handleBackReport} />

      <div className="animate-fadeIn relative w-full max-w-4xl rounded-xl bg-gray-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-teal-700 to-teal-500 px-4 py-3">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-white">Event Details</h3>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackReport}
              className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-gray-600 transition-colors duration-150 hover:bg-gray-100 hover:text-black focus:outline-none"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          <div className="flex flex-col gap-2 md:flex-row md:gap-4 h-[calc(100vh-12rem)] max-h-[630px]">
            {/* Left Column - Event Info and Image */}
            <div className="flex w-full flex-col space-y-4 md:w-1/2 overflow-y-auto">
              {/* Event Information */}
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm flex-shrink-0">
                <div className="flex flex-col p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="flex items-center text-lg font-medium text-gray-800">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-2 h-5 w-5 text-teal-600"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Event Information
                    </h4>
                  </div>

                  {/* Scrollable content area for event information */}
                  <div className="overflow-y-auto max-h-[350px]">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 ">
                      <div className="flex flex-col space-y-1">
                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Risk Detected</span>
                          <span className="block text-gray-700 text-xs">
                            {event.uc_type?.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Camera</span>
                          <span className="block text-gray-700 text-xs">
                            {cameraInfo ? cameraInfo.name : event.camera_id}
                          </span>
                        </div>

                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Location Tags</span>
                          <span
                            className="block truncate text-gray-700 text-xs"
                            title={cameraInfo?.location_tags?.join(", ")}
                          >
                            {cameraInfo?.location_tags && cameraInfo.location_tags.length > 0
                              ? cameraInfo.location_tags.join(", ")
                              : event.additional_info?.func_tag_name || "No tags"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Site</span>
                          <span className="block text-gray-700 text-xs">
                            {siteInfo ? siteInfo.name : event.site_id}
                          </span>
                        </div>

                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Created Time</span>
                          <span className="block text-gray-700 text-xs">
                            {formatTime(event.time_created)}
                          </span>
                        </div>

                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Risk Type</span>
                          <span className="block text-gray-700 text-xs">{event.severity}</span>
                        </div>
                      </div>

                      <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                        <span className="block font-medium text-gray-700">Received Time</span>
                        <span className="block text-gray-700 text-xs">
                          {formatTime(event.time_received)}
                        </span>
                      </div>

                      <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                        <span className="block font-medium text-gray-700">Details</span>
                        <span className="block text-gray-700 text-xs">
                          {getEventDetails(event.uc_type, event.additional_info)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Event Image/Video */}
              <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm flex-shrink-0">
                {(() => {
                  // Helper function to check if video is valid
                  const hasValidVideo = () => {
                    if (!event?.video_url) return false;

                    const videoUrl = String(event.video_url).trim().toLowerCase();

                    // Check for invalid values
                    const invalidValues = ['', 'null', 'undefined', 'none', 'n/a', 'na'];
                    if (invalidValues.includes(videoUrl)) return false;

                    // Video URL should be a valid string with some content
                    return videoUrl.length > 5; // Minimum realistic URL length
                  };

                  const isVideoValid = hasValidVideo();

                  return (
                    <>

                      <h4 className="mb-2 flex items-center text-base font-medium text-gray-800">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="mr-2 h-5 w-5 text-teal-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {hasValidVideo() ? (isPlayingVideo ? 'Event Media' : 'Event Snapshot') : 'Event Snapshot'}
                      </h4>

                      {/* Toggle between Image and Video - ONLY show when video is valid */}
                      {isVideoValid && (
                        <div className="mb-3 flex items-center justify-center">
                          <div className="flex w-full rounded-lg bg-gray-100 p-1">
                            <button
                              onClick={() => setIsPlayingVideo(false)}
                              className={`flex w-1/2 items-center justify-center gap-1.5 rounded-md px-4 py-1 text-sm font-medium transition-colors ${!isPlayingVideo
                                  ? 'bg-teal-600 text-white'
                                  : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                              Image
                            </button>
                            <button
                              onClick={() => setIsPlayingVideo(true)}
                              className={`flex w-1/2 items-center justify-center gap-1.5 rounded-md px-4 py-1 text-sm font-medium transition-colors ${isPlayingVideo
                                  ? 'bg-teal-600 text-white'
                                  : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                              </svg>
                              Video
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
                        {!isPlayingVideo || !isVideoValid ? (
                          // Show Image
                          <>

                            <div className="cursor-zoom-in" onClick={toggleEnlargedImage}>
                              {event.media_link ? (
                                <img
                                  src={event.media_link}
                                  alt="Event snapshot"
                                  className="aspect-video w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = eventSnapshot;
                                    e.currentTarget.onerror = null;
                                  }}
                                />
                              ) : (
                                <div className="flex aspect-video w-full items-center justify-center bg-gray-50 text-gray-500">
                                  <div className="text-center">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="mx-auto h-12 w-12 text-gray-300 mb-2"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                    <p className="text-sm">No image available</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>

                        ) : (
                          // Show Video
                          <div className="relative bg-black">
                            <video
                              src={event.video_url}
                              controls
                              autoPlay
                              disablePictureInPicture
                              controlsList="nopictureinpicture"
                              className="aspect-video w-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const errorDiv = e.currentTarget.parentElement?.querySelector('.video-error');
                                if (errorDiv) {
                                  (errorDiv as HTMLElement).style.display = 'flex';
                                }
                              }}
                            >
                              Your browser does not support video playback.
                            </video>
                            <div className="video-error hidden aspect-video w-full flex-col items-center justify-center bg-gray-100 text-gray-600">
                              <VideoOff className="mb-3 h-16 w-16 text-gray-400" />
                              <p className="text-sm font-medium text-gray-600">Failed to load video</p>
                              <p className="mt-1 text-xs text-gray-400">The video file may be corrupted or unavailable</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Enlarged Image Modal */}
              {isImageEnlarged && !isPlayingVideo && (
                <div
                  className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                  onClick={toggleEnlargedImage}
                >
                  <div className="relative max-h-[85vh] max-w-[85vw] cursor-zoom-out">
                    <div className="relative p-4">
                      <div className="overflow-hidden rounded-lg">
                        <img
                          src={event.media_link || eventSnapshot}
                          alt="Enlarged event snapshot"
                          className="mx-auto block max-h-[75vh] max-w-[80vw] object-contain"
                          onError={(e) => {
                            e.currentTarget.src = eventSnapshot;
                            e.currentTarget.onerror = null;
                          }}
                        />
                      </div>

                      <button
                        onClick={toggleEnlargedImage}
                        className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-colors duration-200 hover:bg-gray-900"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Status, Comments and Actions - Scrollable */}
            <div className="flex w-full flex-col md:w-1/2 overflow-y-auto max-h-full">
              <div className="space-y-4 pb-4">
                {/* Status History Section */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div
                    className="border-b border-gray-200 px-4 py-2 cursor-pointer"
                    onClick={() => setIsStatusExpanded(!isStatusExpanded)}
                  >
                    <h4 className="flex items-center justify-between text-lg font-medium text-gray-800">
                      <div className="flex items-center font-medium ">
                        <ChevronDown className={`mr-2 h-4 w-4 transform transition-transform ${isStatusExpanded ? '' : '-rotate-90'}`} />
                        <Clock className="mr-2 h-5 w-5 text-teal-600" />
                        Status History
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${getCurrentStatus() === "Logged"
                            ? "border border-blue-200 bg-blue-100 text-blue-800"
                            : getCurrentStatus() === "Notified"
                              ? "border border-indigo-200 bg-indigo-100 text-indigo-800"
                              : getCurrentStatus() === "Seen"
                                ? "border border-purple-200 bg-purple-100 text-purple-800"
                                : getCurrentStatus() === "Invalid"
                                  ? "border border-red-200 bg-red-100 text-red-800"
                                  : "border border-gray-200 bg-gray-100 text-gray-800"
                            }`}
                        >
                          {isUpdatingStatus ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                          ) : (
                            getCurrentStatus()
                          )}
                        </span>
                        {canMarkInvalid() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkInvalid();
                            }}
                            disabled={isUpdatingStatus}
                            className="rounded-md bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 disabled:opacity-50" // Add disabled:opacity-50
                          >
                            Mark Invalid
                          </button>
                        )}
                        {canMarkValid() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkValid();
                            }}
                            disabled={isUpdatingStatus}
                            className="rounded-md bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600 disabled:opacity-50" // Add disabled:opacity-50
                          >
                            Mark Valid
                          </button>
                        )}
                      </div>
                    </h4>
                  </div>

                  {isStatusExpanded && (
                    <div className="p-4">
                      <div className="max-h-40 overflow-y-auto">
                        {getStatusHistory().length > 0 ? (
                          getStatusHistory().map((entry, index) => (
                            <div key={index} className="mb-3 flex items-start space-x-3 border-b border-gray-100 pb-3 last:border-b-0">
                              <div className="flex-shrink-0">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-medium ${entry.value === "Logged"
                                    ? "bg-blue-500"
                                    : entry.value === "Notified"
                                      ? "bg-indigo-500"
                                      : entry.value === "Seen"
                                        ? "bg-purple-500"
                                        : entry.value === "Invalid"
                                          ? "bg-red-500"
                                          : "bg-gray-500"
                                    }`}
                                >
                                  {entry.value.charAt(0)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">{entry.value}</p>
                                  <p className="text-xs text-gray-500">{formatTime(entry.updated_at)}</p>
                                </div>
                                <p className="text-xs text-gray-600">by {entry.updated_by?.name || "unknown"}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                            <p className="text-base font-medium text-gray-600">No history yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div
                    className="border-b border-gray-200 px-4 py-2 cursor-pointer"
                    onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
                  >
                    <h4 className="flex items-center justify-between text-lg font-medium text-gray-800">
                      <div className="flex items-center">
                        <ChevronDown className={`mr-2 h-4 w-4 transform transition-transform ${isCommentsExpanded ? '' : '-rotate-90'}`} />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="mr-2 h-5 w-5 text-teal-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Comments
                      </div>
                      <span className="rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-600">
                        {commentsList.length}
                      </span>
                    </h4>
                  </div>

                  {isCommentsExpanded && (
                    <div className="p-4">
                      <div
                        className="mb-4 overflow-y-auto rounded-md border border-gray-200 pr-1"
                        style={{ maxHeight: "200px", minHeight: "100px" }}
                      >
                        {commentsList && commentsList.length > 0 ? (
                          <ul className="divide-y divide-gray-200">
                            {commentsList.map((comment, index) => (
                              <li key={index} className="px-3 py-3">
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 rounded-full border border-gray-200 bg-gray-100 p-2 text-gray-600">
                                    <User className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center justify-between">
                                      <p className="text-base font-medium text-gray-800">
                                        {comment.user || comment.created_by || "User"}
                                      </p>
                                      <p className="text-xs text-gray-500 ">
                                        {formatTime(
                                          comment.timestamp ||
                                          comment.created_at ||
                                          "Date not available",
                                        )}
                                      </p>
                                    </div>
                                    <p className="text-sm break-words whitespace-pre-wrap text-gray-800">
                                      {comment.text || comment.comment}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="mb-2 h-10 w-10 text-gray-300"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                            <p className="text-base font-medium text-gray-600">No comments yet</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-end space-x-3">
                        <div className="flex-1">
                          <textarea
                            id="newComment"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="w-full resize-none rounded-md border border-gray-300 px-4 py-2 text-base focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            rows={2}
                            placeholder="Add a comment..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                          className="mb-2 rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Section */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="flex flex-col">
                    <div
                      className="border-b border-gray-200 px-4 py-2 cursor-pointer"
                      onClick={() => setIsActionsExpanded(!isActionsExpanded)}
                    >
                      <h4 className="flex items-center justify-between text-lg font-medium text-gray-800">
                        <div className="flex items-center">
                          <ChevronDown className={`mr-2 h-4 w-4 transform transition-transform ${isActionsExpanded ? '' : '-rotate-90'}`} />
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="mr-2 h-5 w-5 text-teal-600"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Actions
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`rounded-md px-3 py-1 text-sm font-medium ${actionsList.length > 0
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-600"
                              }`}
                          >
                            {actionsList.length > 0 ? `${actionsList.length}${actionsList.length > 1 ? '' : ''}` : "No Actions"}
                          </span>
                        </div>
                      </h4>
                    </div>

                    {/* Scrollable Actions Content */}
                    {isActionsExpanded && (
                      <div className="p-4">
                        <div
                          className="mb-4 overflow-y-auto  pr-1"
                          style={{ maxHeight: "200px", minHeight: "100px" }}
                        >
                          {actionsList.length > 0 ? (
                            <div className="space-y-4 p-3">
                              {actionsList.map((action, index) => (
                                <div key={action.id || index} className="border border-gray-200 rounded-lg p-3">
                                  {/* Action Header */}
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center">
                                      <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100">
                                        <User className="h-4 w-4 text-gray-700" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">
                                          {action.created_by || "Unknown"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {formatTime(action.created_at || "Date not available")}
                                        </p>
                                      </div>
                                    </div>
                                    <span
                                      className={`rounded-md px-2 py-1 text-xs font-medium ${action.status === "Open"
                                        ? "bg-blue-100 text-blue-800"
                                        : action.status === "Closed"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                      {action.status || "Open"}
                                    </span>
                                  </div>

                                  {/* Action Content */}
                                  <div className="mb-2 px-11">
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                      {action.action_taken || action.action || "No action details available"}
                                    </p>
                                  </div>

                                  {/* Action Control Buttons */}
                                  <div className="flex justify-end space-x-2">
                                    {action.status === "Open" && (
                                      <button
                                        onClick={() => handleCloseAction(action.id)}
                                        className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                                      >
                                        Close
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                              <p className="text-base font-medium text-gray-600">No actions yet</p>
                            </div>
                          )}
                        </div>

                        {/* Add New Action Input - Outside scrollable area */}
                        {!actionsList.some(action => action.status === "Open") && (
                          <div className="flex items-end space-x-3">
                            <div className="flex-1">
                              <textarea
                                value={newActionMessage}
                                onChange={(e) => setNewActionMessage(e.target.value)}
                                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                rows={2}
                                placeholder="Add action..."
                              />
                            </div>
                            <button
                              onClick={handleDirectTakeAction}
                              disabled={!newActionMessage.trim()}
                              className="mb-2 rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
                            >
                              <PlusCircle className="mr-1 inline h-4 w-4" />
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;