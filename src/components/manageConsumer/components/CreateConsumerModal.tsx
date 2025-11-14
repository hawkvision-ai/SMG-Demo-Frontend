import { CreateConsumerData, CreateConsumerModalProps } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { useGetAllSites } from "@/hooks/useApi"; // Import your hook
import { Plus, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import ReusableDropdown, { DropdownOption } from "./ReusableDropdown"; // Import the new component

const CreateConsumerModal: React.FC<CreateConsumerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isAdminMode = false, // Default to false for backward compatibility
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateConsumerData>({
    name: "",
    email: "",
    phone: "",
    role: isAdminMode ? "admin" : "consumer",
    job_title: "",
    sites: [],
    location_tags: [],
    customer_id: user?.customer_id || "", // Use customer_id from user context
  });

  const [selectedSites, setSelectedSites] = useState<
    Array<{ id: string; name: string; locationTags: string[] }>
  >([]);
  const [showAddSiteDropdown, setShowAddSiteDropdown] = useState(false);

  // Form validation states
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    phone: "",
    job_title: "",
    sites: "",
  });

  // Track if fields have been touched for better UX
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    job_title: false,
    sites: false,
  });

  // Ref for click outside detection
  const addSiteDropdownRef = useRef<HTMLDivElement>(null);

  // Use the API hook to get all sites (only needed for consumer mode)
  const {
    data: allSites,
    loading,
    error,
  } = useGetAllSites(
    !isAdminMode ? user?.customer_id || "" : "", // Only fetch if not admin mode
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addSiteDropdownRef.current &&
        !addSiteDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAddSiteDropdown(false);
      }
    };

    if (showAddSiteDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddSiteDropdown]);

  // Real-time name validation
  const validateName = (value: string): string => {
    if (!value.trim()) return "Name is required";
    if (value.trim().length < 2) return "Name must be at least 2 characters";
    if (value.trim().length > 49) return "Name must not exceed 50 characters";
    if (!/^[a-zA-Z\s'-]+$/.test(value.trim()))
      return "Name can only contain letters, spaces, hyphens, and apostrophes";
    return "";
  };

  // Real-time phone validation
  const validatePhoneNumber = (value: string): string => {
    if (!value || value.length === 0) {
      return "Phone number is required";
    }

    const digits = value.replace(/\D/g, "");

    if (value.startsWith("91") || value.startsWith("+91")) {
      const nationalNumber = digits.slice(2);
      if (nationalNumber.length !== 10) {
        return "Phone number must have exactly 10 digits after country code";
      }
      if (!/^[6-9]/.test(nationalNumber)) {
        return "Phone number must start with 6, 7, 8, or 9";
      }
    } else {
      if (digits.length < 10) {
        return "Phone number must be at least 10 digits";
      }
      if (digits.length > 15) {
        return "Phone number must not exceed 15 digits";
      }
    }

    if (/^(.)\1+$/.test(digits.slice(-10))) {
      return "Phone number cannot contain all same digits";
    }

    return "";
  };

  // Real-time email validation
  const validateEmail = (email: string) => {
    if (!email.trim()) {
      return "Email is required";
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  // Real-time job title validation
  const validateJobTitle = (jobTitle: string) => {
    if (!jobTitle.trim()) {
      return "Job title is required";
    } else if (!/[a-zA-Z]/.test(jobTitle.trim())) {
      return "Job title must contain at least one letter";
    } else if (!/^[a-zA-Z0-9\s\-_,.()]+$/.test(jobTitle.trim())) {
      return "Job title can only contain letters, numbers, spaces, and -_,.()";
    } else if (jobTitle.trim().length > 50) {
      return "Job title cannot exceed 50 characters";
    }
    return "";
  };

  // Real-time sites validation
  const validateSites = (sites: Array<{ id: string; name: string; locationTags: string[] }>) => {
    if (!isAdminMode && sites.length === 0) {
      return "Please select at least one site";
    }
    return "";
  };

  // Validation function for form submission
  const validateForm = () => {
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const phoneError = validatePhoneNumber(formData.phone);
    const jobTitleError = validateJobTitle(formData.job_title);
    const sitesError = validateSites(selectedSites);

    const newErrors = {
      name: nameError,
      email: emailError,
      phone: phoneError,
      job_title: jobTitleError,
      sites: sitesError,
    };

    setErrors(newErrors);
    return !nameError && !emailError && !phoneError && !jobTitleError && !sitesError;
  };

  // Function to reset form state
  const resetFormState = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: isAdminMode ? "admin" : "consumer",
      job_title: "",
      sites: [],
      location_tags: [],
      customer_id: user?.customer_id || "",
    });
    setSelectedSites([]);
    setShowAddSiteDropdown(false);
    setErrors({ name: "", email: "", phone: "", job_title: "", sites: "" });
    setTouched({ name: false, email: false, phone: false, job_title: false, sites: false });
  };

  const handleSubmit = () => {
    // Mark all fields as touched
    setTouched({ name: true, email: true, phone: true, job_title: true, sites: true });

    if (!validateForm()) {
      return;
    }

    const submitData: CreateConsumerData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone.startsWith("+") ? formData.phone : `+${formData.phone}`,
      role: isAdminMode ? "admin" : "consumer",
      job_title: formData.job_title,
      sites: isAdminMode ? [] : selectedSites.map((s) => s.id), // Empty sites for admin
      location_tags: isAdminMode ? [] : selectedSites.flatMap((s) => s.locationTags), // Empty location_tags for admin
      customer_id: formData.customer_id,
    };
    onSubmit(submitData);
    onClose();
    // Reset form
    resetFormState();
  };

  const addSite = (siteId: string) => {
    const site = allSites?.find((s) => s.id === siteId);
    if (!site) return;

    const newSite = {
      id: siteId,
      name: site.name,
      locationTags: [], // Start with empty tags, will be added when user selects them
    };

    const updatedSites = [...selectedSites, newSite];
    setSelectedSites(updatedSites);
    setShowAddSiteDropdown(false);

    // Real-time validation for sites
    if (touched.sites) {
      const sitesError = validateSites(updatedSites);
      setErrors((prev) => ({ ...prev, sites: sitesError }));
    }
  };

  // Handle "All Sites" selection
  const addAllSites = () => {
    if (!allSites) return;

    const availableSites = allSites.filter((site) => !selectedSites.some((s) => s.id === site.id));

    const newSites = availableSites.map((site) => ({
      id: site.id,
      name: site.name,
      locationTags: [], // Start with empty tags
    }));

    const updatedSites = [...selectedSites, ...newSites];
    setSelectedSites(updatedSites);
    setShowAddSiteDropdown(false);

    // Real-time validation for sites
    if (touched.sites) {
      const sitesError = validateSites(updatedSites);
      setErrors((prev) => ({ ...prev, sites: sitesError }));
    }
  };

  const removeSite = (siteId: string) => {
    const updatedSites = selectedSites.filter((s) => s.id !== siteId);
    setSelectedSites(updatedSites);

    // Mark sites as touched and validate in real-time
    setTouched((prev) => ({ ...prev, sites: true }));
    const sitesError = validateSites(updatedSites);
    setErrors((prev) => ({ ...prev, sites: sitesError }));
  };

  const removeLocationTag = (siteId: string, tagToRemove: string) => {
    setSelectedSites(
      selectedSites.map((site) =>
        site.id === siteId
          ? { ...site, locationTags: site.locationTags.filter((tag) => tag !== tagToRemove) }
          : site,
      ),
    );
  };

  const addLocationTag = (siteId: string, tag: string) => {
    setSelectedSites(
      selectedSites.map((site) =>
        site.id === siteId ? { ...site, locationTags: [...site.locationTags, tag] } : site,
      ),
    );
  };

  // Get available location tags for a specific site
  const getLocationTagsForSite = (siteId: string): string[] => {
    const site = allSites?.find((site) => site.id === siteId);
    return site?.location_tags || [];
  };

  // Prepare site options for dropdown
  const availableSiteOptions: DropdownOption[] = React.useMemo(() => {
    if (!allSites) return [];

    return allSites
      .filter((site) => !selectedSites.some((s) => s.id === site.id))
      .map((site) => ({
        value: site.id,
        label: site.name,
      }));
  }, [allSites, selectedSites]);

  // Check if there are multiple available sites to show "All Sites" option
  const showAllSitesOption = availableSiteOptions.length > 1;

  // Prepare location tag options for each site
  const getLocationTagOptions = (siteId: string): DropdownOption[] => {
    const availableTags = getLocationTagsForSite(siteId);
    const site = selectedSites.find((s) => s.id === siteId);
    const selectedTags = site?.locationTags || [];

    const remainingTags = availableTags.filter((tag) => !selectedTags.includes(tag));

    const options: DropdownOption[] = [];

    // Add "Select All" option if there are remaining tags
    if (remainingTags.length > 1) {
      options.push({
        value: "SELECT_ALL",
        label: "Select All",
        isSelectAll: true,
      });
    }

    // Add individual tag options
    remainingTags.forEach((tag) => {
      options.push({
        value: tag,
        label: tag,
      });
    });

    return options;
  };

  // Handle select all for location tags
  const handleSelectAllLocationTags = (siteId: string, allValues: string[]) => {
    setSelectedSites(
      selectedSites.map((site) =>
        site.id === siteId ? { ...site, locationTags: [...site.locationTags, ...allValues] } : site,
      ),
    );
  };

  // Real-time name validation
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({ ...formData, name });

    // Validate in real-time after field is touched
    if (touched.name || name.length > 0) {
      setTouched((prev) => ({ ...prev, name: true }));
      const nameError = validateName(name);
      setErrors((prev) => ({ ...prev, name: nameError }));
    }
  };

  // Real-time phone validation
  const handlePhoneChange = (phone: string) => {
    setFormData({ ...formData, phone });

    // Validate in real-time after field is touched
    if (touched.phone || phone.length > 0) {
      setTouched((prev) => ({ ...prev, phone: true }));
      const phoneError = validatePhoneNumber(phone);
      setErrors((prev) => ({ ...prev, phone: phoneError }));
    }
  };

  // Real-time email validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });

    // Validate in real-time after field is touched
    if (touched.email || email.length > 0) {
      setTouched((prev) => ({ ...prev, email: true }));
      const emailError = validateEmail(email);
      setErrors((prev) => ({ ...prev, email: emailError }));
    }
  };

  // Real-time job title validation
  const handleJobTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const jobTitle = e.target.value;
    setFormData({ ...formData, job_title: jobTitle });

    // Validate in real-time after field is touched
    if (touched.job_title || jobTitle.length > 0) {
      setTouched((prev) => ({ ...prev, job_title: true }));
      const jobTitleError = validateJobTitle(jobTitle);
      setErrors((prev) => ({ ...prev, job_title: jobTitleError }));
    }
  };

  // Handle field blur events to mark fields as touched
  const handleNameBlur = () => {
    setTouched((prev) => ({ ...prev, name: true }));
    const nameError = validateName(formData.name);
    setErrors((prev) => ({ ...prev, name: nameError }));
  };

  const handlePhoneBlur = () => {
    setTouched((prev) => ({ ...prev, phone: true }));
    const phoneError = validatePhoneNumber(formData.phone);
    setErrors((prev) => ({ ...prev, phone: phoneError }));
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const emailError = validateEmail(formData.email);
    setErrors((prev) => ({ ...prev, email: emailError }));
  };

  const handleJobTitleBlur = () => {
    setTouched((prev) => ({ ...prev, job_title: true }));
    const jobTitleError = validateJobTitle(formData.job_title);
    setErrors((prev) => ({ ...prev, job_title: jobTitleError }));
  };

  // Check if form is valid for submit button
  const isFormValid =
    !errors.name &&
    !errors.email &&
    !errors.phone &&
    !errors.job_title &&
    !errors.sites &&
    formData.name.trim() &&
    formData.email.trim() &&
    formData.phone.trim() &&
    formData.job_title.trim() &&
    (isAdminMode || selectedSites.length > 0);

  if (!isOpen) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className={`mx-4 max-h-[90vh] w-full ${isAdminMode ? "max-w-2xl" : "max-w-4xl"} overflow-y-auto rounded-lg bg-white p-8`}
      >
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            Create {isAdminMode ? "Admin" : "Consumer"}
          </h2>
          <button
            onClick={() => {
              resetFormState();
              onClose();
            }}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Name and Phone Number Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                placeholder="John Doe"
                maxLength={50}
                className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 focus:ring-1 ${
                  errors.name
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                }`}
                required
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                country={"in"}
                value={formData.phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                inputStyle={{
                  width: "100%",
                  height: "42px",
                  fontSize: "14px",
                  borderRadius: "0.5rem",
                  border: errors.phone ? "1px solid #fca5a5" : "1px solid #d1d5db",
                  paddingLeft: "48px",
                }}
                buttonStyle={{
                  border: errors.phone ? "1px solid #fca5a5" : "1px solid #d1d5db",
                  borderRight: "none",
                  borderRadius: "0.5rem 0 0 0.5rem",
                  backgroundColor: "white",
                }}
                containerStyle={{
                  width: "100%",
                }}
                inputClass={errors.phone ? "!border-red-300" : ""}
                dropdownStyle={{
                  borderRadius: "0.5rem",
                }}
                searchStyle={{
                  width: "100%",
                  padding: "8px",
                }}
                inputProps={{
                  required: true,
                  placeholder: "Enter phone number",
                  className: `focus:outline-none focus:ring-1 ${
                    errors.phone
                      ? "focus:border-red-500 focus:ring-red-500"
                      : "focus:border-teal-500 focus:ring-teal-500"
                  }`,
                }}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>
          </div>

          {/* Email ID and Job Title Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">
                Email ID <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="admin@hawkvision.ai"
                className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 focus:ring-1 ${
                  errors.email
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                }`}
                required
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.job_title}
                onChange={handleJobTitleChange}
                onBlur={handleJobTitleBlur}
                placeholder={isAdminMode ? "System Administrator" : "UI/UX Designer"}
                className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 focus:ring-1 ${
                  errors.job_title
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                }`}
                required
              />
              {errors.job_title && <p className="mt-1 text-sm text-red-600">{errors.job_title}</p>}
            </div>
          </div>

          {/* Sites Section - Only show for Consumer mode */}
          {!isAdminMode && (
            <div>
              {/* Header */}
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 px-4 py-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600">
                    Site <span className="text-red-500">*</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Location Tag</label>
                </div>
              </div>

              {/* Display Selected Sites and Location Tags */}
              {selectedSites.map((site) => (
                <div
                  key={site.id}
                  className="mb-4 grid grid-cols-2 gap-2 border-b border-gray-100 pb-4"
                >
                  {/* Site Name with Remove Button */}
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-800">{site.name}</span>
                    <button
                      type="button"
                      onClick={() => removeSite(site.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Location Tags */}
                  <div className="space-y-2">
                    {/* Location Tags Dropdown using ReusableDropdown */}
                    <ReusableDropdown
                      placeholder="Select Location Tag"
                      value=""
                      onChange={(value) => {
                        if (value && value !== "SELECT_ALL" && !site.locationTags.includes(value)) {
                          addLocationTag(site.id, value);
                        }
                      }}
                      onSelectAll={(allValues) => handleSelectAllLocationTags(site.id, allValues)}
                      options={getLocationTagOptions(site.id)}
                      showAllOptionsHeader={false}
                      variant="default"
                    />

                    {/* Selected Location Tags */}
                    {site.locationTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {site.locationTags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeLocationTag(site.id, tag)}
                              className="ml-2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Site & Bottom Location Tag */}
              <div className="my-5 border-gray-200"></div>
              <div className="grid grid-cols-2 gap-2">
                {/* Add Site Button with Dropdown */}
                <div ref={addSiteDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSiteDropdown(!showAddSiteDropdown);
                      // Mark sites as touched when user interacts
                      setTouched((prev) => ({ ...prev, sites: true }));
                    }}
                    className={`inline-flex items-center rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                      errors.sites
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                    }`}
                    disabled={loading}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {loading ? "Loading..." : "Add Site"}
                  </button>

                  {/* Site Selection Dropdown */}
                  {showAddSiteDropdown && availableSiteOptions.length > 0 && (
                    <div className="absolute bottom-full z-[60] mb-2 max-h-48 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black/5">
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
                          onClick={() => {
                            addSite(option.value);
                            setShowAddSiteDropdown(false);
                          }}
                        >
                          <span className="h-2 w-2 rounded-full bg-gray-400" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Location Tag Dropdown - Always disabled */}
                <div className="relative">
                  <select
                    className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-500"
                    disabled={true}
                  >
                    <option value="">Select Location Tag</option>
                  </select>
                </div>
              </div>

              {/* Sites error message */}
              {errors.sites && <p className="mt-2 text-sm text-red-600">{errors.sites}</p>}

              {/* Show error if API call fails */}
              {error && (
                <div className="mt-2 text-sm text-red-600">
                  Error loading sites. Please try again.
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 border-t border-gray-200 pt-5">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleSubmit}
                className={`rounded-lg px-6 py-2.5 text-white transition-colors focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  !isFormValid ? "cursor-not-allowed bg-gray-400" : "bg-teal-600 hover:bg-teal-700"
                }`}
                disabled={!isFormValid || (loading && !isAdminMode)}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateConsumerModal;
