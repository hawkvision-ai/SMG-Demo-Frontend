// import React, { useState, useRef, useEffect } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { ROI, Coordinate, ROIModalProps, COLOR_PALETTE } from './types';
// import { ColorPalette } from './ColorPalette';
// import { ROIList } from './ROIList';
// import { ROIDetailsModal } from './ROIDetailsModal';

// const ROIDefinitionModal: React.FC<ROIModalProps> = ({
//   cameraId,
//   siteId,
//   onClose,
//   imageUrl
// }) => {
//   // Internal states
//   const [open, setOpen] = useState(true);

//   // Drawing-related states
//   const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
//   const [color, setColor] = useState(COLOR_PALETTE[0]);
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [isNearStart, setIsNearStart] = useState(false);
//   const [mousePosition, setMousePosition] = useState<Coordinate | null>(null);
//   const [cursorStyle, setCursorStyle] = useState("default");

//   // For holding all saved ROIs
//   const [savedROIs, setSavedROIs] = useState<ROI[]>([]);

//   // For ROI details modal
//   const [showDetailsModal, setShowDetailsModal] = useState(false);
//   const [roiName, setRoiName] = useState('');
//   const [functionalTags, setFunctionalTags] = useState<string[]>([]);
//   const [tagInput, setTagInput] = useState("");

//   // Keep canvas refs in the main component
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const imageRef = useRef<HTMLImageElement>(null);
//   const sketchPointerRef = useRef<HTMLDivElement>(null);

//   // Helper methods
//   const getCentroid = (pts: Coordinate[]) => {
//     const sum = pts.reduce((acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
//     return { x: sum.x / pts.length, y: sum.y / pts.length };
//   };

//   const doLinesIntersect = (p1: Coordinate, p2: Coordinate, p3: Coordinate, p4: Coordinate) => {
//     const ccw = (a: any, b: any, c: any) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
//     return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
//   };

//   // Event handlers
//   const handleImageLoad = () => {
//     if (imageRef.current && canvasRef.current) {
//       const canvas = canvasRef.current;
//       const img = imageRef.current;
//       canvas.width = img.naturalWidth;
//       canvas.height = img.naturalHeight;
//       drawAll();
//     }
//   };

//   const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (!canvasRef.current || !isDrawing || coordinates.length === 0) return;

//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();
//     const x = (e.clientX - rect.left) / rect.width;
//     const y = (e.clientY - rect.top) / rect.height;

//     // Update sketch pointer position if needed
//     if (sketchPointerRef.current) {
//       sketchPointerRef.current.style.left = `${e.clientX}px`;
//       sketchPointerRef.current.style.top = `${e.clientY}px`;
//     }

//     // Check if near starting point to close the polygon
//     if (coordinates.length >= 3) {
//       const firstPoint = coordinates[0];
//       const distance = Math.sqrt(Math.pow(firstPoint.x - x, 2) + Math.pow(firstPoint.y - y, 2));
//       const isNear = distance < 0.02;
//       setIsNearStart(isNear);
//       setCursorStyle(isNear ? "pointer" : "crosshair");
//     }

//     setMousePosition({ x, y });
//     drawAll([...coordinates, { x, y }]);
//   };

//   const handleMouseEnter = () => {
//     if (sketchPointerRef.current) {
//       sketchPointerRef.current.style.display = 'block';
//     }
//     setCursorStyle("crosshair");
//   };

//   const handleMouseLeave = () => {
//     if (sketchPointerRef.current) {
//       sketchPointerRef.current.style.display = 'none';
//     }
//     setIsNearStart(false);
//     setCursorStyle("default");
//   };

//   const removeTag = (tag: string) => {
//     setFunctionalTags(functionalTags.filter((t) => t !== tag));
//   };

//   const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     if (value.includes(",") || value.includes("#")) {
//       const newTag = value.replace(/[,#]/g, "").trim();
//       if (newTag && !functionalTags.includes(newTag)) {
//         setFunctionalTags([...functionalTags, newTag]);
//       }
//       setTagInput("");
//     } else {
//       setTagInput(value);
//     }
//   };

//   const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (!canvasRef.current) return;
//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();
//     const x = (e.clientX - rect.left) / rect.width;
//     const y = (e.clientY - rect.top) / rect.height;
//     const newPoint = { x, y };

//     // If a closed polygon is already present waiting for ROI details, do not add more points.
//     if (coordinates.length > 2 &&
//       Math.abs(coordinates[0].x - coordinates[coordinates.length - 1].x) < 0.01 &&
//       Math.abs(coordinates[0].y - coordinates[coordinates.length - 1].y) < 0.01) {
//       return;
//     }

//     // Validate line intersections (if needed)
//     if (coordinates.length >= 2) {
//       for (let i = 0; i < coordinates.length - 2; i++) {
//         const segmentStart = coordinates[i];
//         const segmentEnd = coordinates[i + 1];
//         if (doLinesIntersect(segmentStart, segmentEnd, coordinates[coordinates.length - 1], newPoint)) {
//           alert("Invalid point! This line intersects with another line.");
//           return;
//         }
//       }
//     }

//     const newCoords = [...coordinates, newPoint];

//     // Check if polygon is being closed (by clicking near the starting point)
//     if (newCoords.length >= 3) {
//       const first = newCoords[0];
//       const last = newPoint;
//       const distance = Math.sqrt(Math.pow(first.x - last.x, 2) + Math.pow(first.y - last.y, 2));
//       if (distance < 0.05) {
//         // Close the polygon and open the details modal
//         const closedPolygon = [...newCoords.slice(0, -1), first];
//         setCoordinates(closedPolygon);
//         setIsDrawing(false);
//         drawAll(closedPolygon);
//         setShowDetailsModal(true);
//         return;
//       }
//     }

//     setCoordinates(newCoords);
//     setIsDrawing(true);
//   };

//   const resetDrawing = () => {
//     setCoordinates([]);
//     setIsDrawing(false);
//     setMousePosition(null);
//     setIsNearStart(false);
//     if (canvasRef.current) {
//       const ctx = canvasRef.current.getContext('2d');
//       if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
//     }
//     drawAll();
//   };

//   const handleSaveDetails = () => {
//     if (!roiName.trim()) {
//       alert('Please enter a ROI name');
//       return;
//     }
//     if (coordinates.length < 3) {
//       alert('Invalid polygon. Please draw a complete polygon.');
//       return;
//     }

//     // Remove duplicate closing point if present
//     const finalCoordinates = coordinates.length > 3 &&
//       Math.abs(coordinates[0].x - coordinates[coordinates.length - 1].x) < 0.01 &&
//       Math.abs(coordinates[0].y - coordinates[coordinates.length - 1].y) < 0.01
//       ? coordinates.slice(0, -1)
//       : coordinates;

//     const newROI: ROI = {
//       name: roiName,
//       functionalTag: functionalTags.join(", "),
//       coordinates: finalCoordinates,
//       color
//     };

//     // Add ROI to saved list
//     setSavedROIs(prev => [...prev, newROI]);

//     // Reset details and drawing state but keep the main ROI modal open.
//     setRoiName('');
//     setFunctionalTags([]);
//     setTagInput("");
//     setCoordinates([]);
//     setShowDetailsModal(false);
//     drawAll();
//   };

//   const handleCancelDetails = () => {
//     setRoiName('');
//     setFunctionalTags([]);
//     setTagInput("");
//     setCoordinates([]);
//     setShowDetailsModal(false);
//     drawAll();
//   };

//   const handleModalClose = () => {
//     setOpen(false);
//     onClose();
//   };

//   // Drawing function
//   const drawAll = (tempCoords?: Coordinate[]) => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;

//     // Clear canvas
//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     // Draw saved ROIs first
//     savedROIs.forEach((roi) => {
//       ctx.beginPath();
//       ctx.strokeStyle = roi.color;
//       ctx.lineWidth = 2;
//       ctx.fillStyle = `${roi.color}70`;
//       roi.coordinates.forEach((coord, index) => {
//         const x = coord.x * canvas.width;
//         const y = coord.y * canvas.height;
//         index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
//       });
//       ctx.closePath();
//       ctx.fill();
//       ctx.stroke();

//       // Draw point labels
//       const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
//       roi.coordinates.forEach((coord, index) => {
//         const x = coord.x * canvas.width;
//         const y = coord.y * canvas.height;
//         ctx.beginPath();
//         ctx.arc(x, y, 5, 0, Math.PI * 2);
//         ctx.fillStyle = roi.color;
//         ctx.fill();
//         ctx.fillStyle = "white";
//         ctx.font = "36px sans-serif";
//         ctx.textAlign = "center";
//         ctx.textBaseline = "middle";
//         ctx.fillText(labels[index] || '', x, y);
//       });

//       // Draw ROI name and tags at centroid
//       const centroid = getCentroid(roi.coordinates);
//       ctx.fillStyle = "white";
//       ctx.font = "36px sans-serif";
//       ctx.textAlign = "center";
//       ctx.textBaseline = "middle";
//       ctx.fillText(`${roi.name}`, centroid.x * canvas.width, centroid.y * canvas.height);
//     });

//     // Draw current polygon
//     const coordsToDraw = tempCoords || coordinates;
//     if (coordsToDraw.length === 0) return;
//     ctx.beginPath();
//     ctx.strokeStyle = color;
//     ctx.lineWidth = 2;
//     ctx.fillStyle = `${color}70`;
//     coordsToDraw.forEach((coord, index) => {
//       const x = coord.x * canvas.width;
//       const y = coord.y * canvas.height;
//       index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
//     });

//     // Detect if current polygon is closed
//     const isClosed = coordsToDraw.length >= 3 &&
//       Math.abs(coordsToDraw[0].x - coordsToDraw[coordsToDraw.length - 1].x) < 0.01 &&
//       Math.abs(coordsToDraw[0].y - coordsToDraw[coordsToDraw.length - 1].y) < 0.01;
//     if (isClosed) {
//       ctx.closePath();
//       ctx.fill();
//     }
//     ctx.stroke();

//     // Draw point labels for current polygon
//     const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
//     coordsToDraw.forEach((coord, index) => {
//       const x = coord.x * canvas.width;
//       const y = coord.y * canvas.height;
//       ctx.beginPath();
//       ctx.arc(x, y, 5, 0, Math.PI * 2);
//       ctx.fillStyle = color;
//       ctx.fill();
//       ctx.fillStyle = "white";
//       ctx.font = "12px sans-serif";
//       ctx.textAlign = "center";
//       ctx.textBaseline = "middle";
//       ctx.fillText(labels[index] || '', x, y);
//     });

//     // Draw preview line if drawing and mouse position exists
//     if (isDrawing && mousePosition && coordsToDraw.length > 0) {
//       const lastCoord = coordsToDraw[coordsToDraw.length - 1];
//       ctx.beginPath();
//       ctx.moveTo(lastCoord.x * canvas.width, lastCoord.y * canvas.height);
//       ctx.lineTo(mousePosition.x * canvas.width, mousePosition.y * canvas.height);
//       ctx.strokeStyle = `${color}80`;
//       ctx.stroke();
//     }
//   };

//   // Effects
//   useEffect(() => {
//     if (!open) {
//       resetDrawing();
//       setSavedROIs([]);
//     }
//   }, [open]);

//   useEffect(() => {
//     drawAll();
//   }, [coordinates, color, isDrawing, mousePosition, savedROIs]);

//   return (
//     <>
//       <Dialog open={open} onOpenChange={handleModalClose}>
//         <DialogContent className="flex flex-col bg-white rounded-lg shadow-lg w-full max-w-3xl p-5">
//           <DialogHeader>
//             <DialogTitle>Define ROI for Camera {cameraId}</DialogTitle>
//           </DialogHeader>
//           <div className="pr-4 flex-1">
//             {/* Canvas drawing - kept directly in this component */}
//             <div className="relative w-full">
//               {imageUrl ? (
//                 <>
//                   <img
//                     ref={imageRef}
//                     src={imageUrl}
//                     alt="ROI Source"
//                     onLoad={handleImageLoad}
//                   />
//                   <canvas
//                     ref={canvasRef}
//                     onClick={handleCanvasClick}
//                     onMouseMove={handleMouseMove}
//                     onMouseEnter={handleMouseEnter}
//                     onMouseLeave={handleMouseLeave}
//                     className="absolute top-0 left-0 w-full h-full"
//                     style={{
//                       backgroundImage: `url(${imageUrl})`,
//                       backgroundSize: 'contain',
//                       backgroundRepeat: 'no-repeat',
//                       backgroundPosition: 'center',
//                       cursor: cursorStyle
//                     }}
//                   />
//                   {isNearStart && coordinates.length > 2 && (
//                     <div className="absolute top-2 left-2 bg-white bg-opacity-75 px-2 py-1 rounded text-sm">
//                       Click here to complete polygon
//                     </div>
//                   )}
//                   <div ref={sketchPointerRef} className="absolute hidden w-4 h-4 pointer-events-none" style={{ transform: 'translate(-50%, -50%)' }}></div>
//                 </>
//               ) : (
//                 <div className="flex items-center justify-center h-40 text-gray-500">
//                   Loading camera image...
//                 </div>
//               )}
//             </div>

//             {/* Color Selection - using extracted component */}
//             <ColorPalette
//               selectedColor={color}
//               onColorSelect={setColor}
//             />

//             {/* Action buttons */}
//             <div className="flex justify-between mt-4">
//               <Button variant="outline" onClick={resetDrawing}>
//                 New ROI
//               </Button>
//               <Button variant="outline" onClick={handleModalClose}>
//                 Close
//               </Button>
//             </div>

//             {/* ROI List - using extracted component */}
//             <ROIList rois={savedROIs} />
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* ROI Details Modal - using extracted component */}
//       <ROIDetailsModal
//         open={showDetailsModal}
//         roiName={roiName}
//         functionalTags={functionalTags}
//         tagInput={tagInput}
//         onNameChange={(e) => setRoiName(e.target.value)}
//         onTagInputChange={handleTagInput}
//         onRemoveTag={removeTag}
//         onSave={handleSaveDetails}
//         onCancel={handleCancelDetails}
//       />
//     </>
//   );
// };

// export default ROIDefinitionModal;
