import { useEnv } from "@/context/EnvContext";
import { useDeleteSite, useGetSitesByCustomer } from "@/hooks/useApi";
import { Building2, Camera as CameraIcon, Home } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { BreadcrumbItem } from "../Breadcrumb";
import Loading from "../Loading";
import NotificationConfiguration from "../NotificationSettings/NotificationConfiguration";
import { AddSiteModal, Breadcrumb } from "./components";
import AddCameraModal from "./components/AddCameraModal";
import Camera from "./components/Cameras";
import FunctionalTagsConfig from "./components/FunctionalTagsConfig";
import LocationTags from "./components/LocationTags/locationTag";
import ShowSites from "./components/ShowSites";
import SiteQueueManager from "./components/SiteQueueManager";
import Counter from "./Counter/Counter";
import { CameraData, SiteData } from "./types";

type TabType = "LOCATIONTAGS" | "CAMERAS" | "TAGS" | "NOTIFICATIONS" | "QUEUE" | "COUNTER";

export default function SitesPage() {
  const { env } = useEnv();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isInitialMount = useRef(true);

  // Get tab from URL or default to LOCATIONTAGS
  const urlTab = (searchParams.get("tab") as TabType) || "LOCATIONTAGS";
  const urlSiteId = searchParams.get("siteId");
  const urlCameraId = searchParams.get("cameraId");

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(urlSiteId);
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [isEditCameraModalOpen, setIsEditCameraModalOpen] = useState(false);
  const [isEditSiteModalOpen, setIsEditSiteModalOpen] = useState(false);

  const [selectedSite, setSelectedSite] = useState<SiteData | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(urlCameraId);
  const [selectedCamera, setSelectedCamera] = useState<CameraData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(urlTab);
  const [isRestoringFromUrl, setIsRestoringFromUrl] = useState(!!urlSiteId); // NEW

  const { data: sitesData, error: sitesError, execute: fetchSites, loading: sitesLoading } = useGetSitesByCustomer();
  const { execute: deleteSite } = useDeleteSite();

  // Initial fetch on mount
  useEffect(() => {
    fetchSites();
  }, []);

  // Transform and set site data when sitesData or urlSiteId changes
  useEffect(() => {
    if (sitesData && urlSiteId) {
      const site = sitesData.find((s) => s.id === urlSiteId);
      if (site) {
        const transformedSite: SiteData = {
          id: site.id,
          name: site.name,
          address: site.address || "",
          country: site.country,
          city: site.city,
          manager: site.manager || "",
          vehicles: site.no_of_vehicle || 0,
          edgeDeviceId: site.edge_device_id,
          staffCount: site.staff_count || 0,
          imageUrl: site.site_image_url || "",
          no_of_cameras: site.cameras?.length || 0,
          cloud_edge_id: site.cloud_edge_id || "",
          last_sync: site.last_sync || "",
          last_heartbeat: site.last_heartbeat || "",
          edge_status: site.edge_status || "",
          edge_status_updated_at: site.edge_status_updated_at || "",
          last_edge_status_msg: site.last_edge_status_msg,
          cameras: site.cameras || [],
          realEdgeDeviceId: site.real_edge_device_id,
          real_last_heartbeat: site.real_last_heartbeat || "",
          automation_last_heartbeat: site.automation_last_heartbeat || "",
          anonymisation_controls: site.anonymisation_controls,
          running_usecases: site.running_usecases,
        };
        setSelectedSite(transformedSite);
        setSelectedSiteId(urlSiteId);
        setIsRestoringFromUrl(false); // Done restoring
      } else {
        // Site not found, stop loading
        setIsRestoringFromUrl(false);
      }
    } else if (!urlSiteId) {
      // Clear site when no siteId in URL
      setSelectedSite(null);
      setSelectedSiteId(null);
      setIsRestoringFromUrl(false);
    } else if (sitesData && !sitesLoading) {
      // Data loaded but site not found
      setIsRestoringFromUrl(false);
    }
  }, [sitesData, urlSiteId, sitesLoading]);

  // Sync state with URL params (for browser back/forward)
  useEffect(() => {
    // Skip on initial mount to avoid conflicts
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSelectedSiteId(urlSiteId);
    setSelectedCameraId(urlCameraId);
    setActiveTab(urlTab);

    // Clear camera if not in URL
    if (!urlCameraId) {
      setSelectedCamera(null);
    }

    // Set restoring flag if navigating to a site
    if (urlSiteId && !selectedSite) {
      setIsRestoringFromUrl(true);
    }
  }, [urlSiteId, urlCameraId, urlTab]);

  const handleSiteClick = (site: SiteData) => {
    setSelectedSiteId(site.id);
    setSelectedSite(site);
    setSelectedCameraId(null);
    setSelectedCamera(null);
    setActiveTab("LOCATIONTAGS");
    
    // Create new history entry
    const params = new URLSearchParams();
    params.set("siteId", site.id);
    params.set("tab", "LOCATIONTAGS");
    setSearchParams(params);
  };

  const handleCameraClick = (cameraId: string, camera: CameraData) => {
    setSelectedCameraId(cameraId);
    setSelectedCamera(camera);
    setActiveTab("CAMERAS");
    
    // Create new history entry
    if (selectedSiteId) {
      const params = new URLSearchParams();
      params.set("siteId", selectedSiteId);
      params.set("tab", "CAMERAS");
      params.set("cameraId", cameraId);
      setSearchParams(params);
    }
  };

  const handleBackToSites = () => {
    setSelectedSiteId(null);
    setSelectedSite(null);
    setSelectedCameraId(null);
    setSelectedCamera(null);
    setActiveTab("LOCATIONTAGS");
    setIsRestoringFromUrl(false);
    
    // Clear URL params to go back to sites list
    navigate("/configure");
  };

  const handleBackToSiteDetails = () => {
    setSelectedCameraId(null);
    setSelectedCamera(null);
    
    // Go back in browser history
    navigate(-1);
  };

  const handleDeleteSite = async (siteId: string) => {
    try {
      await deleteSite(siteId);
      if (selectedSite?.id === siteId) {
        handleBackToSites();
      }
      await fetchSites();
    } catch (error) {
      console.error("Failed to delete site:", error);
      alert("Failed to delete site. Please try again.");
    }
  };

  const handleEditSite = () => {
    if (selectedSite) setIsEditSiteModalOpen(true);
  };

  const handleSiteUpdateComplete = async () => {
    setIsEditSiteModalOpen(false);
    await fetchSites();
  };

  const handleEditCamera = () => {
    if (selectedCamera) setIsEditCameraModalOpen(true);
  };

  const handleCameraUpdateComplete = async (updatedCamera?: CameraData) => {
    setIsEditCameraModalOpen(false);
    await fetchSites();
    if (updatedCamera) {
      setSelectedCamera(updatedCamera);
    }
  };

  // Handle tab change - use replace to avoid cluttering history
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    
    const params = new URLSearchParams();
    if (selectedSiteId) {
      params.set("siteId", selectedSiteId);
      params.set("tab", tab);
      if (selectedCameraId) {
        params.set("cameraId", selectedCameraId);
      }
    }
    // Replace history for tab changes
    setSearchParams(params, { replace: true });
  };

  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        label: "Sites",
        icon: <Home size={16} />,
        onClick: handleBackToSites,
      },
    ];

    if (selectedSite) {
      items.push({
        label: selectedSite.name,
        icon: <Building2 size={16} />,
        onClick: selectedCamera ? handleBackToSiteDetails : undefined,
      });

      if (selectedCamera) {
        items.push({
          label: selectedCamera.name,
          icon: <CameraIcon size={16} />,
        });
      }
    }

    return items;
  };

  const renderContent = () => {
    if (sitesError && sitesError.message !== "No sites found for this customer") {
      return (
        <div className="flex h-64 flex-col items-center justify-center text-red-600">
          <p>Error loading sites: {sitesError.message}</p>
          <button
            onClick={() => fetchSites()}
            className="mt-4 rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    // Show loading while restoring from URL or fetching initial data
    if (isRestoringFromUrl || sitesLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loading />
        </div>
      );
    }

    if (selectedSiteId && selectedSite) {
      return (
        <>
          {!selectedCameraId && (
            <div className="mb-4 flex border-b border-teal-200">
              <button
                onClick={() => handleTabChange("LOCATIONTAGS")}
                className={`cursor-pointer rounded-t-md px-4 py-2 transition-colors ${
                  activeTab === "LOCATIONTAGS"
                    ? "border-transparent bg-teal-600 text-white hover:bg-teal-700"
                    : "border-teal-600 bg-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                Location Tags
              </button>
              <button
                onClick={() => handleTabChange("COUNTER")}
                className={`cursor-pointer rounded-t-md px-4 py-2 transition-colors ${
                  activeTab === "COUNTER"
                    ? "border-transparent bg-teal-600 text-white hover:bg-teal-700"
                    : "border-teal-600 bg-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                Counter
              </button>
              <button
                onClick={() => handleTabChange("NOTIFICATIONS")}
                className={`cursor-pointer rounded-t-md px-4 py-2 transition-colors ${
                  activeTab === "NOTIFICATIONS"
                    ? "border-transparent bg-teal-600 text-white hover:bg-teal-700"
                    : "border-teal-600 bg-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                Notifications
              </button>
              <button
                onClick={() => handleTabChange("TAGS")}
                className={`cursor-pointer rounded-t-md px-4 py-2 transition-colors ${
                  activeTab === "TAGS"
                    ? "border-transparent bg-teal-600 text-white hover:bg-teal-700"
                    : "border-teal-600 bg-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                Functional Tags Config
              </button>
              <button
                onClick={() => handleTabChange("CAMERAS")}
                className={`cursor-pointer rounded-t-md px-4 py-2 transition-colors ${
                  activeTab === "CAMERAS"
                    ? "border-transparent bg-teal-600 text-white hover:bg-teal-700"
                    : "border-teal-600 bg-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                Cameras
              </button>
              {env === "virtual" && (
                <button
                  onClick={() => handleTabChange("QUEUE")}
                  className={`cursor-pointer rounded-t-md px-4 py-2 transition-colors ${
                    activeTab === "QUEUE"
                      ? "border-transparent bg-teal-600 text-white hover:bg-teal-700"
                      : "border-teal-600 bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Media Queue
                </button>
              )}
            </div>
          )}

          {activeTab === "LOCATIONTAGS" && <LocationTags siteId={selectedSiteId} />}
          {activeTab === "COUNTER" && <Counter siteId={selectedSiteId} />}
          {activeTab === "NOTIFICATIONS" && <NotificationConfiguration siteId={selectedSiteId} />}
          {activeTab === "TAGS" && <FunctionalTagsConfig siteId={selectedSiteId} />}
          {activeTab === "CAMERAS" && (
            <Camera
              siteId={selectedSiteId}
              onCameraSelect={handleCameraClick}
              selectedCameraId={selectedCameraId}
              site={selectedSite}
            />
          )}
          {activeTab === "QUEUE" && env === "virtual" && selectedSite && (
            <SiteQueueManager siteId={selectedSiteId} site={selectedSite} />
          )}
        </>
      );
    }

    return (
      <>
        <ShowSites
          onSiteClick={handleSiteClick}
          onAddSite={() => {}}
          onDeleteSite={handleDeleteSite}
          onEditComplete={fetchSites}
        />
        <AddSiteModal
          open={isAddSiteModalOpen}
          onClose={() => setIsAddSiteModalOpen(false)}
          onComplete={() => {
            setIsAddSiteModalOpen(false);
            fetchSites();
          }}
        />
      </>
    );
  };

  return (
    <div className="">
      {selectedSite && selectedSiteId && (
        <div className="mb-4">
          <Breadcrumb
            key={`breadcrumb-${selectedSiteId}-${selectedCameraId || "none"}`}
            items={getBreadcrumbItems()}
            onBack={selectedCamera ? handleBackToSiteDetails : handleBackToSites}
            editLabel={selectedCamera ? "Edit Camera" : "Edit Site"}
            onEditClick={selectedCamera ? handleEditCamera : handleEditSite}
            disableBack={false}
          />
        </div>
      )}
      {renderContent()}

      {selectedCamera && isEditCameraModalOpen && (
        <AddCameraModal
          open={isEditCameraModalOpen}
          onClose={() => setIsEditCameraModalOpen(false)}
          onComplete={() => handleCameraUpdateComplete(selectedCamera)}
          editCamera={selectedCamera}
          siteId={selectedSiteId || ""}
          env={env}
        />
      )}

      {selectedSite && (
        <AddSiteModal
          open={isEditSiteModalOpen}
          onClose={() => setIsEditSiteModalOpen(false)}
          onComplete={handleSiteUpdateComplete}
          editSite={selectedSite}
        />
      )}
    </div>
  );
}