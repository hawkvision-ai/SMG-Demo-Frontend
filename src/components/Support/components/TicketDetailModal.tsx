import { TicketStatusEnum } from "@/api/types";
import Loading from "@/components/Loading";
import { useGetTicket, useTransitionIssue } from "@/hooks/useApi";
import { AlertCircle, ChevronDown, Download, Edit, File, FileText, Image, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import CommentSection, { CommentSectionRef } from "./CommentSection";
import UpdateTicket from "./UpdateTicket";

interface TicketDetailModalProps {
  ticketKey: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefetch?: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticketKey,
  isOpen,
  onClose,
  onRefetch,
}) => {
  const { data: ticketsData, loading, error, execute: getTicket } = useGetTicket(ticketKey || "");
  const { execute: transitionIssue, loading: isTransitioning } = useTransitionIssue();

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const commentSectionRef = useRef<CommentSectionRef>(null);

  // Handle both array and object responses
  const ticket = useMemo(() => {
    if (!ticketsData) return null;

    // If ticketsData is an array, get the first item
    if (Array.isArray(ticketsData)) {
      return ticketsData.length > 0 ? ticketsData[0] : null;
    }

    // If ticketsData is an object (single ticket), return it directly
    if (typeof ticketsData === "object" && ticketsData.key) {
      return ticketsData;
    }

    return null;
  }, [ticketsData]);

  // Parse current ticket sites and cameras from custom fields
  const getCurrentSitesAndCameras = (ticket: any) => {
    const currentSites: string[] = [];
    const currentCameras: string[] = [];

    // ✅ CORRECT - Extract sites from customfield_10224
    const sitesField = ticket.custom_fields?.customfield_10224;
    if (sitesField) {
      if (Array.isArray(sitesField)) {
        currentSites.push(...sitesField);
      } else if (typeof sitesField === "string") {
        currentSites.push(
          ...sitesField
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
        );
      }
    }

    // ✅ CORRECT - Extract cameras from customfield_10190
    const camerasField = ticket.custom_fields?.customfield_10190;
    if (camerasField) {
      if (Array.isArray(camerasField)) {
        currentCameras.push(...camerasField);
      } else if (typeof camerasField === "string") {
        currentCameras.push(
          ...camerasField
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
        );
      }
    }

    return { currentSites, currentCameras };
  };

  const CommunicationIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H6L8 21L10 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="6"
        y1="8"
        x2="18"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="6"
        y1="12"
        x2="14"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="18" cy="6" r="2" fill="#10B981" stroke="white" strokeWidth="1" />
    </svg>
  );

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    if (showStatusDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showStatusDropdown]);

  // Fetch ticket data when modal opens
  useEffect(() => {
    if (isOpen && ticketKey) {
      setIsInitialLoad(true);
      getTicket();
    }
  }, [isOpen, ticketKey]);

  // Update initial load flag when ticket loads
  useEffect(() => {
    if (ticket && ticket.key === ticketKey) {
      setIsInitialLoad(false);
    }
  }, [ticket, ticketKey]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowUpdateModal(false);
      setIsInitialLoad(true);
      setShowStatusDropdown(false);
      setIsRefreshing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Callback function to refresh ticket when status changes from CommentSection
  const handleStatusChange = async () => {
    setIsRefreshing(true);
    
    try {
      // Force immediate refresh of both ticket data AND comments
      const ticketPromise = getTicket();
      const commentsPromise = commentSectionRef.current?.refreshComments();
      
      await Promise.all([ticketPromise, commentsPromise].filter(Boolean));

      // Additional refresh with slight delay to ensure backend consistency
      await new Promise((resolve) => {
        setTimeout(async () => {
          const delayedTicketPromise = getTicket();
          const delayedCommentsPromise = commentSectionRef.current?.refreshComments();
          
          await Promise.all([delayedTicketPromise, delayedCommentsPromise].filter(Boolean));
          resolve(true);
        }, 900);
      });
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle status transition from Pending to Open (from TicketDetailModal dropdown)
  const handleStatusTransition = async (newStatus: TicketStatusEnum) => {
    if (!ticket) return;

    setIsRefreshing(true);
    
    try {
      await transitionIssue(ticket.key, newStatus);
      setShowStatusDropdown(false);

      // Comprehensive refresh: ticket details + comments
      await handleStatusChange();

      // Force CommentSection to refresh by triggering a re-render
      // This ensures CommentSection re-evaluates its status-dependent logic
      setTimeout(() => {
        if (onRefetch) {
          onRefetch();
        }
      }, 100);
    } catch (error) {
      console.error("Failed to transition ticket status:", error);
      setIsRefreshing(false);
    }
  };

  // Loading overlay component
  const renderLoadingOverlay = () => {
    if (!isRefreshing) return null;
    
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"></div>
          <p className="text-sm font-medium text-gray-700">Updating ticket status...</p>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  // Loading state
  if (loading && isInitialLoad) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white">
          <div className="flex items-center justify-center p-8">
            <Loading />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !ticket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <p className="text-red-600">
                {error ? "Failed to load ticket details" : "No ticket data found"}
              </p>
              <button
                onClick={onClose}
                className="mt-4 rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Open":
        return "bg-gray-100 text-gray-700 border border-gray-200";
      case "Done":
        return "bg-blue-100 text-green-700 border border-gray-200 bg-green-100";
      case "Work in progress":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case "Reopened":
        return "bg-gray-100 text-gray-700 border border-gray-200";
      case "Pending":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case "Closed":
        return "bg-gray-100 text-gray-700 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  const getPriorityBadge = (priority: string): React.ReactElement => {
    const getPriorityDot = (priority: string): string => {
      switch (priority) {
        case "High":
          return "bg-red-500";
        case "Medium":
          return "bg-yellow-500";
        case "Low":
          return "bg-green-500";
        default:
          return "bg-gray-500";
      }
    };

    return (
      <div className="flex items-center">
        <div className={`mr-2 h-2 w-2 rounded-full ${getPriorityDot(priority)}`}></div>
        <span className="text-sm font-normal text-gray-800">{priority}</span>
      </div>
    );
  };

  const getDisplayFileName = (url: string): string => {
    // Extract the file name from the URL
    const fileName = url.split("/").pop() || "";

    // Find the last underscore position
    const lastUnderscoreIndex = fileName.lastIndexOf("_");

    // Return the part after the last underscore, or the full file name if no underscore found
    return lastUnderscoreIndex !== -1 ? fileName.slice(lastUnderscoreIndex + 1) : fileName;
  };

  const getFileIcon = (fileName: string): React.ReactElement => {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension)) {
      return <Image className="h-4 w-4 text-blue-500" />;
    } else if (["pdf", "doc", "docx", "txt"].includes(extension)) {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleDownloadAttachment = async (attachment: any): Promise<void> => {
    try {
      if (attachment.public_download_url || attachment.url) {
        const url = attachment.public_download_url || attachment.url;

        let filename = url.split("/").pop() || "attachment";

        if (filename.includes("_")) {
          filename = filename.substring(filename.lastIndexOf("_") + 1);
        }

        filename = decodeURIComponent(filename);

        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error("Failed to download attachment:", error);
    }
  };

  const handleUpdateSuccess = async () => {
    // Re-fetch ticket data after successful update
    await getTicket();
    setShowUpdateModal(false);

    // Call parent refetch if provided
    if (onRefetch) {
      onRefetch();
    }
  };

  const canComment = ["Open", "Work in progress", "Pending", "Reopened", "Done"].includes(
    ticket.status,
  );

  // Get current sites and cameras for display
  const { currentSites, currentCameras } = getCurrentSitesAndCameras(ticket);

  // Check if status can be changed (only Pending can be changed to Open)
  const canChangeStatus = ticket.status === "Pending";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[70vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white relative">
          {/* Loading overlay */}
          {renderLoadingOverlay()}
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {ticket.key} - {ticket.summary}
              </h2>
            </div>

            {/* Right side with status dropdown and close button */}
            <div className="flex items-center space-x-3">
              {/* Status Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => canChangeStatus && setShowStatusDropdown(!showStatusDropdown)}
                  disabled={!canChangeStatus || isTransitioning || isRefreshing}
                  className={`flex items-center space-x-2 rounded-full px-3 py-1 text-sm font-medium transition-all ${getStatusColor(
                    ticket.status,
                  )} ${canChangeStatus ? "cursor-pointer hover:opacity-80" : "cursor-default"} disabled:opacity-100`}
                >
                  <span>{ticket.status}</span>
                  {canChangeStatus && !isTransitioning && !isRefreshing && <ChevronDown className="h-3 w-3" />}
                  {(isTransitioning || isRefreshing) && (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                </button>

                {/* Dropdown Menu */}
                {showStatusDropdown && canChangeStatus && !isRefreshing && (
                  <div className="absolute top-full right-0 z-10 mt-1 w-32 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={() => handleStatusTransition(TicketStatusEnum.OPEN)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Open
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                disabled={isRefreshing}
                className="text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Column - Ticket Details */}
            <div className="relative flex w-1/3 flex-col border-r border-gray-200 bg-white">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 pb-20">
                <div className="space-y-6">
                  {/* Created Date */}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created on</p>
                    <p className="text-sm text-gray-900">
                      {new Date(ticket.created).toLocaleDateString("en-GB")}
                    </p>
                  </div>

                  {/* Reporter and Agent */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Reporter</p>
                      <p className="text-sm font-normal text-gray-900">
                        {ticket.created_by?.name || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Agent</p>
                      <p className="text-sm font-normal text-gray-900">
                        {ticket.assignee || "Unassigned"}
                      </p>
                    </div>
                  </div>

                  {/* Category and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Category</p>
                      <p className="text-sm font-normal text-gray-900">
                        {ticket.enriched?.issue_type || "General"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Priority</p>
                      {getPriorityBadge(ticket.priority)}
                    </div>
                  </div>

                  {/* Description - WITH MAX HEIGHT AND SCROLL */}
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-500">Description</p>
                    <div className="max-h-32 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="text-sm leading-relaxed font-normal whitespace-pre-wrap text-gray-900">
                        {ticket.description}
                      </div>
                    </div>
                  </div>

                  {/* Attachments - Read-only */}
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-500">Attachment</p>
                    <div className="space-y-2">
                      {ticket.attachments &&
                      Array.isArray(ticket.attachments) &&
                      ticket.attachments.length > 0 ? (
                        ticket.attachments.map((attachment: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-md bg-gray-50 p-2"
                          >
                            <div className="flex items-center space-x-2">
                              {getFileIcon(attachment.filename || attachment.name || "")}
                              <span className="cursor-pointer text-sm text-blue-600 underline">
                                {getDisplayFileName(
                                  attachment.filename ||
                                    attachment.name ||
                                    `Attachment ${index + 1}`,
                                )}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDownloadAttachment(attachment)}
                              className="p-1 text-gray-500 hover:text-blue-600"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 italic">No attachments</p>
                      )}
                    </div>
                  </div>

                  {/* Sites and Cameras - Updated styling */}
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-500">Sites</p>
                      <div className="min-h-[40px] rounded-md border border-gray-300 bg-white p-3">
                        {currentSites.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {currentSites.map((site, index) => (
                              <span
                                key={index}
                                className="inline-block rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                              >
                                {site}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not specified</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-500">Cameras</p>
                      <div className="min-h-[40px] rounded-md border border-gray-300 bg-white p-3">
                        {currentCameras.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {currentCameras.map((camera, index) => (
                              <span
                                key={index}
                                className="inline-block rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                              >
                                {camera}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not specified</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Update Button at Bottom */}
              <div className="absolute right-0 bottom-0 left-0 flex items-center justify-center border-t border-gray-200 bg-white bg-gradient-to-r from-white to-gray-50 p-4">
                <button
                  onClick={() => setShowUpdateModal(true)}
                  disabled={isRefreshing}
                  className="flex w-full items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="mr-2 h-4 w-4" /> Update Ticket
                </button>
              </div>
            </div>

            {/* Right Column - Communication */}
            <div className="flex min-h-0 flex-1 flex-col bg-white">
              <div className="flex-shrink-0 border-b border-gray-200 bg-teal-50 px-6 py-2">
                <div className="flex items-center">
                  <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                    <CommunicationIcon />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Communication</h3>
                    <p className="text-xs text-gray-600">Chat with support team</p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <CommentSection
                  ref={commentSectionRef}
                  ticketId={ticket.key}
                  canComment={canComment}
                  ticketStatus={ticket.status}
                  onStatusChange={handleStatusChange}
                  isParentRefreshing={isRefreshing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Ticket Modal */}
      <UpdateTicket
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        ticket={ticket}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </>
  );
};

export default TicketDetailModal;