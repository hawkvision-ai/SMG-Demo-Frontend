
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import EventTable from './Components/EventTable';
import ColumnManager from './Components/ColumnManager';
import { EventDetailsModal } from './Components/EventDetailModal';
import { useGetFilteredTableEvents, useSaveUserPreferences, useGetUserPreferences } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { useEnv } from '@/context/EnvContext';
import type { EventFilters, ColumnConfig, DateFilterEnum } from '@/api/types';
import { ChevronLeft, ChevronRight, Download, Edit, FilterX, RotateCcw, LayoutGrid, List } from 'lucide-react';
import { loadFiltersFromStorage, saveFiltersToStorage, clearFiltersFromStorage, saveHasLoadedToStorage, loadHasLoadedFromStorage, saveEventDataToStorage, loadEventDataFromStorage, clearEventDataFromStorage, saveLastEventIdToStorage, loadLastEventIdFromStorage, clearLastEventIdFromStorage, clearAllTimezoneData, saveViewModeToStorage, loadViewModeFromStorage } from '@/utils/browserStorage';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import EventTilesView from './Components/EventsTilesView';


const defaultColumns: ColumnConfig[] = [
  { key: 'Sno', label: 'S.No', width: 20, resizable: true, visible: true },
  { key: 'site_name', label: 'Site Name', width: 100, resizable: true, visible: true },
  { key: 'camera_name', label: 'Camera', width: 100, resizable: true, visible: true },
  { key: 'uc_type', label: 'Use Case', width: 100, resizable: true, visible: true },
  { key: 'time_created', label: 'Time Created', width: 150, resizable: true, visible: true },
  { key: 'severity', label: 'Severity', width: 50, resizable: true, visible: true },
  { key: 'status', label: 'Status', width: 80, resizable: true, visible: true },
  { key: 'action_status', label: 'Action Status', width: 100, resizable: true, visible: true },
  { key: 'location_tags', label: 'Location Tags', width: 100, resizable: true, visible: true },
  { key: 'functional_tag', label: 'Functional Tags', width: 100, resizable: true, visible: true },
  { key: 'comments', label: 'Comments', width: 100, resizable: true, visible: true },
  { key: 'action_taken', label: 'Action Taken', width: 100, resizable: true, visible: true },
  { key: 'details', label: 'Details', width: 100, resizable: true, visible: true },
  { key: 'mail_receivers', label: 'Email Receivers', width: 100, resizable: true, visible: true },
  { key: 'extra_info', label: 'PPM', width: 100, resizable: true, visible: false },

];

const EventTablePage: React.FC = () => {
  const { user } = useAuth();
  const { env } = useEnv();

const [filters, setFilters] = useState<EventFilters>({
  
  sites: [],
  useCases: [],
  cameras: [],
  locationTags: [],
  functionalTags: [],
  actions: [],
  statuses: [],
  severities: [],
  comments: [],
  actionsTaken: [],
  mailReceivers: [],
  details: [],
  extraInfo: [],
  dateFilter: null,
  dateRange: null
});

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [autoApply, setAutoApply] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [editButtonPosition, setEditButtonPosition] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'table' | 'tiles'>(() => {
    return user?.id ? (loadViewModeFromStorage(user.id) || 'table') : 'table';
  });

  // Modal state
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sort order state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [columnSort, setColumnSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [allEventsData, setAllEventsData] = useState<any[]>([]);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReturningToScreen, setIsReturningToScreen] = useState(false);

  //states for export feature
  const [showExportMenu, setShowExportMenu] = useState(false);


  // API hooks
  const {
    data: tableData,
    loading: tableLoading,
    error: tableError,
    execute: fetchTableData,
  } = useGetFilteredTableEvents();

  const { execute: saveUserPreferences } = useSaveUserPreferences();
  const { execute: getUserPreferences } = useGetUserPreferences();
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [hasCustomColumns, setHasCustomColumns] = useState(false);
  const [hasSavedPreferences, setHasSavedPreferences] = useState(false);



  // Get visible columns only
  const visibleColumns = columns.filter(col => col.visible);
  const hasHiddenColumns = columns.some(col => !col.visible);



  // Load filters when environment changes
useEffect(() => {
  if (user?.id && env && preferencesLoaded) {
    const savedFilters = loadFiltersFromStorage(user.id, env);
    if (savedFilters) {
      setFilters(savedFilters);
    } else {
      setFilters({
        sites: [],
        useCases: [],
        cameras: [],
        locationTags: [],
        functionalTags: [],
        actions: [],
        statuses: [],
        severities: [],
        comments: [],
        actionsTaken: [],
        mailReceivers: [],
        details: [],
        extraInfo: [],
        dateFilter: null,
        dateRange: null
      });
    }
  }
}, [env, user?.id, preferencesLoaded]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu && !(event.target as Element).closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  useEffect(() => {
    if (user?.id) saveViewModeToStorage(viewMode, user.id);
  }, [viewMode, user?.id]);


  useEffect(() => {
  if (!user?.customer_id || !user?.id || !env) return;

  const storedPreviousEnv = localStorage.getItem("lastEnvironment");

  if (storedPreviousEnv && storedPreviousEnv !== env) {
    // console.log(`🔄 Environment changed from ${storedPreviousEnv} to ${env}`);

    const currentTimezone = user?.timezone || "UTC";

    // ✅ Check if new env already has cached data
    const cachedEventData = loadEventDataFromStorage(user.id, env, currentTimezone);
    const cachedLastEventId = loadLastEventIdFromStorage(user.id, env, currentTimezone);

    if (cachedEventData && cachedEventData.length > 0) {
      // Found cached data - fetch new events first, then merge and display
      // console.log(`✅ Found cached data for ${env} - fetching new events first`);
      setIsReturningToScreen(true);

      const fetchAndMerge = async () => {
        try {
          const result = await fetchTableData({
            customer_id: user.customer_id,
            page_no: 1,
            page_size: null,
            sort_order: sortOrder,
            site_ids: null,
            camera_ids: null,
            uc_types: null,
            severities: null,
            statuses: null,
            action_statuses: null,
            location_tags: null,
            date_filter: null,
            from_date: null,
            to_date: null,
            timezone: currentTimezone,
            last_event_id: cachedLastEventId || "", // Fetch only newer events
            env: env,
          });

          // Merge new events with cached data
          let finalData = [...cachedEventData];
          let finalLastEventId = cachedLastEventId;

          if (result?.events && result.events.length > 0) {
            const existingIds = new Set(cachedEventData.map(e => e.event_id));
            const newEvents = result.events.filter(e => !existingIds.has(e.event_id));

            if (newEvents.length > 0) {
              console.log(`📥 Found ${newEvents.length} new events for ${env}`);
              finalData = [...newEvents, ...cachedEventData];
              finalLastEventId = newEvents[0].event_id;
            } else {
              console.log(`✅ No new events for ${env} - using cached data`);
            }
          } else {
            console.log(`✅ No new events for ${env} - using cached data`);
          }

          // Now display the merged data
          setAllEventsData(finalData);
          setLastEventId(finalLastEventId);
          setIsInitialLoad(false);
          setIsReturningToScreen(false);

          // Update cache with merged data
          saveEventDataToStorage(finalData, user.id, env, currentTimezone);
          if (finalLastEventId) {
            saveLastEventIdToStorage(finalLastEventId, user.id, env, currentTimezone);
          }
          saveHasLoadedToStorage(user.id, env, currentTimezone);

        } catch (error) {
          // console.error("❌ Error fetching new events:", error);
          // On error, still show cached data
          setAllEventsData(cachedEventData);
          setLastEventId(cachedLastEventId);
          setIsInitialLoad(false);
          setIsReturningToScreen(false);
        }
      };

      fetchAndMerge();

    } else {
      // No cached data - fetch all data for new environment
      // console.log(`📥 No cached data for ${env} - fetching all data`);
      setIsInitialLoad(true);
      
      const fetchAllData = async () => {
        try {
          const result = await fetchTableData({
            customer_id: user.customer_id,
            page_no: 1,
            page_size: null,
            sort_order: sortOrder,
            site_ids: null,
            camera_ids: null,
            uc_types: null,
            severities: null,
            statuses: null,
            action_statuses: null,
            location_tags: null,
            date_filter: null,
            from_date: null,
            to_date: null,
            timezone: currentTimezone,
            last_event_id: "",
            env: env,
          });

          if (result?.events) {
            setAllEventsData(result.events);
            setLastEventId(result.events.length > 0 ? result.events[0].event_id : null);

            saveEventDataToStorage(result.events, user.id, env, currentTimezone);
            if (result.events.length > 0) {
              saveLastEventIdToStorage(result.events[0].event_id, user.id, env, currentTimezone);
            }
            saveHasLoadedToStorage(user.id, env, currentTimezone);
          }
          setIsInitialLoad(false);
        } catch (error) {
          // console.error("❌ Error fetching data:", error);
          setIsInitialLoad(false);
        }
      };

      fetchAllData();
    }
  }

  localStorage.setItem("lastEnvironment", env);
}, [env, user?.customer_id, user?.id, user?.timezone, sortOrder]);

  useEffect(() => {
    if (!user?.customer_id || !user?.id || preferencesLoaded || !env) return;

    const currentTimezone = user?.timezone || 'UTC';

    const storedPreviousTimezone = localStorage.getItem('lastTimezone');
    if (storedPreviousTimezone && storedPreviousTimezone !== currentTimezone) {
      console.log(`Timezone changed from ${storedPreviousTimezone} to ${currentTimezone} - clearing all data`);

      // Clear all timezone-specific data
      clearAllTimezoneData();

      // Reset states
      setAllEventsData([]);
      setLastEventId(null);
      setIsInitialLoad(true);
      setPagination(prev => ({ ...prev, page: 1 }));
    }

    // Always update the stored timezone
    localStorage.setItem('lastTimezone', currentTimezone);

    const initializeComponent = async () => {
      await loadUserPreferences();

      const hasLoadedBefore = loadHasLoadedFromStorage(user.id, env, currentTimezone);
      const cachedEventData = loadEventDataFromStorage(user.id, env, currentTimezone);
      const cachedLastEventId = loadLastEventIdFromStorage(user.id, env, currentTimezone);

      if (hasLoadedBefore && cachedEventData && cachedEventData.length > 0) {
        setAllEventsData(cachedEventData);
        setLastEventId(cachedLastEventId);
        setIsInitialLoad(false);
        setIsReturningToScreen(true);
        try {
          const result = await fetchTableData({
            customer_id: user?.customer_id,
            page_no: 1,
            page_size: null,
            sort_order: sortOrder,
            site_ids: null,
            camera_ids: null,
            uc_types: null,
            severities: null,
            statuses: null,
            action_statuses: null,
            location_tags: null,
            date_filter: null,
            from_date: null,
            to_date: null,
            timezone: currentTimezone,
            last_event_id: cachedLastEventId || "",
            env: env
          });

          if (result?.events && result.events.length > 0) {
            const existingIds = new Set(cachedEventData.map(e => e.event_id));
            const newEvents = result.events.filter(e => !existingIds.has(e.event_id));

            if (newEvents.length > 0) {
              const updatedEventData = [...newEvents, ...cachedEventData];
              setAllEventsData(updatedEventData);
              setLastEventId(newEvents[0].event_id);

              if (user?.id && env) {
                saveEventDataToStorage(updatedEventData, user.id, env, currentTimezone);
                saveLastEventIdToStorage(newEvents[0].event_id, user.id, env, currentTimezone);
              }
            }
          }
        } catch (error) {
          console.error('Initialization refresh failed:', error);
        }

        setIsReturningToScreen(false);
      } else {
        // First load or timezone change - fetch all data
        console.log(`Loading data for ${env} environment with timezone ${currentTimezone}`);
        try {
          const result = await fetchTableData({
            customer_id: user?.customer_id,
            page_no: 1,
            page_size: null,
            sort_order: sortOrder,
            site_ids: null,
            camera_ids: null,
            uc_types: null,
            severities: null,
            statuses: null,
            action_statuses: null,
            location_tags: null,
            date_filter: null,
            from_date: null,
            to_date: null,
            timezone: currentTimezone,
            last_event_id: "",
            env: env
          });

          if (result?.events) {
            setAllEventsData(result.events);
            const newLastEventId = result.events.length > 0 ? result.events[0].event_id : null;
            setLastEventId(newLastEventId);

            // Save to localStorage with timezone
            if (user?.id && env) {
              saveEventDataToStorage(result.events, user.id, env, currentTimezone);
              if (newLastEventId) {
                saveLastEventIdToStorage(newLastEventId, user.id, env, currentTimezone);
              }
              saveHasLoadedToStorage(user.id, env, currentTimezone);
            }
          }

          setIsInitialLoad(false);
        } catch (error) {
          console.error('Initial load failed:', error);
          setIsInitialLoad(false);
        }
      }
    };

    initializeComponent();
  }, [user?.customer_id, user?.id, preferencesLoaded, sortOrder, env, user?.timezone]);

const loadUserPreferences = async () => {
  if (!user?.id || !user?.customer_id) return;

  try {
    const preferences = await getUserPreferences(user.id, user.customer_id);

    if (preferences?.event_table_columns) {
      const { column_order, column_visibility, rows_per_page } = preferences.event_table_columns;

      // Apply column order and visibility
      if (column_order && column_visibility) {
        const reorderedColumns = column_order.map(key => {
          const column = defaultColumns.find(col => col.key === key);
          if (column) {
            return {
              ...column,
              visible: column_visibility[key] ?? true
            };
          }
          return null;
        }).filter(Boolean);

        // Add any missing columns
        const existingKeys = new Set(column_order);
        const missingColumns = defaultColumns.filter(col => !existingKeys.has(col.key));

        const finalColumns = [...reorderedColumns, ...missingColumns];
        setColumns(finalColumns);

        // Check if loaded preferences differ from default
        const isCustomized = finalColumns.some((col, index) => {
          const defaultCol = defaultColumns.find(dc => dc.key === col.key);
          return defaultCol && col.visible !== defaultCol.visible;
        });
        setHasCustomColumns(isCustomized);
      }

      // Apply page size
      if (rows_per_page) {
        setPagination(prev => ({ ...prev, pageSize: rows_per_page }));
      }
    } else {
      // No preferences found in backend, use defaults
      setHasCustomColumns(false);
    }

    setPreferencesLoaded(true);
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    setPreferencesLoaded(true);
    setHasCustomColumns(false);
  }
};

  const isColumnsCustomized = (cols: ColumnConfig[]) => {
    return cols.some((col, index) => col.visible !== defaultColumns[index].visible);
  };


  const savePreferences = async (overrideColumns?: ColumnConfig[], overridePageSize?: number) => {
    if (!user?.id || !user?.customer_id || !preferencesLoaded) return;

    try {
      const columnsToUse = overrideColumns || columns;
      const pageSizeToUse = overridePageSize || pagination.pageSize;

      const visibilityMap = columnsToUse.reduce((acc, col) => {
        acc[col.key] = col.visible;
        return acc;
      }, {} as Record<string, boolean>);

      const preferenceData = {
        customer_id: user.customer_id,
        user_id: user.id,
        event_table_columns: {
          column_order: columnsToUse.map(col => col.key),
          column_visibility: visibilityMap,
          rows_per_page: pageSizeToUse
        }
      };

      await saveUserPreferences(preferenceData);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

 useEffect(() => {
  if (user?.id && preferencesLoaded && env) {
    saveFiltersToStorage(filters, user.id, env);
  }
}, [filters, user?.id, preferencesLoaded, env]);

  // 4. Add reset and refresh functions
const handleResetFilters = useCallback(() => {
  const defaultFilters: EventFilters = {
    sites: [],
    useCases: [],
    cameras: [],
    locationTags: [],
    functionalTags: [],
    actions: [],
    statuses: [],
    severities: [],
    comments: [],
    actionsTaken: [],
    mailReceivers: [],
    details: [],
    extraInfo: [],
    dateFilter: null,
    dateRange: null
  };

  setFilters(defaultFilters);
  if (env) clearFiltersFromStorage(env);
  setPagination(prev => ({ ...prev, page: 1 }));
}, [env]);


  const handleRefreshData = useCallback(async () => {
    const currentTimezone = user?.timezone || 'UTC';

    // Get lastEventId with timezone
    const stateLastEventId = lastEventId;
    const storageLastEventId = loadLastEventIdFromStorage(user?.id || '', env || '', currentTimezone);
    const currentLastEventId = stateLastEventId || storageLastEventId;

    setIsRefreshing(true);
    try {
      const result = await fetchTableData({
        customer_id: user?.customer_id,
        page_no: 1,
        page_size: null,
        sort_order: sortOrder,
        site_ids: null,
        camera_ids: null,
        uc_types: null,
        severities: null,
        statuses: null,
        action_statuses: null,
        location_tags: null,
        date_filter: null,
        from_date: null,
        to_date: null,
        timezone: currentTimezone,
        last_event_id: currentLastEventId || "",
        env: env
      });

      if (result?.events && result.events.length > 0) {
        if (!currentLastEventId) {
          // First load - replace all data
          setAllEventsData(result.events);
          const newLastEventId = result.events[0].event_id;
          setLastEventId(newLastEventId);

          if (user?.id && env) {
            saveEventDataToStorage(result.events, user.id, env, currentTimezone);
            saveLastEventIdToStorage(newLastEventId, user.id, env, currentTimezone);
          }
        } else {
          // Incremental refresh - merge new events with existing ones
          setAllEventsData(prevData => {
            const existingIds = new Set(prevData.map(e => e.event_id));
            const newEvents = result.events.filter(e => !existingIds.has(e.event_id));

            if (newEvents.length > 0) {
              const updatedEventData = [...newEvents, ...prevData];
              const newLastEventId = newEvents[0].event_id;

              // Update lastEventId state
              setLastEventId(newLastEventId);

              // Save to storage
              if (user?.id && env) {
                saveEventDataToStorage(updatedEventData, user.id, env, currentTimezone);
                saveLastEventIdToStorage(newLastEventId, user.id, env, currentTimezone);
              }

              return updatedEventData;
            }

            return prevData; // No new events, return existing data
          });
        }
      } else {
        // No new events returned - keep existing data
        console.log(`${env} Environment - No new events found`);
      }
    } catch (error) {
      console.error(`${env} Environment - Refresh failed:`, error);
    }
    setIsRefreshing(false);
  }, [user, sortOrder, fetchTableData, lastEventId, env]);


  // Function to extract unique header values from events data
  const extractHeadersFromEvents = useCallback((events: any[]) => {
    if (!events || events.length === 0) {
      return {
        sites: [],
        cameras: [],
        useCases: [],
        severities: [],
        statuses: [],
        actions: [],
        locationTags: [],
        functionalTags: [],
        comments: [],
        actionsTaken: [],
        mailReceivers: [],
        details: [],
        extraInfo: []
      };
    }

  const sites = [...new Set(events.map(e => e.site_name || 'N/A'))].sort();


   const cameras = [...new Set(events.map(e => e.camera_name || 'N/A'))].sort();


    // Extract unique values for other fields - include N/A for empty values
    const useCases = [...new Set(events.map(e => e.uc_type || 'N/A').filter(Boolean))];
    const severities = [...new Set(events.map(e => e.severity || 'N/A').filter(Boolean))];
    const statuses = [...new Set(events.map(e => e.status || 'N/A').filter(Boolean))];
    const actions = [...new Set(events.map(e => e.action_status || 'N/A').filter(Boolean))];

    // Extract unique location tags (flatten arrays) - include N/A for empty arrays

    const allLocationTags = events
      .flatMap(e => {
        if (!e.location_tags || e.location_tags.length === 0) {
          return ['N/A'];
        }
        return e.location_tags;
      })
      .filter(Boolean);
    const locationTags = [...new Set(allLocationTags)];

    /// Extract unique functional tags (flatten arrays) - include N/A for empty arrays
    const allFunctionalTags = events
      .map(e => e.functional_tag && e.functional_tag.trim() !== '' ? e.functional_tag : 'N/A')
      .filter(Boolean);
    const functionalTags = [...new Set(allFunctionalTags)];

    /////
    const allComments = events
      .flatMap(e => {
        if (e.comments && e.comments.length > 0) {
          return e.comments.map(comment =>
            (comment.text && comment.text.trim() !== '')
              ? comment.text
              : 'No Comment'
          );
        }
        return ['N/A'];
      })
      .filter(Boolean);
    const comments = [...new Set(allComments)];

    const allActionsTaken = events
      .flatMap(e => {
        if (e.actions && e.actions.length > 0) {
          return e.actions.map(action =>
            (action.action_taken && action.action_taken.trim() !== '')
              ? `${action.action_taken} - ${action.created_by}`
              : 'No Action Taken'
          );
        }
        return ['N/A'];
      })
      .filter(Boolean);

    const actionsTaken = [...new Set(allActionsTaken)];


    const allMailReceivers = events
      .flatMap(e => {
        if (e.mail_receivers && e.mail_receivers.length > 0) {
          return e.mail_receivers;
        }
        return ['N/A'];
      })
      .filter(Boolean);
    const mailReceivers = [...new Set(allMailReceivers)];

    const allDetails = events
      .flatMap(e => {
        if (e.details && Array.isArray(e.details) && e.details.length > 0) {
          return e.details.map(detail => {
            if (typeof detail === 'string') {
              return detail; // "NO-Hardhat"
            } else if (typeof detail === 'object' && detail !== null) {
              return Object.entries(detail)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', '); // "speed: 41, speed_limit: 5"
            }
            return String(detail);
          });
        }
        return ['N/A'];
      })
      .filter(Boolean);
    const details = [...new Set(allDetails)];

    const allExtraInfo = events.flatMap(e => {
      if (e.extra_info && typeof e.extra_info === 'object') {
        return Object.entries(e.extra_info).map(([key, value]) => `${key}: ${value}`);
      }
      return ['N/A'];
    }).filter(Boolean);
    const extraInfo = [...new Set(allExtraInfo)];

    return {
      sites: sites,
      cameras: cameras,
      useCases: useCases.sort(),
      severities: severities.sort(),
      statuses: statuses.sort(),
      actions: actions.sort(),
      locationTags: locationTags.sort(),
      comments: comments.sort(),
      actionsTaken: actionsTaken.sort(),
      mailReceivers: mailReceivers.sort(),
      details: details.sort(),
      functionalTags: functionalTags.sort(),
      extraInfo: extraInfo.sort()
    };
  }, []);

  const handleColumnSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setColumnSort({ column, direction });
  }, []);

  // Client-side filtering function - UPDATED FOR EXCLUSION LOGIC
  const filterEvents = useCallback((events: any[], filters: EventFilters, sortOrder: 'asc' | 'desc', columnSort?: { column: string; direction: 'asc' | 'desc' } | null) => {
    let filtered = [...events];

  if (filters.sites.length > 0) {
  filtered = filtered.filter(event => {
    const siteName = event.site_name || 'N/A';
    return !filters.sites.includes(siteName); 
  });
}


if (filters.cameras.length > 0) {
  filtered = filtered.filter(event => {
    const cameraName = event.camera_name || 'N/A';
    return !filters.cameras.includes(cameraName); 
  });
}

    if (filters.useCases.length > 0) {
      filtered = filtered.filter(event => {
        const useCase = event.uc_type && event.uc_type.trim() !== '' ? event.uc_type : 'N/A';
        return !filters.useCases.includes(useCase); // EXCLUDE if in the list
      });
    }

    if (filters.severities.length > 0) {
      filtered = filtered.filter(event => {
        const severity = event.severity && event.severity.trim() !== '' ? event.severity : 'N/A';
        return !filters.severities.includes(severity); // EXCLUDE if in the list
      });
    }

    if (filters.statuses.length > 0) {
      filtered = filtered.filter(event => {
        const status = event.status && event.status.trim() !== '' ? event.status : 'N/A';
        return !filters.statuses.includes(status); // EXCLUDE if in the list
      });
    }

    if (filters.actions.length > 0) {
      filtered = filtered.filter(event => {
        const actionStatus = event.action_status && event.action_status.trim() !== '' ? event.action_status : 'N/A';
        return !filters.actions.includes(actionStatus); // EXCLUDE if in the list
      });
    }

    if (filters.locationTags.length > 0) {
      filtered = filtered.filter(event => {
        const eventTags = event.location_tags && event.location_tags.length > 0
          ? event.location_tags
          : ['N/A'];
        return eventTags.some(tag => !filters.locationTags.includes(tag));
      });
    }

    if (filters.functionalTags.length > 0) {
      filtered = filtered.filter(event => {
        const functionalTag = event.functional_tag && event.functional_tag.trim() !== '' ? event.functional_tag : 'N/A';
        return !filters.functionalTags.includes(functionalTag); // EXCLUDE if in the list
      });
    }

    if (filters.comments.length > 0) {
      filtered = filtered.filter(event => {
        const eventComments = event.comments && event.comments.length > 0
          ? event.comments.map(c =>
            (c.text && c.text.trim() !== '')
              ? c.text
              : 'No Comment'
          )
          : ['N/A'];
        return eventComments.some(comment => !filters.comments.includes(comment));
      });
    }

    if (filters.actionsTaken.length > 0) {
      filtered = filtered.filter(event => {
        const eventActions = event.actions && event.actions.length > 0
          ? event.actions.map(a => (a.action_taken && a.action_taken.trim() !== '') ? `${a.action_taken} - ${a.created_by}` : 'N/A')
          : ['N/A'];
        return !filters.actionsTaken.some(action => eventActions.includes(action));
      });
    }

    if (filters.mailReceivers.length > 0) {
      filtered = filtered.filter(event => {
        const eventMailReceivers = event.mail_receivers && event.mail_receivers.length > 0
          ? event.mail_receivers
          : ['N/A'];
        return eventMailReceivers.some(receiver => !filters.mailReceivers.includes(receiver));
      });
    }

    if (filters.details.length > 0) {
      filtered = filtered.filter(event => {
        const eventDetails = event.details && Array.isArray(event.details) && event.details.length > 0
          ? event.details.map(detail => {
            if (typeof detail === 'string') {
              return detail;
            } else if (typeof detail === 'object' && detail !== null) {
              return Object.entries(detail)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            }
            return String(detail);
          })
          : ['N/A'];

        return eventDetails.some(detail => !filters.details.includes(detail));
      });
    }

    if (filters.extraInfo.length > 0) {
      filtered = filtered.filter(event => {
        const eventExtraInfo = event.extra_info && typeof event.extra_info === 'object'
          ? Object.entries(event.extra_info)
            .map(([key, value]) => `${key}: ${value}`)
          : ['N/A'];

        return eventExtraInfo.some(extraInfoValue => !filters.extraInfo.includes(extraInfoValue));
      });
    }

    // Apply date filtering with timezone support
    if (filters.dateFilter || filters.dateRange) {
      const userTimezone = user?.timezone || 'UTC';

      filtered = filtered.filter(event => {
        if (!event.time_created) return false;

        // Parse event date - handle format "2025-06-17 17:38:10 Asia/Kolkata"
        let eventDate;
        try {
          let timeString = event.time_created;

          // Remove timezone suffix if present (e.g., " Asia/Kolkata")
          if (timeString.includes(' ') && timeString.split(' ').length > 2) {
            const parts = timeString.split(' ');
            timeString = `${parts[0]} ${parts[1]}`; // Keep only date and time
          }

          // Convert to ISO format and create date
          eventDate = new Date(timeString.replace(' ', 'T'));

          // Check if date is valid
          if (isNaN(eventDate.getTime())) {
            return false;
          }
        } catch (error) {
          return false;
        }

        // Convert event date to user timezone for comparison
        const eventInUserTz = new Date(eventDate.toLocaleString("en-US", { timeZone: userTimezone }));

        // Get current date in user's timezone
        const now = new Date();
  if (filters.dateFilter === 'today') {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          return eventDate >= todayStart && eventDate <= todayEnd;
        }

        if (filters.dateFilter === 'yesterday') {
          const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
          const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          return eventDate >= yesterdayStart && eventDate <= yesterdayEnd;
        }

        if (filters.dateFilter === 'last_7_days') {
          const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
          const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          return eventDate >= weekStart && eventDate <= weekEnd;
        }

        if (filters.dateFilter === 'last_30_days') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
          const monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          return eventDate >= monthStart && eventDate <= monthEnd;
        }

        if (filters.dateFilter === 'last_90_days') {
          const start90 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0, 0);
          const end90 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          return eventDate >= start90 && eventDate <= end90;
        }

        if (filters.dateFilter === 'last_365_days') {
          const start365 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 364, 0, 0, 0, 0);
          const end365 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          return eventDate >= start365 && eventDate <= end365;
        }


        if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
          const startDate = new Date(filters.dateRange.start + 'T00:00:00');
          const endDate = new Date(filters.dateRange.end + 'T23:59:59');

          return eventDate >= startDate && eventDate <= endDate;
        }

        return true;
      });
    }

    if (columnSort) {
      filtered.sort((a, b) => {
        let aVal = '';
        let bVal = '';

        switch (columnSort.column) {
          case 'site_name':
            aVal = a.site_name || 'N/A';
            bVal = b.site_name || 'N/A';
            break;
          case 'camera_name':
            aVal = a.camera_name || 'N/A';
            bVal = b.camera_name || 'N/A';
            break;
          case 'uc_type':
            aVal = a.uc_type || 'N/A';
            bVal = b.uc_type || 'N/A';
            break;
          case 'severity':
            aVal = a.severity || 'N/A';
            bVal = b.severity || 'N/A';
            break;
          case 'status':
            aVal = a.status || 'N/A';
            bVal = b.status || 'N/A';
            break;
          case 'action_status':
            aVal = a.action_status || 'N/A';
            bVal = b.action_status || 'N/A';
            break;
          case 'location_tags':
            aVal = (a.location_tags && a.location_tags.length > 0) ?
              [...a.location_tags].sort()[0] : 'N/A';
            bVal = (b.location_tags && b.location_tags.length > 0) ?
              [...b.location_tags].sort()[0] : 'N/A';
            break;
          case 'functional_tag':
            aVal = a.functional_tag || 'N/A';
            bVal = b.functional_tag || 'N/A';
            break;
          case 'comments':
            aVal = (a.comments && a.comments.length > 0) ?
              [...a.comments.map(c => c.text)].sort()[0] : 'N/A';
            bVal = (b.comments && b.comments.length > 0) ?
              [...b.comments.map(c => c.text)].sort()[0] : 'N/A';
            break;
          case 'action_taken':
            aVal = (a.actions && a.actions.length > 0) ?
              [...a.actions.map(a => a.action_taken)].sort()[0] : 'N/A';
            bVal = (b.actions && b.actions.length > 0) ?
              [...b.actions.map(a => a.action_taken)].sort()[0] : 'N/A';
            break;
          case 'mail_receivers':
            aVal = (a.mail_receivers && a.mail_receivers.length > 0) ?
              [...a.mail_receivers].sort()[0] || 'N/A' : 'N/A';
            bVal = (b.mail_receivers && b.mail_receivers.length > 0) ?
              [...b.mail_receivers].sort()[0] || 'N/A' : 'N/A';
            break;

          case 'details':
            const getFirstDetail = (event) => {
              if (event.details && Array.isArray(event.details) && event.details.length > 0) {
                const firstDetail = event.details[0];
                if (typeof firstDetail === 'string') {
                  return firstDetail;
                } else if (typeof firstDetail === 'object' && firstDetail !== null) {
                  return Object.entries(firstDetail)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                }
                return String(firstDetail);
              }
              return 'N/A';
            };

            aVal = String(getFirstDetail(a));
            bVal = String(getFirstDetail(b));
            break;

          case 'extra_info':
            const getFirstExtraInfo = (event) => {
              if (event.extra_info && typeof event.extra_info === 'object') {
                const entries = Object.entries(event.extra_info);
                if (entries.length > 0) {
                  return entries
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                }
              }
              return 'N/A';
            };

            aVal = String(getFirstExtraInfo(a));
            bVal = String(getFirstExtraInfo(b));
            break;

          default:
            return 0;
        }




        const comparison = aVal.localeCompare(bVal);
        return columnSort.direction === 'asc' ? comparison : -comparison;
      });
    } else {
      // Apply default time sorting
      filtered.sort((a, b) => {
        const dateA = new Date(a.time_created.split(' ').slice(0, 2).join('T')).getTime();
        const dateB = new Date(b.time_created.split(' ').slice(0, 2).join('T')).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return filtered;

  }, [user?.timezone]);

  // Get filtered events
  const filteredEvents = useMemo(() => {
    return filterEvents(allEventsData, filters, sortOrder, columnSort);
  }, [allEventsData, filters, sortOrder, columnSort, filterEvents]);

  // Get paginated events
  const paginatedEvents = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredEvents.slice(startIndex, endIndex);
  }, [filteredEvents, pagination]);

  // Calculate pagination data
  const paginationData = useMemo(() => {
    const totalCount = filteredEvents.length;
    const totalPages = Math.ceil(totalCount / pagination.pageSize);

    return {
      totalCount,
      currentPage: pagination.page,
      totalPages,
      pageSize: pagination.pageSize
    };
  }, [filteredEvents.length, pagination]);

// Extract headers with dynamic cascading - keep full list for actively filtered column
const processedHeaderData = useMemo(() => {
  const allHeaders = extractHeadersFromEvents(allEventsData);
  
  // Check if ANY filter is active
  const hasAnyActiveFilter = 
    filters.sites.length > 0 ||
    filters.cameras.length > 0 ||
    filters.useCases.length > 0 ||
    filters.severities.length > 0 ||
    filters.statuses.length > 0 ||
    filters.actions.length > 0 ||
    filters.locationTags.length > 0 ||
    filters.functionalTags.length > 0 ||
    filters.comments.length > 0 ||
    filters.actionsTaken.length > 0 ||
    filters.mailReceivers.length > 0 ||
    filters.details.length > 0 ||
    filters.extraInfo.length > 0 ||
    filters.dateFilter !== null ||
    filters.dateRange !== null;
  
  // If NO filters active, show all options
  if (!hasAnyActiveFilter) {
    return allHeaders;
  }
  
  // Helper: Get cascaded options WITHOUT a specific column's own filter
  const getCascadedHeadersWithoutColumnFilter = (columnToExclude: keyof EventFilters) => {
    const tempFilters = { ...filters };
    
    // Handle different filter types properly
    if (columnToExclude === 'dateFilter' || columnToExclude === 'dateRange') {
      tempFilters[columnToExclude] = null;
    } else if (Array.isArray(tempFilters[columnToExclude])) {
      tempFilters[columnToExclude] = [] as any;
    }
    
    const cascadedEvents = filterEvents(allEventsData, tempFilters, sortOrder, columnSort);
    return extractHeadersFromEvents(cascadedEvents);
  };
  
  // Get cascaded options for each column
  const cascadedSites = getCascadedHeadersWithoutColumnFilter('sites');
  const cascadedCameras = getCascadedHeadersWithoutColumnFilter('cameras');
  const cascadedUseCases = getCascadedHeadersWithoutColumnFilter('useCases');
  const cascadedSeverities = getCascadedHeadersWithoutColumnFilter('severities');
  const cascadedStatuses = getCascadedHeadersWithoutColumnFilter('statuses');
  const cascadedActions = getCascadedHeadersWithoutColumnFilter('actions');
  const cascadedLocationTags = getCascadedHeadersWithoutColumnFilter('locationTags');
  const cascadedFunctionalTags = getCascadedHeadersWithoutColumnFilter('functionalTags');
  const cascadedComments = getCascadedHeadersWithoutColumnFilter('comments');
  const cascadedActionsTaken = getCascadedHeadersWithoutColumnFilter('actionsTaken');
  const cascadedMailReceivers = getCascadedHeadersWithoutColumnFilter('mailReceivers');
  const cascadedDetails = getCascadedHeadersWithoutColumnFilter('details');
  const cascadedExtraInfo = getCascadedHeadersWithoutColumnFilter('extraInfo');
  
  return {
    sites: cascadedSites.sites,
    cameras: cascadedCameras.cameras,
    useCases: cascadedUseCases.useCases,
    severities: cascadedSeverities.severities,
    statuses: cascadedStatuses.statuses,
    actions: cascadedActions.actions,
    locationTags: cascadedLocationTags.locationTags,
    functionalTags: cascadedFunctionalTags.functionalTags,
    comments: cascadedComments.comments,
    actionsTaken: cascadedActionsTaken.actionsTaken,
    mailReceivers: cascadedMailReceivers.mailReceivers,
    details: cascadedDetails.details,
    extraInfo: cascadedExtraInfo.extraInfo,
  };
}, [allEventsData, filters, sortOrder, columnSort, filterEvents, extractHeadersFromEvents]);


  const handleExport = useCallback((format: 'csv' | 'excel') => {
    setShowExportMenu(false);

    try {
      // Use the already filtered events from frontend
      const exportData = filteredEvents.map((event, index) => ({
        'S.No': index + 1,
        'Site Name': event.site_name || 'N/A',
        'Camera': event.camera_name || 'N/A',
        'Use Case': event.uc_type || 'N/A',
        'Time Created': event.time_created,
        'Severity': event.severity || 'N/A',
        'Status': event.status || 'N/A',
        'Action Status': event.action_status || 'N/A',
        'Location Tags': event.location_tags && event.location_tags.length > 0
          ? event.location_tags.join(', ')
          : 'N/A',
        'Functional Tags': event.functional_tag || 'N/A',

        'Comments': event.comments && event.comments.length > 0
          ? event.comments.map((c: any) => `${c.text} - ${c.user}`).join('; ')
          : 'N/A',
        'Action Taken': event.actions && event.actions.length > 0
          ? event.actions.map((a: any) => `${a.action_taken} - ${a.created_by}`).join('; ')
          : 'N/A',
        'Details': event.details && Array.isArray(event.details) && event.details.length > 0
          ? event.details.map((detail: any) => {
            if (typeof detail === 'string') {
              return detail;
            } else if (typeof detail === 'object' && detail !== null) {
              return Object.entries(detail)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            }
            return String(detail);
          }).join('; ')
          : 'N/A',
        'Email Receivers': event.mail_receivers && event.mail_receivers.length > 0
          ? event.mail_receivers.join(', ')
          : 'N/A',
        'Event URL': event.event_url || 'N/A'
      }));

      const fileName = `${user?.name || 'events'}_Data_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        // Generate CSV
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Generate Excel with clickable URLs
        const wsData = exportData.map(row => {
          const newRow = { ...row };
          // Format Event URL as Excel HYPERLINK formula
          if (newRow['Event URL'] && newRow['Event URL'] !== 'N/A') {
            newRow['Event URL'] = {
              f: `HYPERLINK("${newRow['Event URL']}", "view event")`
            };
          }
          return newRow;
        });

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Events');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }

    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [filteredEvents, user?.name]);

const handleFilterChange = useCallback((filterType: keyof EventFilters, excludedValues: string[]) => {
  setFilters(prev => ({
    ...prev,
    [filterType]: excludedValues,
  }));
  setPagination(prev => ({ ...prev, page: 1 })); 
}, []);

  const handleDateRangeChange = useCallback((dateRange: { start: string; end: string } | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange,
      dateFilter: null
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleDateFilterChange = useCallback((dateFilter: DateFilterEnum) => {
    setFilters(prev => ({
      ...prev,
      dateFilter,
      dateRange: null
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleColumnResize = useCallback((columnKey: string, width: number) => {
    setColumns(prev => prev.map(col =>
      col.key === columnKey ? { ...col, width } : col
    ));
  }, []);

  const handleColumnReorder = useCallback((fromIndex: number, toIndex: number) => {
    setColumns(prev => {
      const visibleCols = prev.filter(col => col.visible);
      const newVisibleCols = [...visibleCols];
      const [draggedColumn] = newVisibleCols.splice(fromIndex, 1);
      newVisibleCols.splice(toIndex, 0, draggedColumn);

      const hiddenCols = prev.filter(col => !col.visible);
      const newColumns = [...newVisibleCols, ...hiddenCols];

      // Save preferences immediately with new column order
      setTimeout(() => {
        savePreferences(newColumns);
      }, 100);

      return newColumns;
    });
  }, [user?.id, user?.customer_id, preferencesLoaded, pagination.pageSize]);



  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination({ page: 1, pageSize });

    // Save preferences immediately with new page size
    setTimeout(() => {
      savePreferences(columns, pageSize);
    }, 100);
  }, [user?.id, user?.customer_id, preferencesLoaded, columns]);

  // Modal event handlers
  const handleRowClick = useCallback((event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  // Sort order handler
  const handleSortOrderChange = useCallback((newSortOrder: 'asc' | 'desc') => {
    setSortOrder(newSortOrder);
    setColumnSort(null);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Modal close handler
  const handleModalClose = useCallback(async () => {
    setIsModalOpen(false);
    setSelectedEvent(null);

  }, []);

  const handleEventChange = useCallback((newEvent: any) => {
    setSelectedEvent(newEvent);
  }, []);

  // Cross-page navigation for modal
  const handleCrossPageNavigation = useCallback((direction: "next" | "prev") => {
    const currentIndex = filteredEvents.findIndex(event => event.event_id === selectedEvent?.event_id);
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < filteredEvents.length) {
      const newEvent = filteredEvents[newIndex];
      const newPage = Math.floor(newIndex / pagination.pageSize) + 1;

      if (newPage !== pagination.page) {
        setPagination(prev => ({ ...prev, page: newPage }));
      }

      return {
        ...newEvent,
        Sno: newEvent.s_no,
        event_id: newEvent.event_id,
        site_id: newEvent.site_id,
        site_name: newEvent.site_name,
        camera_id: newEvent.camera_id,
        camera_name: newEvent.camera_name,
        uc_type: newEvent.uc_type,
        time_created: newEvent.time_created,
        severity: newEvent.severity,
        status: newEvent.status,
        action_status: newEvent.action_status,
        location_tags: newEvent.location_tags,
        comments: newEvent.comments,
        action_taken: newEvent.actions
      };
    }

    return null;
  }, [filteredEvents, selectedEvent, pagination.pageSize]);

  // Transform API events to table format
  const events = paginatedEvents.map((event, index) => ({
    Sno: (pagination.page - 1) * pagination.pageSize + index + 1,
    event_id: event.event_id,
    site_id: event.site_id || 'N/A',
    site_name: event.site_name || 'N/A',
    camera_id: event.camera_id || 'N/A',
    camera_name: event.camera_name || 'N/A',
    uc_type: event.uc_type || 'N/A',
    time_created: event.time_created,
    severity: event.severity || 'N/A',
    status: event.status || 'N/A',
    action_status: event.action_status || 'N/A',
    location_tags: event.location_tags && event.location_tags.length > 0 ? event.location_tags : ['N/A'],
    functional_tag: event.functional_tag || 'N/A',
    comments: event.comments && event.comments.length > 0
      ? event.comments.map(c => `${c.text} - ${c.user}`)
      : ['N/A'],
    action_taken: event.actions && event.actions.length > 0
      // ? event.actions.map(a => `${a.action_taken} - ${a.created_by}`)
      ? event.actions.map(a => `${a.action_taken} - ${a.created_by}`)
      : ['N/A'],

    details: event.details && Array.isArray(event.details) && event.details.length > 0
      ? event.details.map(detail => {
        if (typeof detail === 'string') {
          return detail; // "NO-Hardhat"
        } else if (typeof detail === 'object' && detail !== null) {
          return Object.entries(detail)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        }
        return String(detail);
      })
      : ['N/A'],

    mail_receivers: event.mail_receivers && event.mail_receivers.length > 0 ? event.mail_receivers : ['N/A'],
    extra_info: event.extra_info || null,
  }));

  const updateEventInList = useCallback((eventId: string, updates: Partial<any>) => {
    setAllEventsData(prev => {
      const updated = prev.map(event =>
        event.event_id === eventId ? { ...event, ...updates } : event
      );
      const currentTimezone = user?.timezone || 'UTC';
      if (user?.id && env) {
        saveEventDataToStorage(updated, user.id, env, currentTimezone);
      }
      return updated;
    });
  }, [user?.id, user?.timezone, env]);

  return (
    <div className="max-w-full h-full">
      <div className="max-w-10xl h-full">

        {/* Pagination Footer */}
        {paginationData && (
          <div className="mt-2  bg-white shadow-md p-2 rounded-lg mb-2">
            <div className="flex items-center justify-between">
              {/* Left: Action Icons */}
              <div className="flex  items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                    title="Export Data"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Export Menu */}
                  {showExportMenu && (
                    <div className="export-menu-container absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                      >
                        Export Excel
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setEditButtonPosition({
                      x: rect.left,
                      y: rect.bottom + 5,
                    });
                    setIsColumnManagerOpen(!isColumnManagerOpen);
                  }}
                  className={`p-1 rounded transition-colors ${hasCustomColumns
                    ? 'bg-teal-700 text-white hover:bg-teal-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                  title="Manage Columns"
                >
                  <Edit className={`w-4 h-4 ${hasCustomColumns ? 'text-white' : ''}`} />   
                               </button>

                <button
                  onClick={handleResetFilters}
                  disabled={Object.values(filters).every(f =>
                    Array.isArray(f) ? f.length === 0 : f === null
                  )}
                  className={`p-2 rounded transition-colors ${Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f !== null)
                    ? 'text-teal-600  text-gray-800 hover:bg-gray-200'
                    : 'text-gray-400 cursor-not-allowed'
                    }`}
                  title="Clear all filters"
                >
                  <FilterX className="w-4 h-4" />
                </button>

                <button
                  onClick={handleRefreshData}
                  disabled={isInitialLoad || isRefreshing || isReturningToScreen}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  {isInitialLoad || isRefreshing || isReturningToScreen ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                </button>
                <div className=" p-1 rounded flex items-center bg-gray-200 gap-1 ">


                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-0.5 rounded transition-colors ${viewMode === 'table'
                      ? 'bg-teal-700 text-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                      }`}
                    title="Table view"
                  >
                    <List className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setViewMode('tiles')}
                    className={`p-0.5 rounded transition-colors ${viewMode === 'tiles'
                      ? 'bg-teal-700 text-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                      }`}
                    title="Tiles view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right: Controls Group */}
              <div className="flex items-center gap-6">
                {/* Page Size Control */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700">Show</span>
                  <select
                    value={pagination.pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                  >
                    {[10, 20, 50, 100].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                {/* Records Count */}
                <div className="text-sm text-gray-700">
                  {paginationData.totalCount.toLocaleString()} Records
                </div>

                {/* Pagination Controls */}
                {paginationData.totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={paginationData.currentPage === 1}
                      className="flex items-center justify-center p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="First Page"
                    >
                      <div className="flex items-center">
                        <ChevronLeft className="w-3 h-3" />
                        <ChevronLeft className="w-3 h-3 -ml-1" />
                      </div>
                    </button>

                    <button
                      onClick={() => handlePageChange(paginationData.currentPage - 1)}
                      disabled={paginationData.currentPage === 1}
                      className="flex items-center justify-center p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-2 mx-3">
                      <input
                        type="number"
                        min="1"
                        max={paginationData.totalPages}
                        value={paginationData.currentPage}
                        onChange={(e) => {
                          const page = Number(e.target.value);
                          if (page >= 1 && page <= paginationData.totalPages) {
                            handlePageChange(page);
                          }
                        }}
                        className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <span className="text-sm text-gray-600">of {paginationData.totalPages.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => handlePageChange(paginationData.currentPage + 1)}
                      disabled={paginationData.currentPage === paginationData.totalPages}
                      className="flex items-center justify-center p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handlePageChange(paginationData.totalPages)}
                      disabled={paginationData.currentPage === paginationData.totalPages}
                      className="flex items-center justify-center p-1.5 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Last Page"
                    >
                      <div className="flex items-center">
                        <ChevronRight className="w-3 h-3" />
                        <ChevronRight className="w-3 h-3 -ml-1" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Main Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {viewMode === 'table' ? (
            <EventTable
              data={events}
              isTableLoading={(tableLoading && isInitialLoad) || !preferencesLoaded || isReturningToScreen}
              isHeaderLoading={(tableLoading && isInitialLoad) || !preferencesLoaded}
              columns={visibleColumns}
              onColumnResize={handleColumnResize}
              onColumnReorder={handleColumnReorder}
              filters={filters}
              onFilterChange={handleFilterChange}
              onDateRangeChange={handleDateRangeChange}
              onDateFilterChange={handleDateFilterChange}
              autoApply={autoApply}
              onAutoApplyChange={setAutoApply}
              headerData={processedHeaderData}
              onRowClick={handleRowClick}
              sortOrder={sortOrder}
              onSortOrderChange={handleSortOrderChange}
              onColumnSort={handleColumnSort}
              columnSort={columnSort}
            />
          ) : (
            <EventTilesView
              data={paginatedEvents}
              isTableLoading={(tableLoading && isInitialLoad) || !preferencesLoaded || isReturningToScreen}
              isHeaderLoading={(tableLoading && isInitialLoad) || !preferencesLoaded}
              columns={visibleColumns}
              filters={filters}
              onFilterChange={handleFilterChange}
              onDateRangeChange={handleDateRangeChange}
              onDateFilterChange={handleDateFilterChange}
              autoApply={autoApply}
              onAutoApplyChange={setAutoApply}
              headerData={processedHeaderData}
              onRowClick={handleRowClick}
              sortOrder={sortOrder}
              onSortOrderChange={handleSortOrderChange}
            />
          )}
        </div>

        {/* Column Manager Dropdown */}
        {isColumnManagerOpen && (
          <ColumnManager
            columns={columns}
            onApply={async (updatedColumns) => {
              setColumns(updatedColumns);
              setHasCustomColumns(isColumnsCustomized(updatedColumns));
              setTimeout(() => {
                savePreferences(updatedColumns);
              }, 100);
            }}
            onResetColumns={() => {
              setColumns(defaultColumns);
              setTimeout(() => {
                savePreferences(defaultColumns);
                setHasCustomColumns(false);
              }, 100);
            }}
            onClose={() => setIsColumnManagerOpen(false)}
            position={editButtonPosition}
          />
        )}

        {/* Event Details Modal */}
        {isModalOpen && selectedEvent && (
          <EventDetailsModal
            event={selectedEvent}
            isOpen={isModalOpen}
            onClose={handleModalClose}
            user={user}
            allEvents={events}
            onEventChange={handleEventChange}
            onCrossPageNavigation={handleCrossPageNavigation}
            pageSize={pagination.pageSize}
            currentPage={pagination.page}
            totalPages={paginationData?.totalPages || 1}
            onEventUpdate={updateEventInList}
          />
        )}


      </div>
    </div>
  );
};

export default EventTablePage;