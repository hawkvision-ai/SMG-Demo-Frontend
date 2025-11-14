import { useAuth } from "@/context/AuthContext";
import { useGetSitesCamerasByCustomer, useUpdateTicket } from "@/hooks/useApi";
import { Plus, Trash2, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Import components
import MultiSelectDropdown, { MultiSelectOption } from "./MultiSelectDropdown";

// Type definitions
interface Site {
  id: string;
  name: string;
  cameras: string[];
}

interface UpdateTicketProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
  onUpdateSuccess?: () => void;
}

interface UpdateFormData {
  description: string;
  sites: Site[];
}

const UpdateTicket: React.FC<UpdateTicketProps> = ({
  isOpen,
  onClose,
  ticket,
  onUpdateSuccess,
}) => {
  const { user } = useAuth();
  const { execute: updateTicket, loading: updateLoading } = useUpdateTicket();
  const {
    data: sitesCamerasData,
    loading: sitesLoading,
    execute: getSitesCameras,
  } = useGetSitesCamerasByCustomer();

  // Form state - all hooks at the top level
  const [formData, setFormData] = useState<UpdateFormData>({
    description: "",
    sites: [],
  });
  const [showAddSiteDropdown, setShowAddSiteDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const addSiteDropdownRef = useRef<HTMLDivElement>(null);

  // All useCallback hooks - ensuring consistent dependencies
  const markUserInteraction = useCallback(() => {
    setHasUserInteracted(true);
  }, []);

  const getCurrentSitesAndCameras = useCallback((ticketData: any) => {
    const currentSites: string[] = [];
    const currentCameras: string[] = [];

    const sitesField = ticketData?.custom_fields?.customfield_10163;
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

    const camerasField = ticketData?.custom_fields?.customfield_10162;
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
  }, []);

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      markUserInteraction();
      setFormData((prev) => ({ ...prev, description: e.target.value }));
    },
    [markUserInteraction],
  );

  const addSite = useCallback(
    (siteName: string) => {
      markUserInteraction();
      setFormData((prev) => {
        if (siteName && !prev.sites.find((s) => s.name === siteName)) {
          const newSite = {
            id: Date.now().toString() + Math.random(),
            name: siteName,
            cameras: [],
          };
          return {
            ...prev,
            sites: [...prev.sites, newSite],
          };
        }
        return prev;
      });
      setShowAddSiteDropdown(false);
    },
    [markUserInteraction],
  );

  const addAllSites = useCallback(() => {
    markUserInteraction();
    setFormData((prev) => {
      if (!sitesCamerasData) return prev;

      const selectedSiteNames = prev.sites.map((site) => site.name);
      const newSites = Object.keys(sitesCamerasData)
        .filter((siteName) => !selectedSiteNames.includes(siteName))
        .map((siteName) => ({
          id: Date.now().toString() + Math.random(),
          name: siteName,
          cameras: [],
        }));

      return {
        ...prev,
        sites: [...prev.sites, ...newSites],
      };
    });
    setShowAddSiteDropdown(false);
  }, [markUserInteraction, sitesCamerasData]);

  const removeSite = useCallback(
    (siteId: string) => {
      markUserInteraction();
      setFormData((prev) => ({
        ...prev,
        sites: prev.sites.filter((s) => s.id !== siteId),
      }));
    },
    [markUserInteraction],
  );

  const handleCameraChange = useCallback(
    (siteId: string, values: string[]) => {
      markUserInteraction();
      setFormData((prev) => ({
        ...prev,
        sites: prev.sites.map((s) => (s.id === siteId ? { ...s, cameras: values } : s)),
      }));
    },
    [markUserInteraction],
  );

  const handleCameraSelectAll = useCallback(
    (siteId: string) => {
      markUserInteraction();
      setFormData((prev) => {
        const site = prev.sites.find((s) => s.id === siteId);
        if (!site || !sitesCamerasData) return prev;

        const siteCameras = sitesCamerasData[site.name] || [];
        return {
          ...prev,
          sites: prev.sites.map((s) => (s.id === siteId ? { ...s, cameras: siteCameras } : s)),
        };
      });
    },
    [markUserInteraction, sitesCamerasData],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!ticket || !user?.id) return;

      if (formData.description.trim().length < 20) {
        alert("Description must be at least 20 characters long.");
        return;
      }

      setIsSubmitting(true);

      try {
        const allSites = formData.sites.map((site) => site.name);
        const allCameras = formData.sites.flatMap((site) => site.cameras);

        const updateData = {
          key: ticket.key,
          description: formData.description.trim(),
          sites: allSites,
          cameras: allCameras,
        };

        await updateTicket(ticket.key, updateData);

        if (onUpdateSuccess) {
          onUpdateSuccess();
        }

        onClose();
      } catch (error) {
        console.error("Failed to update ticket:", error);
        alert("Failed to update ticket. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [ticket, user, formData, updateTicket, onUpdateSuccess, onClose],
  );

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  // All useEffect hooks
  useEffect(() => {
    if (ticket && isOpen && !hasUserInteracted && !isInitialized) {
      setFormData({
        description: ticket.description || "",
        sites: [],
      });
      setIsInitialized(true);
    }
  }, [ticket, isOpen, hasUserInteracted, isInitialized]);

  useEffect(() => {
    if (ticket && isOpen && sitesCamerasData && !hasUserInteracted && isInitialized) {
      const { currentSites, currentCameras } = getCurrentSitesAndCameras(ticket);

      const sites: Site[] = currentSites.map((siteName) => ({
        id: Date.now().toString() + Math.random(),
        name: siteName,
        cameras: currentCameras.filter((camera) => {
          return sitesCamerasData[siteName]?.includes(camera) || false;
        }),
      }));

      setFormData((prev) => ({
        ...prev,
        sites: sites,
      }));
    }
  }, [
    ticket,
    isOpen,
    sitesCamerasData,
    hasUserInteracted,
    isInitialized,
    getCurrentSitesAndCameras,
  ]);

  useEffect(() => {
    if (isOpen && user?.customer_id && !sitesLoading && !sitesCamerasData) {
      getSitesCameras(user.customer_id);
    }
  }, [isOpen, user, sitesLoading, sitesCamerasData, getSitesCameras]);

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
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAddSiteDropdown]);

  useEffect(() => {
    if (!isOpen) {
      setShowAddSiteDropdown(false);
      setFormData({
        description: "",
        sites: [],
      });
      setHasUserInteracted(false);
      setIsInitialized(false);
    }
  }, [isOpen]);

  // useMemo hooks
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

  const showAllSitesOption = useMemo(() => {
    return availableSiteOptions.length > 1;
  }, [availableSiteOptions]);

  const getCameraOptions = useCallback(
    (siteId: string): MultiSelectOption[] => {
      const site = formData.sites.find((s) => s.id === siteId);
      if (!site || !sitesCamerasData) return [];

      const siteCameras = sitesCamerasData[site.name] || [];
      const selectedCameras = site.cameras;

      return siteCameras
        .filter((camera) => !selectedCameras.includes(camera))
        .map((camera) => ({
          value: camera,
          label: camera,
        }));
    },
    [formData.sites, sitesCamerasData],
  );

  const getPriorityBadge = useCallback((priority: string): React.ReactElement => {
    const getPriorityDot = (priority: string): string => {
      switch (priority) {
        case "Critical":
          return "bg-red-500";
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
        <span className="text-sm font-normal text-gray-900">{priority}</span>
      </div>
    );
  }, []);

  // Early return after all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[70vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800">Update Ticket</h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Read-only fields */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500">Subject</label>
              <input
                type="text"
                value={ticket?.summary || ""}
                disabled
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-900"
              />
            </div>

            {/* Category and Priority - Read-only */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-500">Category</label>
                <input
                  type="text"
                  value={ticket?.enriched?.issue_type || "General"}
                  disabled
                  className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-500">Priority</label>
                <div className="flex w-full items-center rounded-lg border border-gray-300 bg-gray-100 px-4 py-3">
                  <div>{getPriorityBadge(ticket?.priority || "Medium")}</div>
                </div>
              </div>
            </div>

            {/* Description - Editable */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleDescriptionChange}
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Detailed description of your issue or request"
                disabled={isSubmitting}
                maxLength={2000}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum 20 characters required ({formData.description.length}/2000)
              </p>
            </div>

            {/* Site & Camera Section */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-500">Site & Camera</label>
              <div className="my-4 border-b border-gray-200"></div>

              {/* Display Selected Sites and Cameras */}
              {formData.sites.map((site) => (
                <div
                  key={site.id}
                  className="mb-4 grid grid-cols-2 gap-4 border-b border-gray-100 pb-4"
                >
                  {/* Site Name with Remove Button */}
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-800">{site.name}</span>
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
                    <MultiSelectDropdown
                      placeholder="Select Camera"
                      selectedValues={site.cameras}
                      onChange={(values) => handleCameraChange(site.id, values)}
                      onSelectAll={() => handleCameraSelectAll(site.id)}
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

              {/* Add Site & Camera Controls */}
              <div className="my-5 border-gray-200"></div>
              <div className="grid grid-cols-2 gap-4">
                {/* Add Site Button with Dropdown */}
                <div ref={addSiteDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAddSiteDropdown(!showAddSiteDropdown)}
                    className="inline-flex items-center rounded-full bg-teal-100 px-5 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-200"
                    disabled={sitesLoading || isSubmitting || availableSiteOptions.length === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {sitesLoading ? "Loading..." : "Add Site"}
                  </button>

                  {/* Site Selection Dropdown */}
                  {showAddSiteDropdown && availableSiteOptions.length > 0 && (
                    <div className="absolute bottom-full z-[60] mb-2 max-h-48 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl ring-1 ring-black/5">
                      {/* All Sites Option */}
                      {showAllSitesOption && (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-teal-700 transition-colors duration-150 hover:border-l-2 hover:border-teal-500 hover:bg-teal-100 focus:outline-none"
                          onClick={addAllSites}
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

                <div></div>
              </div>
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="flex items-center justify-end border-t border-gray-200 bg-gray-50 p-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  updateLoading ||
                  !user ||
                  sitesLoading ||
                  formData.description.trim().length < 20
                }
                className="flex items-center rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-400"
              >
                {isSubmitting || updateLoading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateTicket;
