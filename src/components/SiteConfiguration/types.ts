// export interface Camera {
//   id: string;
//   name: string;
//   locationTag: string;
//   cameraUrl?: string;
//   previewUrl?: string | null;
//   isConnected?: boolean;
// }

import { EdgeStatusMsg } from "@/api/types";

// New interfaces for anonymisation controls
export interface AnonymisationControls {
  people: {
    face: boolean;
    full_body: boolean;
  };
  numberplate: boolean;
}

export type CameraFormState = {
  cameraName: string;
  locationTag: string;
  cameraUrl: string;
  isConnecting: boolean;
  isConnected: boolean;
  showPreview: boolean;
};

export enum MediaStatus {
  QUEUED = "queued",
  RUNNING = "running",
  FAILED = "failed",
  READY = "ready",
}

export interface RunningUseCase {
  usecase_name: string;
  parameters: any[];
  rois: string[];
}

export interface CameraUseCase {
  camera_name: string;
  usecases: RunningUseCase[];
}

export interface CameraData {
  id: string;
  name: string;
  locationTags: string[];
  imageUrl?: string;
  media_history?: string[];
  videoUrl?: string;
  camera_ip?: string | "";
  calibration?: string;
  default_media?: string | null; // URL to default media (image/video)
}

export interface UseCaseOption {
  id: string;
  name: string;
  icon: string;
}

export interface ROISelectionState {
  selectedRegions: any[]; // Replace 'any' with your specific region type
  previewImage: string | null;
}

export interface ROIData {
  name: string;
  functionalTag: string;
}

export interface SiteData {
  name: string;
  address?: string;
  country: string;
  city: string;
  manager: string;
  vehicles: number;
  edgeDeviceId: string;
  staffCount: number;
  imageUrl: string;
  id: string;
  no_of_cameras: number;
  cloud_edge_id?: string;
  last_sync?: string;
  cameras?: string[];
  last_sync_configs?: Record<string, any>;
  last_heartbeat?: string | "";
  edge_status?: "config_received" | "pending" | "error" | string;
  edge_status_updated_at?: string;
  edge_error?: string | null;
  last_edge_status_msg?: EdgeStatusMsg; // updated from Record<string, any>
  realEdgeDeviceId?: string; // New field added
  real_last_heartbeat?: string;
  automation_last_heartbeat?: string;
  anonymisation_controls?: AnonymisationControls;
  running_usecases?: CameraUseCase[]; // Add this line
}
