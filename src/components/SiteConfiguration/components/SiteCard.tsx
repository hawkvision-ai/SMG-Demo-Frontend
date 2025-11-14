import { EdgeStatus } from "@/api/types";
import automation from "@/assets/icons/automation.svg";
import automationoff from "@/assets/icons/automationoff.svg";
import edgeoff from "@/assets/icons/edgedeviceoff.svg";
import edgeon from "@/assets/icons/edgedeviceon.svg";
import NoAutomation from "@/assets/icons/NoAutomation.svg";
import NoEdge from "@/assets/icons/NoDataSite.svg";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import { useExportSystemLogs } from "@/hooks/useApi";
import { formatDateTimeISO, getTimeAgo } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity,
  Activity as ActivityIcon,
  Camera,
  Car,
  Download,
  Edit,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { SiteData } from "../types";

interface SiteCardProps {
  site: SiteData;
  onSiteClick: (site: SiteData) => void;
  onEditClick: (site: SiteData, e: React.MouseEvent) => void;
  onDeleteClick: (site: SiteData, e: React.MouseEvent) => void;
  onSyncButtonClick: (site: SiteData, e: React.MouseEvent) => void;
  onRunningUsecasesClick?: (site: SiteData) => void;
  heartbeatStatus: "active" | "inactive" | "missing";
  automationHeartbeatStatus: "active" | "inactive" | "missing";
  syncLoading: string | null;
  showDeleteButton?: boolean;
}

export const getEdgeStatusText = (status: string | undefined): string => {
  if (!status) return "Unknown";

  const statusMap: Record<string, string> = {
    [EdgeStatus.REFRESHING_SAS_TOKEN]: "Refreshing token",
    [EdgeStatus.CONFIG_RECEIVED]: "Config received",
    [EdgeStatus.CONFIG_PARSE_FAILED]: "Config failed",
    [EdgeStatus.PIPELINE_STARTING]: "Starting",
    [EdgeStatus.PIPELINE_BUILDING]: "Building",
    [EdgeStatus.PIPELINE_RUNNING]: "Running",
    [EdgeStatus.CAMERAS_CONNECTED]: "Connected",
    [EdgeStatus.PIPELINE_TERMINATED]: "Terminated",
    [EdgeStatus.PIPELINE_IDLE]: "Ready",
    [EdgeStatus.MQTT_ERROR]: "MQTT error",
    [EdgeStatus.PIPELINE_START_FAILED]: "Start failed",
    [EdgeStatus.PIPELINE_BROKEN]: "Broken",
    [EdgeStatus.CAMERA_CONNECTION_FAILED]: "Connection failed",
    [EdgeStatus.LOW_DISK_SPACE]: "Low disk space",
    [EdgeStatus.HIGH_CPU_LOAD]: "High CPU load",
    [EdgeStatus.HIGH_GPU_LOAD]: "High GPU load",
  };

  return statusMap[status] || status;
};

const getEdgeStatusIndicatorColor = (status: string | undefined, isOffline: boolean): string => {
  if (!status) return "bg-slate-400";

  if (isOffline) return "bg-slate-400";

  const errorStates = [
    EdgeStatus.CONFIG_PARSE_FAILED,
    EdgeStatus.PIPELINE_START_FAILED,
    EdgeStatus.PIPELINE_BROKEN,
    EdgeStatus.CAMERA_CONNECTION_FAILED,
  ];

  if (status && errorStates.includes(status as EdgeStatus)) {
    return "bg-red-500";
  } else if (status === EdgeStatus.PIPELINE_IDLE) {
    return "bg-emerald-500";
  } else {
    return "bg-amber-500";
  }
};

const formatStatusMessage = (statusMsg: any): string => {
  if (typeof statusMsg === "string") {
    return statusMsg;
  }

  if (typeof statusMsg === "object" && statusMsg !== null) {
    const parts: string[] = [];

    if (statusMsg.edge_status) {
      parts.push(`Last recorded status: ${statusMsg.edge_status}`);
    }
    if (statusMsg.edge_error) {
      parts.push(`Error: ${statusMsg.edge_error}`);
    }

    Object.entries(statusMsg)
      .filter(([key]) => key !== "edge_status" && key !== "edge_error")
      .forEach(([key, value]) => {
        const formattedKey = key.replace(/_/g, " ");
        const formattedValue = typeof value === "object" ? JSON.stringify(value) : String(value);
        parts.push(`${formattedKey}: ${formattedValue}`);
      });

    return parts.join("\n");
  }

  return "";
};

export const CreateNewSiteCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { env } = useEnv();

  const bgColor = env === "virtual" ? "bg-indigo-500" : "bg-[#2D736B]";
  const hoverBgColor = env === "virtual" ? "group-hover:bg-indigo-600" : "group-hover:bg-[#2D736B]";
  const borderHoverColor = env === "virtual" ? "hover:border-indigo-600" : "hover:border-[#2D736B]";
  const textHoverColor =
    env === "virtual" ? "group-hover:text-indigo-600" : "group-hover:text-[#2D736B]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2, scale: 1.01 }}
      onClick={onClick}
      className={`group hover:shadow-x relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white shadow-sm transition-all duration-300 ${borderHoverColor}`}
      style={{ minHeight: "257px" }}
    >
      <div
        className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 ${bgColor} transition-all duration-300 group-hover:scale-110 ${hoverBgColor}`}
      >
        <Plus className="h-8 w-8 text-white sm:h-10 sm:w-10" strokeWidth={2.5} />
      </div>

      <p
        className={`text-base font-semibold text-slate-700 transition-colors sm:text-lg ${textHoverColor}`}
      >
        Create New Site
      </p>
    </motion.div>
  );
};

const SiteCard: React.FC<SiteCardProps> = ({
  site,
  onSiteClick,
  onEditClick,
  onDeleteClick,
  onSyncButtonClick,
  onRunningUsecasesClick,
  heartbeatStatus,
  automationHeartbeatStatus,
  syncLoading,
  showDeleteButton = true,
}) => {
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const { env } = useEnv();
  const { user } = useAuth();
  const { execute: exportSystemLogs, loading: isExporting } = useExportSystemLogs();

  const isOnline = heartbeatStatus === "active";
  const isOffline = heartbeatStatus === "inactive";

  const isAutomationOnline = automationHeartbeatStatus === "active";
  const isAutomationOffline = automationHeartbeatStatus === "inactive";

  const getHeartbeatTimestamp = () => {
    if (env === "virtual") {
      return site.last_heartbeat;
    } else if (env === "real") {
      return site.real_last_heartbeat;
    }
    return null;
  };

  const heartbeatTimestamp = getHeartbeatTimestamp();

  const getTotalRunningUseCases = (): number => {
    if (!site.running_usecases) return 0;
    return site.running_usecases.reduce((total, camera) => {
      return total + (camera.usecases?.length || 0);
    }, 0);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDownloadSystemLogs = async (e: React.MouseEvent, format: "csv" | "excel" = "csv") => {
    e.stopPropagation();
    setIsExportDropdownOpen(false);

    if (!user?.id) {
      toast.error("User ID not available");
      return;
    }

    try {
      toast(`Downloading ${format.toUpperCase()} file...`);
      console.log(`Downloading ${format.toUpperCase()} file...`);

      const response = await exportSystemLogs(site.id, user.id, format, env);

      const extension = format === "excel" ? "xlsx" : "csv";
      const filename = `system-logs-${site.name}.${extension}`;

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} file downloaded successfully!`);
      console.log(`${format.toUpperCase()} file "${filename}" downloaded successfully!`);
    } catch (error) {
      toast.error("No logs available for this site");
      console.error("Download failed:", error);
    }
  };

  return (
    <motion.div
      key={site.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-300 hover:border-slate-300/80 hover:shadow-xl"
      onMouseEnter={() => setHoveredSiteId(site.id)}
      onMouseLeave={() => setHoveredSiteId(null)}
    >
      {/* Compact Header with Image and Info */}
      <div
        className="relative h-50 cursor-pointer overflow-hidden"
        onClick={() => onSiteClick(site)}
      >
        <img
          src={site.imageUrl || "/placeholder-site.jpg"}
          alt={site.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Status Badges - Top Left - Mobile: Block, Desktop: Inline */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1 sm:top-3 sm:left-3 sm:flex-row sm:flex-wrap">
          {/* Edge Status Badge */}
          <div className="flex flex-col gap-[2px]">
            <div
              className={`flex w-auto items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs ${
                isOnline
                  ? "border-emerald-400/50 bg-emerald-500/90 text-white"
                  : isOffline
                    ? "border-red-400/50 bg-red-500/90 text-white"
                    : "bg-[#d8d8d8] text-gray-900"
              }`}
            >
              {isOnline ? (
                <img
                  src={edgeon}
                  alt="Edge On"
                  className="mr-0.5 inline h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3"
                />
              ) : isOffline ? (
                <img
                  src={edgeoff}
                  alt="Edge Off"
                  className="mr-0.5 inline h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3"
                />
              ) : (
                <img
                  src={NoEdge}
                  alt="No Edge Data"
                  className="mr-0.5 inline h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3"
                />
              )}
              {isOnline ? "Edge" : isOffline ? "Edge" : "No Data"}
            </div>

            {isOffline && heartbeatTimestamp && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
                    <span>since {getTimeAgo(heartbeatTimestamp)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="inline-flex items-center text-xs text-white">
                    <Activity className="mr-1 h-3 w-3" />
                    {formatDateTimeISO(heartbeatTimestamp)}
                  </span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Automation Status Badge - Only show in real environment */}
          {env === "real" && (
            <div className="flex flex-col gap-[2px]">
              <div
                className={`flex w-auto items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs ${
                  isAutomationOnline
                    ? "border-emerald-400/50 bg-emerald-500/90 text-white"
                    : isAutomationOffline
                      ? "border-red-400/50 bg-red-500/90 text-white"
                      : "bg-[#d8d8d8] text-gray-900"
                }`}
              >
                {isAutomationOnline ? (
                  <img
                    src={automation}
                    alt="Automation On"
                    className="mr-0.5 inline h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3"
                  />
                ) : isAutomationOffline ? (
                  <img
                    src={automationoff}
                    alt="Automation Off"
                    className="mr-0.5 inline h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3"
                  />
                ) : (
                  <img
                    src={NoAutomation}
                    alt="No Edge Data"
                    className="mr-0.5 inline h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3"
                  />
                )}
                <span className="hidden sm:inline">
                  {isAutomationOnline
                    ? "Automation"
                    : isAutomationOffline
                      ? "Automation"
                      : "No Data"}
                </span>
                <span className="sm:hidden">Auto</span>
              </div>

              {isAutomationOffline && site.automation_last_heartbeat && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex w-full items-center justify-center rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
                      <span className="mx-auto block w-full text-center">
                        since {getTimeAgo(site.automation_last_heartbeat)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="inline-flex items-center text-xs text-white">
                      <Activity className="mr-1 h-3 w-3" />
                      {formatDateTimeISO(site.automation_last_heartbeat)}
                    </span>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        {/* Site Title and Stats - Bottom - Mobile Responsive */}
        <div className="absolute right-0 bottom-0 left-0 p-2 sm:p-4">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
            {/* Left side - Site name and location */}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-bold text-white drop-shadow-lg sm:text-lg">
                {site.name}
              </h2>
              <div className="mt-0.5 flex items-center text-xs text-white/90 sm:text-sm">
                <MapPin className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="truncate">
                  {site.city}, {site.country}
                </span>
              </div>
            </div>

            {/* Right side - Stats */}
            <div className="flex gap-2 sm:gap-3">
              <div className="flex items-center rounded px-1.5 py-0.5 text-white/90 sm:px-2 sm:py-1">
                <Users className="mr-0.5 h-4 text-gray-200 sm:mr-1 sm:h-5" />
                <span className="text-xs font-semibold sm:text-sm">{site.staffCount}</span>
              </div>
              <div className="flex items-center rounded px-1.5 py-0.5 text-white/90 sm:px-2 sm:py-1">
                <Car className="mr-0.5 h-4 text-gray-200 sm:mr-1 sm:h-5" />
                <span className="text-xs font-semibold sm:text-sm">{site.vehicles}</span>
              </div>
              <div className="flex items-center rounded px-1.5 py-0.5 text-white/90 sm:px-2 sm:py-1">
                <Camera className="mr-0.5 h-4 text-gray-200 sm:mr-1 sm:h-5" />
                <span className="text-xs font-semibold sm:text-sm">{site.no_of_cameras}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Top Right - Mobile Responsive */}
        <div
          className={`absolute top-2 right-2 flex gap-1 opacity-100 transition-all duration-200 sm:top-3 sm:right-3 sm:gap-1.5 sm:opacity-0 ${hoveredSiteId === site.id ? "sm:translate-y-0 sm:opacity-100" : "sm:-translate-y-1"} `}
        >
          {/* Running Use Cases Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRunningUsecasesClick?.(site);
                }}
                size="sm"
                className="relative h-7 w-7 rounded-full border-0 bg-white/90 p-0 text-slate-700 shadow-lg backdrop-blur-sm hover:bg-white hover:text-emerald-600 sm:h-8 sm:w-8"
              >
                <ActivityIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {getTotalRunningUseCases() > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-semibold text-white sm:h-4 sm:w-4 sm:text-[10px]">
                    {getTotalRunningUseCases()}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="text-xs">
                {getTotalRunningUseCases() > 0
                  ? `${getTotalRunningUseCases()} Running Use Cases`
                  : "No Running Use Cases"}
              </span>
            </TooltipContent>
          </Tooltip>

          {/* Export Dropdown */}
          <div className="group/export relative" ref={exportDropdownRef}>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsExportDropdownOpen(!isExportDropdownOpen);
              }}
              size="sm"
              className="h-7 w-7 rounded-full border-0 bg-white/90 p-0 text-slate-700 shadow-lg backdrop-blur-sm hover:bg-white hover:text-teal-600 sm:h-8 sm:w-8"
              disabled={isExporting}
              title="System Logs"
            >
              <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 z-50 mt-1 w-32 rounded-md border border-gray-200 bg-white shadow-md sm:w-36">
                <div className="py-1">
                  <button
                    onClick={(e) => handleDownloadSystemLogs(e, "csv")}
                    className="block w-full px-2 py-1.5 text-left text-[10px] text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
                    disabled={isExporting}
                  >
                    {isExporting ? "Downloading..." : "Export as CSV"}
                  </button>
                  <button
                    onClick={(e) => handleDownloadSystemLogs(e, "excel")}
                    className="block w-full px-2 py-1.5 text-left text-[10px] text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-xs"
                    disabled={isExporting}
                  >
                    {isExporting ? "Downloading..." : "Export as Excel"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={(e) => onEditClick(site, e)}
            size="sm"
            className="h-7 w-7 rounded-full border-0 bg-white/90 p-0 text-slate-700 shadow-lg backdrop-blur-sm hover:bg-white hover:text-blue-600 sm:h-8 sm:w-8"
          >
            <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
          {showDeleteButton && (
            <Button
              onClick={(e) => onDeleteClick(site, e)}
              size="sm"
              className="h-7 w-7 rounded-full border-0 bg-white/90 p-0 text-slate-700 shadow-lg backdrop-blur-sm hover:bg-white hover:text-red-600 sm:h-8 sm:w-8"
            >
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Compact Content - Mobile Responsive */}
      <div className="space-y-2 p-2 sm:space-y-3 sm:p-4" onClick={() => onSiteClick(site)}>
        {/* Edge Status & Sync */}
        <div className="space-y-2">
          {/* Edge Status Row - Only show in virtual environment and when online */}
          {env === "virtual" && isOnline && (
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center">
                {site.edge_status && (
                  <div className="group/status relative flex items-center">
                    <div
                      className={`mr-1.5 h-1.5 w-1.5 rounded-full sm:mr-2 sm:h-2 sm:w-2 ${getEdgeStatusIndicatorColor(site.edge_status, isOffline)}`}
                    ></div>
                    <span
                      className={`cursor-pointer truncate text-[10px] sm:text-xs ${isOffline ? "text-slate-400" : "text-slate-600"}`}
                    >
                      {getEdgeStatusText(site.edge_status)}
                    </span>

                    {site.last_edge_status_msg && (
                      <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-xs break-words whitespace-pre-line text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover/status:opacity-100">
                        {formatStatusMessage(site.last_edge_status_msg)}
                        <div className="absolute top-full left-4 h-0 w-0 border-t-4 border-r-4 border-l-4 border-transparent border-t-slate-900"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sync Button - Only show in real environment */}
          {env === "real" && (
            <div className="flex justify-end">
              <div className="flex-shrink-0">
                {!site.realEdgeDeviceId ? (
                  <div className="group/tooltip relative">
                    <button
                      className="flex cursor-not-allowed items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400 sm:gap-1 sm:px-2 sm:py-1 sm:text-xs"
                      disabled
                    >
                      <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      Sync
                    </button>
                    <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover/tooltip:opacity-100">
                      Cloud Edge not setup
                    </div>
                  </div>
                ) : !isOnline ? (
                  <button
                    className="flex cursor-not-allowed items-center gap-0.5 rounded-md bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-700 sm:gap-1 sm:px-2 sm:py-1 sm:text-xs"
                    disabled
                  >
                    <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    Sync
                  </button>
                ) : (
                  <button
                    onClick={(e) => onSyncButtonClick(site, e)}
                    className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] transition-all sm:gap-1 sm:px-2 sm:py-1 sm:text-xs ${
                      syncLoading === site.id
                        ? "cursor-wait bg-teal-100 text-teal-700"
                        : "bg-teal-500 text-white hover:bg-teal-600"
                    }`}
                    disabled={syncLoading === site.id}
                  >
                    <RefreshCw
                      className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${syncLoading === site.id ? "animate-spin" : ""}`}
                    />
                    {syncLoading === site.id ? "Syncing..." : "Sync"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SiteCard;
