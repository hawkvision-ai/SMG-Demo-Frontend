// import React, { useState, useEffect } from "react";
// import {
//   PlusCircle,
//   ChevronLeft,
//   ChevronRight,
//   AlertTriangle,
//   Play,
//   Square,
//   Edit,
//   Save,
//   X,
// } from "lucide-react";
// import eventSnapshot from "@/assets/preview.jpg";
// import { toast } from "react-hot-toast";
// import {
//   useGetEvent,
//   useViewEvent,
//   useAddCommentToEvent,
//   useCreateAction,
//   useGetAction,
//   useUpdateEventStatus,
//   useUpdateAction,
// } from "@/hooks/useApi";
// import { formatTime } from "@/utils/formatTime";

// interface EventDetailsModalProps {
//   event: any;
//   isOpen: boolean;
//   onClose: () => void;
//   user: any;
//   allEvents: any[];
//   onEventChange: (newEvent: any) => void;
//   onCrossPageNavigation?: (direction: "next" | "prev") => Promise<any>;
//   pageSize?: number;
//   currentPage?: number;
//   totalPages?: number;
//   onEventUpdate?: (eventId: string, updates: Partial<any>) => void;
// }

// export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
//   event,
//   isOpen,
//   onClose,
//   user,
//   allEvents,
//   onEventChange,
//   onCrossPageNavigation,
//   pageSize,
//   onEventUpdate,
//   currentPage = 1,
//   totalPages = 1,
// }) => {
//   // API hooks
//   const { execute: fetchEvent } = useGetEvent();
//   const { execute: viewEvent } = useViewEvent();
//   const { execute: updateEventStatus } = useUpdateEventStatus();
//   const { execute: addComment } = useAddCommentToEvent();
//   const { execute: createAction } = useCreateAction();
//   const { execute: updateAction } = useUpdateAction();
//   const { execute: fetchAction } = useGetAction();

//   // State for event details
//   const [selectedEvent, setSelectedEvent] = useState(event);
//   const [currentActionId, setCurrentActionId] = useState("");

//   // State for comments and actions
//   const [newComment, setNewComment] = useState("");
//   const [commentsList, setCommentsList] = useState<any[]>([]);
//   const [newActionMessage, setNewActionMessage] = useState("");
//   const [actionsList, setActionsList] = useState<any[]>([]);

//   // State for update action functionality
//   const [isEditingAction, setIsEditingAction] = useState(false);
//   const [editActionMessage, setEditActionMessage] = useState("");

//   // State for navigation loading
//   const [isNavigating, setIsNavigating] = useState(false);
//   const [isImageEnlarged, setIsImageEnlarged] = useState(false);

//   // Calculate current event index and navigation availability
//   const currentIndex = allEvents.findIndex(
//     (e) => (e.event_id || e.id) === (selectedEvent.event_id || selectedEvent.id),
//   );
//   const isFirstEvent = currentIndex === 0 && currentPage === 1;
//   const isLastEvent = currentIndex === allEvents.length - 1 && currentPage === totalPages;
//   const hasPrevious = !isFirstEvent;
//   const hasNext = !isLastEvent;

//   // Helper functions for status logic
//   const canMarkInvalid = () => {
//     return selectedEvent.status === "Seen";
//   };

//   const canMarkValid = () => {
//     return selectedEvent.status === "Invalid";
//   };


//   const hasOpenAction = () => {
//     return actionsList.length > 0 && actionsList[0]?.status === "Open";
//   };

//   const hasClosedAction = () => {
//     return actionsList.length > 0 && actionsList[0]?.status === "Closed";
//   };

//   const canCloseAction = () => {
//     return hasOpenAction();
//   };

//   const canReopenAction = () => {
//     return hasClosedAction();
//   };



//   // Load event details on mount or when event changes
//   useEffect(() => {
//     setSelectedEvent(event);
//     loadEventDetails(event);
//     setNewComment("");
//     setNewActionMessage("");
//     setIsEditingAction(false);
//     setEditActionMessage("");
//   }, [event, isOpen]);

//   // Update actions list when action data changes
//   useEffect(() => {
//     if (currentActionId) {
//       fetchAction(currentActionId, user?.timezone)
//         .then((actionData) => {
//           if (actionData) {
//             setActionsList([actionData]);
//           }
//         })
//         .catch((err) => console.error("Failed to fetch action:", err));
//     } else {
//       setActionsList([]);
//     }
//   }, [currentActionId]);

//   const toggleEnlargedImage = () => {
//     setIsImageEnlarged(!isImageEnlarged);
//   };

//   // Handle navigation to previous event
//   const handlePreviousEvent = async () => {
//     if (isNavigating) return;
//     setIsNavigating(true);

//     try {
//       const currentIndex = allEvents.findIndex(
//         (e) => (e.event_id || e.id) === (selectedEvent.event_id || selectedEvent.id),
//       );

//       if (currentIndex <= 0) {
//         if (currentPage <= 1 || !onCrossPageNavigation) {
//           setIsNavigating(false);
//           return;
//         }

//         const prevPageEvent = await onCrossPageNavigation("prev");
//         if (prevPageEvent) {
//           onEventChange(prevPageEvent);
//           setSelectedEvent(prevPageEvent);
//         }
//       } else {
//         const prevEvent = allEvents[currentIndex - 1];
//         onEventChange(prevEvent);
//         setSelectedEvent(prevEvent);
//         loadEventDetails(prevEvent);
//       }
//     } catch (error) {
//       console.error("Failed to navigate to previous event:", error);
//     } finally {
//       setIsNavigating(false);
//     }
//   };

//   // Handle navigation to next event
//   const handleNextEvent = async () => {
//     if (isNavigating) return;
//     setIsNavigating(true);

//     try {
//       const currentIndex = allEvents.findIndex(
//         (e) => (e.event_id || e.id) === (selectedEvent.event_id || selectedEvent.id),
//       );

//       if (currentIndex >= allEvents.length - 1) {
//         if (currentPage >= totalPages || !onCrossPageNavigation) {
//           setIsNavigating(false);
//           return;
//         }

//         const nextPageEvent = await onCrossPageNavigation("next");
//         if (nextPageEvent) {
//           onEventChange(nextPageEvent);
//           setSelectedEvent(nextPageEvent);
//         }
//       } else {
//         const nextEvent = allEvents[currentIndex + 1];
//         onEventChange(nextEvent);
//       }
//     } catch (error) {
//       console.error("Failed to navigate to next event:", error);
//     } finally {
//       setIsNavigating(false);
//     }
//   };

//   // Load full event details with timezone
//   const loadEventDetails = (eventToLoad = selectedEvent) => {
//     if (!eventToLoad) return;
//     const eventId = eventToLoad.event_id || eventToLoad.id;

//     fetchEvent(eventId, user?.timezone)
//       .then((fullEventData) => {
//         if (!fullEventData) return;

//         // Mark as viewed if needed (Logged/Notified -> Seen)
//         if (["Logged", "Notified"].includes(fullEventData.status)) {
//           viewEvent(eventId)
//             .then(() => {
//               const newStatus = "Seen";

//               setSelectedEvent((prev) => ({ ...prev, status: newStatus }));

//               if (onEventUpdate) {
//                 onEventUpdate(eventId, { status: newStatus });
//               }
//             })
//             .catch((err) => console.error("Failed to mark event as viewed:", err));
//         }

//         // Set comments
//         if (Array.isArray(fullEventData.comments)) {
//           setCommentsList(fullEventData.comments);
//         } else {
//           setCommentsList([]);
//         }

//         // Update selected event with full data
//         setSelectedEvent((prev) => ({ ...prev, ...fullEventData }));

//         // Handle action ID
//         if (fullEventData.action_id && String(fullEventData.action_id).trim() !== "") {
//           setCurrentActionId(fullEventData.action_id);
//         } else {
//           setCurrentActionId("");
//           setActionsList([]);
//         }
//       })
//       .catch((err) => console.error("Failed to process event:", err));
//   };

//   // Handle marking event as invalid
//   const handleMarkInvalid = () => {
//     if (!selectedEvent || !canMarkInvalid()) return;

//     updateEventStatus(selectedEvent.event_id || selectedEvent.id, "Invalid")
//       .then(() => {
//         const newStatus = "Invalid";

//         setSelectedEvent((prev) => ({ ...prev, status: newStatus }));

//         if (onEventUpdate) {
//           onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
//             status: newStatus,
//           });
//         }
//       })
//       .catch((error) => {
//         console.error("Failed to mark event as invalid:", error);
//       });
//   };

//   // Handle marking event as valid (from invalid back to seen)
//   const handleMarkValid = () => {
//     if (!selectedEvent || !canMarkValid()) return;

//     updateEventStatus(selectedEvent.event_id || selectedEvent.id, "Seen")
//       .then(() => {
//         const newStatus = "Seen";

//         // Update local selectedEvent state
//         setSelectedEvent((prev) => ({ ...prev, status: newStatus }));

//         // IMPORTANT: Also update the parent component's state
//         if (onEventUpdate) {
//           onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
//             status: newStatus,
//           });
//         }
//       })
//       .catch((error) => {
//         console.error("Failed to mark event as valid:", error);
//       });
//   };

//   // Handle adding a comment
//   const handleAddComment = async () => {
//     if (!selectedEvent || !newComment.trim()) return;

//     try {
//       const response = await addComment(selectedEvent.event_id || selectedEvent.id, newComment.trim(), user?.timezone);
//       if (response && response.comments) {
//         setCommentsList(Array.isArray(response.comments) ? response.comments : []);
//       }

//       setNewComment("");

//       if (onEventUpdate) {
//         onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
//           comments: response && response.comments ? response.comments : commentsList,
//         });
//       }
//     } catch (err) {
//       console.error("Failed to add comment:", err);
//     }
//   };

//   // Handle creating action required
//   const handleActionRequired = () => {
//     if (!selectedEvent) return;

//     const actionData = {
//       event_id: selectedEvent.event_id || selectedEvent.id,
//       action_taken: "",
//       status: "Action_Required",
//       created_by: user?.name || "User",
//     };

//     createAction(actionData)
//       .then((response) => {
//         if (response) {
//           setCurrentActionId(response.id);
//           // Refresh action data from getAction API
//           fetchAction(response.id, user?.timezone)
//             .then((refreshedActionData) => {
//               if (refreshedActionData) {
//                 setActionsList([refreshedActionData]);
//               }
//             })
//             .catch((err) => console.error("Failed to refresh action:", err));

//           if (onEventUpdate) {
//             onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
//               action_status: "Action_Required",
//               actions: [response],
//             });
//           }
//         }
//       })
//       .catch((err) => {
//         console.error("Failed to create action required:", err);
//         toast.error("Failed to create action required: " + (err.message || "Unknown error"));
//       });
//   };


//   // Handle direct take action (without action required first)
//   const handleDirectTakeAction = () => {
//     if (!selectedEvent || !newActionMessage.trim()) return;

//     const actionData = {
//       event_id: selectedEvent.event_id || selectedEvent.id,
//       action_taken: newActionMessage.trim(),
//       status: "Open",
//       created_by: user?.name || "User",
//     };

//     createAction(actionData)
//       .then((response) => {
//         if (response) {
//           setCurrentActionId(response.id);
//           setNewActionMessage("");
//           // Refresh action data from getAction API
//           fetchAction(response.id, user?.timezone)
//             .then((refreshedActionData) => {
//               if (refreshedActionData) {
//                 setActionsList([refreshedActionData]);
//               }
//             })
//             .catch((err) => console.error("Failed to refresh action:", err));

//           if (onEventUpdate) {
//             onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
//               action_status: "Open",
//               actions: [response],
//             });
//           }
//         }
//       })
//       .catch((err) => {
//         console.error("Failed to take action:", err);
//         toast.error("Failed to take action: " + (err.message || "Unknown error"));
//       });
//   };

//   // Handle starting to edit action
//   const handleStartEditAction = () => {
//     const currentAction = actionsList[0];
//     if (currentAction) {
//       setEditActionMessage(currentAction.action_taken || "");
//       setIsEditingAction(true);
//     }
//   };

//   // Handle canceling edit action
//   const handleCancelEditAction = () => {
//     setIsEditingAction(false);
//     setEditActionMessage("");
//   };

//   // Handle saving updated action
//   const handleSaveUpdatedAction = () => {
//     if (!editActionMessage.trim() || !currentActionId) return;

//     const currentAction = actionsList[0];
//     if (!currentAction) return;

//     const updateData = {
//       event_id: currentAction.event_id,
//       action_taken: editActionMessage.trim(),
//       created_by: currentAction.created_by,
//       status: "Open",
//     };

//     updateAction(currentActionId, updateData)
//       .then((response) => {
//         if (response) {
//           setIsEditingAction(false);
//           setEditActionMessage("");
//           // Refresh action data from getAction API to get updated time
//           fetchAction(currentActionId, user?.timezone)
//             .then((refreshedActionData) => {
//               if (refreshedActionData) {
//                 setActionsList([refreshedActionData]);
//               }
//             })
//             .catch((err) => console.error("Failed to refresh action:", err));

//           if (onEventUpdate) {
//             onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
//               action_status: "Open",
//               actions: [response],
//             });
//           }
//         }
//       })
//       .catch((err) => {
//         console.error("Failed to update action:", err);
//         toast.error("Failed to update action");
//       });
//   };

//   // Handle closing action
//   const handleCloseAction = () => {
//     if (!canCloseAction() || !currentActionId) return;

//     const currentAction = actionsList[0];
//     if (!currentAction) return;

//     const updateData = {
//       event_id: currentAction.event_id,
//       action_taken: currentAction.action_taken,
//       created_by: currentAction.created_by,
//       status: "Closed",
//     };

//     updateAction(currentActionId, updateData)
//       .then((response) => {
//         if (response) {
//           setIsEditingAction(false);
//           // Refresh action data from getAction API to get updated time
//           fetchAction(currentActionId, user?.timezone)
//             .then((refreshedActionData) => {
//               if (refreshedActionData) {
//                 setActionsList([refreshedActionData]);
//               }
//             })
//             .catch((err) => console.error("Failed to refresh action:", err));

//           if (onEventUpdate) {
//             onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
//               action_status: "Closed",
//               actions: [response],
//             });
//           }
//         }
//       })
//       .catch((err) => {
//         console.error("Failed to close action:", err);
//         toast.error("Failed to close action");
//       });
//   };

//   // Handle reopening action
//   const handleReopenAction = () => {
//     if (!canReopenAction() || !currentActionId) return;

//     const currentAction = actionsList[0];
//     if (!currentAction) return;

//     const updateData = {
//       event_id: currentAction.event_id,
//       action_taken: currentAction.action_taken,
//       created_by: currentAction.created_by,
//       status: "Open",
//     };

//     updateAction(currentActionId, updateData)
//       .then((response) => {
//         if (response) {
//           // Refresh action data from getAction API to get updated time
//           fetchAction(currentActionId, user?.timezone)
//             .then((refreshedActionData) => {
//               if (refreshedActionData) {
//                 setActionsList([refreshedActionData]);
//               }
//             })
//             .catch((err) => console.error("Failed to refresh action:", err));
//         }
//       })
//       .catch((err) => {
//         console.error("Failed to reopen action:", err);
//         toast.error("Failed to reopen action");
//       });
//   };

//   const getGlobalEventNumber = () => {
//     return selectedEvent.Sno || selectedEvent.s_no || 1;
//   };

//   // Keyboard event listeners
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (!isOpen) return;

//       if (e.key === "ArrowLeft" && hasPrevious && !isNavigating) {
//         e.preventDefault();
//         handlePreviousEvent();
//       } else if (e.key === "ArrowRight" && hasNext && !isNavigating) {
//         e.preventDefault();
//         handleNextEvent();
//       } else if (e.key === "Escape") {
//         onClose();
//       }
//     };

//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, [isOpen, hasPrevious, hasNext, isNavigating, onClose, handlePreviousEvent, handleNextEvent]);

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto p-2 md:p-4">
//       {/* Backdrop */}
//       <div className="absolute inset-0 bg-black/80" onClick={onClose} />

//       <div className="animate-fadeIn relative w-full max-w-4xl rounded-xl bg-gray-50 shadow-2xl">
//         {/* Header */}
//         <div className="flex items-center justify-between rounded-t-xl bg-gradient-to-r from-teal-700 to-teal-500 px-4 py-3">
//           <div className="flex items-center">
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="mr-2 h-6 w-6 text-white"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//               />
//             </svg>
//             <h3 className="text-xl font-semibold text-white">Event Details</h3>

//             <div className="ml-4 flex space-x-2">
//               <span className="ml-4 rounded-md bg-white/20 px-3 py-1 text-sm font-medium text-white">
//                 <span className="font-bold text-white">Event {getGlobalEventNumber()}</span>
//                 <span className="mx-2 text-white/60">|</span>
//                 <span>
//                   Page {currentPage} of {totalPages}
//                 </span>
//               </span>
//             </div>
//           </div>

//           <div className="flex items-center space-x-4">
//             <button
//               onClick={onClose}
//               className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-gray-600 transition-colors duration-150 hover:bg-gray-100 hover:text-black focus:outline-none"
//               title="Close"
//             >
//               ✕
//             </button>
//           </div>
//         </div>

//         {/* Main Content - Equal Height Layout */}
//         <div className="p-4">
//           <div className="flex flex-col gap-2 md:flex-row md:gap-4">
//             {/* Left Column - Event Info and Image - Fixed Height */}
//             <div className="flex w-full flex-col space-y-4 md:w-1/2">
//               {/* Event Information - Flexible Height */}
//               <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
//                 <div className="flex h-full flex-col p-4">
//                   <div className="mb-2 flex items-center justify-between">
//                     <h4 className="flex items-center text-lg font-medium text-gray-800">
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         className="mr-2 h-5 w-5 text-teal-600"
//                         viewBox="0 0 20 20"
//                         fill="currentColor"
//                       >
//                         <path
//                           fillRule="evenodd"
//                           d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
//                           clipRule="evenodd"
//                         />
//                       </svg>
//                       Event Information
//                     </h4>

//                     {/* Status Badge */}
//                     <span
//                       className={`rounded-full px-3 py-1 text-sm font-semibold ${selectedEvent.status === "Logged"
//                         ? "border border-blue-200 bg-blue-100 text-blue-800"
//                         : selectedEvent.status === "Notified"
//                           ? "border border-indigo-200 bg-indigo-100 text-indigo-800"
//                           : selectedEvent.status === "Seen"
//                             ? "border border-purple-200 bg-purple-100 text-purple-800"
//                             : selectedEvent.status === "Invalid"
//                               ? "border border-red-200 bg-red-100 text-red-800"
//                               : "border border-gray-200 bg-gray-100 text-gray-800"
//                         }`}
//                     >
//                       {selectedEvent.status}
//                     </span>
//                   </div>

//                   {/* Scrollable content area for event information */}
//                   <div className="flex-1 overflow-y-auto">
//                     <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-sm">
//                       <div className="flex flex-col space-y-1">
//                         <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
//                           <span className="block font-medium text-gray-700">Risk Detected</span>
//                           <span className="block text-gray-700">
//                             {selectedEvent.uc_type?.replace(/_/g, " ")}
//                           </span>
//                         </div>

//                         <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
//                           <span className="block font-medium text-gray-700">Camera</span>
//                           <span className="block text-gray-700">
//                             {selectedEvent.camera_name || selectedEvent.camera_id}
//                           </span>
//                         </div>

//                         <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
//                           <span className="block font-medium text-gray-700">Location Tags</span>
//                           <span
//                             className="block truncate text-gray-700"
//                             title={selectedEvent.location_tags?.join(", ")}
//                           >
//                             {selectedEvent.location_tags && selectedEvent.location_tags.length > 0
//                               ? selectedEvent.location_tags.join(", ")
//                               : "No tags"}
//                           </span>
//                         </div>
//                       </div>

//                       <div className="flex flex-col space-y-1">
//                         <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
//                           <span className="block font-medium text-gray-700">Site</span>
//                           <span className="block text-gray-700">
//                             {selectedEvent.site_name || selectedEvent.site_id}
//                           </span>
//                         </div>

//                         <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
//                           <span className="block font-medium text-gray-700">Created Time</span>
//                           <span className="block text-gray-700">
//                             {selectedEvent.time_created &&
//                               !selectedEvent.time_created.includes("Invalid") ? (
//                               formatTime(selectedEvent.time_created.replace(" ", "T").split(" ")[0])
//                             ) : (
//                               <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
//                             )}
//                           </span>
//                         </div>

//                         <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
//                           <span className="block font-medium text-gray-700">Risk Type</span>
//                           <span className="block text-gray-700">{selectedEvent.severity}</span>
//                         </div>
//                       </div>

//                       <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
//                         <span className="block font-medium text-gray-700">Received Time</span>
//                         <span className="block text-gray-700">
//                           {selectedEvent.time_received ? (
//                             formatTime(selectedEvent.time_received)
//                           ) : (
//                             <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
//                           )}
//                         </span>
//                       </div>

//                       <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
//                         <span className="block font-medium text-gray-700">Details</span>
//                         <div className="">
//                           {Array.isArray(selectedEvent.details) && selectedEvent.details.length > 0 ? (
//                             <div className="flex flex-wrap gap-1">
//                               {selectedEvent.details.map((detail: any, index: number) => {
//                                 const displayText = typeof detail === 'string'
//                                   ? detail
//                                   : typeof detail === 'object' && detail !== null
//                                     ? Object.entries(detail).map(([key, value]) => `${key}: ${value}`).join(', ')
//                                     : String(detail);

//                                 return (
//                                   <span
//                                     key={index}
//                                     className="inline-block rounded bg-gray-200 px-2 text-xs text-gray-700"
//                                     title={displayText}
//                                   >
//                                     {displayText}
//                                   </span>
//                                 );
//                               })}
//                             </div>
//                           ) : selectedEvent.details &&
//                             typeof selectedEvent.details === "object" &&
//                             !Array.isArray(selectedEvent.details) ? (
//                             <div className="flex flex-wrap ">
//                               {Object.entries(selectedEvent.details).map(([key, value], index) => (
//                                 <span
//                                   key={index}
//                                   className="inline-block px-2 text-xs text-gray-700"
//                                   title={`${key}: ${String(value)}`}
//                                 >
//                                   {key}: {String(value)}
//                                 </span>
//                               ))}
//                             </div>
//                           ) : (
//                             <span className="text-gray-500">No details available</span>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Event Image - Fixed Height */}
//               <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
//                 <h4 className="mb-2 flex items-center text-base font-medium text-gray-800">
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="mr-2 h-5 w-5 text-teal-600"
//                     viewBox="0 0 20 20"
//                     fill="currentColor"
//                   >
//                     <path
//                       fillRule="evenodd"
//                       d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
//                       clipRule="evenodd"
//                     />
//                   </svg>
//                   Event Snapshot
//                 </h4>
//                 <div
//                   className="w-full cursor-zoom-in overflow-hidden rounded-lg border border-gray-200"
//                   onClick={toggleEnlargedImage}
//                 >
//                   {selectedEvent.media_link ? (
//                     <div className="relative">
//                       <img
//                         src={selectedEvent.media_link}
//                         alt="Event snapshot"
//                         className="aspect-video w-full rounded-md object-cover"
//                         onError={(e) => {
//                           e.currentTarget.src = eventSnapshot;
//                           e.currentTarget.onerror = null;
//                         }}
//                       />
//                     </div>
//                   ) : (
//                     <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-500">
//                       Event Preview
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Enlarged Image Modal */}
//               {isImageEnlarged && (
//                 <div
//                   className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
//                   onClick={toggleEnlargedImage}
//                 >
//                   <div className="relative max-h-[85vh] max-w-[85vw] cursor-zoom-out">
//                     <div className="relative p-4">
//                       <div className="overflow-hidden rounded-lg">
//                         <img
//                           src={selectedEvent.media_link || eventSnapshot}
//                           alt="Enlarged event snapshot"
//                           className="mx-auto block max-h-[75vh] max-w-[80vw] object-contain"
//                           onError={(e) => {
//                             e.currentTarget.src = eventSnapshot;
//                             e.currentTarget.onerror = null;
//                           }}
//                         />
//                       </div>

//                       <button
//                         onClick={toggleEnlargedImage}
//                         className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-colors duration-200 hover:bg-gray-900"
//                       >
//                         ✕
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Right Column - Actions and Comments - Matching Height */}
//             <div className="flex w-full flex-col space-y-4 md:w-1/2">
//               {/* Actions Section - Flexible Height */}
//               <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
//                 <div className="flex h-full flex-col">
//                   <div className="border-b border-gray-200 px-4 py-3">
//                     <h4 className="flex items-center justify-between text-lg font-medium text-gray-800">
//                       <div className="flex items-center">
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           className="mr-2 h-5 w-5 text-teal-600"
//                           viewBox="0 0 20 20"
//                           fill="currentColor"
//                         >
//                           <path
//                             fillRule="evenodd"
//                             d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
//                             clipRule="evenodd"
//                           />
//                         </svg>
//                         Action
//                       </div>
//                       <div className="flex items-center space-x-2">
//                         <span
//                           className={`rounded-md px-3 py-1 text-sm font-medium ${actionsList.length > 0
//                             ? actionsList[0]?.status === "Open"
//                               ? "bg-blue-100 text-blue-800"
//                               : actionsList[0]?.status === "Closed"
//                                 ? "bg-green-100 text-green-800"
//                                 : "bg-gray-100 text-gray-600"
//                             : "bg-gray-100 text-gray-600"
//                             }`}
//                         >
//                           {actionsList.length > 0 ? actionsList[0]?.status || "Open" : "No Action"}
//                         </span>
//                       </div>
//                     </h4>
//                   </div>

//                   {/* Scrollable Actions Content */}
//                   {/* Scrollable Actions Content */}
//                   <div className="flex-1 overflow-y-auto p-4">
//                     {actionsList.length > 0 ? (
//                       <div>
//                         {/* Action Details */}
//                         <div className="mb-1 flex items-center justify-between">
//                           <div className="flex items-center">
//                             <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100">
//                               <svg
//                                 xmlns="http://www.w3.org/2000/svg"
//                                 className="h-4 w-4 text-gray-700"
//                                 viewBox="0 0 20 20"
//                                 fill="currentColor"
//                               >
//                                 <path
//                                   fillRule="evenodd"
//                                   d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
//                                   clipRule="evenodd"
//                                 />
//                               </svg>
//                             </div>
//                             <div>
//                               <p className="text-base font-medium text-gray-800">
//                                 {actionsList[0]?.created_by || "System"}
//                               </p>
//                               <p className="text-sm text-gray-500">
//                                 {formatTime(actionsList[0]?.created_at || "Date not available")}
//                               </p>
//                             </div>
//                           </div>
//                         </div>

//                         {/* Action Content */}
//                         <div>
//                           {/* Action Display or Edit Mode */}
//                           {isEditingAction ? (
//                             <div>
//                               <div className="mb-3">
//                                 <textarea
//                                   value={editActionMessage}
//                                   onChange={(e) => setEditActionMessage(e.target.value)}
//                                   className="w-full resize-none rounded-md border border-gray-300 px-4 py-2 text-base focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
//                                   rows={3}
//                                   placeholder="Update action details..."
//                                 />
//                               </div>

//                               <div className="flex justify-end space-x-2">
//                                 <button
//                                   onClick={handleCancelEditAction}
//                                   className="rounded-md bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
//                                 >
//                                   <X className="mr-1 inline h-4 w-4" />
//                                   Cancel
//                                 </button>

//                                 <button
//                                   onClick={handleSaveUpdatedAction}
//                                   disabled={!editActionMessage.trim()}
//                                   className="rounded-md bg-teal-600 px-3 py-1 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
//                                 >
//                                   <Save className="mr-1 inline h-4 w-4" />
//                                   Save
//                                 </button>
//                               </div>
//                             </div>
//                           ) : (
//                             <div>
//                               <div className="relative mb-2 rounded-lg border border-gray-200 bg-white p-3">
//                                 <p className="pr-10 text-base leading-relaxed break-words whitespace-pre-wrap text-gray-800">
//                                   {actionsList[0]?.action_taken ||
//                                     actionsList[0]?.action ||
//                                     "No action details available"}
//                                 </p>

//                                 {/* Edit button positioned at top-right */}
//                                 {hasOpenAction() && (
//                                   <button
//                                     onClick={handleStartEditAction}
//                                     className="absolute top-2 right-2 p-1 text-gray-400 transition-colors hover:text-blue-600"
//                                     title="Edit action"
//                                   >
//                                     <Edit className="h-4 w-4" />
//                                   </button>
//                                 )}
//                               </div>

//                               {/* Action Control Buttons */}
//                               <div className="flex justify-end space-x-2">
//                                 {canCloseAction() && (
//                                   <button
//                                     onClick={handleCloseAction}
//                                     className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
//                                   >
//                                     Close Action
//                                   </button>
//                                 )}

//                                 {canReopenAction() && (
//                                   <button
//                                     onClick={handleReopenAction}
//                                     className="rounded-md bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-500"
//                                   >
//                                     Reopen Action
//                                   </button>
//                                 )}
//                               </div>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     ) : (
//                       <div>
//                         {/* Action Input */}
//                         <div className="mb-3">
//                           <textarea
//                             value={newActionMessage}
//                             onChange={(e) => setNewActionMessage(e.target.value)}
//                             className="w-full resize-none rounded-md border border-gray-300 px-4 py-2 text-base focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
//                             rows={3}
//                             placeholder="Describe the action being taken..."
//                           />
//                         </div>

//                         {/* Action Button - Only Take Action */}
//                         <div className="flex justify-end">
//                           <button
//                             onClick={handleDirectTakeAction}
//                             disabled={!newActionMessage.trim()}
//                             className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
//                           >
//                             <PlusCircle className="mr-1 inline h-4 w-4" />
//                             Take Action
//                           </button>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               {/* Comments Section - Fixed Height */}
//               <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
//                 <div className="border-b border-gray-200 px-4 py-3">
//                   <h4 className="flex items-center justify-between text-lg font-medium text-gray-800">
//                     <div className="flex items-center">
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         className="mr-2 h-5 w-5 text-teal-600"
//                         viewBox="0 0 20 20"
//                         fill="currentColor"
//                       >
//                         <path
//                           fillRule="evenodd"
//                           d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"
//                           clipRule="evenodd"
//                         />
//                       </svg>
//                       Comments
//                     </div>

//                     <div className="flex justify-end">
//                       {canMarkInvalid() && (
//                         <button
//                           onClick={handleMarkInvalid}
//                           className="rounded-md bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
//                         >
//                           Mark Invalid
//                         </button>
//                       )}

//                       {canMarkValid() && (
//                         <button
//                           onClick={handleMarkValid}
//                           className="rounded-md bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600"
//                         >
//                           Mark Valid
//                         </button>
//                       )}
//                     </div>
//                   </h4>
//                 </div>

//                 <div className="p-4">
//                   <div
//                     className="mb-4 overflow-y-auto rounded-md border border-gray-200 pr-1"
//                     style={{ maxHeight: "200px", minHeight: "200px" }}
//                   >
//                     {commentsList && commentsList.length > 0 ? (
//                       <ul className="divide-y divide-gray-200">
//                         {commentsList.map((comment, index) => (
//                           <li key={index} className="px-3 py-3">
//                             <div className="flex items-start space-x-3">
//                               <div className="flex-shrink-0 rounded-full border border-gray-200 bg-gray-100 p-2 text-gray-600">
//                                 <svg
//                                   xmlns="http://www.w3.org/2000/svg"
//                                   className="h-4 w-4"
//                                   viewBox="0 0 20 20"
//                                   fill="currentColor"
//                                 >
//                                   <path
//                                     fillRule="evenodd"
//                                     d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
//                                     clipRule="evenodd"
//                                   />
//                                 </svg>
//                               </div>
//                               <div className="min-w-0 flex-1">
//                                 <div className="mb-1 flex items-center justify-between">
//                                   <p className="text-base font-medium text-gray-800">
//                                     {comment.user || comment.created_by || "User"}
//                                   </p>
//                                   <p className="text-sm text-gray-500">
//                                     {formatTime(
//                                       comment.timestamp ||
//                                       comment.created_at ||
//                                       "Date not available",
//                                     )}
//                                   </p>
//                                 </div>
//                                 <p className="text-base break-words whitespace-pre-wrap text-gray-700">
//                                   {comment.text || comment.comment}
//                                 </p>
//                               </div>
//                             </div>
//                           </li>
//                         ))}
//                       </ul>
//                     ) : (
//                       <div className="flex h-full flex-col items-center justify-center py-6 text-center">
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           className="mb-2 h-10 w-10 text-gray-300"
//                           fill="none"
//                           viewBox="0 0 24 24"
//                           stroke="currentColor"
//                         >
//                           <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             strokeWidth={1.5}
//                             d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
//                           />
//                         </svg>
//                         <p className="text-base font-medium text-gray-600">No comments yet</p>
//                       </div>
//                     )}
//                   </div>

//                   <div className="flex items-end space-x-3">
//                     <div className="flex-1">
//                       <textarea
//                         id="newComment"
//                         value={newComment}
//                         onChange={(e) => setNewComment(e.target.value)}
//                         className="w-full resize-none rounded-md border border-gray-300 px-4 py-2 text-base focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none"
//                         rows={2}
//                         placeholder="Add a comment..."
//                       />
//                     </div>
//                     <button
//                       type="button"
//                       onClick={handleAddComment}
//                       disabled={!newComment.trim()}
//                       className="mb-2 rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
//                     >
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         className="h-5 w-5"
//                         viewBox="0 0 20 20"
//                         fill="currentColor"
//                       >
//                         <path
//                           fillRule="evenodd"
//                           d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
//                           clipRule="evenodd"
//                         />
//                       </svg>
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Navigation Arrows */}
//           <button
//             onClick={handlePreviousEvent}
//             disabled={!hasPrevious || isNavigating}
//             className={`absolute top-1/2 left-0 z-20 -ml-14 flex h-28 w-14 -translate-y-1/2 transform items-center justify-center rounded-l-xl transition-all focus:outline-none ${hasPrevious && !isNavigating
//               ? "bg-black/30 text-white hover:bg-black/50"
//               : "cursor-not-allowed bg-gray-400/20 text-gray-400"
//               }`}
//             title="Previous Event (Left Arrow Key)"
//             aria-label="Previous Event"
//           >
//             <ChevronLeft className="h-12 w-12" />
//           </button>

//           <button
//             onClick={handleNextEvent}
//             disabled={!hasNext || isNavigating}
//             className={`absolute top-1/2 right-0 z-20 -mr-14 flex h-28 w-14 -translate-y-1/2 transform items-center justify-center rounded-r-xl transition-all focus:outline-none ${hasNext && !isNavigating
//               ? "bg-black/30 text-white hover:bg-black/50"
//               : "cursor-not-allowed bg-gray-400/20 text-gray-400"
//               }`}
//             title="Next Event (Right Arrow Key)"
//             aria-label="Next Event"
//           >
//             <ChevronRight className="h-12 w-12" />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default EventDetailsModal;


import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  User,
} from "lucide-react";
import eventSnapshot from "@/assets/preview.jpg";
import { toast } from "react-hot-toast";
import {
  useGetEvent,
  useViewEvent,
  useAddCommentToEvent,
  useCreateAction,
  useGetAction,
  useUpdateEventStatusLogs,
  useUpdateEventStatus,
  useUpdateAction,
} from "@/hooks/useApi";
import { formatTime } from "@/utils/formatTime";
import { VideoOff } from "lucide-react";


interface EventDetailsModalProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  user: any;
  allEvents: any[];
  onEventChange: (newEvent: any) => void;
  onCrossPageNavigation?: (direction: "next" | "prev") => Promise<any>;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  onEventUpdate?: (eventId: string, updates: Partial<any>) => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
  user,
  allEvents,
  onEventChange,
  onCrossPageNavigation,
  pageSize,
  onEventUpdate,
  currentPage = 1,
  totalPages = 1,
}) => {
  // API hooks
  const { execute: fetchEvent } = useGetEvent();
  const { execute: updateEventStatus } = useUpdateEventStatus();
  const { execute: updateEventStatusLogs } = useUpdateEventStatusLogs();
  const { execute: addComment } = useAddCommentToEvent();
  const { execute: createAction } = useCreateAction();
  const { execute: updateAction } = useUpdateAction();
  const { execute: fetchAction } = useGetAction();

  // State for event details
  const [selectedEvent, setSelectedEvent] = useState(event);

  // State for comments and actions
  const [newComment, setNewComment] = useState("");
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [newActionMessage, setNewActionMessage] = useState("");
  const [actionsList, setActionsList] = useState<any[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // State for navigation loading
  const [isNavigating, setIsNavigating] = useState(false);
  const [isImageEnlarged, setIsImageEnlarged] = useState(false);

  // State for dropdowns - Actions section closed by default
  const [isStatusExpanded, setIsStatusExpanded] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(true);

  //video snapshot
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  // Get current status (now a direct string value)
  const getCurrentStatus = () => {
    return selectedEvent.status || "Unknown";
  };

  // Get status history from status_logs (reversed to show latest first)
  const getStatusHistory = () => {
    if (!selectedEvent.status_logs || !Array.isArray(selectedEvent.status_logs)) {
      return [];
    }
    return [...selectedEvent.status_logs].reverse();
  };

  // Calculate current event index and navigation availability
  const currentIndex = allEvents.findIndex(
    (e) => (e.event_id || e.id) === (selectedEvent.event_id || selectedEvent.id),
  );
  const isFirstEvent = currentIndex === 0 && currentPage === 1;
  const isLastEvent = currentIndex === allEvents.length - 1 && currentPage === totalPages;
  const hasPrevious = !isFirstEvent;
  const hasNext = !isLastEvent;

  // Helper functions for status logic
  const canMarkInvalid = () => {
    return getCurrentStatus() === "Seen";
  };

  const canMarkValid = () => {
    return getCurrentStatus() === "Invalid";
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

  // Load event details on mount or when event changes
  useEffect(() => {
    setSelectedEvent(event);
    loadEventDetails(event);
    setNewComment("");
    setNewActionMessage("");
    setIsPlayingVideo(false);
  }, [event, isOpen]);

  // Update actions list when action data changes
  useEffect(() => {
    if (selectedEvent.action_id && Array.isArray(selectedEvent.action_id) && selectedEvent.action_id.length > 0) {
      // Fetch all actions
      Promise.all(
        selectedEvent.action_id.map(actionId =>
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
  }, [selectedEvent.action_id]);

  const toggleEnlargedImage = () => {
    setIsImageEnlarged(!isImageEnlarged);
  };

  // Handle navigation to previous event
  const handlePreviousEvent = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      const currentIndex = allEvents.findIndex(
        (e) => (e.event_id || e.id) === (selectedEvent.event_id || selectedEvent.id),
      );

      if (currentIndex <= 0) {
        if (currentPage <= 1 || !onCrossPageNavigation) {
          setIsNavigating(false);
          return;
        }

        const prevPageEvent = await onCrossPageNavigation("prev");
        if (prevPageEvent) {
          onEventChange(prevPageEvent);
          setSelectedEvent(prevPageEvent);
        }
      } else {
        const prevEvent = allEvents[currentIndex - 1];
        onEventChange(prevEvent);
        setSelectedEvent(prevEvent);
        loadEventDetails(prevEvent);
      }
    } catch (error) {
      console.error("Failed to navigate to previous event:", error);
    } finally {
      setIsNavigating(false);
    }
  };

  // Handle navigation to next event
  const handleNextEvent = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      const currentIndex = allEvents.findIndex(
        (e) => (e.event_id || e.id) === (selectedEvent.event_id || selectedEvent.id),
      );

      if (currentIndex >= allEvents.length - 1) {
        if (currentPage >= totalPages || !onCrossPageNavigation) {
          setIsNavigating(false);
          return;
        }

        const nextPageEvent = await onCrossPageNavigation("next");
        if (nextPageEvent) {
          onEventChange(nextPageEvent);
          setSelectedEvent(nextPageEvent);
        }
      } else {
        const nextEvent = allEvents[currentIndex + 1];
        onEventChange(nextEvent);
      }
    } catch (error) {
      console.error("Failed to navigate to next event:", error);
    } finally {
      setIsNavigating(false);
    }
  };

  // Load full event details with timezone
  const loadEventDetails = (eventToLoad = selectedEvent) => {
    if (!eventToLoad) return;
    const eventId = eventToLoad.event_id || eventToLoad.id;

    fetchEvent(eventId, user?.timezone)
      .then((fullEventData) => {
        if (!fullEventData) return;

        // Update selected event with full data (including fresh status_logs from API)
        setSelectedEvent((prev) => ({
          ...prev, ...fullEventData,
        }));

        // Read status directly from fresh API data
        const currentStatus = fullEventData.status || 'Unknown';

        // Always call updateEventStatusLogs API regardless of status
        updateEventStatusLogs(eventId, "Seen", user?.id)
          .catch((err) => console.error("Failed to update status logs:", err));

        // Call updateEventStatus API only when status is Logged or Notified
        if (["Logged", "Notified"].includes(currentStatus)) {
          setIsUpdatingStatus(true);

          updateEventStatus(eventId, "Seen", user?.id)
            .then(() => {
              const newStatus = "Seen";

              // Only update the status, don't manually update status_logs
              setSelectedEvent((prev) => ({
                ...prev,
                status: newStatus
              }));

              if (onEventUpdate) {
                onEventUpdate(eventId, { status: newStatus });
              }
            })
            .catch((err) => {
              toast.error("Failed to update event status");
            })
            .finally(() => {
              setIsUpdatingStatus(false);
            });
        }

        // Set comments
        if (Array.isArray(fullEventData.comments)) {
          setCommentsList(fullEventData.comments);
        } else {
          setCommentsList([]);
        }
      })
      .catch((err) => console.error("Failed to process event:", err));
  };

  // Handle marking event as invalid
  const handleMarkInvalid = () => {
    if (!selectedEvent || !canMarkInvalid()) return;

    setIsUpdatingStatus(true);
    const eventId = selectedEvent.event_id || selectedEvent.id;

    Promise.all([
      updateEventStatus(eventId, "Invalid", user?.id),
      updateEventStatusLogs(eventId, "Invalid", user?.id)
    ])
      .then(() => {
        const newStatus = "Invalid";
        setSelectedEvent((prev) => ({
          ...prev,
          status: newStatus
        }));
        if (onEventUpdate) {
          onEventUpdate(eventId, { status: newStatus });
        }
      })
      .catch((error) => {
        console.error("Failed to mark event as invalid:", error);
        toast.error("Failed to mark event as invalid"); // Add this line

      })
      .finally(() => {
        setIsUpdatingStatus(false);
      });
  };

  // Handle marking event as valid (from invalid back to seen)
  const handleMarkValid = () => {
    if (!selectedEvent || !canMarkValid()) return;

    setIsUpdatingStatus(true);
    const eventId = selectedEvent.event_id || selectedEvent.id;

    Promise.all([
      updateEventStatus(eventId, "Seen", user?.id),
      updateEventStatusLogs(eventId, "Seen", user?.id)
    ])
      .then(() => {
        const newStatus = "Seen";
        setSelectedEvent((prev) => ({
          ...prev,
          status: newStatus
        }));
        if (onEventUpdate) {
          onEventUpdate(eventId, { status: newStatus });
        }
      })
      .catch((error) => {
        console.error("Failed to mark event as valid:", error);
        toast.error("Failed to mark event as valid");

      })
      .finally(() => {
        setIsUpdatingStatus(false);
      });
  };

  // Handle adding a comment
  const handleAddComment = async () => {
    if (!selectedEvent || !newComment.trim()) return;

    try {
      const response = await addComment(selectedEvent.event_id || selectedEvent.id, newComment.trim(), user?.timezone);
      if (response && response.comments) {
        setCommentsList(Array.isArray(response.comments) ? response.comments : []);
      }

      setNewComment("");
      loadEventDetails();

      if (onEventUpdate) {
        onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
          comments: response && response.comments ? response.comments : commentsList,
        });
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };



  // Handle direct take action (add new action)
  const handleDirectTakeAction = async () => {
    if (!selectedEvent || !newActionMessage.trim()) return;

    const actionData = {
      event_id: selectedEvent.event_id || selectedEvent.id,
      action_taken: newActionMessage.trim(),
      status: "Open",
      created_by: user?.name || "User",
    };

    try {
      const response = await createAction(actionData);

      if (response && response.id) {
        setNewActionMessage("");

        // Fetch ONLY the newly created action with timezone formatting
        const freshAction = await fetchAction(response.id, user?.timezone);

        if (freshAction) {
          // Append the fresh action to existing actions list
          setActionsList((prev) => [...prev, freshAction]);

          // Update selected event's action_id array to include new action
          setSelectedEvent((prev) => ({
            ...prev,
            action_id: [...(prev.action_id || []), response.id]
          }));

          if (onEventUpdate) {
            onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
              action_id: [...(selectedEvent.action_id || []), response.id]
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to take action:", err);
      toast.error("Failed to take action: " + (err.message || "Unknown error"));
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
          setActionsList(prev =>
            prev.map(action =>
              action.id === actionId
                ? { ...action, status: "Closed" }
                : action
            )
          );

          if (onEventUpdate) {
            onEventUpdate(selectedEvent.event_id || selectedEvent.id, {
              actions: actionsList.map(action =>
                action.id === actionId
                  ? { ...action, status: "Closed" }
                  : action
              ),
            });
          }
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
        toast.error("Failed to reopen action");
      });
  };

  const getGlobalEventNumber = () => {
    return selectedEvent.Sno || selectedEvent.s_no || 1;
  };

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowLeft" && hasPrevious && !isNavigating) {
        e.preventDefault();
        handlePreviousEvent();
      } else if (e.key === "ArrowRight" && hasNext && !isNavigating) {
        e.preventDefault();
        handleNextEvent();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, isNavigating, onClose, handlePreviousEvent, handleNextEvent]);


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto p-2 md:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 " onClick={onClose} />

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

            <div className="ml-4 flex space-x-2">
              <span className="ml-4 rounded-md bg-white/20 px-3 py-1 text-sm font-medium text-white">
                <span className="font-bold text-white">Event {getGlobalEventNumber()}</span>
                <span className="mx-2 text-white/60">|</span>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-gray-600 transition-colors duration-150 hover:bg-gray-100 hover:text-black focus:outline-none"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          <div className="flex flex-col gap-2 md:flex-row md:gap-4 h-[calc(150vh-12rem)] max-h-[650px]">
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
                  <div className="flex-1 overflow-y-auto max-h-[350px]">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 ">
                      <div className="flex flex-col space-y-1">
                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Risk Detected</span>
                          <span className="block text-gray-700 text-xs">
                            {selectedEvent.uc_type?.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Camera</span>
                          <span className="block text-gray-700 text-xs">
                            {selectedEvent.camera_name || selectedEvent.camera_id}
                          </span>
                        </div>

                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700 ">Location Tags</span>
                          <span
                            className="block truncate text-gray-700 text-xs"
                            title={selectedEvent.location_tags?.join(", ")}
                          >
                            {selectedEvent.location_tags && selectedEvent.location_tags.length > 0
                              ? selectedEvent.location_tags.join(", ")
                              : "No tags"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Site</span>
                          <span className="block text-gray-700 text-xs">
                            {selectedEvent.site_name || selectedEvent.site_id}
                          </span>
                        </div>

                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Created Time</span>
                          <span className="block text-gray-700 text-xs">
                            {selectedEvent.time_created &&
                              !selectedEvent.time_created.includes("Invalid") ? (
                              formatTime(selectedEvent.time_created.replace(" ", "T").split(" ")[0])
                            ) : (
                              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
                            )}
                          </span>
                        </div>

                        <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                          <span className="block font-medium text-gray-700">Risk Type</span>
                          <span className="block text-gray-700 text-xs">{selectedEvent.severity}</span>
                        </div>
                      </div>

                      <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                        <span className="block font-medium text-gray-700 ">Received Time</span>
                        <span className="block text-gray-700 text-xs">
                          {selectedEvent.time_received ? (
                            formatTime(selectedEvent.time_received)
                          ) : (
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
                          )}
                        </span>
                      </div>

                      <div className="rounded-md border border-gray-100 bg-gray-50 p-2">
                        <span className="block font-medium text-gray-700">Details</span>
                        <div className="flex flex-wrap gap-1 ">
                          {(() => {
                            if (!selectedEvent.details ||
                              !Array.isArray(selectedEvent.details) ||
                              selectedEvent.details.length === 0) {
                              return <span>N/A</span>;
                            }

                            return selectedEvent.details.map((detail: any, index: number) => {
                              // If detail is a string (like "NO-Hardhat")
                              if (typeof detail === 'string') {
                                return (
                                  <span
                                    key={index}
                                    className="inline-block px-2 text-xs text-gray-700"
                                  >
                                    {detail}
                                  </span>
                                );
                              }

                              // If detail is an object (like {speed: 41, speed_limit: 5})
                              if (typeof detail === 'object' && detail !== null) {
                                return (
                                  <React.Fragment key={index}>
                                    {Object.entries(detail).map(([key, value], subIndex) => (
                                      <span
                                        key={`${index}-${subIndex}`}
                                        className="inline-block rounded bg-gray-200 px-2 text-xs text-gray-700"
                                      >
                                        {key.replace(/_/g, ' ')}: {String(value)}
                                      </span>
                                    ))}
                                  </React.Fragment>
                                );
                              }

                              // Fallback
                              return (
                                <span
                                  key={index}
                                  className="inline-block rounded bg-gray-200 px-2 text-xs text-gray-700"
                                >
                                  {String(detail)}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
         {/* Event Image/Video */}
<div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm flex-shrink-0">
  {/* Helper function to check if video exists - ADD THIS AT THE TOP OF YOUR COMPONENT */}
  {(() => {
    // Check if valid video URL exists
    const hasValidVideo = selectedEvent?.video_url && 
                          selectedEvent.video_url.trim() !== '' && 
                          selectedEvent.video_url !== 'null' && 
                          selectedEvent.video_url !== 'undefined' &&
                          selectedEvent.video_url.toLowerCase() !== 'none';

    return (
      <>
        {/* Header with title */}
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
          {hasValidVideo ? 'Event Media' : 'Event Snapshot'}
        </h4>

        {/* Toggle between Image and Video - ONLY show when video exists */}
        {hasValidVideo && (
          <div className="mb-3 flex items-center justify-center">
            <div className="flex w-full rounded-lg bg-gray-100 p-0.5">
              <button
                onClick={() => setIsPlayingVideo(false)}
                className={`flex w-1/2 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  !isPlayingVideo
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Snapshot
              </button>
              <button
                onClick={() => setIsPlayingVideo(true)}
                className={`flex w-1/2 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isPlayingVideo
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                Play Video
              </button>
            </div>
          </div>
        )}

        {/* Media Display Area */}
        <div className="relative w-full overflow-hidden rounded-lg border border-gray-200">
          {!isPlayingVideo || !hasValidVideo ? (
            // Show Image
            <div className="cursor-zoom-in" onClick={toggleEnlargedImage}>
              {selectedEvent.media_link ? (
                <img 
                  src={selectedEvent.media_link} 
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
          ) : (
            // Show Video
            <div className="relative bg-black">
              <video
                src={selectedEvent.video_url}
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
            src={selectedEvent.media_link || eventSnapshot}
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
                      <div className="flex items-center font-medium">
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
                            <div className="flex items-center">
                              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current mr-2"></div>

                            </div>
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
                            className="rounded-md bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 disabled:opacity-50"
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
                            className="rounded-md bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600 disabled:opacity-50"
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
                    className="border-b border-gray-200 px-4 py-3 cursor-pointer"
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
                                      <p className="text-xs text-gray-500">
                                        {formatTime(
                                          comment.timestamp ||
                                          comment.created_at ||
                                          "Date not available",
                                        )}
                                      </p>
                                    </div>
                                    <p className="text-base break-words whitespace-pre-wrap text-gray-700">
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
                            <p className="text-sm font-medium text-gray-600">No comments yet</p>
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
                      <div className="p-2">
                        <div
                          className="mb-2 overflow-y-auto "
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

          {/* Navigation Arrows */}
          <button
            onClick={handlePreviousEvent}
            disabled={!hasPrevious || isNavigating}
            className={`absolute top-1/2 left-0 z-20 -ml-14 flex h-28 w-14 -translate-y-1/2 transform items-center justify-center rounded-l-xl transition-all focus:outline-none ${hasPrevious && !isNavigating
              ? "bg-black/30 text-white hover:bg-black/50"
              : "cursor-not-allowed bg-gray-400/20 text-gray-400"
              }`}
            title="Previous Event (Left Arrow Key)"
            aria-label="Previous Event"
          >
            <ChevronLeft className="h-12 w-12" />
          </button>

          <button
            onClick={handleNextEvent}
            disabled={!hasNext || isNavigating}
            className={`absolute top-1/2 right-0 z-20 -mr-14 flex h-28 w-14 -translate-y-1/2 transform items-center justify-center rounded-r-xl transition-all focus:outline-none ${hasNext && !isNavigating
              ? "bg-black/30 text-white hover:bg-black/50"
              : "cursor-not-allowed bg-gray-400/20 text-gray-400"
              }`}
            title="Next Event (Right Arrow Key)"
            aria-label="Next Event"
          >
            <ChevronRight className="h-12 w-12" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;