// components/SiteConfiguration/ROI/BoundarySetupModal.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetCountersBySite } from "@/hooks/useApi";
import { BoundaryConfig, ROI, Coordinate } from "./types";
import { useCreateEdge, useUpdateEdge } from "@/hooks/useApi";
import { ArrowUp, ArrowDown, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGetCustomer, useSyncAllowedUseCases } from "@/hooks/useApi";


interface BoundarySetupModalProps {
    open: boolean;
    onClose: () => void;
    boundaryName: string;
    direction: "inward" | "outward";
    siteId: string;
    onSave: (config: BoundaryConfig) => void;
    existingConfig?: BoundaryConfig;
    roi: ROI;
    existingEdges?: any[];
    edgeToEdit?: any;
    isEditMode?: boolean;
    imageUrl: string;
}

const BoundarySetupModal: React.FC<BoundarySetupModalProps> = ({
    open, onClose, boundaryName, direction, siteId, onSave, existingConfig, roi, existingEdges, edgeToEdit, isEditMode = false, imageUrl
}) => {
    const [action, setAction] = useState<"notify" | "increment" | "decrement">(
        edgeToEdit?.action || existingConfig?.action || ""
    );
    const [counterId, setCounterId] = useState(
        edgeToEdit?.counter_id || existingConfig?.counterId || ""
    );
    const [notifyCondition, setNotifyCondition] = useState(
        edgeToEdit?.notify_condition || ""
    );
    const [imageLoaded, setImageLoaded] = useState(false);

    const { data: counters, execute: fetchCounters } = useGetCountersBySite();
    const { execute: createEdge } = useCreateEdge();
    const { execute: updateEdge } = useUpdateEdge();
    const { user } = useAuth();
    const { data: customerData, execute: fetchCustomer } = useGetCustomer(user?.customer_id || "");
    const { execute: syncAllowedUseCases } = useSyncAllowedUseCases();

    const allowedBoundaryUseCases = customerData?.boundary_usecase || [];

    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const getBoundaryIndex = (boundaryName: string, totalCoords: number): number => {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const firstLetter = boundaryName[0];
        return alphabet.indexOf(firstLetter) % totalCoords;
    };

    // Helper functions (same as ROIDefinitionModal)
    const normalize = (coords: Coordinate[], width: number, height: number): Coordinate[] =>
        coords.map(({ x, y }) => ({
            x: parseFloat((x / width).toFixed(6)),
            y: parseFloat((y / height).toFixed(6)),
        }));

    const denormalize = (coords: Coordinate[], width: number, height: number): Coordinate[] =>
        coords.map(({ x, y }) => ({
            x: Math.round(x * width),
            y: Math.round(y * height),
        }));

    const isNormalized = (coords: Coordinate[]) =>
        coords.length > 0 && coords.every((c) => c.x <= 1 && c.y <= 1);

    const centroid = (pts: Coordinate[]) => {
        const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        return {
            x: Math.round(sum.x / pts.length),
            y: Math.round(sum.y / pts.length),
        };
    };

    // Align canvas with image (same as ROIDefinitionModal)
    const alignCanvas = useCallback(() => {
        if (!canvasRef.current || !imageRef.current || !containerRef.current) return;

        const { clientWidth, clientHeight, naturalWidth, naturalHeight } = imageRef.current;

        if (naturalWidth === 0 || naturalHeight === 0) return;

        const imageAspectRatio = naturalWidth / naturalHeight;
        const containerAspectRatio = clientWidth / clientHeight;

        let displayWidth, displayHeight;
        if (imageAspectRatio > containerAspectRatio) {
            displayWidth = clientWidth;
            displayHeight = clientWidth / imageAspectRatio;
        } else {
            displayHeight = clientHeight;
            displayWidth = clientHeight * imageAspectRatio;
        }

        const offsetX = (clientWidth - displayWidth) / 2;
        const offsetY = (clientHeight - displayHeight) / 2;

        containerRef.current.style.width = `${displayWidth}px`;
        containerRef.current.style.height = `${displayHeight}px`;
        containerRef.current.style.left = `${offsetX}px`;
        containerRef.current.style.top = `${offsetY}px`;
        containerRef.current.style.position = 'absolute';

        Object.assign(canvasRef.current.style, {
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
        });

        canvasRef.current.width = naturalWidth;
        canvasRef.current.height = naturalHeight;
    }, []);

    // Draw ROI with highlighted boundary (same style as ROIDefinitionModal)
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageLoaded || !roi?.coordinates) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scale = canvas.width / canvas.clientWidth;

        // Get coordinates - denormalize if needed
        const drawCoords = isNormalized(roi.coordinates)
            ? denormalize(roi.coordinates, canvas.width, canvas.height)
            : roi.coordinates;

        if (drawCoords.length === 0) return;

        // Calculate centroid FIRST - needed for arrow direction
        const ctd = centroid(drawCoords);

        // Draw ROI polygon with red stroke
        ctx.beginPath();
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 2 * scale;
        ctx.fillStyle = "rgba(239,68,68,0.2)";
        drawCoords.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Get boundary points
        const boundaryIndex = getBoundaryIndex(boundaryName, drawCoords.length);
        const startIdx = boundaryIndex;
        const endIdx = (startIdx + 1) % drawCoords.length;
        const start = drawCoords[startIdx];
        const end = drawCoords[endIdx];

        // Draw arrow at midpoint
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const lineAngle = Math.atan2(end.y - start.y, end.x - start.x);
        const perpAngle = lineAngle + Math.PI / 2;

        // Determine outward direction
        const testX = midX + Math.cos(perpAngle) * 50;
        const testY = midY + Math.sin(perpAngle) * 50;
        const isOutward = Math.hypot(testX - ctd.x, testY - ctd.y) > Math.hypot(midX - ctd.x, midY - ctd.y);

        let arrowAngle = perpAngle;
        if ((direction === "outward" && !isOutward) || (direction === "inward" && isOutward)) {
            arrowAngle += Math.PI;
        }

        // Calculate distance to opposite boundary using ray-line intersection
        const getDistanceToOppositeBoundary = () => {
            const arrowDirX = Math.cos(arrowAngle);
            const arrowDirY = Math.sin(arrowAngle);

            let minDist = Infinity;

            // Check all edges of the polygon
            for (let i = 0; i < drawCoords.length; i++) {
                // Skip the current boundary edge
                if (i === startIdx) continue;

                const p1 = drawCoords[i];
                const p2 = drawCoords[(i + 1) % drawCoords.length];

                // Line segment direction
                const edgeDirX = p2.x - p1.x;
                const edgeDirY = p2.y - p1.y;

                // Ray-line intersection
                const denominator = arrowDirX * edgeDirY - arrowDirY * edgeDirX;

                if (Math.abs(denominator) < 0.0001) continue; // Lines are parallel

                const dx = p1.x - midX;
                const dy = p1.y - midY;

                const t = (dx * edgeDirY - dy * edgeDirX) / denominator;
                const s = (dx * arrowDirY - dy * arrowDirX) / denominator;

                // Check if intersection is in arrow direction (t > 0) and within line segment (0 <= s <= 1)
                if (t > 0 && s >= 0 && s <= 1) {
                    if (t < minDist) {
                        minDist = t;
                    }
                }
            }

            return minDist === Infinity ? 200 : minDist; // Default to 200 if no intersection found
        };

        const distToOppositeBoundary = getDistanceToOppositeBoundary();

        // --- DYNAMIC ARROW SIZE: compute ROI diagonal to scale arrow ---
        const minX = Math.min(...drawCoords.map(p => p.x));
        const maxX = Math.max(...drawCoords.map(p => p.x));
        const minY = Math.min(...drawCoords.map(p => p.y));
        const maxY = Math.max(...drawCoords.map(p => p.y));
        const bboxWidth = Math.max(1, maxX - minX);
        const bboxHeight = Math.max(1, maxY - minY);
        const roiDiagonal = Math.hypot(bboxWidth, bboxHeight);

        // Base arrow dimensions from ROI size
        const baseArrowLength = Math.max(12, Math.min(120, roiDiagonal * 0.04));

        // Limit arrow length to 50% of distance to opposite boundary
        const maxAllowedLength = distToOppositeBoundary * 0.5;
        const arrowLength = Math.min(baseArrowLength, maxAllowedLength);

        // Scale other arrow dimensions proportionally
        const arrowWidth = Math.max(10, arrowLength * 0.7);
        const shaftLength = Math.max(arrowLength * 1.2, arrowLength + 10);
        const shaftHalf = Math.max(3, arrowWidth * 0.5);
        const outlineWidth = Math.max(1, Math.round(arrowLength * 0.06));

        // Position arrow using scaled offset
        // For full-view ROI, keep outward arrows closer to the boundary
        const isFullViewROI = (bboxWidth / canvas.width > 0.95) && (bboxHeight / canvas.height > 0.95);

        const offsetMultiplier = direction === "inward"
            ? Math.min(1.2, distToOppositeBoundary * 0.15 / arrowLength)
            : isFullViewROI
                ? -0.9  // Negative offset to position arrow inside the ROI
                : Math.min(0.4, distToOppositeBoundary * 0.1 / arrowLength);

        const offset = arrowLength * offsetMultiplier;
        let arrowX = midX + Math.cos(arrowAngle) * offset;
        let arrowY = midY + Math.sin(arrowAngle) * offset;

        // Draw arrow with scaled dimensions
        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(arrowAngle);

        ctx.beginPath();
        ctx.moveTo(arrowLength, 0);                             // tip
        ctx.lineTo(-arrowLength * 0.45, -arrowWidth);           // top left of head
        ctx.lineTo(-arrowLength * 0.45, -shaftHalf);            // top inner corner
        ctx.lineTo(-shaftLength, -shaftHalf);                   // top shaft end
        ctx.lineTo(-shaftLength, shaftHalf);                    // bottom shaft end
        ctx.lineTo(-arrowLength * 0.45, shaftHalf);             // bottom inner corner
        ctx.lineTo(-arrowLength * 0.45, arrowWidth);            // bottom left of head
        ctx.closePath();

        ctx.fillStyle = "#FCD34D";
        ctx.fill();

        ctx.strokeStyle = "#080809";
        ctx.lineWidth = outlineWidth;
        ctx.stroke();

        ctx.restore();
        {
            // compute bounding box of ROI
            const minX = Math.min(...drawCoords.map(p => p.x));
            const maxX = Math.max(...drawCoords.map(p => p.x));
            const minY = Math.min(...drawCoords.map(p => p.y));
            const maxY = Math.max(...drawCoords.map(p => p.y));
            const bboxWidth = Math.max(1, maxX - minX);
            const bboxHeight = Math.max(1, maxY - minY);
            const roiDiagonal = Math.hypot(bboxWidth, bboxHeight);

            // Check if ROI is full-view (covers 95% or more of canvas)
            const isFullView = (bboxWidth / canvas.width > 0.95) && (bboxHeight / canvas.height > 0.95);

            // Adjust sizes for full-view ROIs
            const minRadius = isFullView ? 12 : 10;
            const maxRadius = isFullView ? 20 : 23;
            const radius = Math.max(minRadius, Math.min(maxRadius, roiDiagonal * 0.04));

            const minFont = isFullView ? 12 : 9;
            const maxFont = isFullView ? 15 : 35;
            const fontSize = Math.max(minFont, Math.min(maxFont, roiDiagonal * 0.06));

            const strokeWidth = Math.max(1, Math.round(radius * 0.12));

            // Calculate inward shift for full-view ROIs (shift points toward centroid)
            const inwardShift = isFullView ? radius * 0.9 : 0;

            drawCoords.forEach((c, i) => {
                // Calculate direction vector from point to centroid
                const dx = ctd.x - c.x;
                const dy = ctd.y - c.y;
                const dist = Math.hypot(dx, dy);

                // Shift point inward toward centroid if full-view
                const shiftedX = dist > 0 ? c.x + (dx / dist) * inwardShift : c.x;
                const shiftedY = dist > 0 ? c.y + (dy / dist) * inwardShift : c.y;

                ctx.beginPath();
                ctx.arc(shiftedX, shiftedY, radius, 0, Math.PI * 2);
                ctx.strokeStyle = "#FF0000";
                ctx.lineWidth = strokeWidth;
                ctx.stroke();

                ctx.fillStyle = "#FCD34D";
                ctx.fill();

                ctx.fillStyle = "#000000";
                ctx.font = `${Math.round(fontSize)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i] || "", shiftedX, shiftedY);
            });
        }
        // Draw ROI name (ctd already calculated above)
        // const baseFontSize = Math.min(canvas.width, canvas.height) * 0.04;
        // const fontSize = Math.max(24, Math.min(baseFontSize, 72));
        // ctx.font = `bold ${fontSize}px system-ui`;
        // ctx.textAlign = "center";
        // ctx.textBaseline = "middle";
        // ctx.lineWidth = fontSize * 0.15;
        // ctx.strokeStyle = "#424242";
        // ctx.strokeText(roi.name, ctd.x, ctd.y);
        // ctx.fillStyle = "#F3F4F6";
        // ctx.fillText(roi.name, ctd.x, ctd.y);
    }, [roi, boundaryName, direction, imageLoaded]);

    // Fetch counters when modal opens
    useEffect(() => {
        if (open && siteId) {

            if (user?.customer_id) {
                syncAllowedUseCases(user.customer_id).then(() => {
                    fetchCustomer();
                });
            }
            fetchCounters(siteId);
            setAction(edgeToEdit?.action || existingConfig?.action || "");
            setCounterId(edgeToEdit?.counter_id || existingConfig?.counterId || "");
            setNotifyCondition(edgeToEdit?.notify_condition || "");
            setImageLoaded(false); // Reset image loaded state
        }
    }, [open, siteId]);

    // Handle image load and initial draw
    useEffect(() => {
        if (!imageRef.current || !open) return;

        const handleImageLoad = () => {
            setImageLoaded(true);
            setTimeout(() => {
                alignCanvas();
                draw();
            }, 100);
        };

        if (imageRef.current.complete && imageRef.current.naturalHeight > 0) {
            handleImageLoad();
        }

        return () => {
            setImageLoaded(false);
        };
    }, [open, imageUrl, alignCanvas, draw]);

    // Redraw when dependencies change
    useEffect(() => {
        if (imageLoaded) {
            draw();
        }
    }, [draw, imageLoaded]);

    // Handle resize (same as ROIDefinitionModal)
    useEffect(() => {
        if (!imageRef.current || !open || !imageLoaded) return;

        const obs = new ResizeObserver(() => {
            setTimeout(() => {
                alignCanvas();
                draw();
            }, 50);
        });

        obs.observe(imageRef.current);

        const onResize = () => {
            setTimeout(() => {
                alignCanvas();
                draw();
            }, 100);
        };

        window.addEventListener('resize', onResize);

        return () => {
            obs.disconnect();
            window.removeEventListener('resize', onResize);
        };
    }, [alignCanvas, draw, open, imageLoaded]);

    const validateConfig = (
        action: "notify" | "increment" | "decrement",
        counterId: string,
        existingConfigs: BoundaryConfig[]
    ): string | null => {
        if (action === "notify") return null;
        if (!counterId) return "Please select a counter";

        const oppositeAction = action === "increment" ? "decrement" : "increment";
        const hasOpposite = existingConfigs.some(config =>
            config.action === oppositeAction && config.counterId === counterId
        );

        if (hasOpposite) {
            return `Cannot have both increment and decrement for the same counter on ${direction} direction`;
        }

        const hasDuplicate = existingConfigs.some(config =>
            config.action === action && config.counterId === counterId
        );

        if (hasDuplicate) {
            return `Counter already selected for ${action} on ${direction} direction`;
        }

        return null;
    };

    const handleSave = async () => {
        const existingConfigs = roi?.boundaryConfigs?.filter(
            c => c.boundaryName === boundaryName && c.direction === direction
        ) || [];

        const validationError = validateConfig(action, counterId, existingConfigs);
        if (validationError) {
            alert(validationError);
            return;
        }

        const config: BoundaryConfig = {
            boundaryName,
            action,
            counterId: action === "notify" ? undefined : counterId,
            direction
        };

        if (!roi.id.startsWith("temp-")) {
            try {
                const boundaryIndex = getBoundaryIndex(config.boundaryName, roi.coordinates.length);
                const startIndex = boundaryIndex;
                const endIndex = (startIndex + 1) % roi.coordinates.length;

                const edgeData = {
                    roi_id: roi.id,
                    start: roi.coordinates[startIndex],
                    end: roi.coordinates[endIndex],
                    boundary_name: config.boundaryName,
                    direction: config.direction,
                    action: config.action,
                    notify_condition: config.action === "notify" ? notifyCondition : null,
                    counter_id: config.action === "notify" ? null : (config.counterId || null),
                    visible: config.action !== "notify"
                };

                if (isEditMode && edgeToEdit?.id) {
                    await updateEdge(edgeToEdit.id, edgeData);
                } else {
                    await createEdge(edgeData);
                }
            } catch (err) {
                console.error(`Failed to ${isEditMode ? 'update' : 'create'} edge:`, err);
                return;
            }
        }

        setCounterId("");
        onSave(config);
        onClose();
    };

    // Get existing counter configurations for display
    const getExistingCounters = () => {
        if (!existingEdges || !counters) return [];

        return existingEdges
            .filter(edge =>
                edge.boundary_name === boundaryName &&
                edge.direction === direction
            )
            .map(edge => {
                if (edge.action === "notify") {
                    // For notify actions, show the notification condition instead of counter name
                    return {
                        name: edge.notify_condition || "Notification",
                        action: edge.action,
                        id: edge.id
                    };
                } else {
                    // For increment/decrement, show the counter name
                    const counter = counters.find(c => c.id === edge.counter_id);
                    return {
                        name: counter?.name || "Unknown",
                        action: edge.action,
                        id: edge.id
                    };
                }
            });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl bg-white p-0 overflow-hidden max-h-[90vh]">
                <DialogHeader className="p-1 pb-3 border-b border-gray-300">
                    <DialogTitle className="text-md font-medium text-gray-900">
                        {isEditMode ? 'Edit' : 'Set-up'} {boundaryName}  ({direction}) boundary
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Configure boundary actions and counters for the selected ROI boundary
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col lg:flex-row overflow-y-auto max-h-[calc(90vh-5rem)] gap-4">
                    {/* Left side - Image with ROI (matching ROIDefinitionModal layout) */}
                    <div className="flex-1 ">
                        <div className="relative w-full h-[calc(90vh-10rem)] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-300">                            <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="ROI"
                            onLoad={() => {
                                setImageLoaded(true);
                                setTimeout(() => {
                                    alignCanvas();
                                    draw();
                                }, 100);
                            }}
                            className="w-full h-full object-contain max-w-full max-h-full"
                        />
                            <div ref={containerRef} className="absolute top-0 left-0 h-full w-full pointer-events-none">
                                <canvas
                                    ref={canvasRef}
                                    className="absolute top-0 left-0 h-full w-full"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Right side - Configuration */}
                    <div className="w-[400px] flex-shrink-0 space-y-4 ">

                        {/* Existing Counters */}
                        <div className="space-y-3 border border-gray-300 rounded-lg p-4 bg-white">
                            <Label className="text-sm font-semibold text-gray-900">Existing {boundaryName} ({direction}) movement</Label>

                            {getExistingCounters().length > 0 ? (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {getExistingCounters().map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-2 p-1 rounded border ${item.action === "notify"
                                                ? "bg-blue-50 border-blue-200"
                                                : item.action === "increment"
                                                    ? "bg-green-50 border-green-200"
                                                    : "bg-red-50 border-red-200"
                                                }`}
                                        >
                                            {/* Show different icons based on action type */}
                                            {item.action === "increment" && (
                                                <ArrowUp className="w-4 h-4 text-gray-400" />
                                            )}
                                            {item.action === "decrement" && (
                                                <ArrowDown className="w-4 h-4 text-gray-400" />
                                            )}
                                            {item.action === "notify" && (
                                                <Bell className="w-4 h-4 text-gray-400" />
                                            )}
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-black leading-snug break-words whitespace-normal">
                                                    {item.name}
                                                </p>                    </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <Bell className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-600">No counters set up yet</p>
                                    <p className="text-xs text-gray-500 mt-1">Configure a counter below to get started</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 border-gray-200">Set-up {boundaryName} ({direction}) boundary</h3>
                            <Label className="text-sm font-medium text-gray-700">Select Action</Label>
                            <div className="flex flex-col gap-2">
                                {/* Notify Action */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="notify"
                                        checked={action === "notify"}
                                        onChange={(e) => setAction(e.target.value as any)}
                                        className="w-4 h-4 text-teal-600"
                                    />
                                    <span className="text-sm font-medium">Notify</span>
                                </label>
                                {action === "notify" && (
                                    <div className=" pl-6">
                                        {/* <Label className="text-sm font-medium mb-2">Select Notification Type</Label> */}
                                        <Select value={notifyCondition} onValueChange={setNotifyCondition}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select notification type" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                {(() => {
                                                    const usedConditions = existingEdges?.filter(edge =>
                                                        edge.boundary_name === boundaryName &&
                                                        edge.direction === direction &&
                                                        edge.action === "notify" &&
                                                        edge.id !== edgeToEdit?.id
                                                    ).map(edge => edge.notify_condition).filter(Boolean) || [];

                                                    const availableConditions = (allowedBoundaryUseCases.length > 0
                                                        ? allowedBoundaryUseCases
                                                        : [])
                                                        .filter(condition => !usedConditions.includes(condition));

                                                    return availableConditions.length > 0 ? (
                                                        availableConditions.map((condition) => (
                                                            <SelectItem key={condition} value={condition}>
                                                                {condition}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="px-2 py-1 text-sm text-gray-500">
                                                            No conditions available
                                                        </div>
                                                    );
                                                })()}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Increment Action */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="increment"
                                        checked={action === "increment"}
                                        onChange={(e) => setAction(e.target.value as any)}
                                        className="w-4 h-4 text-teal-600"
                                    />
                                    <span className="text-sm font-medium">Increment Counter</span>
                                </label>
                                {action === "increment" && (
                                    <div className=" pl-6">
                                        {/* <Label className="text-sm font-medium mb-1">Select Counter</Label> */}
                                        <Select value={counterId} onValueChange={setCounterId}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select counter" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                {(() => {
                                                    const currentDirectionUsed = existingEdges?.filter(edge =>
                                                        edge.boundary_name === boundaryName &&
                                                        edge.direction === direction &&
                                                        edge.id !== edgeToEdit?.id
                                                    ).map(edge => edge.counter_id).filter(Boolean) || [];

                                                    const restrictedCounterIds = currentDirectionUsed;

                                                    const availableCounters = counters?.filter(counter =>
                                                        !restrictedCounterIds.includes(counter.id)
                                                    ) || [];

                                                    return availableCounters.length > 0 ? (
                                                        availableCounters.map((counter) => (
                                                            <SelectItem key={counter.id} value={counter.id}>
                                                                {counter.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="px-2 py-1 text-sm text-gray-500">
                                                            No counters available
                                                        </div>
                                                    );
                                                })()}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Decrement Action */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        value="decrement"
                                        checked={action === "decrement"}
                                        onChange={(e) => setAction(e.target.value as any)}
                                        className="w-4 h-4 text-teal-600"
                                    />
                                    <span className="text-sm font-medium">Decrement Counter</span>
                                </label>
                                {action === "decrement" && (
                                    <div className=" pl-6">
                                        {/* <Label className="text-sm font-medium mb-1">Select Counter</Label> */}
                                        <Select value={counterId} onValueChange={setCounterId}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select counter" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                {(() => {
                                                    const currentDirectionUsed = existingEdges?.filter(edge =>
                                                        edge.boundary_name === boundaryName &&
                                                        edge.direction === direction &&
                                                        edge.id !== edgeToEdit?.id
                                                    ).map(edge => edge.counter_id).filter(Boolean) || [];

                                                    const restrictedCounterIds = currentDirectionUsed;

                                                    const availableCounters = counters?.filter(counter =>
                                                        !restrictedCounterIds.includes(counter.id)
                                                    ) || [];

                                                    return availableCounters.length > 0 ? (
                                                        availableCounters.map((counter) => (
                                                            <SelectItem key={counter.id} value={counter.id}>
                                                                {counter.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="px-2 py-1 text-sm text-gray-500">
                                                            No counters available
                                                        </div>
                                                    );
                                                })()}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="px-6"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={(() => {
                                    if (action === "notify") return !notifyCondition;
                                    if (!counterId) return true;

                                    const currentDirectionUsed = existingEdges?.filter(edge =>
                                        edge.boundary_name === boundaryName && edge.direction === direction
                                    ).map(edge => edge.counter_id).filter(Boolean) || [];

                                    const restrictedCounterIds = currentDirectionUsed;

                                    const availableCounters = counters?.filter(counter =>
                                        !restrictedCounterIds.includes(counter.id)
                                    ) || [];

                                    return availableCounters.length === 0;
                                })()}
                                className="bg-teal-800 hover:bg-teal-600 text-white px-8 rounded-full disabled:opacity-50"
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BoundarySetupModal;