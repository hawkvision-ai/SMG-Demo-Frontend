// BoundaryConfigPanel.tsx - NEW FILE
import React, { useEffect } from "react";
import { ROI } from "./types";
import { useGetEdgesByRoi, useGetCountersBySite, useDeleteEdge } from "@/hooks/useApi";
import { ArrowUp, ArrowDown, Bell } from "lucide-react";
import AddButton from "@/assets/icons/add-button.svg";
import EditIcon from "@/assets/icons/edit-icon.svg";
import DeleteIcon from "@/assets/icons/delete-icon.svg";
import SetupButton from "@/assets/icons/setup-button.svg";



interface BoundaryConfigPanelProps {
    roi: ROI;
    siteId: string;
    imageUrl: string;
    onBoundarySetup: (boundaryName: string, direction: "inward" | "outward", configToEdit?: any) => void;
    boundarySetupModal?: boolean;
}

// Auto-generate boundary names
const generateBoundaryNames = (coordinatesLength: number): string[] => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const names: string[] = [];

    for (let i = 0; i < coordinatesLength; i++) {
        const current = alphabet[i % alphabet.length];
        const next = alphabet[(i + 1) % coordinatesLength];
        names.push(`${current}${next}`);
    }

    return names;
};

const BoundaryConfigPanel: React.FC<BoundaryConfigPanelProps> = ({
    roi, siteId, onBoundarySetup, boundarySetupModal = false
}) => {
    const { data: existingEdges, execute: fetchEdges } = useGetEdgesByRoi();
    const { data: counters, execute: fetchCounters } = useGetCountersBySite();
    const { execute: deleteEdge } = useDeleteEdge();

    useEffect(() => {
        if (!roi.id.startsWith("temp-")) {
            fetchEdges(roi.id);
        }
        if (siteId) {
            fetchCounters(siteId);
        }
    }, [roi.id, siteId, boundarySetupModal]);

    // Generate boundaries from coordinates
    const boundaries = generateBoundaryNames(roi.coordinates.length);

    const getConfigLabel = (config: any): string => {
        if (config.action === "notify") {
            return config.notify_condition || "Notify";
        }

        const counter = counters?.find(c => c.id === config.counter_id);
        return counter ? counter.name : (config.counter_id || "Counter");
    };

    const getExistingConfigs = (boundaryName: string, direction: "inward" | "outward") => {
        return existingEdges?.filter(edge =>
            edge.boundary_name === boundaryName && edge.direction === direction
        ).map(edge => ({
            boundaryName: edge.boundary_name,
            direction: edge.direction as "inward" | "outward",
            action: edge.action as "notify" | "increment" | "decrement",
            counter_id: edge.counter_id || undefined,
            notify_condition: edge.notify_condition || undefined,
            edgeId: edge.id,
        })) || [];
    };

    const handleDeleteConfig = async (config: any) => {
        if (!config.edgeId || roi.id.startsWith("temp-")) return;

        try {
            await deleteEdge(config.edgeId);
            fetchEdges(roi.id);
        } catch (err) {
            console.error("Failed to delete edge:", err);
        }
    };

    return (
        <div className="h-full  flex flex-col ">

            {/* Preview Image */}


            {/* Legend */}
            {/* <div className="mt-4 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
          <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Actions</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-center">
                <Bell className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Notify</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-50 border border-green-200 rounded-md flex items-center justify-center">
                <ArrowUp className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Increment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-50 border border-red-200 rounded-md flex items-center justify-center">
                <ArrowDown className="w-3 h-3 text-red-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Decrement</span>
            </div>
          </div>
        </div> */}

            {/* Boundary Table */}
            <div className="flex-1  overflow-y-auto">
                {/* Table Header */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-h-[calc(100vh-200px)]  overflow-y-auto ">
                    <div className="grid grid-cols-[100px_1fr_1fr] gap-0 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-300">
                        <div className="font-bold text-sm p-4 border-r border-gray-200 text-gray-700">
                            Boundary
                        </div>
                        <div className="font-bold text-sm text-center p-4 border-r border-gray-200 text-gray-700 flex items-center justify-center gap-2">
                            Inward
                        </div>
                        <div className="font-bold text-sm text-center p-4 text-gray-700 flex items-center justify-center gap-2">
                            Outward
                        </div>
                    </div>

                    {/* Boundary Rows */}
                    {boundaries.map((boundary) => (
                        <div key={boundary} className="grid grid-cols-[100px_1fr_1fr] gap-0 border-b border-gray-300 last:border-b-0 ">
                            <div className="font-semibold text-md p-4 border-r border-gray-300 bg-white flex items-center justify-center text-gray-800">
                                {boundary}
                            </div>

                            {/* Inward Column */}
                            <div className="p-1 border-r border-gray-200 bg-white min-h-[80px]">
                                {(() => {
                                    const configs = getExistingConfigs(boundary, "inward");

                                    if (configs.length === 0) {
                                        return (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <img
                                                    src={SetupButton}
                                                    onClick={() => onBoundarySetup(boundary, "inward")}
                                                    className="w-25 h-25 cursor-pointer hover:opacity-70"
                                                    alt="Setup"
                                                />
                                            </div>

                                        );
                                    }

                                    return (
                                        <div className="flex items-start gap-2">
                                            {/* Existing configs */}
                                            <div className="flex-1 space-y-1">
                                                {configs.map((config, idx) => (
                                                    <div
                                                        key={`${config.boundaryName}-${config.direction}-${idx}`}
                                                        className={`text-sm border rounded px-2 py-3 flex items-center justify-between ${config.action === "notify"
                                                            ? "bg-blue-50 border-blue-200 text-black"
                                                            : config.action === "increment"
                                                                ? "bg-green-50 border-green-200 text-black"
                                                                : "bg-red-50 border-red-200 text-black"
                                                            }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {config.action === "increment" && <ArrowUp className="w-4 h-4 text-gray-400" />}
                                                            {config.action === "decrement" && <ArrowDown className="w-4 h-4 text-gray-400" />}
                                                            {config.action === "notify" && <Bell className="w-4 h-4 text-gray-400" />}
                                                            <span className="truncate">{getConfigLabel(config)}</span>
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={EditIcon}
                                                                onClick={() => onBoundarySetup(boundary, "inward", config)}
                                                                className="w-5 h-5 cursor-pointer hover:opacity-70"
                                                                alt="Edit"
                                                            />
                                                            <img
                                                                src={DeleteIcon}
                                                                onClick={() => handleDeleteConfig(config)}
                                                                className="w-5 h-5 cursor-pointer hover:opacity-70"
                                                                alt="Delete"
                                                            />


                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* + Icon button when configs exist */}
                                            <img
                                                src={AddButton}
                                                onClick={() => onBoundarySetup(boundary, "inward")}
                                                className="h-8 w-8 cursor-pointer hover:opacity-70 flex-shrink-0"
                                                alt="Add"
                                            />
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Outward Column */}
                            <div className="p-1 bg-white min-h-[80px]">
                                {(() => {
                                    const configs = getExistingConfigs(boundary, "outward");

                                    if (configs.length === 0) {
                                        return (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <img
                                                    src={SetupButton}
                                                    onClick={() => onBoundarySetup(boundary, "outward", existingEdges)}
                                                    className="w-25 h-25 cursor-pointer hover:opacity-70"
                                                    alt="Setup"
                                                />
                                            </div>

                                        );
                                    }

                                    return (
                                        <div className="flex items-start gap-2">
                                            {/* Existing configs */}
                                            <div className="flex-1 space-y-1">
                                                {configs.map((config, idx) => (
                                                    <div
                                                        key={`${config.boundaryName}-${config.direction}-${idx}`}
                                                        className={`text-sm border rounded px-2 py-3 flex items-center justify-between ${config.action === "notify"
                                                            ? "bg-blue-50 border-blue-200 text-black"
                                                            : config.action === "increment"
                                                                ? "bg-green-50 border-green-200 text-black"
                                                                : "bg-red-50 border-red-200 text-black"
                                                            }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {config.action === "increment" && <ArrowUp className="w-4 h-4 text-gray-600" />}
                                                            {config.action === "decrement" && <ArrowDown className="w-4 h-4 text-gray-600" />}
                                                            {config.action === "notify" && <Bell className="w-4 h-4 text-gray-600" />}
                                                            <span className="truncate">{getConfigLabel(config)}</span>
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={EditIcon}
                                                                onClick={() => onBoundarySetup(boundary, "outward", config)}
                                                                className="w-5 h-5 cursor-pointer hover:opacity-70"
                                                                alt="Edit"
                                                            />
                                                            <img
                                                                src={DeleteIcon}
                                                                onClick={() => handleDeleteConfig(config)}
                                                                className="w-5 h-5 cursor-pointer hover:opacity-70"
                                                                alt="Delete"
                                                            />

                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* + Icon button when configs exist */}
                                            <img
                                                src={AddButton}
                                                onClick={() => onBoundarySetup(boundary, "outward", existingEdges)}
                                                className="h-8 w-8 cursor-pointer hover:opacity-70 flex-shrink-0"
                                                alt="Add"
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BoundaryConfigPanel;