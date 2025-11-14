import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useCreateRoi,
  useDeleteRoi,
  useGetEdgesByRoi,
  useGetFunctionalTagsBySite,
  useGetRoisByCamera,
  useUpdateRoi,
} from "@/hooks/useApi";
import { Loader2, ArrowLeft, Settings } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ConfirmationDialog } from "../../ConfirmationDialog";
import { ROIDetailsModal } from "./ROIDetailsModal";
import { ROIList } from "./ROIList";
import { COLOR_PALETTE, Coordinate, ROI } from "./types";
import BoundaryConfigPanel from "./BoundaryConfigPanel";
import BoundarySetupModal from "./BoundarySetupModal";

/** ------------------------------------------------------------------
 *  Helpers (same as before)
 *  ------------------------------------------------------------------*/
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

const onSegment = (p: Coordinate, q: Coordinate, r: Coordinate): boolean => {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
};

const orientation = (p: Coordinate, q: Coordinate, r: Coordinate): number => {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  return val === 0 ? 0 : val > 0 ? 1 : 2;
};

const doLinesIntersect = (
  a1: Coordinate,
  a2: Coordinate,
  b1: Coordinate,
  b2: Coordinate,
): boolean => {
  if (
    Math.max(a1.x, a2.x) < Math.min(b1.x, b2.x) ||
    Math.min(a1.x, a2.x) > Math.max(b1.x, b2.x) ||
    Math.max(a1.y, a2.y) < Math.min(b1.y, b2.y) ||
    Math.min(a1.y, a2.y) > Math.max(b1.y, b2.y)
  ) {
    return false;
  }

  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  if (o4 === 0 && onSegment(b1, a2, b2)) return true;

  return false;
};



/** ------------------------------------------------------------------
 *  Component
 *  ------------------------------------------------------------------*/
export interface ROIModalProps {
  cameraId: string;
  onClose: () => void;
  imageUrl: string;
  onSave?: (rois: ROI[]) => void;
  useCaseId?: string;
  cameraName: string;
  siteId: string;
}

const ROIDefinitionModal: React.FC<ROIModalProps> = ({
  cameraId,
  onClose,
  imageUrl,
  onSave,
  useCaseId,
  cameraName,
  siteId,
}) => {
  /** ----------------------------------------------------------------
   *  API hooks
   *  ----------------------------------------------------------------*/
  const {
    data: existingRois,
    loading: roisLoading,
    execute: fetchRois,
  } = useGetRoisByCamera(cameraId);
  const { execute: createRoi } = useCreateRoi();
  const { data: availableFunctionalTags = [] } = useGetFunctionalTagsBySite(siteId);
  const { execute: fetchEdges } = useGetEdgesByRoi();
  const { execute: deleteRoi } = useDeleteRoi();
  /** ----------------------------------------------------------------
   *  State
   *  ----------------------------------------------------------------*/
  const [dialogOpen, setDialogOpen] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [coords, setCoords] = useState<Coordinate[]>([]);
  const [hoverPos, setHoverPos] = useState<Coordinate | null>(null);
  const [isNearStart, setIsNearStart] = useState(false);
  const [cursor, setCursor] = useState<"default" | "crosshair" | "pointer">("default");
  const [saved, setSaved] = useState<ROI[]>([]);
  const [initial, setInitial] = useState<ROI[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [detailsModal, setDetailsModal] = useState(false);
  const [roiName, setRoiName] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedRoi, setSelectedRoi] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isExitingWithoutSave, setIsExitingWithoutSave] = useState(false);
  const [existingEdges, setExistingEdges] = useState<any[]>([]);
  const [selectedEdgeToEdit, setSelectedEdgeToEdit] = useState<any>(null);

  // NEW: Boundary configuration states
  const [boundaryMode, setBoundaryMode] = useState(false);
  const [selectedRoiForConfig, setSelectedRoiForConfig] = useState<ROI | null>(null);
  const [boundarySetupModal, setBoundarySetupModal] = useState(false);
  const [selectedBoundary, setSelectedBoundary] = useState<{
    name: string;
    direction: "inward" | "outward";
  }>({ name: "", direction: "inward" });

  /** ----------------------------------------------------------------
   *  Refs
   *  ----------------------------------------------------------------*/
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);

  /** ----------------------------------------------------------------
   *  Handlers
   *  ----------------------------------------------------------------*/
  const handleConfigureBoundaries = (roi: ROI) => {
    setCoords([]);        // Removes all drawn points
    setDrawing(false);    // Stops drawing mode
    setHoverPos(null);    // Clears hover position
    setIsNearStart(false); // Resets start proximity
    setCursor("default"); // Resets cursor
    setSelectedRoiForConfig(roi);
    setSelectedRoi(roi.id);
    setBoundaryMode(true);
  };

  const handleBackToROIList = () => {
    setCoords([]);        // Removes all drawn points
    setDrawing(false);    // Stops drawing mode
    setHoverPos(null);    // Clears hover position
    setIsNearStart(false); // Resets start proximity
    setCursor("default"); // Resets cursor

    setBoundaryMode(false);
    setSelectedRoiForConfig(null);
    setSelectedRoi(null);
  };

  const handleBoundarySetup = (boundaryName: string, direction: "inward" | "outward", configToEdit?: any) => {
    setSelectedBoundary({ name: boundaryName, direction });

    // Set the edge to edit if provided
    if (configToEdit && configToEdit.edgeId) {
      // Find the full edge data from existingEdges
      const edgeToEdit = existingEdges.find(edge => edge.id === configToEdit.edgeId);
      setSelectedEdgeToEdit(edgeToEdit);
    } else {
      setSelectedEdgeToEdit(null);
    }

    setBoundarySetupModal(true);
  };

  /** ----------------------------------------------------------------
   *  Canvas helpers (same as before)
   *  ----------------------------------------------------------------*/

  useEffect(() => {
    const fetchCurrentRoiEdges = async () => {
      if (selectedRoiForConfig && !selectedRoiForConfig.id.startsWith("temp-")) {
        try {
          const edges = await fetchEdges(selectedRoiForConfig.id);
          setExistingEdges(edges || []);
        } catch (error) {
          console.error("Failed to fetch edges:", error);
          setExistingEdges([]);
        }
      } else {
        setExistingEdges([]);
      }
    };

    fetchCurrentRoiEdges();
  }, [selectedRoiForConfig , boundarySetupModal ]);

  const alignCanvas = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !containerRef.current) return;

    const { clientWidth, clientHeight, naturalWidth, naturalHeight } = imageRef.current;

    // Calculate the actual displayed image dimensions considering object-contain
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

    // Center the canvas container
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



  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = canvas.width / canvas.clientWidth;

    /** Only draw the selected ROI with full details */
    if (selectedRoi) {
      const roi = saved.find((r) => r.id === selectedRoi);
      if (roi) {
        const drawCoords = isNormalized(roi.coordinates)
          ? denormalize(roi.coordinates, canvas.width, canvas.height)
          : roi.coordinates;

        ctx.beginPath();
        ctx.strokeStyle = "#FF0000"; // Red stroke like old code
        ctx.lineWidth = 2 * scale;
        ctx.fillStyle = `${roi.color}70`;

        drawCoords.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        /* point labels for selected ROI */
        drawCoords.forEach((c, i) => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = "#f8dd84ff";
          ctx.fill();
          ctx.fillStyle = "#000000";
          ctx.font = "25px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i] || "", c.x, c.y);
        });

        /* ROI name with gray border */
        const ctd = centroid(drawCoords);
        const baseFontSize = Math.min(canvas.width, canvas.height) * 0.04;
        const fontSize = Math.max(24, Math.min(baseFontSize, 72));

        ctx.font = `bold ${fontSize}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw gray stroke (border)
        ctx.lineWidth = fontSize * 0.15;
        ctx.strokeStyle = "#424242";
        ctx.strokeText(roi.name, ctd.x, ctd.y);

        // Draw white filled text on top
        ctx.fillStyle = "#F3F4F6";
        ctx.fillText(roi.name, ctd.x, ctd.y);
      }
    }

    /** Draw current polygon being created */
    if (coords.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 5 * scale;
      ctx.fillStyle = `${color}70`;

      coords.forEach((c, i) => (i === 0 ? ctx.moveTo(c.x, c.y) : ctx.lineTo(c.x, c.y)));

      const isClosed =
        coords.length >= 3 &&
        Math.abs(coords[0].x - coords.at(-1)!.x) < 5 &&
        Math.abs(coords[0].y - coords.at(-1)!.y) < 5;

      if (isClosed) {
        ctx.closePath();
        ctx.fill();
      }

      ctx.stroke();

      /** preview line */
      if (drawing && hoverPos && coords.length) {
        ctx.beginPath();
        const last = coords.at(-1)!;
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(hoverPos.x, hoverPos.y);
        ctx.strokeStyle = `${color}80`;
        ctx.stroke();
      }

      // Show points for the current drawing
      coords.forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "30px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), c.x, c.y);
      });
    }
  }, [saved, coords, color, drawing, hoverPos, selectedRoi]);

  /** ----------------------------------------------------------------
   *  Mouse handlers (same as before, but prevent drawing in boundary mode)
   *  ----------------------------------------------------------------*/


  const resetDrawing = () => {
    setCoords([]);
    setDrawing(false);
    setHoverPos(null);
    setIsNearStart(false);
    setCursor("default");
    draw();
  };


  const translateEvent = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / canvasRef.current.clientWidth;
    const scaleY = canvasRef.current.height / canvasRef.current.clientHeight;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawing || !coords.length || boundaryMode) return;
      const pos = translateEvent(e);
      setHoverPos(pos);

      if (pointerRef.current) {
        pointerRef.current.style.left = `${e.clientX}px`;
        pointerRef.current.style.top = `${e.clientY}px`;
      }

      const first = coords[0];
      const dist = Math.hypot(first.x - pos.x, first.y - pos.y);
      setIsNearStart(dist < 80);
      setCursor(dist < 80 ? "pointer" : "crosshair");
    },
    [drawing, coords, boundaryMode],
  );

  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Prevent drawing in boundary mode
      if (boundaryMode) {

        return;
      }

      if (!drawing && selectedRoi) {
        setSelectedRoi(null);
        return;
      }

      const point = translateEvent(e);

      if (
        coords.length > 2 &&
        Math.abs(coords[0].x - coords.at(-1)!.x) < 5 &&
        Math.abs(coords[0].y - coords.at(-1)!.y) < 5
      )
        return;

      const last = coords.at(-1);
      if (last && Math.abs(last.x - point.x) < 3 && Math.abs(last.y - point.y) < 3) return;

      const updated = [...coords, point];

      // Check for line intersections
      if (updated.length >= 4) {
        const newSegmentStart = updated[updated.length - 2];
        const newSegmentEnd = updated[updated.length - 1];

        for (let i = 0; i < updated.length - 3; i++) {
          const segStart = updated[i];
          const segEnd = updated[i + 1];

          if (doLinesIntersect(segStart, segEnd, newSegmentStart, newSegmentEnd)) {
            toast.error("ROI lines cannot cross each other!");
            return;
          }
        }
      }

      // Handle polygon closing
      if (updated.length >= 3) {
        const dist = Math.hypot(updated[0].x - point.x, updated[0].y - point.y);
        if (dist < 80) {
          const closedCoords = [...updated.slice(0, -1), updated[0]];

          const finalSegmentStart = closedCoords[closedCoords.length - 2];
          const finalSegmentEnd = closedCoords[closedCoords.length - 1];

          for (let i = 1; i < closedCoords.length - 3; i++) {
            const segStart = closedCoords[i];
            const segEnd = closedCoords[i + 1];

            if (doLinesIntersect(segStart, segEnd, finalSegmentStart, finalSegmentEnd)) {
              toast.error("ROI lines cannot cross each other!");
              return;
            }
          }

          setCoords(closedCoords);
          setDrawing(false);
          setDetailsModal(true);
          return;
        }
      }

      setCoords(updated);
      setDrawing(true);
    },
    [coords, drawing, selectedRoi, boundaryMode],
  );

  const removeROI = useCallback(
    async (id: string) => {
      try {
        // Call the delete API first
        if (!id.startsWith("temp-")) {
          await deleteRoi(id);
        }

        // After successful API call, update local state
        if (id === selectedRoi) {
          setSelectedRoi(null);
        }

        setSaved((p) => p.filter((r) => r.id !== id));
      } catch (error) {
        console.error("Failed to delete ROI:", error);
      }
    },
    [selectedRoi, deleteRoi]
  );
  /** ----------------------------------------------------------------
   *  Save handlers (same as before)
   *  ----------------------------------------------------------------*/
  const saveDetails = async () => {
    if (!roiName.trim()) return toast.error("Please enter a ROI name");
    if (coords.length < 3) return toast.error("Draw a complete polygon.");

    const newName = roiName.trim().toLowerCase();
    const duplicate = saved.some((roi) => roi.name.trim().toLowerCase() === newName);

    if (duplicate) {
      toast.error("An ROI with this name already exists");
      return;
    }

    const finalCoords =
      coords.length > 3 &&
        Math.abs(coords[0].x - coords.at(-1)!.x) < 0.01 &&
        Math.abs(coords[0].y - coords.at(-1)!.y) < 0.01
        ? coords.slice(0, -1)
        : coords;

    try {
      const width = canvasRef.current!.width;
      const height = canvasRef.current!.height;
      const normalizedCoords = normalize(finalCoords, width, height);

      const now = new Date().toISOString();

      const createdRoi = await createRoi({
        camera_id: cameraId,
        name: roiName,
        coordinates: normalizedCoords,
        is_full_view: false,
        func_tag_ids: selectedTagIds.filter(Boolean),
        ucs_running: useCaseId ? [useCaseId] : [],
        created_at: now,
      });

      const newRoi = {
        id: createdRoi.id || `roi-${Date.now()}`,
        name: roiName,
        functionalTag: selectedTagIds.join(","),
        coordinates: finalCoords,
        color,
        isFullView: false,
      };

      setSaved((p) => [...p, newRoi]);
      setInitial((p) => [...p, newRoi]);
      setSelectedRoi(newRoi.id);

      setRoiName("");
      setSelectedTagIds([]);
      setCoords([]);
      setDetailsModal(false);

    } catch (err) {
      console.error("Failed to create ROI:", err);
    }
  };

  const persistAll = async () => {
    setDialogOpen(false);
    onClose();
  };

  /** ----------------------------------------------------------------
   *  Effects (same as before)
   *  ----------------------------------------------------------------*/
  useEffect(() => {
    if (!imageRef.current) return;

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

    const onOrientationChange = () => {
      setTimeout(() => {
        alignCanvas();
        draw();
      }, 500); // Longer delay for orientation changes
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientationChange);

    // Handle viewport changes on mobile browsers
    window.addEventListener('scroll', onResize);

    return () => {
      obs.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrientationChange);
      window.removeEventListener('scroll', onResize);
    };
  }, [alignCanvas, draw]);


  useEffect(() => {
    if (cameraId) fetchRois().catch(() => toast.error("Failed to load ROIs"));
  }, [cameraId]);

  useEffect(() => {
    if (!existingRois) return;
    const mapped = existingRois.map((r, i) => ({
      id: r.id,
      name: r.name || `ROI ${i + 1}`,
      functionalTag: r.func_tag_ids?.join(", ") ?? "",
      coordinates: r.coordinates,
      color: COLOR_PALETTE[i % COLOR_PALETTE.length],
      isFullView: r.is_full_view ?? false,
    }));
    setSaved(mapped);
    setInitial(mapped);
  }, [existingRois]);

  useEffect(() => {
    if (!imageRef.current) return;
    const obs = new ResizeObserver(() => {
      alignCanvas();
      draw();
    });
    obs.observe(imageRef.current);
    return () => obs.disconnect();
  }, [alignCanvas]);

  useEffect(() => {
    draw();
  }, [coords, saved, selectedRoi, drawing, hoverPos]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawing) {
        setCoords([]);
        setDrawing(false);
        setHoverPos(null);
        setIsNearStart(false);
        setCursor("default");
        draw();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [drawing]);

  /** ----------------------------------------------------------------
   *  Render
   *  ----------------------------------------------------------------*/
  return (
    <>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (submitting) return;

          if (!open) {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            setDialogOpen(false);
            setTimeout(() => onClose(), 100);
          }
        }}
      >
        <DialogContent className="w-[70vw] max-w-4xl rounded-2xl bg-white p-0 shadow-2xl border-0 overflow-hidden max-h-[95vh] min-h-[50vh]">
          <DialogHeader className="">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                {boundaryMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToROIList}
                    className="h-8 w-8 p-0 hover:bg-white/80 rounded-full"
                  >
                    <ArrowLeft style={{ width: '24px', height: '24px', color: "#58595cff" }} />
                  </Button>
                )}
                <div>
                  <DialogTitle className="text-lg md:text-xl font-semibold text-gray-900">
                    {boundaryMode ? "Set-Up Boundaries" : "Define ROI"} for Camera {cameraName}
                  </DialogTitle>
                  {boundaryMode && selectedRoiForConfig && (
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      ROI: <span className="font-medium text-teal-700">{selectedRoiForConfig.name}</span>
                    </p>
                  )}
                </div>
              </div>


            </div>
          </DialogHeader>


          <div className={`flex flex-col lg:flex-row transition-all duration-700 ease-in-out ${boundaryMode ? 'transform' : ''} overflow-y-auto max-h-[calc(95vh-4rem)]`}>
            {/* Left side - Image */}
            <div className={`relative transition-all duration-700 ease-in-out
             ${boundaryMode ? 'lg:w-1/4 w-full' : 'w-2/3'
              } order-1 lg:order-1`}>
              <div className="h-[40vh] lg:h-full ">

                <div className="relative w-full h-auto rounded-xl overflow-hidden flex items-center justify-center">
                  {roisLoading ? (
                    <div className="flex h-full flex-col items-center justify-center text-gray-500">
                      <Loader2 className="mb-3 h-8 w-8 animate-spin text-teal-600" />
                      <p className="font-medium">Loading ROIs...</p>
                    </div>
                  ) : imageUrl ? (
                    <>
                      <img
                        ref={imageRef}
                        src={imageUrl}
                        alt="ROI Source"
                        onLoad={() => {
                          setImageLoaded(true);
                          setTimeout(() => {
                            alignCanvas();
                            if (saved.length > 0) {
                              const needsConversion = saved.some(
                                (r) => r.coordinates.length > 0 && isNormalized(r.coordinates),
                              );

                              if (needsConversion) {
                                setSaved((prev) =>
                                  prev.map((r) => ({
                                    ...r,
                                    coordinates: isNormalized(r.coordinates)
                                      ? denormalize(
                                        r.coordinates,
                                        canvasRef.current!.width,
                                        canvasRef.current!.height,
                                      )
                                      : r.coordinates,
                                  })),
                                );
                              }
                            }
                            draw();
                          }, 100);
                        }}
                        className="w-full h-full object-contain max-w-full max-h-full"
                      />
                      <div ref={containerRef} className="absolute top-0 left-0 h-full w-full">
                        <canvas
                          ref={canvasRef}
                          onClick={onCanvasClick}
                          onMouseMove={onMouseMove}
                          onMouseEnter={() => {
                            if (pointerRef.current) pointerRef.current.style.display = "block";
                            setCursor(drawing && !boundaryMode ? "crosshair" : "default");
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (drawing && !boundaryMode) {
                              setCoords([]);
                              setDrawing(false);
                              setHoverPos(null);
                              setIsNearStart(false);
                              setCursor("default");
                              draw();
                            }
                          }}
                          onMouseLeave={() => {
                            if (pointerRef.current) pointerRef.current.style.display = "none";
                            setIsNearStart(false);
                            setCursor("default");
                          }}
                          className="absolute top-0 left-0 h-full w-full"
                          style={{ cursor: boundaryMode ? "default" : cursor }}
                        />
                      </div>
                      {isNearStart && coords.length > 2 && !boundaryMode && (
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm shadow-lg border">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                            Click here to complete polygon
                          </div>
                        </div>
                      )}
                      <div
                        ref={pointerRef}
                        className="pointer-events-none absolute hidden h-4 w-4"
                        style={{ transform: "translate(-50%, -50%)" }}
                      />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-500">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Settings className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium">No camera image available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                {imageLoaded && imageUrl && !boundaryMode && (
                  <div className=" bg-white/80 backdrop-blur-sm rounded-lg p-1 md:p-1 border border-white/20 shadow-sm">
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <p className="font-medium text-gray-800 text-sm md:text-base">Instructions:</p>
                      {coords.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetDrawing}
                          className="h-6 px-2 text-xs bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2 text-xs md:text-sm text-gray-600">
                      <div>• Click to start drawing ROI</div>
                      <div>• Continue clicking to add points</div>
                      <div>• Close ROI by clicking near first point</div>
                      <div>• Select ROI from list to highlight</div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            <div className={`bg-white transition-all duration-700 ease-in-out transform ${boundaryMode
              ? 'lg:w-3/4 w-full translate-x-0 opacity-100'
              : 'lg:w-1/3 w-full translate-x-0 opacity-100'
              } order-2 lg:order-2 max-h-[40vh] lg:max-h-none overflow-y-auto`}>

              {boundaryMode && selectedRoiForConfig ? (
                <BoundaryConfigPanel
                  boundarySetupModal={boundarySetupModal}
                  roi={selectedRoiForConfig}
                  siteId={siteId}
                  imageUrl={imageUrl}
                  onBoundarySetup={handleBoundarySetup}
                />
              ) : (
                <div className="h-full flex flex-col">
                  <div className="p-1 md:p-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">Saved ROIs</h3>

                  </div>

                  <div className="flex-1 overflow-hidden">
                    {saved.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-3 md:p-6 text-center">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-2xl flex items-center justify-center mb-3 md:mb-4">
                          <Settings className="w-6 h-6 md:w-8 md:h-8 text-teal-600" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1 md:mb-2 text-sm md:text-base">No ROIs defined yet</h4>
                        <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                          Start by drawing a region of interest on the camera image to configure monitoring zones.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 md:p-6">
                        <ROIList
                          rois={saved
                            .filter((roi) => !roi.isFullView)
                            .map((roi) => ({
                              ...roi,
                              functionalTag: roi.functionalTag
                                .split(",")
                                .map((id) => {
                                  const cleanId = id.trim();
                                  const tag = availableFunctionalTags.find((t) => t.id === cleanId);
                                  return tag ? tag.name : `Unknown Tag (${cleanId})`;
                                })
                                .join(", "),
                            }))}
                          onDeleteROI={removeROI}
                          selectedROIId={selectedRoi}
                          onSelect={(id) => {
                            setSelectedRoi(id === selectedRoi ? null : id);
                          }}
                          onConfigureBoundaries={handleConfigureBoundaries}

                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ROI Details Modal */}
      <ROIDetailsModal
        open={detailsModal}
        roiName={roiName}
        selectedTagIds={selectedTagIds}
        availableTags={availableFunctionalTags}
        onNameChange={(e) => setRoiName(e.target.value)}
        onTagToggle={(id) => {
          setSelectedTagIds((prev) =>
            prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id],
          );
        }}
        onSave={saveDetails}
        onCancel={() => {
          setRoiName("");
          setSelectedTagIds([]);
          setCoords([]);
          setDetailsModal(false);
        }}
      />

      {/* Boundary Setup Modal */}
      <BoundarySetupModal
        open={boundarySetupModal}
        onClose={() => setBoundarySetupModal(false)}
        boundaryName={selectedBoundary.name}
        direction={selectedBoundary.direction}
        siteId={siteId}
        imageUrl={imageUrl} 
        onSave={(config) => {
          setBoundarySetupModal(false);
          if (selectedRoiForConfig?.id) {
            fetchEdges(selectedRoiForConfig.id).then((edges) => {
              setExistingEdges(edges || []);
            });
          }
        }}
        roi={selectedRoiForConfig!}
        existingEdges={existingEdges}

        edgeToEdit={selectedEdgeToEdit}
        isEditMode={!!selectedEdgeToEdit}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirm}
        title="Unsaved Changes"
        description="You have unsaved changes. Do you want to save before exiting?"
        primaryButtonText="Save and Exit"
        secondaryButtonText="Exit without Saving"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          persistAll();
        }}
        onSecondary={() => {
          setConfirm(false);
          setIsExitingWithoutSave(true);
          setDialogOpen(false);
          onClose();
        }}
        isLoading={submitting}
      />
    </>
  );
};

export default ROIDefinitionModal;