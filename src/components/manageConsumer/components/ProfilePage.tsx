import { ConsumerUser, ProfilePageProps, UpdateUserSchema } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { useDeleteUser, useGetAllSites, useUpdateConsumer } from "@/hooks/useApi";
import { ChevronDown, Edit, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import DeleteUserModal from "./DeleteUserModal"; // Import the delete modal
import ReusableDropdown, { DropdownOption } from "./ReusableDropdown"; // Import the new component

const ProfilePage: React.FC<ProfilePageProps> = ({ consumer, onBack }) => {
  const { user, logout } = useAuth();
  // State for edit modes
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);

  // Form state for personal information
  const [personalFormData, setPersonalFormData] = useState({
    job_title: consumer.job_title || "",
    role: consumer.role || "",
  });

  // Real-time validation state for job title
  const [jobTitleError, setJobTitleError] = useState("");
  const [jobTitleTouched, setJobTitleTouched] = useState(false);

  // State for location tags editing
  const [editingLocationTags, setEditingLocationTags] = useState<string[]>([]);

  // State for viewing all location tags for a specific site
  const [viewingAllTagsForSite, setViewingAllTagsForSite] = useState<string | null>(null);

  // State for dropdown and delete modal
  const [showMoreActionsDropdown, setShowMoreActionsDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // State for deleting site
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);

  // State for user type dropdown
  const [showUserTypeDropdown, setShowUserTypeDropdown] = useState(false);

  // State for self-role change confirmation
  const [showSelfRoleChangeModal, setShowSelfRoleChangeModal] = useState(false);

  // Ref for click outside detection for user type dropdown
  const userTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Get all sites data
  const { data: allSites, loading: sitesLoading } = useGetAllSites(consumer.customer_id);

  // Update consumer hook
  const { execute: updateConsumer, loading: isUpdating } = useUpdateConsumer();

  // Delete user hook
  const { execute: deleteUser, loading: isDeleting } = useDeleteUser();

  // Handle click outside to close user type dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userTypeDropdownRef.current &&
        !userTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserTypeDropdown(false);
      }
    };

    if (showUserTypeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserTypeDropdown]);

  // Real-time job title validation function
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

  // Function to format role for display
  const formatRole = (role: string): string => {
    switch (role) {
      case "consumer":
        return "Consumer";
      case "admin":
        return "Admin";
      case "cust_super_admin":
        return "Super Admin";
      default:
        return role;
    }
  };

  // Determine user type for delete modal
  const getUserType = (): "consumer" | "admin" => {
    return consumer.role === "admin" || consumer.role === "cust_super_admin" ? "admin" : "consumer";
  };

  const getAvatar = (consumer: ConsumerUser) => {
    return (
      consumer.avatar ||
      consumer.name?.charAt(0)?.toUpperCase() ||
      consumer.email?.charAt(0)?.toUpperCase() ||
      "U"
    );
  };

  // Helper function to get avatar color
  const getAvatarColor = (consumer: ConsumerUser) => {
    const colors = ["bg-blue-400", "bg-green-400", "bg-yellow-400", "bg-red-400", "bg-indigo-400"];
    const index = consumer.id ? consumer.id.length % colors.length : 0;
    return colors[index];
  };

  // Function to get site name by ID
  const getSiteNameById = (siteId: string): string => {
    const site = allSites?.find((site) => site.id === siteId);
    return site?.name || siteId;
  };

  // Function to get location tags for a site
  const getLocationTagsForSite = (siteId: string): string[] => {
    const site = allSites?.find((site) => site.id === siteId);
    return site?.location_tags || [];
  };

  // Group consumer's location tags by site
  const getAssignedSitesData = () => {
    if (!consumer.sites || !allSites) return [];

    return consumer.sites.map((siteId) => {
      const siteName = getSiteNameById(siteId);
      const siteLocationTags = getLocationTagsForSite(siteId);

      const assignedLocationTags =
        consumer.location_tags?.filter((tag) => siteLocationTags.includes(tag)) || [];

      return {
        siteId,
        siteName,
        locationTags: assignedLocationTags,
        allSiteLocationTags: siteLocationTags,
      };
    });
  };

  // Check if all location tags are selected for a site
  const areAllLocationTagsSelected = (siteData: any) => {
    return (
      siteData.allSiteLocationTags.length > 0 &&
      siteData.locationTags.length === siteData.allSiteLocationTags.length
    );
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    try {
      const currentUserId = user?.id || user?.customer_id || "";
      await deleteUser(consumer.id, currentUserId);
      setShowDeleteModal(false);
      // Navigate back to the main page after successful deletion
      onBack();
    } catch (error) {
      console.error("Failed to delete user:", error);
      // Error is handled by the toast in the hook
    }
  };

  // Handle delete site
  const handleDeleteSite = async (siteIdToDelete: string) => {
    try {
      setDeletingSiteId(siteIdToDelete);

      // Get current consumer sites and filter out the site to delete
      const currentSites = consumer.sites || [];
      const updatedSites = currentSites.filter((siteId) => siteId !== siteIdToDelete);

      // Get current location tags and remove those associated with the deleted site
      const currentLocationTags = consumer.location_tags || [];
      const siteLocationTags = getLocationTagsForSite(siteIdToDelete);
      const updatedLocationTags = currentLocationTags.filter(
        (tag) => !siteLocationTags.includes(tag),
      );

      // Prepare update payload
      const updateData: Partial<UpdateUserSchema> = {
        sites: updatedSites,
        location_tags: updatedLocationTags,
      };

      await updateConsumer(consumer.id, updateData);

      // Update the consumer object locally
      consumer.sites = updatedSites;
      consumer.location_tags = updatedLocationTags;

      // Reset editing state if we were editing this site
      if (editingSiteId === siteIdToDelete) {
        setEditingSiteId(null);
        setEditingLocationTags([]);
      }
    } catch (error) {
      console.error("Failed to delete site:", error);
    } finally {
      setDeletingSiteId(null);
    }
  };

  // Handle personal information edit
  const handlePersonalEdit = () => {
    // Close site location tags editing if it's open
    if (editingSiteId) {
      setEditingSiteId(null);
      setEditingLocationTags([]);
    }

    setIsEditingPersonal(true);
    setPersonalFormData({
      job_title: consumer.job_title || "",
      role: consumer.role || "",
    });
    // Reset validation state when starting to edit
    setJobTitleError("");
    setJobTitleTouched(false);
  };

  // Handle personal information save
  const handlePersonalSave = async () => {
    // Final validation before save
    setJobTitleTouched(true);
    const validationError = validateJobTitle(personalFormData.job_title);
    setJobTitleError(validationError);

    if (validationError) {
      return; // Don't save if there are validation errors
    }

    // Check if user is changing their own role to a lower privilege
    const isSelfRoleChange = isSelfEditing() && consumer.role !== personalFormData.role;
    const isDemotion = isRoleDemotion(personalFormData.role);

    // If it's self-demotion, show confirmation modal
    if (isSelfRoleChange && isDemotion) {
      setShowSelfRoleChangeModal(true);
      return;
    }

    // Proceed with save
    await performPersonalSave();
  };

  // Actual save logic (separated for reuse)
  const performPersonalSave = async () => {
    try {
      const isSelfRoleChange = isSelfEditing() && consumer.role !== personalFormData.role;
      const isDemotion = isRoleDemotion(personalFormData.role);

      const updateData: Partial<UpdateUserSchema> = {
        job_title: personalFormData.job_title,
        role: personalFormData.role,
      };

      await updateConsumer(consumer.id, updateData);
      setIsEditingPersonal(false);

      // Update the consumer object locally
      consumer.job_title = personalFormData.job_title;
      consumer.role = personalFormData.role;

      // Reset validation state
      setJobTitleError("");
      setJobTitleTouched(false);

      // If user demoted themselves, force logout after 3 seconds
      if (isSelfRoleChange && isDemotion) {
        // Show success message
        console.log("Role changed successfully. You will be logged out in 3 seconds...");

        setTimeout(() => {
          logout();
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to update personal information:", error);
    }
  };

  // Handle self-role change confirmation
  const handleConfirmSelfRoleChange = async () => {
    setShowSelfRoleChangeModal(false);
    await performPersonalSave();
  };

  // Handle personal information cancel
  const handlePersonalCancel = () => {
    setIsEditingPersonal(false);
    setPersonalFormData({
      job_title: consumer.job_title || "",
      role: consumer.role || "",
    });
    // Reset validation state
    setJobTitleError("");
    setJobTitleTouched(false);
  };

  // Handle user type selection
  const handleUserTypeSelect = (role: string) => {
    setPersonalFormData({ ...personalFormData, role });
    setShowUserTypeDropdown(false);
  };

  // Real-time job title change handler
  const handleJobTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const jobTitle = e.target.value;
    setPersonalFormData({ ...personalFormData, job_title: jobTitle });

    // Validate in real-time after field is touched
    if (jobTitleTouched || jobTitle.length > 0) {
      setJobTitleTouched(true);
      const error = validateJobTitle(jobTitle);
      setJobTitleError(error);
    }
  };

  // Handle job title blur
  const handleJobTitleBlur = () => {
    setJobTitleTouched(true);
    const error = validateJobTitle(personalFormData.job_title);
    setJobTitleError(error);
  };

  // Handle location tags edit
  const handleLocationTagsEdit = (siteId: string) => {
    // Close personal information editing if it's open
    if (isEditingPersonal) {
      setIsEditingPersonal(false);
      setPersonalFormData({
        job_title: consumer.job_title || "",
        role: consumer.role || "",
      });
      // Reset validation state
      setJobTitleError("");
      setJobTitleTouched(false);
    }

    setEditingSiteId(siteId);
    const siteData = getAssignedSitesData().find((site) => site.siteId === siteId);
    setEditingLocationTags(siteData?.locationTags || []);
  };

  // Add location tag
  const addLocationTag = (tag: string) => {
    if (!editingLocationTags.includes(tag)) {
      setEditingLocationTags([...editingLocationTags, tag]);
    }
  };

  // Remove location tag
  const removeLocationTag = (tagToRemove: string) => {
    setEditingLocationTags(editingLocationTags.filter((tag) => tag !== tagToRemove));
  };

  // Handle location tags save
  const handleLocationTagsSave = async () => {
    if (!editingSiteId) return;

    try {
      // Get current consumer location tags
      const currentLocationTags = consumer.location_tags || [];

      // Get the site being edited
      const editingSiteData = getAssignedSitesData().find((site) => site.siteId === editingSiteId);
      if (!editingSiteData) return;

      // Remove old location tags for this site from consumer's location tags
      const tagsToRemove = editingSiteData.locationTags;
      const filteredLocationTags = currentLocationTags.filter((tag) => !tagsToRemove.includes(tag));

      // Add new location tags for this site
      const updatedLocationTags = [...filteredLocationTags, ...editingLocationTags];

      // Remove duplicates
      const uniqueLocationTags = [...new Set(updatedLocationTags)];

      const updateData: Partial<UpdateUserSchema> = {
        location_tags: uniqueLocationTags,
      };

      await updateConsumer(consumer.id, updateData);

      // Update the consumer object locally
      consumer.location_tags = uniqueLocationTags;

      setEditingSiteId(null);
      setEditingLocationTags([]);
    } catch (error) {
      console.error("Failed to update location tags:", error);
    }
  };

  // Handle location tags cancel
  const handleLocationTagsCancel = () => {
    setEditingSiteId(null);
    setEditingLocationTags([]);
  };

  // Handle view all location tags
  const handleViewAllTags = (siteId: string) => {
    setViewingAllTagsForSite(viewingAllTagsForSite === siteId ? null : siteId);
  };

  // Prepare location tag options for editing
  const getLocationTagOptions = (siteId: string): DropdownOption[] => {
    const availableTags = getLocationTagsForSite(siteId);
    const remainingTags = availableTags.filter((tag) => !editingLocationTags.includes(tag));

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

  // Handle select all for location tags in edit mode
  const handleSelectAllLocationTags = (allValues: string[]) => {
    setEditingLocationTags([...editingLocationTags, ...allValues]);
  };

  // Check if the logged-in user is editing their own profile
  const isSelfEditing = (): boolean => {
    return consumer.id === user?.id;
  };

  // Check if admin is trying to edit super admin's role
  const canEditRole = (): boolean => {
    // Super admin cannot change their own role
    if (user?.role === "cust_super_admin" && isSelfEditing()) {
      return false;
    }

    // Super admin can edit any other user's role
    if (user?.role === "cust_super_admin") {
      return true;
    }

    // Admin cannot edit super admin's role
    if (user?.role === "admin" && consumer.role === "cust_super_admin") {
      return false;
    }

    // Admin can edit consumer and other admin roles (including their own)
    if (user?.role === "admin") {
      return true;
    }

    // Consumers cannot edit roles
    return false;
  };

  // Check if role change will demote the user (admin/super_admin -> consumer)
  const isRoleDemotion = (newRole: string): boolean => {
    const currentRole = consumer.role;
    const isCurrentlyAdmin = currentRole === "admin" || currentRole === "cust_super_admin";
    const willBeConsumer = newRole === "consumer";
    return isCurrentlyAdmin && willBeConsumer;
  };

  // Check if the user can be deleted (prevent super admin self-deletion)
  const canDeleteUser = (): boolean => {
    // Super admin cannot delete themselves
    if (isSelfEditing() && consumer.role === "cust_super_admin") {
      return false;
    }
    return true;
  };

  // User type options (simplified to only Admin and Consumer)
  const roleOptions = [
    { value: "consumer", label: "Consumer" },
    { value: "admin", label: "Admin" },
  ];

  // Check if personal form is valid
  const isPersonalFormValid = !jobTitleError && personalFormData.job_title.trim();

  return (
    <div
      className="min-h-screen bg-gray-50"
      onClick={() => {
        // Close view all tags and dropdown when clicking anywhere on the screen
        if (viewingAllTagsForSite !== null) {
          setViewingAllTagsForSite(null);
        }
        if (showMoreActionsDropdown) {
          setShowMoreActionsDropdown(false);
        }
        if (showUserTypeDropdown) {
          setShowUserTypeDropdown(false);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-gray-200 px-6 pt-4">
        <div className="relative flex items-center">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-all hover:bg-gray-300 hover:text-gray-900"
          >
            ←
          </button>
          <h1 className="ml-4 text-xl font-semibold text-[#275E59]">Profile</h1>
        </div>
        {user?.role !== "consumer" && user?.role !== "admin" && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreActionsDropdown(!showMoreActionsDropdown);
              }}
              className="inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              More Actions
              <ChevronDown
                className={`ml-2 h-4 w-4 transition-transform ${showMoreActionsDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {/* More Actions Dropdown */}
            {showMoreActionsDropdown && (
              <div
                className="absolute top-full right-0 z-10 mt-2 w-48 rounded-2xl border border-gray-200 bg-white px-2 py-4 shadow-lg"
                style={{ fontSize: "12px" }}
                onClick={(e) => e.stopPropagation()}
              >
                {canDeleteUser() ? (
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowMoreActionsDropdown(false);
                    }}
                    className="flex w-full items-center text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete {getUserType() === "admin" ? "Admin" : "Consumer"}
                  </button>
                ) : (
                  <div className="px-2 py-1">
                    <div className="flex w-full cursor-not-allowed items-center text-left text-sm text-gray-400">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Admin
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Super Admins cannot delete themselves
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6 p-6">
        <div className="flex space-x-6">
          <div
            className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm"
            style={{ width: "253px", height: "282px" }}
          >
            <div className="flex flex-col items-center" style={{ width: "221px", height: "234px" }}>
              <div
                className={`h-32 w-32 ${getAvatarColor(consumer)} flex items-center justify-center rounded-full text-8xl font-bold text-white`}
              >
                {getAvatar(consumer)}
              </div>
              <h2 className="mt-5 text-center text-xl font-semibold text-gray-900">
                {consumer.name}
              </h2>
              <span className="mt-4 text-center">
                <p className="text-center text-gray-500">{formatRole(consumer.role)}</p>
              </span>
            </div>
          </div>

          {/* Div 2: Personal Information */}
          <div className="flex-1 rounded-lg bg-white shadow-sm">
            <div className="mx-6 flex items-center justify-between border-b border-gray-200 px-1 py-4">
              <h3 className="text-xl font-medium text-gray-900">Personal Information</h3>
              {!isEditingPersonal ? (
                <button
                  onClick={handlePersonalEdit}
                  className="inline-flex items-center rounded-lg border-1 border-gray-500 px-3 py-1 text-base"
                  style={{ width: "82px", height: "32px" }}
                >
                  Edit
                  <Edit className="ml-2 h-4 w-4" />
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={handlePersonalCancel}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePersonalSave}
                    className={`rounded-lg px-4 py-2 text-sm text-white transition-colors ${
                      !isPersonalFormValid
                        ? "cursor-not-allowed bg-gray-400"
                        : "bg-teal-600 hover:bg-teal-700"
                    }`}
                    disabled={isUpdating || !isPersonalFormValid}
                  >
                    {isUpdating ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-base font-medium text-gray-500">
                    Full Name
                  </label>
                  <p className="text-base font-medium text-gray-900">{consumer.name || "N/A"}</p>
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-gray-500">Email Id</label>
                  <p className="text-base font-medium text-gray-900 lowercase">
                    {consumer.email || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-gray-500">
                    Phone Number
                  </label>
                  <p className="text-base font-medium text-gray-900">{consumer.phone || "N/A"}</p>
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-gray-500">
                    Time Zone
                  </label>
                  <p className="text-base font-medium text-gray-900">
                    {consumer.timezone || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-gray-500">
                    Job Title
                  </label>
                  {isEditingPersonal ? (
                    <div>
                      <input
                        type="text"
                        value={personalFormData.job_title}
                        onChange={handleJobTitleChange}
                        onBlur={handleJobTitleBlur}
                        className={`w-full rounded-lg border px-3 py-2 text-base text-gray-900 focus:ring-2 ${
                          jobTitleError
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                        }`}
                        placeholder="Enter job title"
                      />
                      {jobTitleError && (
                        <p className="mt-1 text-sm text-red-600">{jobTitleError}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-base font-medium text-gray-900">
                      {consumer.job_title || "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-base font-medium text-gray-500">
                    User Type
                  </label>
                  {isEditingPersonal ? (
                    <div ref={userTypeDropdownRef} className="relative">
                      {/* Check if admin cannot edit super admin role */}
                      {!canEditRole() ? (
                        <div>
                          <div className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-base text-gray-500">
                            {formatRole(personalFormData.role)}
                          </div>
                          <p className="mt-1 text-xs text-red-600">
                            {user?.role === "cust_super_admin" && isSelfEditing()
                              ? "Super Admins cannot change their own role"
                              : "You cannot modify Super Admin's role"}
                          </p>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowUserTypeDropdown(!showUserTypeDropdown);
                            }}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-base text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                          >
                            {formatRole(personalFormData.role)}
                          </button>

                          {/* Warning for self-role change */}
                          {isSelfEditing() && (
                            <p className="mt-1 text-xs text-amber-600">
                              ⚠️ Changing your own role will log you out
                            </p>
                          )}

                          {/* User Type Dropdown */}
                          {showUserTypeDropdown && (
                            <div className="absolute top-full z-[60] mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black/5">
                              {roleOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:border-l-2 hover:border-teal-500 hover:bg-teal-100 focus:outline-none"
                                  onClick={() => handleUserTypeSelect(option.value)}
                                >
                                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-base font-medium text-gray-900">
                      {formatRole(consumer.role) || "N/A"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Div 3: Assigned Sites (Full Width Below) - Only show for consumers */}
        {getUserType() === "consumer" && (
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="mx-6 border-b border-gray-200 px-1 py-4">
              <h3 className="text-xl font-medium text-gray-900">Assigned Sites</h3>
            </div>

            <div className="p-5">
              {sitesLoading ? (
                <div className="py-8 text-center">
                  <p className="text-gray-500">Loading sites...</p>
                </div>
              ) : (
                <div className="overflow-visible">
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-1/4 px-4 py-3 text-left text-base font-medium tracking-wider text-gray-500">
                          Site
                        </th>
                        <th className="w-1/2 px-4 py-3 text-left text-base font-medium tracking-wider text-gray-500">
                          Location Tag
                        </th>
                        <th className="w-1/4 px-18 py-3 text-right text-base font-medium tracking-wider text-gray-500">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {getAssignedSitesData().map((siteData) => (
                        <tr key={siteData.siteId} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-4 text-base font-medium whitespace-nowrap text-gray-800">
                            {siteData.siteName}
                          </td>
                          <td className="px-4 py-4">
                            {editingSiteId === siteData.siteId ? (
                              <div className="space-y-3">
                                {/* Location tags dropdown using ReusableDropdown */}
                                <ReusableDropdown
                                  placeholder="Select Location Tag"
                                  value=""
                                  onChange={(value) => {
                                    if (
                                      value &&
                                      value !== "SELECT_ALL" &&
                                      !editingLocationTags.includes(value)
                                    ) {
                                      addLocationTag(value);
                                    }
                                  }}
                                  onSelectAll={handleSelectAllLocationTags}
                                  options={getLocationTagOptions(siteData.siteId)}
                                  showAllOptionsHeader={true}
                                  allOptionsHeaderText="Available Location Tags"
                                  variant="compact"
                                />

                                {/* Selected location tags */}
                                <div className="flex flex-wrap gap-2">
                                  {editingLocationTags.map((tag, tagIndex) => (
                                    <span
                                      key={tagIndex}
                                      className="inline-flex items-center rounded-full border-2 border-gray-300 px-3 py-1 text-xs text-gray-800"
                                    >
                                      {tag}
                                      <button
                                        type="button"
                                        onClick={() => removeLocationTag(tag)}
                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {siteData.locationTags.length > 0 ? (
                                  <>
                                    {areAllLocationTagsSelected(siteData) ? (
                                      <div className="space-y-3">
                                        {viewingAllTagsForSite === siteData.siteId ? (
                                          <div
                                            className="flex flex-wrap gap-2"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {siteData.allSiteLocationTags.map((tag, tagIndex) => (
                                              <span
                                                key={tagIndex}
                                                className="inline-block rounded-full border-2 border-gray-300 px-3 py-1 text-sm text-gray-800"
                                              >
                                                {tag}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <>
                                            <span className="inline-block rounded-full border-2 border-gray-300 px-3 py-1 text-sm text-gray-800">
                                              All Location Tags
                                            </span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewAllTags(siteData.siteId);
                                              }}
                                              className="ml-4 font-medium transition-colors"
                                              style={{
                                                color: "#6598FF",
                                                textDecoration: "underline",
                                                textDecorationColor: "#6598FF",
                                              }}
                                            >
                                              View All
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {siteData.locationTags.map((tag, tagIndex) => (
                                          <span
                                            key={tagIndex}
                                            className="inline-block rounded-full border-2 border-gray-300 px-3 py-1 text-sm text-gray-800"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-500">
                                    No location tags assigned
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-12 py-4 text-right whitespace-nowrap">
                            {editingSiteId === siteData.siteId ? (
                              <div className="flex flex-col items-end space-y-2">
                                <button
                                  onClick={handleLocationTagsSave}
                                  className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs text-white transition-colors hover:bg-teal-700"
                                  style={{ width: "94px", height: "31px" }}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={handleLocationTagsCancel}
                                  className="rounded-lg bg-gray-100 px-4 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-200"
                                  style={{ width: "94px", height: "31px" }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDeleteSite(siteData.siteId)}
                                  className="flex items-center justify-center rounded-lg bg-red-200 px-4 py-1.5 text-xs text-gray-900 transition-colors hover:bg-red-300"
                                  style={{ width: "94px", height: "31px" }}
                                  disabled={deletingSiteId === siteData.siteId}
                                >
                                  {deletingSiteId === siteData.siteId ? (
                                    "Deleting..."
                                  ) : (
                                    <>
                                      Delete Site <Trash2 className="ml-1 h-3 w-3" />
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleLocationTagsEdit(siteData.siteId)}
                                className="inline-flex items-center rounded-lg border-1 border-gray-500 px-3 py-1 text-base"
                                style={{ width: "82px", height: "32px" }}
                              >
                                Edit <Edit className="ml-1 h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {getAssignedSitesData().length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                            No sites assigned
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDelete={handleDeleteUser}
        userType={getUserType()}
        isDeleting={isDeleting}
      />

      {/* Self-Role Change Confirmation Modal */}
      {showSelfRoleChangeModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Confirm Role Change</h3>
            <p className="mb-2 text-sm text-gray-600">
              You are about to change your role from <strong>{formatRole(consumer.role)}</strong> to{" "}
              <strong>{formatRole(personalFormData.role)}</strong>.
            </p>
            <p className="mb-6 text-sm font-medium text-amber-600">
              ⚠️ This will log you out immediately, and you will need to sign in again with your new
              role permissions.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSelfRoleChangeModal(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSelfRoleChange}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white transition-colors hover:bg-teal-700"
              >
                Confirm & Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
