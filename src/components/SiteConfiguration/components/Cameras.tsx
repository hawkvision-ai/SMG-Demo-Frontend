import { useState, useEffect, useCallback } from "react";
import SectionWrapper from "@/components/SiteConfiguration/components/SectionWrapper";
import AddCameraModal from "./AddCameraModal";
import EmptyCameraState from "./EmptyCameraState";
import ShowCameras from "./ShowCameras";
import CameraDetails from "./CameraDetails";
import { CameraData, SiteData } from "../types";
import { useGetCamerasBySite, useDeleteCamera } from "@/hooks/useApi";
import camImg from "@/assets/icons/camera.svg";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { useEnv } from "@/context/EnvContext";

interface CameraProps {
  siteId: string;
  onCameraSelect?: (cameraId: string, camera: CameraData) => void;
  selectedCameraId?: string | null;
  site?: SiteData | null;
}

const Camera: React.FC<CameraProps> = ({
  siteId,
  onCameraSelect,
  selectedCameraId: externalSelectedCameraId = null,
}) => {
  const { env } = useEnv();
  const [modalOpen, setModalOpen] = useState(false);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [editCamera, setEditCamera] = useState<CameraData | null>(null);
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [internalSelectedCameraId, setInternalSelectedCameraId] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  // const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);

  // Updated API hooks to use the new endpoint
  const {
    data: camerasData,
    loading: camerasLoading,
    error: camerasError,
    execute: fetchCameras,
  } = useGetCamerasBySite();

  const { execute: deleteCamera } = useDeleteCamera();

  // const { execute: syncWithEdge } = useSyncWithEdge();
  // const [syncing, setSyncing] = useState(false);

  // const handleSync = async () => {
  //   try {
  //     setSyncing(true);
  //     await syncWithEdge({siteId:siteId});
  //   } catch (error) {
  //     console.error("Sync failed:", error);
  //   } finally {
  //     setSyncing(false);
  //   }
  // };



  // Use either external or internal selection state
  const selectedCameraId =
    externalSelectedCameraId !== null ? externalSelectedCameraId : internalSelectedCameraId;

  // When external selection changes, update our internal state to match
  useEffect(() => {
    // if (externalSelectedCameraId !== null) {
    setInternalSelectedCameraId(externalSelectedCameraId);
    // }
  }, [externalSelectedCameraId]);

  // Initial fetch of cameras - only run once when component mounts or siteId changes
  useEffect(() => {
    if (siteId && !initialLoadDone) {
      fetchCameras(siteId)
        .then(() => {
          setInitialLoadDone(true);
        })
        .catch((error) => {
          if (error.details === "No cameras found for this site") {
            setCameras([]);
          } else {
            console.error("Error fetching cameras:", error);
          }
          setInitialLoadDone(true);
        });
    }
  }, [siteId, initialLoadDone]);

  // Update cameras state when API data changes
  useEffect(() => {
    if (camerasData) {
      // Transform API data to match our CameraData format
      const transformedCameras = camerasData.map((camera) => ({
        id: camera.id,
        name: camera.name || `Camera ${camera.id.slice(-4)}`,
        locationTags: camera.location_tags || [],
        imageUrl: camera.camera_image_url || "",
        media_history: camera.media_history || [],
        camera_ip: camera?.camera_ip || "",
        calibration: camera?.calibration
      }));

      setCameras(transformedCameras);
    }
  }, [camerasData]);

  const openModalForNew = () => {
    setEditCamera(null);
    setModalOpen(true);
  };

  const openModalForEdit = (camera: CameraData) => {
    setEditCamera(camera);
    setModalOpen(true);
  };

  const handleRefreshCameras = useCallback(() => {
    fetchCameras(siteId).catch((error) => {
      if (error.details !== "No cameras found for this site") {
        console.error("Error refreshing cameras:", error);
      }
    });
  }, [siteId]);

  const handleDeleteCamera = async (cameraId: string) => {
    try {
      await deleteCamera(cameraId);

      // Refresh camera list
      handleRefreshCameras();

      // If the deleted camera was selected, clear selection
      if (selectedCameraId === cameraId) {
        handleBackToList();
      }
    } catch (error: any) {
      console.error("Failed to delete camera:", error);
      alert("Failed to delete camera. Please try again.");
    }
  };

  const handleSearch = (term: string) => {
    setSearch(term);
  };

  const handleSelectCamera = (cameraId: string) => {
    const selectedCamera = cameras.find((cam) => cam.id === cameraId) || null;

    // Update internal state
    setInternalSelectedCameraId(cameraId);

    // If parent component is handling selection, notify it
    if (onCameraSelect && selectedCamera) {
      onCameraSelect(cameraId, selectedCamera);
    }
  };

  const handleBackToList = () => {
    // Update internal state
    setInternalSelectedCameraId(null);

    // If parent component is handling selection, notify it
    if (onCameraSelect) {
      onCameraSelect("", {} as CameraData);
    }
  };

  // Handle camera update from CameraDetails
  const handleCameraUpdate = (updatedCamera: CameraData) => {
    // Update camera in the local list
    setCameras((prev) => prev.map((cam) => (cam.id === updatedCamera.id ? updatedCamera : cam)));

    // Also notify parent if needed
    if (onCameraSelect) {
      onCameraSelect(updatedCamera.id, updatedCamera);
    }
    handleRefreshCameras();
  };

  // Apply filters to cameras
  const filteredCameras = cameras.filter(
    (camera) =>
      camera.name.toLowerCase().includes(search.toLowerCase()) &&
      (filterLocation === "" ||
        camera.locationTags.some((tag) =>
          tag.toLowerCase().includes(filterLocation.toLowerCase()),
        )),
  );

  // Find the selected camera object to pass to CameraDetails
  const selectedCamera = cameras.find((cam) => cam.id === selectedCameraId);



  // If a camera is selected, render the CameraDetails component with additional props
  if (selectedCameraId) {
    return (


      <CameraDetails
        cameraId={selectedCameraId}
        siteId={siteId}
        camera={selectedCamera}
        onCameraUpdate={handleCameraUpdate}
        onRefreshCameraList={handleRefreshCameras}
      />

    );
  }

  // Check if we're in the initial loading state
  const isLoading = camerasLoading && !initialLoadDone;

  // Otherwise, render the camera list with SectionWrapper
  return (
    <SectionWrapper
      entityName="Cameras"
      iconSrc={camImg}
      onAdd={openModalForNew}
      showSearch={true}
      showAddButton={true} // Enable the add button
      onSearch={handleSearch}
      height="75vh"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500"><Loading /></div>
        </div>
      ) : camerasError && camerasError.message !== "No cameras found for this site" ? (
        <div className="flex h-120 flex-col items-center justify-center text-red-600">
          <p>Error loading cameras: {camerasError.message}</p>
          <Button
            onClick={handleRefreshCameras}
            className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-white"
          >
            Try Again
          </Button>
        </div>
      ) : filteredCameras.length === 0 ? (
        <EmptyCameraState onAddCamera={openModalForNew} />
      ) : (
        <ShowCameras
          cameras={filteredCameras}
          onEditCamera={openModalForEdit}
          onSelectCamera={handleSelectCamera}
          onDeleteCamera={handleDeleteCamera}
        />
      )}

      <AddCameraModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onComplete={handleRefreshCameras}
        editCamera={editCamera}
        siteId={siteId}
        env={env}
      />
      {/* Fixed sync button
      <div className="fixed bottom-6 right-[45vw] z-50">
        <Button
          onClick={() => setConfirmSyncOpen(true)}
          disabled={syncing}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold shadow-lg transition-colors ${syncing
            ? "cursor-wait bg-teal-200 text-teal-700"
            : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Site Config"}
        </Button>
      </div>

      <ConfirmationDialog
        open={confirmSyncOpen}
        title="Sync Site Config"
        description="This will push your latest site, camera, and ROI configurations to the gateway device. Proceed?"
        primaryButtonText="Sync Now"
        onClose={() => setConfirmSyncOpen(false)}
        onConfirm={async () => {
          setConfirmSyncOpen(false);
          await handleSync();
        }}
        isLoading={syncing}
      />*/}

    </SectionWrapper> 
  );
};

export default Camera;
