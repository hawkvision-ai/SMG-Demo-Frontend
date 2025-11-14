import { TicketStatusEnum } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { useCreateComment, useGetCommentsByIssue, useTransitionIssue } from "@/hooks/useApi";
import { Download, Info, MessageSquare, Paperclip, Send, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";

// Updated API Comment interface to match the actual API response
export interface ApiComment {
  id: string;
  author: string;
  body: string;
  created: string;
  updated: string;
  attachments: File[];
}

// API Attachment interface based on your API response
export interface ApiAttachment {
  self: string;
  id: string;
  filename: string;
  author: {
    self: string;
    accountId: string;
    emailAddress: string;
    avatarUrls: Record<string, string>;
    displayName: string;
    active: boolean;
    timeZone: string;
    accountType: string;
  };
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
  public_download_url?: string;
  url?: string;
}

interface CommentAttachment {
  filename: string;
  size: number;
  type: string;
  url?: string;
  public_download_url?: string;
}

interface DisplayComment {
  id: string;
  author: string;
  role: string;
  content: string;
  timestamp: string;
  isCustomer: boolean;
  attachments: CommentAttachment[];
  avatar: string;
  avatarColor: string;
  agent_info?: {
    name: string;
    email: string;
  };
}

interface CommentSectionProps {
  ticketId: string;
  canComment: boolean;
  ticketStatus?: TicketStatusEnum | string;
  onStatusChange?: () => void;
  isParentRefreshing?: boolean;
}

export interface CommentSectionRef {
  refreshComments: () => Promise<void>;
}

const CommentSection = forwardRef<CommentSectionRef, CommentSectionProps>(
  ({ ticketId, canComment, ticketStatus, onStatusChange, isParentRefreshing = false }, ref) => {
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // API hooks
    const {
      data: apiComments,
      loading: commentsLoading,
      error: commentsError,
      execute: getComments,
    } = useGetCommentsByIssue();
    const { execute: createCommentAPI, loading: isCreatingComment } = useCreateComment();
    const { execute: transitionIssue, loading: isTransitioning } = useTransitionIssue();

    const [newMessage, setNewMessage] = useState<string>("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileError, setFileError] = useState<string>("");

    // Expose refresh method to parent via ref
    useImperativeHandle(ref, () => ({
      refreshComments: async () => {
        await getComments(ticketId);
      },
    }));

    // Updated download function with filename trimming
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

    // Convert API comments to display format
    const comments: DisplayComment[] = useMemo(() => {
      if (!apiComments) return [];

      return apiComments.map((comment) => {
        const apiRole = (comment as any).role;
        let commentRole: string;
        let isCustomer: boolean;

        if (apiRole === "user") {
          commentRole = "user";
          isCustomer = true;
        } else {
          commentRole = "Agent";
          isCustomer = false;
        }

        const displayAttachments: CommentAttachment[] =
          comment.attachments?.map((attachment) => ({
            filename: (attachment as any).filename ?? (attachment as File).name,
            size: attachment.size,
            type: (attachment as any).mimeType ?? (attachment as File).type,
            url: (attachment as any).content ?? undefined,
            public_download_url: (attachment as any).public_download_url ?? undefined,
          })) || [];

        return {
          id: comment.id,
          author: comment.author,
          role: commentRole,
          content: comment.body,
          timestamp: new Date(comment.created).toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          isCustomer: isCustomer,
          attachments: displayAttachments,
          avatar: comment.author.charAt(0).toUpperCase(),
          avatarColor: isCustomer ? "bg-blue-500" : "bg-teal-500",
        };
      });
    }, [apiComments, user]);

    // Effect to refresh comments when ticket status changes from external sources
    useEffect(() => {
      if (ticketId && ticketStatus) {
        // Re-fetch comments whenever the ticket status changes
        // This ensures CommentSection stays synchronized with TicketDetailModal
        getComments(ticketId);
      }
    }, [ticketStatus, ticketId]);

    useEffect(() => {
      if (ticketId) {
        setIsInitialLoad(true);
        getComments(ticketId);
      }
    }, [ticketId]);

    useEffect(() => {
      if (apiComments && isInitialLoad) {
        setIsInitialLoad(false);
      }
    }, [apiComments, isInitialLoad]);

    useEffect(() => {
      scrollToBottom();
    }, [comments]);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const dismissError = () => {
      setFileError("");
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      setFileError("");

      const validFiles: File[] = [];
      const maxSize = 25 * 1024 * 1024;
      const maxFiles = 5;

      if (selectedFiles.length + files.length > maxFiles) {
        setFileError(`You can only attach up to ${maxFiles} files total.`);
        return;
      }

      for (const file of files) {
        if (file.size > maxSize) {
          setFileError(`File "${file.name}" is too large. Maximum size is 25MB.`);
          return;
        }

        const isDuplicate = selectedFiles.some(
          (existing) => existing.name === file.name && existing.size === file.size,
        );

        if (isDuplicate) {
          setFileError(`File "${file.name}" is already selected.`);
          return;
        }

        validFiles.push(file);
      }

      const newSelectedFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newSelectedFiles);

      if (newSelectedFiles.length > 0) {
        const firstFileName = newSelectedFiles[0].name;
        let displayText: string;

        if (newSelectedFiles.length === 1) {
          displayText = firstFileName;
        } else {
          displayText = `${firstFileName} (+${newSelectedFiles.length - 1})`;
        }

        setNewMessage(displayText);
      }
    };

    const removeFile = (index: number): void => {
      const updatedFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(updatedFiles);
      setFileError("");

      if (updatedFiles.length > 0) {
        const firstFileName = updatedFiles[0].name;
        let displayText: string;

        if (updatedFiles.length === 1) {
          displayText = firstFileName;
        } else {
          displayText = `${firstFileName} (+${updatedFiles.length - 1})`;
        }

        setNewMessage(displayText);
      } else {
        setNewMessage("");
      }
    };

    const getDisplayFileName = (fileName: string): string => {
      const parts = fileName.split("_");
      return parts.length > 1 ? parts.slice(1).join("_") : fileName;
    };

    const handleSendMessage = async (): Promise<void> => {
      if (!newMessage.trim() && selectedFiles.length === 0) return;
      if (!user?.id) {
        setFileError("User authentication required");
        return;
      }

      const messageToSend = newMessage.trim();
      const filesToSend = [...selectedFiles];
      setNewMessage("");
      setSelectedFiles([]);
      setFileError("");

      try {
        await createCommentAPI(ticketId, {
          user_id: user.id,
          user_role: "user",
          comment_text: messageToSend || "",
          attachments: filesToSend.length > 0 ? filesToSend : undefined,
        });

        await getComments(ticketId);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Failed to send message:", error);
        setFileError("Failed to send message. Please add some text.");
        setNewMessage(messageToSend);
        setSelectedFiles(filesToSend);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    // Handle ticket status transition
    const handleTransition = async (targetStatus: TicketStatusEnum): Promise<void> => {
      try {
        await transitionIssue(ticketId, targetStatus);

        // Notify parent component to refresh ticket data
        if (onStatusChange) {
          onStatusChange();
        }

        // Refresh comments as well
        await getComments(ticketId);
      } catch (error) {
        console.error("Failed to transition ticket:", error);
        setFileError("Failed to update ticket status. Please try again.");
      }
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getFileIcon = (fileType: string): string => {
      if (fileType.includes("pdf")) return "📄";
      if (fileType.includes("word") || fileType.includes("document")) return "📝";
      if (fileType.includes("excel") || fileType.includes("sheet")) return "📊";
      if (fileType.includes("image") || fileType.includes("png")) return "🖼️";
      if (fileType.includes("text")) return "📄";
      return "🖼️";
    };

    const getCommentAlignment = (role: string): string => {
      return role === "user" ? "justify-end" : "justify-start";
    };

    const getCommentFlexDirection = (role: string): string => {
      return role === "user" ? "flex-row-reverse" : "flex-row";
    };

    const getAvatarMargin = (role: string): string => {
      return role === "user" ? "ml-2" : "mr-2";
    };

    const getTextAlignment = (role: string): string => {
      return role === "user" ? "text-right" : "text-left";
    };

    const renderErrorMessage = () => {
      if (!fileError) return null;

      return (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2">
          <div className="flex items-start justify-between">
            <p className="flex-1 text-xs text-red-600">{fileError}</p>
            <button
              onClick={dismissError}
              className="ml-2 flex-shrink-0 text-red-500 transition-colors hover:text-red-700"
              title="Dismiss error"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    };

    // Render input section component
    const renderInputSection = () => (
      <div className="sticky bottom-0 flex-shrink-0 border-t border-gray-200 bg-gradient-to-r from-white to-gray-50 p-3 shadow-lg">
        {renderErrorMessage()}

        {selectedFiles.length > 0 && (
          <div className="mb-2 max-h-16 space-y-1 overflow-y-auto">
            <p className="text-xs font-medium text-gray-700">Selected files:</p>
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-start space-x-2 rounded-md border border-blue-200 bg-blue-50 p-1.5"
              >
                <span className="mt-0.5 flex-shrink-0 text-sm">{getFileIcon(file.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium break-words whitespace-normal text-gray-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={isParentRefreshing}
                  className="flex-shrink-0 p-0.5 text-red-500 transition-colors hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm">✕</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <label className={`rounded-lg p-2 text-gray-400 transition-colors hover:bg-teal-50 hover:text-teal-600 ${isParentRefreshing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <Paperclip className="h-4 w-4" />
            <input 
              type="file" 
              multiple 
              onChange={handleFileSelect} 
              className="hidden"
              disabled={isParentRefreshing || isCreatingComment}
            />
          </label>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            disabled={isCreatingComment || isParentRefreshing}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm transition-all duration-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
          />

          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || isCreatingComment || isParentRefreshing}
            className="rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 p-2 text-white shadow-sm transition-all duration-200 hover:from-teal-600 hover:to-cyan-700 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400"
          >
            {isCreatingComment ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );

    // Render resolution action section for "Done" status
    const renderResolutionSection = () => (
      <div className="sticky bottom-0 flex-shrink-0 border-t border-gray-200 bg-gradient-to-r from-white to-gray-50 py-4 shadow-lg">
        {renderErrorMessage()}
        <div className="mr-2 ml-2 flex items-center justify-between pr-3 pl-3">
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-700">Your ticket has been resolved from our end.</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleTransition(TicketStatusEnum.REOPENED)}
              disabled={isTransitioning || isParentRefreshing}
              className="rounded border border-teal-500 bg-white px-3 py-2 text-sm font-medium text-teal-600 shadow-sm transition-all duration-200 hover:bg-teal-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {isTransitioning || isParentRefreshing ? "..." : "Reopen"}
            </button>
            <button
              onClick={() => handleTransition(TicketStatusEnum.CLOSED)}
              disabled={isTransitioning || isParentRefreshing}
              className="rounded bg-red-400 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-red-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isTransitioning || isParentRefreshing ? "..." : "Close Ticket"}
            </button>
          </div>
        </div>
      </div>
    );

    // Render disabled message component
    const renderDisabledMessage = () => (
      <div className="sticky bottom-0 flex-shrink-0 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-lg">
        <div className="flex items-center justify-center text-gray-500">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">This ticket has been closed</p>
            <p className="text-xs text-gray-500">You cannot comment further.</p>
          </div>
        </div>
      </div>
    );

    if (commentsLoading && isInitialLoad && comments.length === 0) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex flex-1 items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-teal-500"></div>
              <p>Loading comments...</p>
            </div>
          </div>
        </div>
      );
    }

    if (commentsError && comments.length === 0) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex flex-1 items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="mb-2 text-red-600">Failed to load comments</p>
              <button
                onClick={() => getComments(ticketId)}
                className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (comments.length === 0) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex flex-1 items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p>
                No messages yet.{" "}
                {canComment && ticketStatus !== TicketStatusEnum.DONE
                  ? "Start the conversation!"
                  : "Messages will appear here once the ticket is approved."}
              </p>
            </div>
          </div>
          {ticketStatus === TicketStatusEnum.DONE && renderResolutionSection()}
          {ticketStatus === TicketStatusEnum.CLOSED && renderDisabledMessage()}
          {canComment &&
            ticketStatus !== TicketStatusEnum.DONE &&
            ticketStatus !== TicketStatusEnum.CLOSED &&
            renderInputSection()}
        </div>
      );
    }

    return (
      <div className="flex h-full w-full flex-col bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scroll-smooth p-4">
          {comments.map((comment) => (
            <div key={comment.id} className={`flex ${getCommentAlignment(comment.role)}`}>
              <div
                className={`flex max-w-xs lg:max-w-md ${getCommentFlexDirection(comment.role)} space-x-2`}
              >
                <div
                  className={`h-8 w-8 rounded-full ${comment.avatarColor} flex flex-shrink-0 items-center justify-center text-sm font-medium text-white ${getAvatarMargin(comment.role)}`}
                >
                  {comment.avatar}
                </div>

                <div className="flex flex-col">
                  <div className={`mb-1 text-xs text-gray-500 ${getTextAlignment(comment.role)}`}>
                    <span className="font-medium">{comment.author}</span>
                    <span className="ml-1 text-gray-400">({comment.role})</span>
                  </div>

                  <div
                    className={`rounded-lg px-4 py-3 shadow-sm ${
                      comment.role === "user"
                        ? "bg-[#67F3E28F] text-gray-900"
                        : "border border-gray-200 bg-white text-gray-900 shadow-md"
                    }`}
                  >
                    {comment.content && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                    )}

                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className={`space-y-1 ${comment.content ? "mt-2" : ""}`}>
                        {comment.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className={`flex items-start space-x-2 rounded-md p-2 ${
                              comment.role === "user" ? "bg-opacity-50 bg-white" : "bg-gray-100"
                            }`}
                          >
                            <span className="mt-0.5 flex-shrink-0 text-sm">
                              {getFileIcon(attachment.type)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-xs font-medium break-words whitespace-normal text-gray-900"
                                title={attachment.filename}
                              >
                                {getDisplayFileName(attachment.filename)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDownloadAttachment(attachment)}
                              className="group flex-shrink-0 rounded p-1 text-gray-600 transition-colors hover:bg-gray-200"
                              title={`Download ${attachment.filename}`}
                            >
                              <Download className="h-3 w-3 transition-transform group-hover:scale-110" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`mt-1 text-xs text-gray-400 ${getTextAlignment(comment.role)}`}>
                    {comment.timestamp}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Conditional rendering based on ticket status */}
        {ticketStatus === TicketStatusEnum.DONE && renderResolutionSection()}
        {ticketStatus === TicketStatusEnum.CLOSED && renderDisabledMessage()}
        {canComment &&
          ticketStatus !== TicketStatusEnum.DONE &&
          ticketStatus !== TicketStatusEnum.CLOSED &&
          renderInputSection()}
      </div>
    );
  }
);

CommentSection.displayName = "CommentSection";

export default CommentSection;