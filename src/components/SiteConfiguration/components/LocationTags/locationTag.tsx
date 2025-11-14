import { apiClient } from "@/api/api-client";
import { CreateLocationTagInput, LocationTag, LocationTagResponse } from "@/api/types";
import {
  useCreateLocationTag,
  useDeleteLocationTag,
  useGetLocationTagsBySite,
} from "@/hooks/useApi";
import { validateLocationTagName } from "@/utils/inputValidation";
import { Check, ChevronDown, Edit2, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import DeleteLocation from "./DeleteLocation";

type SortOption = "lastCreated" | "aToZ";
type EditMode = "none" | "rename" | "delete";

interface LocationTagManagerProps {
  siteId: string;
}

const LocationTagManager: React.FC<LocationTagManagerProps> = ({ siteId }) => {
  const [newTagName, setNewTagName] = useState("");
  const [validationError, setValidationError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("aToZ");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteModalTag, setDeleteModalTag] = useState<LocationTag | null>(null);
  const [editMode, setEditMode] = useState<EditMode>("none");
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  const [originalValues, setOriginalValues] = useState<{ [key: string]: string }>({});
  const [editingErrors, setEditingErrors] = useState<{ [key: string]: string }>({});
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // API Hooks with proper typing
  const {
    data: responseData,
    loading: loadingTags,
    execute: fetchTags,
    error: fetchError,
  } = useGetLocationTagsBySite();

  const { execute: createTag, loading: creatingTag } = useCreateLocationTag();
  const { execute: deleteTag, loading: deletingTag } = useDeleteLocationTag();

  const handleTagNameChange = (value: string) => {
    if (value.length <= 50) {
      setNewTagName(value);
    }

    const error = validateLocationTagName(value);
    setValidationError(error);
  };

  // Safely extract tags from response with proper typing
  const tags = useMemo((): LocationTag[] => {
    console.log("Raw response data:", responseData);

    // Return empty array if no data
    if (!responseData) {
      return [];
    }

    // Check if response has the expected structure
    if (
      responseData &&
      typeof responseData === "object" &&
      "camera_location_tags" in responseData &&
      Array.isArray((responseData as any).camera_location_tags)
    ) {
      const locationTagResponse = responseData as unknown as LocationTagResponse;
      // Validate that each tag has required properties
      const validTags = locationTagResponse.camera_location_tags.filter(
        (tag: any): tag is LocationTag =>
          tag &&
          typeof tag === "object" &&
          tag._id &&
          typeof tag._id === "string" &&
          tag.name &&
          typeof tag.name === "string" &&
          tag.site_id &&
          typeof tag.site_id === "string",
      );
      console.log("Extracted valid tags:", validTags);
      return validTags;
    }

    // Fallback: check if responseData itself is an array of tags
    if (Array.isArray(responseData)) {
      const validTags = responseData.filter(
        (tag: any): tag is LocationTag =>
          tag &&
          typeof tag === "object" &&
          tag._id &&
          typeof tag._id === "string" &&
          tag.name &&
          typeof tag.name === "string",
      );
      return validTags;
    }

    console.warn("Unexpected response structure:", responseData);
    return [];
  }, [responseData]);

  // Fetch tags on mount with error handling
  useEffect(() => {
    const loadTags = async () => {
      try {
        await fetchTags(siteId);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };

    if (siteId) {
      loadTags();
    }
  }, [siteId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setShowMoreDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateTag = async () => {
    if (newTagName.trim() && !validationError) {
      // Check for duplicate tag name (case-insensitive)
      const isDuplicate = tags.some(
        (tag) => tag.name.toLowerCase() === newTagName.trim().toLowerCase(),
      );

      if (isDuplicate) {
        setValidationError("A location tag with this name already exists");
        return;
      }

      try {
        const tagData: CreateLocationTagInput = {
          name: newTagName.trim(),
          site_id: siteId,
        };
        await createTag(tagData);
        setNewTagName("");
        setValidationError("");
        setShowCreateModal(false);
        await fetchTags(siteId);
      } catch (error) {
        console.error("Failed to create tag:", error);
      }
    }
  };

  const handleDeleteTag = async () => {
    if (deleteModalTag) {
      try {
        await deleteTag(deleteModalTag._id);
        setDeleteModalTag(null);
        setEditMode("none");
        await fetchTags(siteId);
      } catch (error) {
        console.error("Failed to delete tag:", error);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalTag(null);
    setEditMode("none");
  };

  const startRename = () => {
    setEditMode("rename");
    setShowMoreDropdown(false);
    const initialValues: { [key: string]: string } = {};
    const originalVals: { [key: string]: string } = {};
    const initialErrors: { [key: string]: string } = {};

    tags.forEach((tag: LocationTag) => {
      initialValues[tag._id] = tag.name;
      originalVals[tag._id] = tag.name;
      initialErrors[tag._id] = ""; // Initialize with no errors
    });

    setEditingValues(initialValues);
    setOriginalValues(originalVals);
    setEditingErrors(initialErrors);
  };

  const startDelete = () => {
    setEditMode("delete");
    setShowMoreDropdown(false);
  };

  const handleTagClick = (tag: LocationTag) => {
    if (editMode === "delete") {
      setDeleteModalTag(tag);
    }
  };

  const handleSaveRename = async () => {
    try {
      setIsUpdatingTags(true);

      // Find all tags that have been modified
      const modifiedTags = Object.keys(editingValues).filter(
        (tagId) =>
          editingValues[tagId]?.trim() !== originalValues[tagId] && editingValues[tagId]?.trim(),
      );

      // Validate all modified tags
      const invalidTags = modifiedTags.filter((tagId) => {
        const error = validateLocationTagName(editingValues[tagId]);
        return error !== "";
      });

      if (invalidTags.length > 0) {
        // Don't proceed if there are validation errors
        setIsUpdatingTags(false);
        return;
      }

      if (modifiedTags.length === 0) {
        setEditMode("none");
        setEditingValues({});
        setOriginalValues({});
        setEditingErrors({});
        setIsUpdatingTags(false);
        return;
      }

      // Show single toast for the entire operation
      const updatePromise = async () => {
        // Update all modified tags without individual toasts
        for (const tagId of modifiedTags) {
          const newName = editingValues[tagId].trim();
          if (newName) {
            // Call API directly without toast wrapper
            await apiClient.updateLocationTag(tagId, { name: newName });
          }
        }
      };

      // Use toast.promise for single toast message
      await toast.promise(updatePromise(), {
        loading: `Updating ${modifiedTags.length} location tag${modifiedTags.length > 1 ? "s" : ""}...`,
        success: `${modifiedTags.length} location tag${modifiedTags.length > 1 ? "s" : ""} updated successfully!`,
        error: "Failed to update location tags.",
      });

      setEditMode("none");
      setEditingValues({});
      setOriginalValues({});
      setEditingErrors({});
      await fetchTags(siteId);
    } catch (error) {
      console.error("Failed to update tags:", error);
    } finally {
      setIsUpdatingTags(false);
    }
  };

  const handleCancelRename = () => {
    setEditMode("none");
    setEditingValues({});
    setOriginalValues({});
    setEditingErrors({});
  };

  const handleEditingValueChange = (tagId: string, value: string) => {
    setEditingValues((prev) => ({
      ...prev,
      [tagId]: value,
    }));

    // Validate the new value
    const error = validateLocationTagName(value);
    setEditingErrors((prev) => ({
      ...prev,
      [tagId]: error,
    }));
  };

  const filteredAndSortedTags = useMemo((): LocationTag[] => {
    // Ensure we have a valid array
    if (!Array.isArray(tags)) {
      console.warn("Tags is not an array:", tags);
      return [];
    }

    let filtered = tags.filter((tag: LocationTag) => {
      // Ensure tag exists and has a name
      if (!tag || !tag.name || typeof tag.name !== "string") {
        return false;
      }
      return tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (sortBy === "aToZ") {
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      // Sort by _id (MongoDB ObjectId contains timestamp)
      filtered.sort((a, b) => {
        return b._id.localeCompare(a._id);
      });
    }

    return filtered;
  }, [tags, searchQuery, sortBy]);

  const getSortLabel = () => {
    return sortBy === "lastCreated" ? "Last Created" : "A to Z";
  };

  // Check if there are any validation errors in editing mode
  const hasEditingErrors = Object.values(editingErrors).some((error) => error !== "");

  const isLoading = loadingTags || creatingTag || isUpdatingTags || deletingTag;

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewTagName("");
    setValidationError("");
  };

  return (
    <div className="flex w-full flex-col p-6" style={{ height: "80vh" }}>
      <div className="max-w-full">
        {/* Header with Filters and Create Button */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xl font-medium text-gray-600">Filters:</span>

              {/* Sort Dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  disabled={loadingTags || editMode === "rename"}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <span className="text-sm text-gray-700">Sort By: {getSortLabel()}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
                {showSortDropdown && (
                  <div className="absolute left-0 z-10 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                    <button
                      onClick={() => {
                        setSortBy("aToZ");
                        setShowSortDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-50 ${
                        sortBy === "aToZ" ? "text-teal-600" : "text-gray-700"
                      }`}
                    >
                      <span>A to Z</span>
                      {sortBy === "aToZ" && <Check className="h-4 w-4 text-teal-600" />}
                    </button>
                    <button
                      onClick={() => {
                        setSortBy("lastCreated");
                        setShowSortDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-50 ${
                        sortBy === "lastCreated" ? "text-teal-600" : "text-gray-700"
                      }`}
                    >
                      <span>Last Created</span>
                      {sortBy === "lastCreated" && <Check className="h-4 w-4 text-teal-600" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tags..."
                  disabled={loadingTags || editMode === "rename"}
                  className="w-80 rounded-lg border border-gray-300 py-2 pr-4 pl-10 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              {/* Create Tag Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={loadingTags || editMode === "rename"}
                className="flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2 text-white"
              >
                <Plus className="h-4 w-4" />
                <span>Create Tag</span>
              </button>

              {/* More Options */}
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  disabled={loadingTags || tags.length === 0 || editMode === "rename"}
                  className="rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <MoreHorizontal className="h-5 w-5 text-gray-600" />
                </button>
                {showMoreDropdown && (
                  <div className="absolute right-0 z-10 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg">
                    <button
                      onClick={startRename}
                      disabled={isUpdatingTags}
                      className="flex w-full items-center gap-2 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={startDelete}
                      disabled={deletingTag}
                      className="flex w-full items-center gap-2 px-4 py-2 text-red-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tags Content Area */}
        <div className="rounded-lg bg-white">
          {/* Loading State */}
          {loadingTags && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading location tags...</div>
            </div>
          )}

          {/* Error State */}
          {fetchError && !loadingTags && (
            <div className="flex items-center justify-center py-8">
              <div className="text-red-500">
                Failed to load location tags.
                <button
                  onClick={() => fetchTags(siteId)}
                  className="ml-2 text-blue-600 underline hover:text-blue-800"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loadingTags && !fetchError && tags.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">
                No location tags found. Create your first tag using the Create Tag button.
              </div>
            </div>
          )}

          {/* No Search Results */}
          {!loadingTags && !fetchError && tags.length > 0 && filteredAndSortedTags.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">No location tags match your search.</div>
            </div>
          )}

          {/* Tags Grid */}
          {!loadingTags && !fetchError && filteredAndSortedTags.length > 0 && (
            <div className="p-6">
              <div className="flex flex-wrap gap-3">
                {filteredAndSortedTags.map((tag: LocationTag, idx: number) => (
                  <div key={tag._id} className="relative">
                    {editMode === "rename" ? (
                      <div className="flex flex-col">
                        <div className="flex items-center rounded-full border-2 border-gray-300 bg-white px-5 py-2">
                          <input
                            type="text"
                            value={
                              editingValues[tag._id] !== undefined
                                ? editingValues[tag._id]
                                : tag.name
                            }
                            onChange={(e) => handleEditingValueChange(tag._id, e.target.value)}
                            disabled={isUpdatingTags}
                            className={`flex-1 rounded px-2 py-1 text-sm font-normal text-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-200 ${
                              editingErrors[tag._id] ? "bg-red-100" : "bg-blue-200"
                            }`}
                            autoFocus={idx === 0}
                          />
                        </div>
                        {editingErrors[tag._id] && (
                          <p className="mt-1 px-2 text-xs text-red-600">{editingErrors[tag._id]}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleTagClick(tag)}
                        disabled={isLoading}
                        className={`border bg-white px-5 py-2 ${
                          editMode === "delete" ? "border-red-300" : "border-gray-300"
                        } flex items-center gap-2 rounded-full text-sm font-normal text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100`}
                      >
                        {tag.name}
                        {editMode === "delete" && <Trash2 className="h-4 w-4 text-red-500" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Rename Action Buttons */}
              {editMode === "rename" && (
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={handleCancelRename}
                    disabled={isUpdatingTags}
                    className="rounded-lg border border-gray-300 px-8 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRename}
                    disabled={isUpdatingTags || hasEditingErrors}
                    className="rounded-lg bg-teal-700 px-8 py-2 font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingTags ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Location Tag Modal */}
      {showCreateModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Create Location Tag</h2>
              <button
                onClick={handleCloseCreateModal}
                disabled={creatingTag}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="mb-6">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => handleTagNameChange(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" &&
                  !creatingTag &&
                  !validationError &&
                  newTagName.trim() &&
                  handleCreateTag()
                }
                placeholder="Enter Here"
                disabled={creatingTag}
                className={`w-full rounded-lg border px-4 py-3 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 ${
                  validationError ? "border-red-300 focus:ring-red-500" : "border-gray-300"
                }`}
                autoFocus
              />
              {validationError && <p className="mt-2 text-sm text-red-600">{validationError}</p>}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end">
              <button
                onClick={handleCreateTag}
                disabled={creatingTag || !newTagName.trim() || !!validationError}
                className="rounded-lg bg-teal-800 px-6 py-2 font-medium text-white"
              >
                {creatingTag ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalTag && (
        <DeleteLocation
          tag={deleteModalTag}
          onCancel={handleCancelDelete}
          onDelete={handleDeleteTag}
          loading={deletingTag}
        />
      )}
    </div>
  );
};

export default LocationTagManager;
