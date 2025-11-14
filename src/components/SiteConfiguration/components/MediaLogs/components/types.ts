export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
  width: number;
  resizable: boolean;
}

export interface MediaQueueLogItem {
  id: string;
  site_name: string;
  camera_name: string;
  media_url: string;
  status: string;
  user: {
    email: string;
    initials: string;
  };
  message: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  logged_at: string;
}

export interface FilterState {
  searchQuery: string;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  camera_name: string[];
  status: string[];
  user_email: string[];
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
