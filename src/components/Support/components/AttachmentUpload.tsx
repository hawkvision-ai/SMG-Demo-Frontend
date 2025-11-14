import { AlertCircle, Trash2, Upload, X } from "lucide-react";
import React, { useRef, useState } from "react";

// Type definitions
interface AttachmentFile {
  id: number;
  file: File;
  name: string;
  size: number;
  type: string;
  preview: string | null;
}

interface AttachmentUploadProps {
  attachments: AttachmentFile[];
  setAttachments: React.Dispatch<React.SetStateAction<AttachmentFile[]>>;
  maxSize?: number; // MB
  maxFiles?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  attachments,
  setAttachments,
  maxSize = 25, // MB
  maxFiles = 5,
  acceptedTypes = [], // Empty array means accept all file types
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file: File): string[] => {
    const errors: string[] = [];

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      errors.push(`File "${file.name}" exceeds the maximum size of ${maxSize}MB.`);
    }

    // Only check file type if acceptedTypes is specified and not empty
    if (acceptedTypes.length > 0) {
      const isValidType = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.includes("*")) {
          const baseType = type.split("/")[0];
          return file.type.startsWith(baseType);
        }
        return file.type === type;
      });

      if (!isValidType) {
        errors.push(`File "${file.name}" format is not supported.`);
      }
    }

    return errors;
  };

  const handleFiles = (files: FileList | null): void => {
    if (!files || disabled) return;

    const fileArray = Array.from(files);
    const newErrors: string[] = [];
    const validFiles: AttachmentFile[] = [];
    const totalCurrentFiles = attachments.length;
    const remainingSlots = maxFiles - totalCurrentFiles;

    // Check total file count
    if (fileArray.length > remainingSlots) {
      newErrors.push(
        `Maximum ${maxFiles} files allowed.`,
      );
      setUploadErrors(newErrors);
      return;
    }

    fileArray.forEach((file) => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
        return;
      }

      // Check for duplicates
      const isDuplicate = attachments.some(
        (existing) => existing.name === file.name && existing.size === file.size,
      );

      if (!isDuplicate) {
        validFiles.push({
          id: Date.now() + Math.random(),
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        });
      } else {
        newErrors.push(`File "${file.name}" is already attached.`);
      }
    });

    setUploadErrors(newErrors);

    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    handleFiles(files);
    // Reset input value to allow selecting the same file again
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleUploadClick = (): void => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeAttachment = (id: number): void => {
    setAttachments((prev) => {
      const updated = prev.filter((attachment) => attachment.id !== id);
      // Clean up preview URLs
      const removed = prev.find((attachment) => attachment.id === id);
      if (removed && removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });

    // Clear errors when files are removed
    setUploadErrors([]);
  };

  // Function to dismiss/clear all errors
  const dismissErrors = (): void => {
    setUploadErrors([]);
  };

  // Calculate total attachments count
  const totalAttachments = attachments.length;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-500">
        Attachments ({totalAttachments}/{maxFiles})
      </label>

      {/* Dynamic Layout - Full width when no attachments, Split when attachments exist */}
      {totalAttachments === 0 ? (
        /* No Attachments - Full Width Upload Box */
        <div className="w-full">
          <div
            className={`relative rounded-lg border-2 border-dashed border-gray-200 p-2 text-center transition-all duration-300 ${
              disabled
                ? "cursor-not-allowed bg-gray-50"
                : "cursor-pointer hover:border-gray-300 hover:bg-gray-50"
            } ${dragOver ? "border-blue-400 bg-blue-50" : ""}`}
            onClick={handleUploadClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto mb-4 h-10 w-10 text-gray-400" />
            <div className="mb-2 text-lg font-medium text-blue-500">Click to upload</div>
            <div className="mb-2 text-gray-500">or drag and drop</div>
            <div className="text-sm text-gray-400">
              Upload up to {maxFiles} files, maximum {maxSize}MB per file.
            </div>
            <div className="text-sm text-gray-400">All file formats supported.</div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
              accept={acceptedTypes.length > 0 ? acceptedTypes.join(",") : undefined}
            />
          </div>
        </div>
      ) : (
        /* Has Attachments - Split Layout */
        <div className="flex gap-6">
          {/* Upload Box - 40% */}
          <div className="w-2/5">
            <div
              className={`relative rounded-lg border-2 border-dashed border-gray-200 p-8 text-center transition-all duration-300 ${
                disabled
                  ? "cursor-not-allowed bg-gray-50"
                  : "cursor-pointer hover:border-gray-300 hover:bg-gray-50"
              } ${dragOver ? "border-blue-400 bg-blue-50" : ""}`}
              onClick={handleUploadClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <div className="mb-1 font-medium text-blue-600">Click to upload</div>
              <div className="mb-1 text-sm text-gray-500">or drag and drop</div>
              <div className="text-xs text-gray-400">
                Upload up to {maxFiles} files, maximum {maxSize}MB per file.
              </div>
              <div className="text-xs text-gray-400">All file formats supported.</div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled}
                accept={acceptedTypes.length > 0 ? acceptedTypes.join(",") : undefined}
              />
            </div>
          </div>

          {/* Attachments List - 60% */}
          <div className="w-3/5">
            <div className="max-h-51 space-y-2 overflow-y-auto">
              {/* New Attachments */}
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="group flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center space-x-3">
                    {attachment.preview ? (
                      /* Image Preview */
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200">
                        <img
                          src={attachment.preview}
                          alt={attachment.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      /* Document Icon */
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-sm font-medium text-gray-900"
                        title={attachment.name}
                      >
                        {attachment.name}
                      </div>
                      <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="flex-shrink-0 rounded-md p-2 text-red-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
                    disabled={disabled}
                    title="Remove attachment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dismissible Error Messages */}
      {uploadErrors.length > 0 && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-red-400" />
              <div className="space-y-1">
                {uploadErrors.map((error, index) => (
                  <p key={index} className="text-sm text-red-700">
                    {error}
                  </p>
                ))}
              </div>
            </div>
            {/* Dismiss Button */}
            <button
              type="button"
              onClick={dismissErrors}
              className="ml-4 flex-shrink-0 rounded-md p-1 text-red-400 transition-colors duration-150 hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50"
              title="Dismiss errors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentUpload;