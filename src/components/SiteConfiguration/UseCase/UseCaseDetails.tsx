import React from "react";

// Using the actual ROI interfaces
interface Coordinate {
  x: number;
  y: number;
}

interface ROISchema {
  camera_id: string;
  name?: string | null;
  coordinates: Coordinate[];
  is_full_view?: boolean;
  functional_tags?: string[] | null;
  ucs_running?: string[] | null;
  created_at?: string;
}

interface ROIResponse extends ROISchema {
  id: string;
}

interface UseCaseDetailsProps {
  useCase: {
    id: string;
    name: string;
    func_tag_name: string;
    objects: [string, boolean, boolean][];
    parameters: {
      id: string;
      type: string;
      int_params?: [number, number];
      str_params: [string];
      unit?: string;
    }[];
  };
  roi?: ROIResponse | ROIResponse[]; // Optional ROI information using the correct type
}

const UseCaseDetails: React.FC<UseCaseDetailsProps> = ({ useCase, roi }) => {
  // Function to render the object status with appropriate styling
  const renderObjectStatus = (isActive: boolean, isNotify: boolean) => {
    if (!isActive) return null;

    return (
      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
          isNotify ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
        }`}
      >
        {isNotify ? "Notify" : "Count"}
      </span>
    );
  };

  // Format ROIs for display
  const formatROIs = () => {
    if (!roi) return null;

    const rois = Array.isArray(roi) ? roi : [roi];

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700">Regions of Interest</h4>
        <div className="grid gap-3">
          {rois.map((r) => (
            <div key={r.id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.name || `ROI ${r.id}`}</span>
                {r.is_full_view && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                    Full View
                  </span>
                )}
              </div>
              {r.coordinates && r.coordinates.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  {r.coordinates.length} coordinate points
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with name and tag */}
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-lg font-medium">{useCase.name}</h3>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800">
          {useCase.func_tag_name}
        </span>
      </div>

      {/* ROI section */}
      {roi && formatROIs()}

      {/* Objects section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700">Objects</h4>
        {useCase.objects && useCase.objects.length > 0 ? (
          <div className="grid gap-3">
            {useCase.objects
              .filter(([_, isActive]) => isActive) // Only show active objects
              .map((obj, index) => {
                const [name, isActive, isNotify] = obj;

                return (
                  <div
                    key={`${name}-${index}`}
                    className="rounded-md border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="flex items-center">
                      <span className="font-medium capitalize">{name}</span>
                      {renderObjectStatus(isActive, isNotify)}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="p-2 text-sm text-gray-500">No objects configured</div>
        )}
      </div>

      {/* Parameters section with range type handling as number */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700">Parameters</h4>
        {useCase.parameters && useCase.parameters.length > 0 ? (
          <div className="grid gap-4">
            {useCase.parameters.map((param, index) => {
              if (param.type === "range" && param.int_params) {
                const value = param.int_params[0];

                return (
                  <div key={`${param.id}-${index}`} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{param.id}</span>
                      <div className="flex items-center">
                        <span className="font-medium text-teal-700">{value}</span>
                        {param.unit && <span className="ml-1 text-gray-500">{param.unit}</span>}
                      </div>
                    </div>
                  </div>
                );
              }

              if (param.type === "dropdown") {
                return (
                  <div key={`${param.id}-${index}`} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{param.id}</span>
                      <span className="font-semibold text-teal-700">
                        {param.int_params || "N/A"}
                      </span>
                    </div>
                  </div>
                );
              }

              return null; // fallback for unknown types
            })}
          </div>
        ) : (
          <div className="p-2 text-sm text-gray-500">No parameters configured</div>
        )}
      </div>
    </div>
  );
};

export default UseCaseDetails;
