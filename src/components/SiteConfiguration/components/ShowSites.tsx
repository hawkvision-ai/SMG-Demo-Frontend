import { EdgeStatus } from "@/api/types";
import siteIcon from "@/assets/icons/sitesIcon.svg";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import Loading from "@/components/Loading";
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import { useGetSitesByCustomer, useRealSyncWithEdge, useSyncWithEdge } from "@/hooks/useApi";
import { convertToUserTimezone } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteData } from "../types";
import AddSiteModal from "./AddSiteModal";
import RunningUseCasesDialog from "./RunningUsecase";
import SectionWrapper from "./SectionWrapper";
import SiteCard, { CreateNewSiteCard } from "./SiteCard";

export interface ShowSitesProps {
  onSiteClick: (site: SiteData) => void;
  onAddSite: () => void;
  onDeleteSite?: (siteId: string) => void;
  onEditComplete?: () => void;
}

const ShowSites: React.FC<ShowSitesProps> = ({ onSiteClick, onDeleteSite, onEditComplete }) => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [siteToDelete, setSiteToDelete] = useState<SiteData | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState<string | null>(null);
  const { execute: syncWithEdge } = useSyncWithEdge();
  const { execute: realSyncWithEdge } = useRealSyncWithEdge();
  const [isStarted, setIsStarted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"start" | "stop" | "migrate" | null>(null);
  const { user, getUserTimezoneOrUTC } = useAuth();
  const { env, setSwitchEnabled } = useEnv();
  const { data: sitesData, loading: sitesLoading, execute: fetchSites } = useGetSitesByCustomer();

  const [sites, setSites] = useState<SiteData[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (sitesData) {
      const transformedSites = sitesData.map((site) => ({
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
      }));
      setSites(transformedSites);
    }
  }, [sitesData]);

  const [siteHeartbeats, setSiteHeartbeats] = useState<
    Record<string, "active" | "inactive" | "missing">
  >({});

  const [siteAutomationHeartbeats, setSiteAutomationHeartbeats] = useState<
    Record<string, "active" | "inactive" | "missing">
  >({});

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<SiteData | null>(null);

  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [syncOverrideConfirmOpen, setSyncOverrideConfirmOpen] = useState(false);
  const [syncWaitMessage, setSyncWaitMessage] = useState(false);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [siteToSync, setSiteToSync] = useState<SiteData | null>(null);

  const [runningUsecasesSite, setRunningUsecasesSite] = useState<SiteData | null>(null);
  const [isRunningUsecasesOpen, setIsRunningUsecasesOpen] = useState(false);

  useEffect(() => {
    setSwitchEnabled(true);
    return () => setSwitchEnabled(false);
  }, []);

  const handleConfigHistoryClick = () => {
    navigate("/config/history");
  };

  const getHeartbeatStatus = (
    lastHeartbeat: string | undefined,
  ): "active" | "inactive" | "missing" => {
    if (!lastHeartbeat) return "missing";

    try {
      const DEBUG = false;
      const userTimezone = getUserTimezoneOrUTC();
      const now = new Date();
      const currentTime = convertToUserTimezone(now, userTimezone);
      const heartbeatTime = new Date(lastHeartbeat);

      if (isNaN(heartbeatTime.getTime())) {
        console.warn("Invalid heartbeat timestamp:", lastHeartbeat);
        return "missing";
      }

      if (DEBUG) {
        console.log("User timezone:", userTimezone);
        console.log("Heartbeat timestamp:", lastHeartbeat);
        console.log("Parsed heartbeat time:", heartbeatTime.toISOString());
        console.log("Current time (user timezone):", currentTime.toISOString());
      }

      const timeDifference = currentTime.getTime() - heartbeatTime.getTime();

      if (DEBUG) {
        console.log("Time difference (ms):", timeDifference);
        console.log("Time difference (minutes):", timeDifference / (60 * 1000));
      }

      const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000;

      return timeDifference < ACTIVE_THRESHOLD_MS ? "active" : "inactive";
    } catch (error) {
      console.error("Error processing heartbeat time:", error);
      return "missing";
    }
  };

  const updateHeartbeatStatuses = () => {
    const statuses: Record<string, "active" | "inactive" | "missing"> = {};

    sites.forEach((site) => {
      const heartbeatField = env === "virtual" ? site.last_heartbeat : site.real_last_heartbeat;

      console.log(
        `Checking heartbeat for site ${site.name} (${site.id}) with ${env} heartbeat: ${heartbeatField}`,
      );

      statuses[site.id] = getHeartbeatStatus(heartbeatField);
    });

    setSiteHeartbeats(statuses);
  };

  const updateAutomationHeartbeatStatuses = () => {
    const statuses: Record<string, "active" | "inactive" | "missing"> = {};

    sites.forEach((site) => {
      if (env === "real") {
        console.log(
          `Checking automation heartbeat for site ${site.name} (${site.id}): ${site.automation_last_heartbeat}`,
        );
        statuses[site.id] = getHeartbeatStatus(site.automation_last_heartbeat);
      }
    });

    setSiteAutomationHeartbeats(statuses);
  };

  useEffect(() => {
    if (sites && sites.length > 0) {
      updateHeartbeatStatuses();
      updateAutomationHeartbeatStatuses();
    }
  }, [sites, env]);

  useEffect(() => {
    updateHeartbeatStatuses();
    updateAutomationHeartbeatStatuses();

    const intervalId = setInterval(
      async () => {
        try {
          await fetchSites();
          updateHeartbeatStatuses();
          updateAutomationHeartbeatStatuses();

          if (syncLoading) {
            const syncedSite = sites.find((site) => site.id === syncLoading);
            if (syncedSite) {
              if (
                syncedSite.edge_status === EdgeStatus.PIPELINE_IDLE &&
                syncedSite.edge_status_updated_at &&
                syncedSite.last_sync
              ) {
                const statusTime = new Date(syncedSite.edge_status_updated_at).getTime();
                const syncTime = new Date(syncedSite.last_sync).getTime();

                if (statusTime > syncTime) {
                  setSyncLoading(null);
                }
              }

              const errorStates = [
                EdgeStatus.CONFIG_PARSE_FAILED,
                EdgeStatus.PIPELINE_START_FAILED,
                EdgeStatus.PIPELINE_BROKEN,
                EdgeStatus.CAMERA_CONNECTION_FAILED,
              ];

              if (
                syncedSite.edge_status &&
                errorStates.includes(syncedSite.edge_status as EdgeStatus)
              ) {
                setSyncLoading(null);
                setSyncErrorMessage(
                  `Edge process failed: ${getEdgeStatusText(syncedSite.edge_status)}`,
                );
              }
            }
          }
        } catch (error) {
          console.error("Error polling site data:", error);
        }
      },
      2 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [sites, syncLoading, env]);

  const handleSyncButtonClick = async (site: SiteData, e: React.MouseEvent) => {
    e.stopPropagation();

    const heartbeatStatus = siteHeartbeats[site.id] || "missing";
    if (heartbeatStatus === "inactive") {
      return;
    }

    setSiteToSync(site);

    if (site.edge_status === EdgeStatus.CONFIG_RECEIVED) {
      setSyncWaitMessage(true);
      return;
    }

    const needsOverrideStates = [
      EdgeStatus.PIPELINE_STARTING,
      EdgeStatus.PIPELINE_RUNNING,
      EdgeStatus.CAMERAS_CONNECTED,
    ];

    if (site.edge_status && needsOverrideStates.includes(site.edge_status as EdgeStatus)) {
      setSyncOverrideConfirmOpen(true);
      return;
    }

    setSyncConfirmOpen(true);

    await fetchSites();
  };

  const startSync = async (siteToSync: SiteData | null) => {
    if (siteToSync) {
      try {
        setSyncLoading(siteToSync.id);
        if (env === "virtual") {
          await syncWithEdge({
            siteId: siteToSync.id,
            userEmail: user?.email,
          });
        } else {
          await realSyncWithEdge({
            siteId: siteToSync.id,
            userEmail: user?.email,
          });
        }

        await fetchSites();
        setSyncLoading(null);
      } catch (error) {
        console.error("Sync failed:", error);
        setSyncErrorMessage(
          typeof error === "object" && error !== null && "message" in error
            ? (error.message as string)
            : "Sync failed. Please try again.",
        );
        setSyncLoading(null);
      } finally {
        setSiteToSync(null);
      }
    }
  };

  const getEdgeStatusText = (status: string | undefined): string => {
    if (!status) return "Unknown";

    const statusMap: Record<string, string> = {
      [EdgeStatus.CONFIG_RECEIVED]: "Configuration received",
      [EdgeStatus.CONFIG_PARSE_FAILED]: "Configuration parsing failed",
      [EdgeStatus.PIPELINE_STARTING]: "Pipeline starting",
      [EdgeStatus.PIPELINE_START_FAILED]: "Pipeline failed to start",
      [EdgeStatus.PIPELINE_RUNNING]: "Pipeline running",
      [EdgeStatus.PIPELINE_IDLE]: "Ready",
      [EdgeStatus.PIPELINE_BROKEN]: "Pipeline broken",
      [EdgeStatus.CAMERAS_CONNECTED]: "Cameras connected",
      [EdgeStatus.CAMERA_CONNECTION_FAILED]: "Camera connection failed",
    };

    return statusMap[status] || status;
  };

  const dialogProps = {
    start: {
      title: "Start Virtual Environment",
      description: "Are you sure you want to start the virtual environment?",
      button: "Start",
    },
    stop: {
      title: "Stop Virtual Environment",
      description: "Are you sure you want to stop the virtual environment?",
      button: "Stop",
    },
    migrate: {
      title: "Migrate to Real/Prod Environment",
      description:
        "This will move all your current virtual configurations to the real (production) environment. Are you sure you want to migrate?",
      button: "Migrate",
    },
  }[pendingAction ?? "start"];

  const handleConfirm = () => {
    if (pendingAction === "start") {
      setIsStarted(true);
    } else if (pendingAction === "stop") {
      setIsStarted(false);
    } else if (pendingAction === "migrate") {
      alert("Migration started! (Replace with real logic.)");
    }
    setConfirmOpen(false);
    setPendingAction(null);
  };

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.manager.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDeleteClick = (site: SiteData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSiteToDelete(site);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (siteToDelete && onDeleteSite) {
      await onDeleteSite(siteToDelete.id);
      await fetchSites();
    }
    setConfirmDialogOpen(false);
    setSiteToDelete(null);
  };

  const handleEditClick = (site: SiteData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSiteToEdit(site);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSiteToEdit(null);
  };

  const handleEditComplete = async () => {
    setIsEditModalOpen(false);
    setSiteToEdit(null);
    await fetchSites();
    onEditComplete?.();
  };

  const handleRunningUsecasesClick = (site: SiteData) => {
    setRunningUsecasesSite(site);
    setIsRunningUsecasesOpen(true);
  };

  const handleRunningUsecasesClose = () => {
    setIsRunningUsecasesOpen(false);
    setRunningUsecasesSite(null);
  };

  const handleAddSiteClick = () => {
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleAddComplete = async () => {
    setIsAddModalOpen(false);
    await fetchSites();
    onEditComplete?.();
  };

  return (
    <>
      <SectionWrapper
        entityName="Sites"
        onAdd={handleAddSiteClick}
        showSearch={true}
        showSelect={true}
        showAddButton={false}
        onSearch={(term) => setSearchTerm(term)}
        iconSrc={siteIcon}
        height={env === "virtual" ? "87vh" : "87vh"}
        onConfigHistory={handleConfigHistoryClick}
        showConfigHistoryButton={true}
      >
        {sitesLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loading />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-1 md:grid-cols-2 xl:grid-cols-3">
            <CreateNewSiteCard onClick={handleAddSiteClick} />

            {filteredSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                onSiteClick={onSiteClick}
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteClick}
                onSyncButtonClick={handleSyncButtonClick}
                onRunningUsecasesClick={handleRunningUsecasesClick}
                heartbeatStatus={siteHeartbeats[site.id] || "missing"}
                automationHeartbeatStatus={siteAutomationHeartbeats[site.id] || "missing"}
                syncLoading={syncLoading}
                showDeleteButton={!!onDeleteSite}
              />
            ))}
          </div>
        )}

        {siteToDelete && (
          <ConfirmationDialog
            open={confirmDialogOpen}
            title="Delete Site"
            description={`Are you sure you want to delete ${siteToDelete.name}?`}
            primaryButtonText="Delete"
            onClose={() => setConfirmDialogOpen(false)}
            onConfirm={confirmDelete}
          />
        )}

        <AddSiteModal
          open={isEditModalOpen}
          onClose={handleEditModalClose}
          onComplete={handleEditComplete}
          editSite={siteToEdit as any}
        />
        <AddSiteModal
          open={isAddModalOpen}
          onClose={handleAddModalClose}
          onComplete={handleAddComplete}
          editSite={null}
        />
      </SectionWrapper>

      <ConfirmationDialog
        open={confirmOpen}
        title={dialogProps.title}
        description={dialogProps.description}
        primaryButtonText={dialogProps.button}
        onClose={() => {
          setConfirmOpen(false);
          setPendingAction(null);
        }}
        onConfirm={handleConfirm}
        isLoading={false}
      />

      <ConfirmationDialog
        open={syncConfirmOpen}
        title="Sync Site Configuration"
        description={`Are you sure you want to sync the configuration for "${siteToSync?.name}"? This will push latest site, camera, and use case data.`}
        primaryButtonText="Sync Now"
        onClose={() => {
          setSyncConfirmOpen(false);
          setSiteToSync(null);
        }}
        onConfirm={async () => {
          setSyncConfirmOpen(false);
          await startSync(siteToSync);
        }}
      />

      <ConfirmationDialog
        open={syncOverrideConfirmOpen}
        title="Override Current Process"
        description={
          siteToSync
            ? `The edge device is currently ${getEdgeStatusText(siteToSync.edge_status).toLowerCase()}. Sending new configuration now may interrupt the current process. Are you sure you want to override?`
            : "Are you sure you want to override the current process?"
        }
        primaryButtonText="Override and Sync"
        onClose={() => {
          setSyncOverrideConfirmOpen(false);
          setSiteToSync(null);
        }}
        onConfirm={async () => {
          setSyncOverrideConfirmOpen(false);
          await startSync(siteToSync);
        }}
      />

      <ConfirmationDialog
        open={syncWaitMessage}
        title="Configuration Processing"
        description={
          siteToSync
            ? `The edge device is currently processing the configuration. Please wait until the process completes before syncing again.`
            : "Please wait for the current configuration to be processed."
        }
        primaryButtonText="OK"
        onClose={() => {
          setSyncWaitMessage(false);
          setSiteToSync(null);
        }}
        onConfirm={() => {
          setSyncWaitMessage(false);
          setSiteToSync(null);
        }}
      />

      <ConfirmationDialog
        open={!!syncErrorMessage}
        title="Sync Error"
        description={syncErrorMessage || "An error occurred during sync."}
        primaryButtonText="OK"
        onClose={() => {
          setSyncErrorMessage(null);
          setSiteToSync(null);
          setSyncLoading(null);
        }}
        onConfirm={() => {
          setSyncErrorMessage(null);
          setSiteToSync(null);
          setSyncLoading(null);
        }}
      />

      <RunningUseCasesDialog
        open={isRunningUsecasesOpen}
        onClose={handleRunningUsecasesClose}
        siteName={runningUsecasesSite?.name || ""}
        runningUsecases={runningUsecasesSite?.running_usecases}
      />
    </>
  );
};

export default ShowSites;