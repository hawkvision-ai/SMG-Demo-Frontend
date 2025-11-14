

// components/SiteConfiguration/ROI/ConfigureBoundariesModal.tsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ROI, BoundaryConfig } from "./types";
import BoundarySetupModal from "./BoundarySetupModal";
import { useGetEdgesByRoi, useGetCountersBySite, useDeleteEdge } from "@/hooks/useApi";
import { ArrowUp, ArrowDown, Bell, Loader2 } from "lucide-react";
import editIcon from "@/assets/icons/edit.svg";
import deleteIcon from "@/assets/icons/delete-icon.svg";
import SetupButton from "@/assets/icons/setup-button.svg";
import AddButton from "@/assets/icons/add-button.svg";



interface ConfigureBoundariesModalProps {
  open: boolean;
  onClose: () => void;
  roi: ROI;
  siteId: string;
  onSave: (updatedROI: ROI) => void;
  imageUrl: string;
}

// Generate edge names (AB, BC, CD, DA)
const generateEdgeNames = (coordinatesLength: number): string[] => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const names: string[] = [];

  for (let i = 0; i < coordinatesLength; i++) {
    const current = alphabet[i % alphabet.length];
    const next = alphabet[(i + 1) % coordinatesLength];
    names.push(`${current}${next}`);
  }

  return names;
};

// Generate point names for visualization (A, B, C, D)
const generatePointNames = (coordinatesLength: number): string[] => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const names: string[] = [];

  for (let i = 0; i < coordinatesLength; i++) {
    names.push(alphabet[i % alphabet.length]);
  }

  return names;
};

const ConfigureBoundariesModal: React.FC<ConfigureBoundariesModalProps> = ({
  open, onClose, roi, siteId, onSave, imageUrl
}) => {
  const [setupModal, setSetupModal] = useState(false);
  const [selectedBoundary, setSelectedBoundary] = useState<{ name: string; direction: "inward" | "outward" }>({ name: "", direction: "inward" });
  const [selectedEdgeToEdit, setSelectedEdgeToEdit] = useState<any>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const { data: existingEdges, execute: fetchEdges } = useGetEdgesByRoi();
  const { data: counters, execute: fetchCounters } = useGetCountersBySite();
  const { execute: deleteEdge } = useDeleteEdge();

  useEffect(() => {
    if (open && !roi.id.startsWith("temp-")) {
      fetchEdges(roi.id);
    }
    if (siteId) {
      fetchCounters(siteId);
    }
  }, [open, roi.id, siteId, setupModal]);

  // Generate edge names for boundary configurations
  const edgeNames = generateEdgeNames(roi.coordinates.length);
  // Generate point names for visualization
  const pointNames = generatePointNames(roi.coordinates.length);

  const openSetup = (edgeName: string, direction: "inward" | "outward", edgeToEdit?: any) => {
    setSelectedBoundary({ name: edgeName, direction });
    setSelectedEdgeToEdit(edgeToEdit);
    setSetupModal(true);
  };

  // FIXED: Remove the parent onSave call to prevent modal closing
  const handleBoundarySave = (config: BoundaryConfig) => {
    // Just refresh the edges data, don't call parent onSave
    if (!roi.id.startsWith("temp-")) {
      setTimeout(() => {
        fetchEdges(roi.id);
      }, 100);
    }
  };

  const getConfig = (edgeName: string, direction: "inward" | "outward") =>
    roi.boundaryConfigs?.find(c => c.boundaryName === edgeName && c.direction === direction);

  // Helper to get display label for a config
  const getConfigLabel = (config: BoundaryConfig): string => {
    if (config.action === "notify") {
      return config.notify_condition || "Notify";
    }

    const counter = counters?.find(c => c.id === config.counterId);
    return counter ? counter.name : (config.counterId || "Counter");
  };

  const getExistingConfigs = (edgeName: string, direction: "inward" | "outward"): (BoundaryConfig & { edgeId: string })[] => {
    const backendConfigs = existingEdges?.filter(edge =>
      edge.boundary_name === edgeName && edge.direction === direction
    ).map(edge => ({
      boundaryName: edge.boundary_name,
      direction: edge.direction as "inward" | "outward",
      action: edge.action as "notify" | "increment" | "decrement",
      counterId: edge.counter_id || undefined,
      notify_condition: edge.notify_condition || undefined,
      edgeId: edge.id,
    })) || [];

    return backendConfigs;
  };

  const handleDeleteConfig = async (config: BoundaryConfig & { edgeId?: string }) => {
    if (!config.edgeId || roi.id.startsWith("temp-")) return;

    try {
      await deleteEdge(config.edgeId);
      fetchEdges(roi.id);
    } catch (err) {
      console.error("Failed to delete edge:", err);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl bg-white overflow-auto">
          <DialogHeader>
            <DialogTitle>Setting-up boundary</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[300px_1fr] gap-6">
            {/* Left side - Image preview with ROI overlay */}
            <div>
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="ROI Preview"
                  className="w-full h-auto rounded border"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    setImageSize({
                      width: img.clientWidth,
                      height: img.clientHeight
                    });
                  }}
                />

                {/* ROI and Edge Overlay */}
                {imageSize.width > 0 && imageSize.height > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* ROI Polygon */}
                    <polygon
                      points={roi.coordinates.map(pt => `${pt.x * imageSize.width},${pt.y * imageSize.height}`).join(' ')}
                      fill="rgba(239, 68, 68, 0.2)"
                      stroke="#dc2626"
                      strokeWidth="2"
                    />



                    {/* Show edge lines and labels */}
                    {roi.coordinates.map((coord, index) => {
                      const nextIndex = (index + 1) % roi.coordinates.length;
                      const nextCoord = roi.coordinates[nextIndex];
                      const x1 = coord.x * imageSize.width;
                      const y1 = coord.y * imageSize.height;
                      const x2 = nextCoord.x * imageSize.width;
                      const y2 = nextCoord.y * imageSize.height;
                      const edgeName = edgeNames[index];

                      // Check if this edge has configurations
                      const hasConfigs = existingEdges?.some(edge =>
                        edge.boundary_name === edgeName
                      );

                      return (
                        <g key={`edge-${index}`}>
                          {/* Edge line */}
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={"#dc2626"}
                            strokeWidth="3"
                            strokeDasharray={hasConfigs ? "0" : "5,5"}
                          />

                          {/* Edge line */}
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#dc2626"
                            strokeWidth="3"
                            strokeDasharray={hasConfigs ? "0" : "5,5"}
                          />
                        </g>
                      );
                    })}

                    {/* Show individual points */}
                    {roi.coordinates.map((coord, index) => {
                      const x = coord.x * imageSize.width;
                      const y = coord.y * imageSize.height;
                      const pointName = pointNames[index];

                      return (
                        <g key={`point-${index}`}>
                          {/* Point circle */}
                          <circle
                            cx={x}
                            cy={y}
                            r="8"
                            fill="#FCD34D"
                            stroke="#dc2626"
                            strokeWidth="2"
                          />

                          {/* Point label */}
                          <text
                            x={x}
                            y={y}
                            fontSize="12"
                            fill="#000000"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontWeight="bold"
                          >
                            {pointName}
                          </text>
                        </g>
                      );
                    })}

                    {/* ROI Name */}
                    <text
                      x={roi.coordinates.reduce((sum, pt) => sum + pt.x, 0) / roi.coordinates.length * imageSize.width}
                      y={roi.coordinates.reduce((sum, pt) => sum + pt.y, 0) / roi.coordinates.length * imageSize.height}
                      fontSize="14"
                      fill="#ffffff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontWeight="bold"
                      className="drop-shadow-lg"
                    >
                      {roi.name}
                    </text>
                  </svg>
                )}
              </div>

              {/* Legend */}
              <div className="mt-4 p-3 bg-white">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Legend</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-50 border border-blue-100 rounded"></div>
                    <Bell className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-black">Notify</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-50 border border-green-100 rounded"></div>
                    <ArrowUp className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-black">Increment Counter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-50 border border-red-100 rounded"></div>
                    <ArrowDown className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-black">Decrement Counter</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Edge configuration table */}
            <div>
              {/* Header */}
              <div className="grid grid-cols-[120px_1fr_1fr] gap-0 border border-gray-300">
                <div className="font-medium p-3 border-r border-gray-300 bg-gray-50">Edges</div>
                <div className="font-medium text-center p-3 border-r border-gray-300 bg-gray-50 flex items-center justify-center gap-1">
                  Inward
                </div>
                <div className="font-medium text-center p-3 bg-gray-50 flex items-center justify-center gap-1">
                  Outward
                </div>
              </div>

              {/* Edge rows */}
              <div className="border-l border-r border-b border-gray-300 max-h-96 overflow-y-auto">
                {edgeNames.map((edgeName, edgeIndex) => (
                  <div key={edgeName}>
                    <div className="grid grid-cols-[120px_1fr_1fr] gap-0">
                      <div className="font-medium text-lg p-3 border-r border-gray-300 bg-white flex items-center">
                        {edgeName}
                      </div>

                      {/* Inward column */}
                      <div className="p-3 border-r border-gray-300 bg-white">
                        {(() => {
                          if (!existingEdges) {
                            return (
                              <div className="flex items-center justify-center h-8 bg-gray-50">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            );
                          }

                          const configs = getExistingConfigs(edgeName, "inward");

                          if (configs.length === 0) {
                        return (
  <div className="w-full h-full flex items-center justify-center">
    <img
      src={SetupButton}
      onClick={() => openSetup(edgeName, "inward")}
      className="w-20 h-20 cursor-pointer hover:opacity-70"
      alt="Setup"
    />
  </div>
);
                          }

                          return (
                            <div className="flex items-start gap-2">
                              <div className="flex-1 space-y-1">
                                {configs.map((config, idx) => (
                                  <div
                                    key={`${config.boundaryName}-${config.direction}-${idx}`}
                                    className={`text-xs border rounded px-2 py-1 flex items-center justify-between ${config.action === "notify"
                                      ? "bg-blue-50 border-blue-200 text-black"
                                      : config.action === "increment"
                                        ? "bg-green-50 border-green-200 text-black-700"
                                        : "bg-red-50 border-red-200 text-black-700"
                                      }`}
                                  >
                                    <span className="flex items-center gap-1">
                                      {config.action === "increment" && <ArrowUp className="w-3 h-3 text-gray-600" />}
                                      {config.action === "decrement" && <ArrowDown className="w-3 h-3 text-gray-600" />}
                                      {config.action === "notify" && <Bell className="w-3 h-3 text-gray-600" />}
                                      {getConfigLabel(config)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const edgeToEdit = existingEdges?.find(edge =>
                                            edge.boundary_name === config.boundaryName &&
                                            edge.direction === config.direction &&
                                            edge.id === config.edgeId
                                          );
                                          openSetup(config.boundaryName, config.direction, edgeToEdit);
                                        }}
                                        className="text-blue-500 hover:text-blue-700 text-xs flex items-center justify-center w-4 h-4"
                                        title="Edit configuration"
                                      >
                                        <img src={editIcon} alt="Edit" className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteConfig(config);
                                        }}
                                        className="text-red-500 hover:text-red-700 text-xs flex items-center justify-center w-4 h-4"
                                        title="Delete configuration"
                                      >
                                        <img src={deleteIcon} alt="Delete" className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                         <img
  src={AddButton}
  onClick={() => openSetup(edgeName, "inward")}
  className="h-8 w-8 cursor-pointer hover:opacity-70 flex-shrink-0"
  alt="Add"
/>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Outward column */}
                      <div className="p-3 bg-white">
                        {(() => {

                          if (!existingEdges) {
                            return (
                              <div className="flex items-center justify-center h-8 bg-gray-50">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            );
                          }

                          const configs = getExistingConfigs(edgeName, "outward");

                     if (configs.length === 0) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        src={SetupButton}
        onClick={() => openSetup(edgeName, "outward")}
        className="w-20 h-20 cursor-pointer hover:opacity-70"
        alt="Setup"
      />
    </div>
  );
}

                          return (
                            <div className="flex items-start gap-2">
                              <div className="flex-1 space-y-1">
                                {configs.map((config, idx) => (
                                  <div
                                    key={`${config.boundaryName}-${config.direction}-${idx}`}
                                    className={`text-xs border rounded px-2 py-1 flex items-center justify-between ${config.action === "notify"
                                      ? "bg-blue-50 border-blue-200 text-black"
                                      : config.action === "increment"
                                        ? "bg-green-50 border-green-200 text-black"
                                        : "bg-red-50 border-red-200 text-black"
                                      }`}
                                  >
                                    <span className="flex items-center gap-1 ">
                                      {config.action === "increment" && <ArrowUp className="w-3 h-3 text-gray-600" />}
                                      {config.action === "decrement" && <ArrowDown className="w-3 h-3 text-gray-600" />}
                                      {config.action === "notify" && <Bell className="w-3 h-3 text-gray-600" />}
                                      {getConfigLabel(config)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const edgeToEdit = existingEdges?.find(edge =>
                                            edge.boundary_name === config.boundaryName &&
                                            edge.direction === config.direction &&
                                            edge.id === config.edgeId
                                          );
                                          openSetup(config.boundaryName, config.direction, edgeToEdit);
                                        }}
                                        className="text-blue-500 hover:text-blue-700 text-xs flex items-center justify-center w-4 h-4"
                                        title="Edit configuration"
                                      >
                                        <img src={editIcon} alt="Edit" className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteConfig(config);
                                        }}
                                        className="text-red-500 hover:text-red-700 text-xs flex items-center justify-center w-4 h-4"
                                        title="Delete configuration"
                                      >
                                        <img src={deleteIcon} alt="Delete" className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                          <img
  src={AddButton}
  onClick={() => openSetup(edgeName, "outward")}
  className="h-8 w-8 cursor-pointer hover:opacity-70 flex-shrink-0"
  alt="Add"
/>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Add border between rows except last */}
                    {edgeIndex < edgeNames.length - 1 && (
                      <div className="border-b border-gray-300"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* FIXED: Save button now calls parent onSave when actually closing */}
              <div className="flex justify-end pt-6">
                <Button
                  onClick={() => {
                    onSave(roi); // Call parent onSave here
                    onClose();   // Then close
                  }}
                  className="bg-teal-800 hover:bg-teal-600 text-white px-8 py-2 rounded-full"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual edge setup modal */}
      <BoundarySetupModal
        open={setupModal}
        onClose={() => {
          setSetupModal(false);
          setSelectedEdgeToEdit(null);
        }}
        boundaryName={selectedBoundary.name}
        direction={selectedBoundary.direction}
        siteId={siteId}
        onSave={handleBoundarySave}
        existingConfig={getConfig(selectedBoundary.name, selectedBoundary.direction)}
        roi={roi}
        existingEdges={existingEdges}
        edgeToEdit={selectedEdgeToEdit}
        isEditMode={!!selectedEdgeToEdit}
        imageUrl={imageUrl} 
      />
    </>
  );
};

export default ConfigureBoundariesModal;