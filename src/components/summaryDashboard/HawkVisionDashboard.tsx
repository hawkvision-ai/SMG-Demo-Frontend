import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGetCombinedEvents, useGetMonitoringData, useGetCameraHealth, useGetCustomerEventAnalytics } from "@/hooks/useApi";
import EventCards from "./components/EventCards";
import SiteMonitoring from "./components/SiteMonitoring";
import CameraMonitoring from "./components/CameraMonitoring";
import AverageFPSMonitoring from "./components/AverageFPS";
import EventsDistribution from "./components/EventsDistribution";
import { SiteMonitoringData } from "@/api/types";
import { useGetSitesByCustomer } from "@/hooks/useApi";
import { ChevronDown, GripVertical, RotateCcw } from "lucide-react";
import { getTimeAgo } from "@/lib/utils";
import { saveToBrowserStorage, loadFromBrowserStorage, clearFromBrowserStorage } from "@/utils/browserStorage";
import { useEnv } from "@/context/EnvContext";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

type TimePeriod = "1D" | "1W" | "1M" | "1Y";

interface SiteWithStatus {
  id: string;
  name: string;
  site_id: string;
  last_heartbeat?: string;
  real_last_heartbeat?: string;
  status: 'online' | 'offline';
  statusText: string;
}

interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxH?: number;
}

interface GridLayouts {
  lg: GridLayoutItem[];
  md: GridLayoutItem[];
  sm: GridLayoutItem[];
  xs: GridLayoutItem[];
  [key: string]: GridLayoutItem[];
}

const getDefaultLayouts = (): GridLayouts => ({
  lg: [
    { i: "event-cards", x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 3 },
    { i: "unified-controls", x: 0, y: 4, w: 12, h: 1, minW: 6, minH: 1, maxH: 1 },
    { i: "site-monitoring", x: 0, y: 5, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "fps-monitoring", x: 4, y: 5, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "camera-monitoring", x: 8, y: 5, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "events-distribution", x: 0, y: 11, w: 12, h: 4, minW: 6, minH: 3 },
  ],
  md: [
    { i: "event-cards", x: 0, y: 0, w: 10, h: 4, minW: 5, minH: 3 },
    { i: "unified-controls", x: 0, y: 4, w: 10, h: 1, minW: 5, minH: 1, maxH: 1 },
    { i: "site-monitoring", x: 0, y: 5, w: 5, h: 6, minW: 3, minH: 4 },
    { i: "fps-monitoring", x: 5, y: 5, w: 5, h: 6, minW: 3, minH: 4 },
    { i: "camera-monitoring", x: 0, y: 11, w: 10, h: 6, minW: 5, minH: 4 },
    { i: "events-distribution", x: 0, y: 17, w: 10, h: 4, minW: 5, minH: 3 },
  ],
  sm: [
    { i: "event-cards", x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
    { i: "unified-controls", x: 0, y: 4, w: 6, h: 1, minW: 4, minH: 1, maxH: 1 },
    { i: "site-monitoring", x: 0, y: 5, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "fps-monitoring", x: 0, y: 11, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "camera-monitoring", x: 0, y: 17, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "events-distribution", x: 0, y: 23, w: 6, h: 4, minW: 4, minH: 3 },
  ],
  xs: [
    { i: "event-cards", x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: "unified-controls", x: 0, y: 4, w: 4, h: 1, minW: 3, minH: 1, maxH: 1 },
    { i: "site-monitoring", x: 0, y: 5, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "fps-monitoring", x: 0, y: 11, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "camera-monitoring", x: 0, y: 17, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "events-distribution", x: 0, y: 23, w: 4, h: 4, minW: 3, minH: 3 },
  ],
});

const HawkVisionDashboard: React.FC = () => {
  const { user } = useAuth();
  const { env } = useEnv();

  // Unified state for all components
  const [selectedSite, setSelectedSite] = useState<string>(() =>
    user?.id ? loadFromBrowserStorage(user.id, 'siteDashboardState')?.selectedSite || "" : ""
  );
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(() =>
    user?.id ? loadFromBrowserStorage(user.id, 'siteDashboardState')?.timePeriod || "1W" : "1W"
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [realtimeMonitoringData, setRealtimeMonitoringData] = useState<Record<string, SiteMonitoringData> | null>(null);
  const [cameraHealthData, setCameraHealthData] = useState<any>(null);
  const [allSites, setAllSites] = useState<SiteWithStatus[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Drag and drop state
  const [layouts, setLayouts] = useState<GridLayouts>(() => {
    if (user?.id) {
      const savedLayouts = loadFromBrowserStorage(user.id, 'dashboardLayouts');
      return savedLayouts || getDefaultLayouts();
    }
    return getDefaultLayouts();
  });
  const [isDragging, setIsDragging] = useState(false);

  const { execute: fetchSites } = useGetSitesByCustomer(user?.customer_id, user?.id);

  const {
    data: eventAnalyticsData,
    loading: analyticsLoading,
    execute: fetchEventAnalytics,
  } = useGetCustomerEventAnalytics();

  const {
    data: eventsData,
    loading: eventsLoading,
    execute: fetchEvents
  } = useGetCombinedEvents();

  const { execute: fetchMonitoringData } = useGetMonitoringData();
  const { execute: fetchCameraHealth } = useGetCameraHealth();

  const timePeriods: { value: TimePeriod; label: string }[] = [
    { value: "1D", label: "1D" },
    { value: "1W", label: "1W" },
    { value: "1M", label: "1M" },
    { value: "1Y", label: "1Y" },
  ];

  // Drag and drop handlers
  const handleLayoutChange = (layout: Layout[], layouts: any) => {
    setLayouts(layouts);
    if (user?.id) {
      saveToBrowserStorage(layouts, user.id, 'dashboardLayouts');
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = () => {
    setIsDragging(false);
  };

  const resetLayout = () => {
    setLayouts(getDefaultLayouts());
    if (user?.id) {
      clearFromBrowserStorage('dashboardLayouts');
    }
  };

  // Drag handle component
  const DragHandle = () => (
    <div className="drag-handle absolute top-1 right-1 cursor-move p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors opacity-60 hover:opacity-100 z-[999]">
      <GripVertical className="h-4 w-4 text-gray-600" />
    </div>
  );

  // Check if site is offline based on heartbeat data
  const isSiteOffline = useCallback((site: SiteWithStatus): boolean => {
    const heartbeatField = env === "real" ? site.real_last_heartbeat : site.last_heartbeat;

    if (!heartbeatField || heartbeatField === null) return true;

    try {
      const timeAgoResult = getTimeAgo(heartbeatField);
      return !(timeAgoResult === "just now" || timeAgoResult === "1m" || timeAgoResult === "2m");
    } catch (error) {
      console.error("Error checking site status:", error);
      return true;
    }
  }, [env]);

  // Process sites data with status
  const processedSites = useMemo(() => {
    return allSites.map(site => {
      const isOffline = isSiteOffline(site);
      return {
        ...site,
        status: isOffline ? 'offline' : 'online' as 'online' | 'offline',
        statusText: isOffline ? 'Offline' : 'Online'
      };
    });
  }, [allSites, isSiteOffline]);

  // Get current selected site data
  const getCurrentSite = () => {
    return processedSites.find(site => site.name === selectedSite);
  };

  // Map monitoring data to selected site
  const getMappedMonitoringData = () => {
    if (!realtimeMonitoringData || !selectedSite) return null;

    const currentSite = getCurrentSite();
    if (!currentSite) return null;

    if (realtimeMonitoringData[selectedSite]) {
      return { [selectedSite]: realtimeMonitoringData[selectedSite] };
    }

    const monitoringBySiteId = Object.values(realtimeMonitoringData).find(
      data => data.site_id === currentSite.site_id
    );

    if (monitoringBySiteId) {
      return { [selectedSite]: monitoringBySiteId };
    }

    return null;
  };

  // Map camera data to selected site
  const getMappedCameraData = () => {
    if (!cameraHealthData || !selectedSite) return null;

    const currentSite = getCurrentSite();
    if (!currentSite) return null;

    if (cameraHealthData[selectedSite]) {
      return { [selectedSite]: cameraHealthData[selectedSite] };
    }

    const cameraBySiteId = Object.entries(cameraHealthData).find(
      ([key, data]) => data.site_id === currentSite.site_id
    );

    if (cameraBySiteId) {
      return { [selectedSite]: cameraBySiteId[1] };
    }

    return null;
  };

  const getMappedAnalyticsData = () => {
    if (!eventAnalyticsData || !eventAnalyticsData.sites || !Array.isArray(eventAnalyticsData.sites) || !selectedSite) {
      return null;
    }

    const currentSite = getCurrentSite();
    if (!currentSite) return null;

    // Find analytics data by site_name first
    let foundSite = eventAnalyticsData.sites.find(site => site.site_name === selectedSite);

    // If not found by name, try by site_id
    if (!foundSite) {
      foundSite = eventAnalyticsData.sites.find(site => site.site_id === currentSite.site_id);
    }

    if (foundSite) {
      return {
        [selectedSite]: {
          site_id: foundSite.site_id,
          site_name: foundSite.site_name,
          analytics: {
            "1d": foundSite["1d"],
            "1w": foundSite["1w"],
            "1m": foundSite["1m"],
            "1y": foundSite["1y"]
          }
        }
      };
    }

    return null;
  };

  useEffect(() => {
    if (user?.id) {
      const savedLayouts = loadFromBrowserStorage(user.id, 'dashboardLayouts');
      if (savedLayouts) {
        setLayouts(savedLayouts);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      saveToBrowserStorage({ selectedSite, timePeriod }, user.id, 'siteDashboardState');
    }
  }, [selectedSite, timePeriod, user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.unified-dropdown-container')) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Initial data loading
  useEffect(() => {
    if (user?.customer_id) {
      const initialLoad = async () => {
        try {
          setIsInitialLoading(true);

          // Core APIs that should load together
          const [sitesData] = await Promise.all([
            fetchSites(),
            fetchEvents(user.customer_id, user?.timezone, env),
            fetchMonitoringData(user.customer_id, user?.timezone, env).then(setRealtimeMonitoringData),
            fetchCameraHealth(user.customer_id, user?.timezone, env).then(setCameraHealthData)
          ]);

          setAllSites((sitesData || []).map(site => ({ ...site, site_id: site.id, status: 'offline' as const, statusText: 'Offline' })));

          // This line is crucial - make sure it's called
          setIsInitialLoading(false);

        } catch (error) {
          console.error('Core APIs failed:', error);
          // Make sure this is also called on error
          setIsInitialLoading(false);
        }

        // Analytics API - separate call
        try {
          await fetchEventAnalytics(user.customer_id, env);
        } catch (analyticsError) {
          console.error('Analytics API failed (non-blocking):', analyticsError);
        }
      };

      initialLoad();
    }
  }, [user?.customer_id, user?.timezone, env]);

  // UPDATED: Separate polling intervals
  useEffect(() => {
    if (!user?.customer_id) return;

    // Sites polling every 2 minutes (for heartbeat updates)
    const sitesPollingInterval = setInterval(async () => {
      try {
        const latestSites = await fetchSites();
        setAllSites(latestSites || []);
      } catch (error) {
        console.error("Sites polling failed:", error);
      }
    }, 110 * 1000); // 2 minutes

    // Other APIs polling every 10 minutes
    const dataPollingInterval = setInterval(async () => {
      try {
        const [latestMonitoringData, latestCameraData] = await Promise.all([
          fetchMonitoringData(user.customer_id, user?.timezone, env),
          fetchCameraHealth(user.customer_id, user?.timezone, env)
        ]);

        if (latestMonitoringData) {
          setRealtimeMonitoringData(latestMonitoringData);
        }

        if (latestCameraData) {
          setCameraHealthData(latestCameraData);
        }

        // Poll analytics data
        fetchEventAnalytics(user.customer_id, env);

      } catch (error) {
        console.error("Data polling failed:", error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Cleanup both intervals
    return () => {
      clearInterval(sitesPollingInterval);
      clearInterval(dataPollingInterval);
    };
  }, [user?.customer_id, user?.timezone, env]);

  // Set default site when sites load
  useEffect(() => {
    if (processedSites.length > 0 && !selectedSite) {
      setSelectedSite(processedSites[0].name);
    }
  }, [processedSites, selectedSite]);

  const filteredSites = processedSites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[78vh] p-6">
      <div className="mx-auto max-w-9xl">
        {/* Header with Reset Button */}
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800"> Home Dashboard</h1>
          <button
            onClick={resetLayout}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Layout
          </button>
        </div>

        {/* Responsive Grid Layout */}
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          isDraggable={true}
          isResizable={true}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          draggableHandle=".drag-handle"
          useCSSTransforms={true}
        >
          {/* Event Cards */}
          <div key="event-cards" className="group relative transition-opacity duration-200">
            <DragHandle />
            <div className={`h-full ${isDragging ? 'opacity-70' : 'opacity-100'}`}>
              <EventCards
                eventsData={eventsData || null}
                eventsLoading={eventsLoading}
                user={user}
              />
            </div>
          </div>

          {/* Unified Controls Header */}
          <div key="unified-controls" className="group relative transition-opacity duration-200" style={{ zIndex: 9999 }}>
            <DragHandle />
            <div className={`h-full ${isDragging ? 'opacity-70' : 'opacity-100'}`}>
              <div className="rounded-lg bg-white p-4 shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-bold text-gray-700">Site Overview</h2>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    {/* Site Selection Dropdown */}
                    <div className="relative unified-dropdown-container">
                      {isInitialLoading ? (
                        <div className="h-10 w-64 animate-pulse rounded-md bg-gray-200" />
                      ) : (
                        <button
                          onClick={() => {
                            if (processedSites.length === 0) return;
                            setDropdownOpen(!dropdownOpen);
                          }}
                          disabled={processedSites.length === 0}
                          className={`flex min-w-0 items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors sm:min-w-64 ${processedSites.length === 0
                            ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                            }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-gray-900">
                              {processedSites.length === 0
                                ? "No Sites Available"
                                : selectedSite
                              }
                            </span>
                            {processedSites.length > 0 && getCurrentSite() && (
                              <>
                                {(() => {
                                  const currentSite = getCurrentSite();
                                  const heartbeat = env === "real" ? currentSite?.real_last_heartbeat : currentSite?.last_heartbeat;
                                  if (!heartbeat) {
                                    return <span className="flex-shrink-0 text-xs font-medium text-gray-500">No data</span>;
                                  }
                                  return (
                                    <>
                                      <span className={`flex-shrink-0 text-xs font-medium ${currentSite?.status === 'offline' ? "text-red-600" : "text-emerald-600"}`}>
                                        ({currentSite?.statusText})
                                      </span>
                                      {currentSite?.status === 'offline' && (
                                        <span className="hidden text-xs text-gray-500 sm:inline">
                                          - since {getTimeAgo(heartbeat)}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                          <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${processedSites.length === 0
                            ? 'text-gray-400'
                            : dropdownOpen ? 'rotate-180' : ''
                            }`} />
                        </button>
                      )}

                      {dropdownOpen && !isInitialLoading && processedSites.length > 0 && (
                        <div className="absolute top-full left-0 z-10 mt-1 w-full min-w-80 rounded-md border border-gray-200 bg-white shadow-lg max-h-60 overflow-hidden">
                          <input
                            type="text"
                            placeholder="Search sites..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 text-sm border-b border-gray-200 focus:outline-none"
                          />
                          <div className="max-h-48 overflow-y-auto">
                            {filteredSites.map((site) => (
                              <button
                                key={site.id}
                                onClick={() => {
                                  setSelectedSite(site.name);
                                  setDropdownOpen(false);
                                }}
                                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${selectedSite === site.name ? 'bg-gray-100' : ''
                                  }`}
                              >
                                <span className="truncate font-medium">
                                  {site.name}
                                </span>
                                {(() => {
                                  const heartbeat = env === "real" ? site.real_last_heartbeat : site.last_heartbeat;

                                  if (!heartbeat) {
                                    return <span className="flex-shrink-0 text-xs font-medium text-gray-500">No data</span>;
                                  }

                                  return (
                                    <>
                                      <span className={`flex-shrink-0 text-xs font-medium ${site.status === 'offline' ? "text-red-600" : "text-emerald-600"}`}>
                                        ({site.statusText})
                                      </span>
                                      {site.status === 'offline' && (
                                        <span className="hidden text-xs text-gray-500 sm:inline">
                                          - since {getTimeAgo(heartbeat)}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Time Period Selector */}
                    <div className="flex items-center gap-1 text-xs">
                      {timePeriods.map((period, index) => (
                        <React.Fragment key={period.value}>
                          <button
                            onClick={() => setTimePeriod(period.value)}
                            className={`px-3 py-1 font-medium transition-colors rounded-md ${timePeriod === period.value
                              ? "bg-gray-200 text-teal-600 shadow-sm"
                              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                              }`}
                          >
                            {period.label}
                          </button>
                          {index < timePeriods.length - 1 && (
                            <span className="mx-1 text-gray-400">|</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Site Monitoring */}
          <div key="site-monitoring" className="group relative transition-opacity duration-200">
            <DragHandle />
            <div className={`h-full ${isDragging ? 'opacity-70' : 'opacity-100'}`}>
              <SiteMonitoring
                realtimeMonitoringData={getMappedMonitoringData()}
                selectedSite={selectedSite}
                setSelectedSite={setSelectedSite}
                monitoringTimePeriod={timePeriod}
                setMonitoringTimePeriod={setTimePeriod}
                isInitialLoading={isInitialLoading}
                user={user}
              />
            </div>
          </div>

          {/* Average FPS Monitoring */}
          <div key="fps-monitoring" className="group relative transition-opacity duration-200">
            <DragHandle />
            <div className={`h-full ${isDragging ? 'opacity-70' : 'opacity-100'}`}>
              <AverageFPSMonitoring
                realtimeMonitoringData={getMappedMonitoringData()}
                selectedSite={selectedSite}
                monitoringTimePeriod={timePeriod}
                isInitialLoading={isInitialLoading}
                user={user}
              />
            </div>
          </div>

          {/* Camera Monitoring */}
          <div key="camera-monitoring" className="group relative transition-opacity duration-200">
            <DragHandle />
            <div className={`h-full ${isDragging ? 'opacity-70' : 'opacity-100'}`}>
              <CameraMonitoring
                cameraHealthData={getMappedCameraData()}
                selectedSite={selectedSite}
                setSelectedSite={setSelectedSite}
                timePeriod={timePeriod}
                setTimePeriod={setTimePeriod}
                isInitialLoading={isInitialLoading}
                user={user}
                className="h-full"
              />
            </div>
          </div>

          {/* Events Distribution */}
          <div key="events-distribution" className="group relative transition-opacity duration-200">
            <DragHandle />
            <div className={`h-full ${isDragging ? 'opacity-70' : 'opacity-100'}`}>
              <EventsDistribution
                eventAnalyticsData={getMappedAnalyticsData()}
                analyticsLoading={analyticsLoading}
                selectedSite={selectedSite}
                timePeriod={timePeriod}
              />
            </div>
          </div>
        </ResponsiveGridLayout>
      </div>
    </div>
  );
};

export default HawkVisionDashboard;
