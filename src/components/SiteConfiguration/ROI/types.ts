// ROI-related types
export interface Coordinate {
  x: number;
  y: number;
}

export interface BoundaryConfig {
  boundaryName: string;
  action: "notify" | "increment" | "decrement";
  counterId?: string;
  direction: "inward" | "outward";
  notify_condition?: string; 
}

export interface ROI {
  id: string;
  name: string;
  functionalTag: string;
  coordinates: Coordinate[];
  color: string;
  isFullView: boolean;
  boundaryConfigs?: BoundaryConfig[];
}

// API-related ROI types
export interface ROIResponse {
  id: string;
  usecase_id: string;
  name: string | null;
  coordinates: Coordinate[];
  metadata: Record<string, any> | null;
  created_at: string;

}

export interface ROICreate {
  usecase_id: string;
  name: string | null;
  coordinates: Coordinate[];
  metadata: Record<string, any> | null;
}

export interface ROIUpdate {
  name: string | null;
  coordinates: Coordinate[];
  metadata: Record<string, any> | null;
}

// Color palette for ROIs
export const COLOR_PALETTE = [
  "#FF5252", // Red
  "#FF9800", // Orange
  "#FFEB3B", // Yellow
  "#4CAF50", // Green
  "#2196F3", // Blue
  "#9C27B0", // Purple
  "#795548", // Brown
  "#607D8B", // Blue Gray
  "#E91E63", // Pink
  "#00BCD4", // Cyan
];


