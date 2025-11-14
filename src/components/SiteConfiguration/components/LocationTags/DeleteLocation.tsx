import { ChevronDown, ChevronUp } from "lucide-react";
import React, { useState } from "react";
 
// Interface for Camera
interface Camera {
  camera_id: string;
  camera_name: string;
}
 
// Interface for Location Tag - matches the API structure
interface LocationTag {
  _id: string;
  name: string;
  site_id: string;
  site_name?: string;
  cameras?: Camera[];
}
 
// Props for DeleteLocation component
interface DeleteLocationProps {
  tag: LocationTag;
  onCancel: () => void;
  onDelete: () => void;
  loading?: boolean;
}
 
const DeleteLocation: React.FC<DeleteLocationProps> = ({
  tag,
  onCancel,
  onDelete,
  loading = false,
}) => {
  const [showCameras, setShowCameras] = useState(false);
 
  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6">
        {/* Title */}
        <h3 className="mb-3 text-lg font-semibold text-gray-800">
          Are you sure you want to delete "<span className="text-blue-400">{tag.name}</span>"
          Location tag?
        </h3>
 
        {/* Warning message */}
        <p className="mb-3 text-sm text-gray-500">
          Note: Deleting the Location tag will affect the camera(s) where it has been applied.
        </p>
 
        {/* View cameras toggle - only show if cameras exist */}
        {tag.cameras && tag.cameras.length > 0 && (
          <>
            <button
              onClick={() => setShowCameras(!showCameras)}
              disabled={loading}
              className="mb-4 flex items-center gap-1 text-sm font-normal text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>View cameras</span>
              {showCameras ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
 
            {/* Cameras list - shown when expanded */}
            {showCameras && (
              <div className="mb-4">
                <div className="flex flex-wrap justify-start gap-3">
                  {tag.cameras.map((camera) => (
                    <div
                      key={camera.camera_id}
                      className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
                      style={{ minWidth: "80px", textAlign: "center" }}
                    >
                      {camera.camera_name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
 
        {/* Action buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-8 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="rounded-lg bg-red-100 px-8 py-2 font-medium text-red-600 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
 
export default DeleteLocation;