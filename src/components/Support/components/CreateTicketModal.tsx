import { CreateTicket, TicketCategoryEnum, TicketPriorityEnum } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { useCreateTicket, useGetSitesCamerasByCustomer } from "@/hooks/useApi";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Import the ReusableDropdown component
import MultiSelectDropdown, { MultiSelectOption } from "./MultiSelectDropdown";

// Import the standalone AttachmentUpload component
import AttachmentUpload from "./AttachmentUpload";

// Import validation utilities
import {
  clearFieldError,
  createDebouncedValidation,
  FormData,
  FormErrors,
  markFieldTouched,
  TouchedFields,
  validateForm,
} from "./utils";

// Type definitions
interface AttachmentFile {
  id: number;
  file: File;
  name: string;
  size: number;
  type: string;
  preview: string | null;
}

interface TicketData extends Omit<FormData, "sites"> {
  sites: string[];
  cameras: string[];
  attachments: AttachmentFile[];
  createdAt: string;
  status: string;
}

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: TicketData) => Promise<void>;
  onRefetch?: () => void;
}

// Character limits constants
const SUBJECT_MAX_LENGTH = 128;
const DESCRIPTION_MAX_LENGTH = 2000;

const CATEGORY_OPTIONS: MultiSelectOption[] = [
  { value: TicketCategoryEnum.BUG, label: "Bug" },
  { value: TicketCategoryEnum.ASK_A_QUESTION, label: "Ask a Question" },
];

const PRIORITY_OPTIONS: MultiSelectOption[] = [
  { value: TicketPriorityEnum.LOW, label: "Low" },
  { value: TicketPriorityEnum.MEDIUM, label: "Medium" },
  { value: TicketPriorityEnum.HIGH, label: "High" },
];

// Custom Dropdown Component for Category/Priority
const CustomDropdown: React.FC<{
  options: MultiSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
  name: string;
}> = ({ options, value, onChange, placeholder, disabled = false, error = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
          error ? "border-red-300" : "border-gray-300"
        } ${disabled ? "cursor-not-allowed bg-gray-50" : "bg-white hover:bg-gray-50"}`}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors duration-150 hover:bg-gray-50 ${
                value === option.value ? "bg-blue-50" : ""
              }`}
            >
              <span className="text-gray-900">{option.label}</span>
              {value === option.value && <Check className="h-4 w-4 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onRefetch,
}) => {
  const { user } = useAuth();
  const { execute: createTicket, loading: isCreating, error: createError } = useCreateTicket();
  const {
    data: sitesCamerasData,
    loading: sitesLoading,
    execute: getSitesCameras,
  } = useGetSitesCamerasByCustomer();

  const [formData, setFormData] = useState<FormData>({
    subject: "",
    category: "",
    description: "",
    priority: "",
    issue_key: "",
    sites: [],
  });
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({
    subject: false,
    description: false,
  });
  const [showAddSiteDropdown, setShowAddSiteDropdown] = useState(false);

  const addSiteDropdownRef = useRef<HTMLDivElement>(null);
  const subjectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Character limit validation functions
  const isSubjectOverLimit = formData.subject.length > SUBJECT_MAX_LENGTH;
  const isDescriptionOverLimit = formData.description.length > DESCRIPTION_MAX_LENGTH;

  // Create debounced validation functions using utils
  const debouncedValidateSubject = useCallback(
    createDebouncedValidation("subject", 300, subjectTimeoutRef, setErrors),
    [],
  );

  const debouncedValidateDescription = useCallback(
    createDebouncedValidation("description", 500, descriptionTimeoutRef, setErrors),
    [],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addSiteDropdownRef.current &&
        !addSiteDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAddSiteDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Effect to run validation when fields change
  useEffect(() => {
    debouncedValidateSubject(formData.subject, touchedFields.subject);
  }, [formData.subject, touchedFields.subject, debouncedValidateSubject]);

  useEffect(() => {
    debouncedValidateDescription(formData.description, touchedFields.description);
  }, [formData.description, touchedFields.description, debouncedValidateDescription]);

  // Trigger sites and cameras fetch when modal opens
  useEffect(() => {
    if (isOpen && user?.customer_id) {
      getSitesCameras(user.customer_id);
    }
  }, [isOpen, user?.customer_id]);

  // Process sites data into dropdown options
  const availableSiteOptions = useMemo(() => {
    if (!sitesCamerasData) return [];

    const selectedSiteNames = formData.sites.map((site) => site.name);
    return Object.keys(sitesCamerasData)
      .filter((siteName) => !selectedSiteNames.includes(siteName))
      .map((siteName) => ({
        value: siteName,
        label: siteName,
      }));
  }, [sitesCamerasData, formData.sites]);

  // Show "All Sites" option when there are multiple available sites
  const showAllSitesOption = availableSiteOptions.length > 1;

  // Get camera options for a specific site
  const getCameraOptions = useCallback(
    (siteId: string): MultiSelectOption[] => {
      const site = formData.sites.find((s) => s.id === siteId);
      if (!site || !sitesCamerasData) return [];

      const siteCameras = sitesCamerasData[site.name] || [];
      const selectedCameras = site.cameras;

      // Only return cameras that are NOT already selected
      const options: MultiSelectOption[] = siteCameras
        .filter((camera) => !selectedCameras.includes(camera))
        .map((camera) => ({
          value: camera,
          label: camera,
        }));

      return options;
    },
    [formData.sites, sitesCamerasData],
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (subjectTimeoutRef.current) {
        clearTimeout(subjectTimeoutRef.current);
      }
      if (descriptionTimeoutRef.current) {
        clearTimeout(descriptionTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "subject" || name === "description") {
      markFieldTouched(name as keyof TouchedFields, setTouchedFields);
    }
  };

  const handleDropdownChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof FormErrors]) {
      clearFieldError(name as keyof FormErrors, setErrors);
    }
  };

  const addSite = (siteName: string) => {
    if (siteName && !formData.sites.find((s) => s.name === siteName)) {
      const newSite = {
        id: Date.now().toString(),
        name: siteName,
        cameras: [],
      };
      setFormData((prev) => ({
        ...prev,
        sites: [...prev.sites, newSite],
      }));
    }
    setShowAddSiteDropdown(false);
  };

  const addAllSites = () => {
    if (!sitesCamerasData) return;

    const selectedSiteNames = formData.sites.map((site) => site.name);
    const newSites = Object.keys(sitesCamerasData)
      .filter((siteName) => !selectedSiteNames.includes(siteName))
      .map((siteName) => ({
        id: Date.now().toString() + Math.random(),
        name: siteName,
        cameras: [],
      }));

    setFormData((prev) => ({
      ...prev,
      sites: [...prev.sites, ...newSites],
    }));
    setShowAddSiteDropdown(false);
  };

  const removeSite = (siteId: string) => {
    setFormData((prev) => ({
      ...prev,
      sites: prev.sites.filter((s) => s.id !== siteId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    setTouchedFields({
      subject: true,
      description: true,
    });

    // Check character limits before validation
    if (isSubjectOverLimit || isDescriptionOverLimit) {
      const limitErrors: FormErrors = {};
      if (isSubjectOverLimit) {
        limitErrors.subject = `Subject cannot exceed ${SUBJECT_MAX_LENGTH} characters`;
      }
      if (isDescriptionOverLimit) {
        limitErrors.description = `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters`;
      }
      setErrors(limitErrors);
      return;
    }

    // Use validation from utils
    const { isValid, errors: validationErrors } = validateForm(formData);
    setErrors(validationErrors);

    if (!isValid) {
      return;
    }

    if (!user) {
      setErrors({ submit: "User authentication required. Please log in again." });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const allSites = formData.sites.map((site) => site.name);
      const allCameras = formData.sites.flatMap((site) => site.cameras);

      const ticketDataForAPI: CreateTicket = {
        user_id: user.id || "",
        customer_id: user.customer_id || "",
        summary: formData.subject.trim(),
        description: formData.description.trim(),
        priority: formData.priority as TicketPriorityEnum,
        request_type_name: formData.category as TicketCategoryEnum,
        sites: allSites,
        cameras: allCameras,
        attachments: attachments.map((att) => att.file),
      };

      const result = await createTicket(ticketDataForAPI);

      if (!result) {
        throw new Error("Failed to create ticket - no response from server");
      }

      const callbackData: TicketData = {
        subject: formData.subject.trim(),
        issue_key: formData.issue_key.trim(),
        category: formData.category as TicketCategoryEnum,
        description: formData.description.trim(),
        priority: formData.priority as TicketPriorityEnum,
        sites: allSites,
        cameras: allCameras,
        attachments: attachments,
        createdAt: new Date().toISOString(),
        status: "To Do",
      };

      await onSubmit(callbackData);

      if (onRefetch) {
        onRefetch();
      }

      handleReset();
      onClose();

      console.log("Ticket created successfully");
    } catch (error) {
      console.error("Error creating ticket:", error);

      let errorMessage = "Failed to create ticket. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (createError) {
        errorMessage = createError.message || "API error occurred";
      }

      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = (): void => {
    attachments.forEach((attachment) => {
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
    });

    setFormData({
      subject: "",
      category: "",
      description: "",
      priority: "",
      issue_key: "",
      sites: [],
    });
    setAttachments([]);
    setErrors({});
    setTouchedFields({
      subject: false,
      description: false,
    });
  };

  const handleClose = (): void => {
    if (!isSubmitting) {
      handleReset();
      onClose();
    }
  };

  const clearAll = (): void => {
    handleReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white sm:h-[80vh] lg:h-[80vh] lg:max-w-4xl lg:rounded-2xl xl:h-[75vh] xl:max-w-3xl">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-800 lg:text-xl">Create Ticket</h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed"
            type="button"
          >
            <X className="h-5 w-5 lg:h-6 lg:w-6" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:space-y-6 lg:p-6">
            {/* Subject */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-500 lg:mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none lg:px-4 lg:py-3 ${
                  errors.subject || isSubjectOverLimit ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Brief description of your issue"
                disabled={isSubmitting}
                maxLength={SUBJECT_MAX_LENGTH + 0} // Allow typing a bit over to show warning
              />
              <div className="mt-1 flex items-center justify-between">
                <div>
                  {errors.subject && <p className="text-xs text-red-600">{errors.subject}</p>}
                  {isSubjectOverLimit && !errors.subject && (
                    <p className="text-xs text-red-600">
                      Subject cannot exceed {SUBJECT_MAX_LENGTH} characters
                    </p>
                  )}
                </div>
                <p className={`text-xs ${isSubjectOverLimit ? "text-red-600" : "text-gray-500"}`}>
                  {formData.subject.length}/{SUBJECT_MAX_LENGTH}
                </p>
              </div>
            </div>

            {/* Category and Priority - Fixed container height to prevent shifting */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
              <div className="min-h-[80px] lg:min-h-[90px]">
                <label className="mb-1.5 block text-sm font-medium text-gray-500 lg:mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  name="category"
                  options={CATEGORY_OPTIONS}
                  value={formData.category}
                  onChange={(value) => handleDropdownChange("category", value)}
                  placeholder="Select category"
                  disabled={isSubmitting}
                  error={!!errors.category}
                />
                {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
              </div>

              <div className="min-h-[80px] lg:min-h-[90px]">
                <label className="mb-1.5 block text-sm font-medium text-gray-500 lg:mb-2">
                  Priority <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  name="priority"
                  options={PRIORITY_OPTIONS}
                  value={formData.priority}
                  onChange={(value) => handleDropdownChange("priority", value)}
                  placeholder="Select priority"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-500 lg:mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none lg:px-4 lg:py-3 ${
                  errors.description || isDescriptionOverLimit
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
                placeholder="Detailed description of your issue or request"
                disabled={isSubmitting}
                maxLength={DESCRIPTION_MAX_LENGTH + 100} // Allow typing a bit over to show warning
              />
              <div className="mt-1 flex items-start justify-between">
                <div>
                  {errors.description && (
                    <p className="text-xs text-red-600">{errors.description}</p>
                  )}
                  {isDescriptionOverLimit && !errors.description && (
                    <p className="text-xs text-red-600">
                      Description cannot exceed {DESCRIPTION_MAX_LENGTH} characters
                    </p>
                  )}
                  {!errors.description && !isDescriptionOverLimit && (
                    <p className="text-xs text-gray-500">Minimum 20 characters required</p>
                  )}
                </div>
                <p
                  className={`text-xs ${isDescriptionOverLimit ? "text-red-600" : "text-gray-500"}`}
                >
                  {formData.description.length}/{DESCRIPTION_MAX_LENGTH}
                </p>
              </div>
            </div>

            {/* Attachments - Using standalone AttachmentUpload component */}
            <AttachmentUpload
              attachments={attachments}
              setAttachments={setAttachments}
              maxSize={25}
              maxFiles={5}
              disabled={isSubmitting}
            />

            {/* Site & Camera Section */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500 lg:mb-3">
                Site & Camera
              </label>
              <div className="my-3 border-b border-gray-200 lg:my-4"></div>

              {/* Display Selected Sites and Cameras */}
              {formData.sites.map((site) => (
                <div
                  key={site.id}
                  className="mb-3 grid grid-cols-1 gap-3 border-b border-gray-100 pb-3 lg:mb-4 lg:grid-cols-2 lg:gap-2 lg:pb-4"
                >
                  {/* Site Name with Remove Button */}
                  <div className="flex items-center gap-3 lg:gap-4">
                    <span className="text-sm font-medium text-gray-800 lg:text-base">
                      {site.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSite(site.id)}
                      className="text-red-500 transition-colors duration-150 hover:text-red-700"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Cameras */}
                  <div className="space-y-2">
                    {/* Camera Dropdown using MultiSelectDropdown */}
                    <MultiSelectDropdown
                      placeholder="Select Camera"
                      selectedValues={site.cameras}
                      onChange={(values) => {
                        setFormData((prev) => ({
                          ...prev,
                          sites: prev.sites.map((s) =>
                            s.id === site.id ? { ...s, cameras: values } : s,
                          ),
                        }));
                      }}
                      onSelectAll={() => {
                        // Get all available cameras for this site
                        const siteCameras = sitesCamerasData?.[site.name] || [];
                        setFormData((prev) => ({
                          ...prev,
                          sites: prev.sites.map((s) =>
                            s.id === site.id ? { ...s, cameras: siteCameras } : s,
                          ),
                        }));
                      }}
                      options={getCameraOptions(site.id)}
                      showSelectAll={true}
                      selectAllText="Select All Cameras"
                      showSort={true}
                      variant="default"
                      disabled={isSubmitting || sitesLoading}
                      searchable={true}
                    />
                  </div>
                </div>
              ))}

              {/* Add Site & Bottom Camera */}
              <div className="my-4 border-gray-200 lg:my-5"></div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-2">
                {/* Add Site Button with Dropdown */}
                <div ref={addSiteDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAddSiteDropdown(!showAddSiteDropdown)}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors lg:px-5 ${
                      errors.sites
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                    }`}
                    disabled={sitesLoading || isSubmitting}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {sitesLoading ? "Loading..." : "Add Site"}
                  </button>

                  {/* Site Selection Dropdown */}
                  {showAddSiteDropdown && availableSiteOptions.length > 0 && (
                    <div className="absolute bottom-full z-[60] mb-2 max-h-40 w-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 lg:max-h-48 lg:w-56">
                      {/* All Sites Option */}
                      {showAllSitesOption && (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-teal-700 transition-colors duration-150 hover:border-l-2 hover:border-teal-500 hover:bg-teal-100 focus:outline-none"
                          onClick={() => addAllSites()}
                        >
                          <span className="h-2 w-2 rounded-full bg-teal-500" />
                          All Sites
                        </button>
                      )}

                      {/* Individual Site Options */}
                      {availableSiteOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:border-l-2 hover:border-teal-500 hover:bg-teal-100 focus:outline-none"
                          onClick={() => addSite(option.value)}
                        >
                          <span className="h-2 w-2 rounded-full bg-gray-400" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sites error message */}
              {errors.sites && <p className="mt-2 text-sm text-red-600">{errors.sites}</p>}

              {/* Show error if API call fails */}
              {createError && (
                <div className="mt-2 text-sm text-red-600">
                  Error loading sites. Please try again.
                </div>
              )}
            </div>

            {/* Display error message */}
            {errors.submit && (
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:gap-0 lg:px-6 lg:py-4">
            <button
              type="button"
              onClick={clearAll}
              disabled={isSubmitting || isCreating}
              className="text-sm font-medium text-red-600 transition-colors duration-150 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear all
            </button>

            <div className="flex w-full gap-3 sm:w-auto">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting || isCreating}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isCreating || !user || sitesLoading}
                className="flex flex-1 items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-400 sm:flex-none"
              >
                {isSubmitting || isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;
