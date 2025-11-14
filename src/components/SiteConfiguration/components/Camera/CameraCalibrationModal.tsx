import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, Loader2, RotateCcw } from "lucide-react";
import { Matrix, SVD } from "ml-matrix";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ------------------------------------------------------------------
 *  Types
 *  ------------------------------------------------------------------*/
interface Point {
  x: number;
  y: number;
}

interface Rectangle {
  points: [Point, Point, Point, Point];
  width: number;
  height: number;
}

interface VerificationLine {
  id: string;
  startPoint: Point;
  endPoint: Point;
  actualLength: number;
  predictedLength: number;
  accuracy: number;
}

interface LineCalibrationProps {
  cameraId?: string;
  onClose: () => void;
  imageUrl: string;
  onSave?: (calibration: {
    rectangle: {
      points: [
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
      ];
      width: number;
      height: number;
    };
    homography_matrix: number[][];
    meters_per_pixel: number;
  }) => void;
  initialConfig?: {
    rectangle: {
      points: [
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
      ];
      width: number;
      height: number;
    };
  };
  cameraName: string;
  editable?: boolean;
}

/** ------------------------------------------------------------------
 *  Utility functions
 *  ------------------------------------------------------------------*/
const calculateDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
};

/**
 * Transform point using homography matrix
 */
const transformPoint = (point: Point, homographyMatrix: number[][]): Point => {
  const [x, y] = [point.x, point.y];

  // Apply homography transformation
  const w = homographyMatrix[2][0] * x + homographyMatrix[2][1] * y + homographyMatrix[2][2];
  const transformedX =
    (homographyMatrix[0][0] * x + homographyMatrix[0][1] * y + homographyMatrix[0][2]) / w;
  const transformedY =
    (homographyMatrix[1][0] * x + homographyMatrix[1][1] * y + homographyMatrix[1][2]) / w;

  return { x: transformedX, y: transformedY };
};

/**
 * Calculate real-world distance between two points using homography
 */
const calculateRealWorldDistance = (p1: Point, p2: Point, homographyMatrix: number[][]): number => {
  const transformedP1 = transformPoint(p1, homographyMatrix);
  const transformedP2 = transformPoint(p2, homographyMatrix);

  return calculateDistance(transformedP1, transformedP2);
};

/**
 * ROBUST point ordering function - orders points ONCE and consistently
 */
const orderPointsOnce = (points: Point[]): [Point, Point, Point, Point] => {
  if (points.length !== 4) {
    throw new Error("Expected exactly 4 points to identify corners");
  }

  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  const pointsWithAngles = points.map((point, originalIndex) => ({
    point,
    angle: Math.atan2(point.y - centerY, point.x - centerX),
    originalIndex,
  }));

  pointsWithAngles.sort((a, b) => {
    const angleDiff = a.angle - b.angle;
    if (Math.abs(angleDiff) < 0.01) {
      return a.originalIndex - b.originalIndex;
    }
    return angleDiff;
  });

  let topLeftIndex = 0;
  let minSum = pointsWithAngles[0].point.x + pointsWithAngles[0].point.y;

  for (let i = 1; i < 4; i++) {
    const sum = pointsWithAngles[i].point.x + pointsWithAngles[i].point.y;
    if (sum < minSum) {
      minSum = sum;
      topLeftIndex = i;
    }
  }

  const orderedPoints: Point[] = [];
  for (let i = 0; i < 4; i++) {
    const index = (topLeftIndex + i) % 4;
    orderedPoints.push(pointsWithAngles[index].point);
  }

  return orderedPoints as [Point, Point, Point, Point];
};

/**
 * UPDATED computeHomography - uses points AS-IS without reordering
 */
const computeHomography = (
  rectangle: Rectangle,
): {
  homographyMatrix: number[][];
  metersPerPixel: number;
} => {
  if (!rectangle || !rectangle.points || rectangle.points.length !== 4) {
    return {
      homographyMatrix: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      metersPerPixel: 1,
    };
  }

  const orderedPoints = rectangle.points;
  const { width: realWidth, height: realHeight } = rectangle;

  const dst: Point[] = [
    { x: 0, y: 0 },
    { x: 0, y: realHeight },
    { x: realWidth, y: realHeight },
    { x: realWidth, y: 0 },
  ];

  const A: number[][] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = orderedPoints[i];
    const { x: u, y: v } = dst[i];

    A.push([-x, -y, -1, 0, 0, 0, x * u, y * u, u]);
    A.push([0, 0, 0, -x, -y, -1, x * v, y * v, v]);
  }

  const matrixA = new Matrix(A);
  const svd = new SVD(matrixA);
  const V = svd.rightSingularVectors;
  const svValues = svd.diagonal;
  const smallestSVIndex = svValues.indexOf(Math.min(...svValues));

  const h: number[] = [];
  for (let i = 0; i < V.rows; i++) {
    h.push(V.get(i, smallestSVIndex));
  }

  const H = [
    [h[3], h[4], h[5]],
    [h[0], h[1], h[2]],
    [h[6], h[7], h[8]],
  ];

  const scale = H[2][2];
  if (scale !== 0) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        H[i][j] /= scale;
      }
    }
  }

  const pixelWidth = calculateDistance(orderedPoints[0], orderedPoints[3]);
  const pixelHeight = calculateDistance(orderedPoints[0], orderedPoints[1]);

  if (pixelWidth === 0 || pixelHeight === 0) {
    throw new Error("Invalid region: zero width or height");
  }

  const widthMPP = realWidth / pixelWidth;
  const heightMPP = realHeight / pixelHeight;
  const metersPerPixel = (widthMPP + heightMPP) / 2;

  return {
    homographyMatrix: H,
    metersPerPixel,
  };
};

/** ------------------------------------------------------------------
 *  Component
 *  ------------------------------------------------------------------*/
const CameraCalibrationModal: React.FC<LineCalibrationProps> = ({
  onClose,
  imageUrl = "https://media.istockphoto.com/id/536557515/photo/secure-metal-industrial-building.jpg?s=612x612&w=0&k=20&c=Tkzye3TdwB5zBQAUVYibzkc_cfAVhf-mZf2I2a_vlcU=",
  onSave,
  initialConfig,
  cameraName,
  editable = true,
}) => {
  // Add new state for help dialog
  const [showGuide, setShowGuide] = useState(false);

  // State
  const [dialogOpen, setDialogOpen] = useState(true);
  const [rectangle, setRectangle] = useState<Rectangle | null>(null);
  const [initialRectangle, setInitialRectangle] = useState<Rectangle | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [dimensionError, setDimensionError] = useState<string[]>(["", ""]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isExitingWithoutSave, setIsExitingWithoutSave] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Verification state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationLines, setVerificationLines] = useState<VerificationLine[]>([]);
  const [currentVerificationLine, setCurrentVerificationLine] = useState<{
    startPoint: Point | null;
    endPoint: Point | null;
  }>({ startPoint: null, endPoint: null });
  const [showInputOverlay, setShowInputOverlay] = useState(false);
  const [overlayInput, setOverlayInput] = useState("");
  const [overlayPosition, setOverlayPosition] = useState<Point>({ x: 0, y: 0 });
  const [homographyMatrix, setHomographyMatrix] = useState<number[][]>([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const widthInputRef = useRef<HTMLInputElement>(null);
  const heightInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  // Derived values
  const hasChanges = useMemo(() => {
    if (!rectangle && !initialRectangle) return false;
    if (!rectangle || !initialRectangle) return true;

    if (
      rectangle.width !== initialRectangle.width ||
      rectangle.height !== initialRectangle.height
    ) {
      return true;
    }

    return rectangle.points.some(
      (point, i) =>
        point.x !== initialRectangle.points[i].x || point.y !== initialRectangle.points[i].y,
    );
  }, [rectangle, initialRectangle]);

  const calibrationComplete = useMemo(() => {
    return rectangle !== null && rectangle.width > 0 && rectangle.height > 0;
  }, [rectangle]);

  const verificationAccuracy = useMemo(() => {
    if (verificationLines.length === 0) return null;

    const totalAccuracy = verificationLines.reduce((sum, line) => sum + line.accuracy, 0);
    return totalAccuracy / verificationLines.length;
  }, [verificationLines]);

  // Helper function for point labels
  const getPointLabel = (index: number): string => {
    switch (index) {
      case 0:
        return "A";
      case 1:
        return "B";
      case 2:
        return "C";
      case 3:
        return "D";
      default:
        return "";
    }
  };

  const getLineLabel = (startIdx: number, endIdx: number): string => {
    return `${getPointLabel(startIdx)}${getPointLabel(endIdx)}`;
  };

  // Canvas helpers
  const alignCanvas = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !containerRef.current) return;

    const { clientWidth, clientHeight, naturalWidth, naturalHeight } = imageRef.current;

    // Set container to match displayed image size
    containerRef.current.style.width = `${clientWidth}px`;
    containerRef.current.style.height = `${clientHeight}px`;

    // Set canvas display size to match image
    canvasRef.current.style.width = `${clientWidth}px`;
    canvasRef.current.style.height = `${clientHeight}px`;

    // Set canvas internal resolution to match natural image size
    // This maintains coordinate system consistency
    canvasRef.current.width = naturalWidth;
    canvasRef.current.height = naturalHeight;
  }, []);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleRatio = canvas.width / canvas.clientWidth;

    if (showVerification) {
      // Draw verification mode

      // Draw existing verification lines
      verificationLines.forEach((line, index) => {
        // First draw the white border (thicker line)
        ctx.beginPath();
        ctx.moveTo(line.startPoint.x, line.startPoint.y);
        ctx.lineTo(line.endPoint.x, line.endPoint.y);
        ctx.strokeStyle = "white"; // White border
        ctx.lineWidth = 7 * scaleRatio; // Thicker for border
        ctx.lineCap = "round";
        ctx.stroke();

        // Then draw the actual line (thinner, on top)
        ctx.beginPath();
        ctx.moveTo(line.startPoint.x, line.startPoint.y);
        ctx.lineTo(line.endPoint.x, line.endPoint.y);

        const accuracy = line.accuracy;
        if (accuracy >= 95) {
          ctx.strokeStyle = "#FF0000"; // Teal-800
        } else if (accuracy >= 30) {
          ctx.strokeStyle = "#FF0000"; // Teal-800
        } else {
          ctx.strokeStyle = "#FF0000"; // Teal-800
        }

        ctx.lineWidth = 3 * scaleRatio;
        ctx.lineCap = "round";
        ctx.stroke();

        // Draw line endpoints
        [line.startPoint, line.endPoint].forEach((point) => {
          // Draw white border for endpoints
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8 * scaleRatio, 0, Math.PI * 2);
          ctx.fillStyle = "white";
          ctx.fill();

          // Draw actual endpoint
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6 * scaleRatio, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();

          ctx.fillStyle = "white";
          ctx.font = `bold ${12 * scaleRatio}px system-ui`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText((index + 1).toString(), point.x, point.y);
        });

        // Draw comprehensive line label with measurements
        const midX = (line.startPoint.x + line.endPoint.x) / 2;
        const midY = (line.startPoint.y + line.endPoint.y) / 2;
        const realText = `L${index + 1} Real ${line.actualLength.toFixed(2)}m`;
        const predictedText = `Predicted ${line.predictedLength.toFixed(2)}m`;

        // Set font properties
        ctx.font = `600 ${11 * scaleRatio}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Function to draw text with border
        function drawTextWithBorder(
          text: string,
          x: number,
          y: number,
          fillColor: string = "#E5E4E2",
          strokeColor: string = "#111827",
          lineWidth: number = 3,
        ) {
          if (!ctx) return; // Guard against null context

          // ctx.save();
          // ctx.setLineDash([4 * scaleRatio, 2 * scaleRatio]); // Make the border dotted
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth * scaleRatio;
          ctx.fillStyle = fillColor;

          // Draw the stroke (border)
          ctx.strokeText(text, x, y);
          // ctx.setLineDash([]); // Reset to solid for fill
          // Draw the fill (text)
          ctx.fillText(text, x, y);
          //ctx.restore();
        }

        // Draw real text above the line with border
        drawTextWithBorder(realText, midX, midY - 14 * scaleRatio);

        // Draw predicted text below the line with border
        drawTextWithBorder(predictedText, midX, midY + 14 * scaleRatio);
      });

      // Draw current line being drawn
      if (currentVerificationLine.startPoint) {
        ctx.beginPath();
        ctx.arc(
          currentVerificationLine.startPoint.x,
          currentVerificationLine.startPoint.y,
          6 * scaleRatio,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "#FF0000"; // Red color
        ctx.fill();

        if (currentVerificationLine.endPoint) {
          ctx.arc(
            currentVerificationLine.endPoint.x,
            currentVerificationLine.endPoint.y,
            6 * scaleRatio,
            0,
            Math.PI * 2,
          );
          ctx.fill();

          // Draw white border for current line
          ctx.beginPath();
          ctx.moveTo(currentVerificationLine.startPoint.x, currentVerificationLine.startPoint.y);
          ctx.lineTo(currentVerificationLine.endPoint.x, currentVerificationLine.endPoint.y);
          ctx.strokeStyle = "white";
          ctx.lineWidth = 7 * scaleRatio;
          ctx.lineCap = "round";
          ctx.stroke();

          // Draw actual current line
          ctx.beginPath();
          ctx.moveTo(currentVerificationLine.startPoint.x, currentVerificationLine.startPoint.y);
          ctx.lineTo(currentVerificationLine.endPoint.x, currentVerificationLine.endPoint.y);
          ctx.strokeStyle = "#FF0000"; // Red color
          ctx.lineWidth = 3 * scaleRatio;
          ctx.lineCap = "round";
          ctx.stroke();
        } else if (currentPoint) {
          ctx.beginPath();
          ctx.moveTo(currentVerificationLine.startPoint.x, currentVerificationLine.startPoint.y);
          ctx.lineTo(currentPoint.x, currentPoint.y);
          ctx.strokeStyle = "rgba(13, 148, 136, 0.6)";
          ctx.lineWidth = 2 * scaleRatio;
          ctx.setLineDash([8 * scaleRatio, 4 * scaleRatio]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw hover point
      if (currentPoint && !currentVerificationLine.endPoint) {
        ctx.beginPath();
        ctx.arc(currentPoint.x, currentPoint.y, 4 * scaleRatio, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(13, 148, 136, 0.6)";
        ctx.fill();
      }
    } else {
      // Draw calibration mode
      const displayPoints = rectangle ? rectangle.points : points;
      const isRectangleComplete = rectangle !== null;

      // First, draw all the lines
      if (displayPoints.length >= 2) {
        // Draw lines individually with specific colors
        for (let i = 1; i < displayPoints.length; i++) {
          // Determine line color based on which edge it is
          // AB (height - points 0 to 1) = Red
          // BC (points 1 to 2) = Dark Blue
          // CD (points 2 to 3) = Red
          const isHeightLine = i === 1 || i === 3; // AB or CD

          // Draw white background line first (thicker)
          ctx.beginPath();
          ctx.moveTo(displayPoints[i - 1].x, displayPoints[i - 1].y);
          ctx.lineTo(displayPoints[i].x, displayPoints[i].y);
          ctx.strokeStyle = "white";
          ctx.lineWidth = 10 * scaleRatio;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();

          // Draw dashed colored line on top
          ctx.beginPath();
          ctx.moveTo(displayPoints[i - 1].x, displayPoints[i - 1].y);
          ctx.lineTo(displayPoints[i].x, displayPoints[i].y);

          if (isRectangleComplete) {
            ctx.strokeStyle = isHeightLine ? "#dc2626" : "#1e40af"; // Red for height, Dark blue for width
          } else {
            ctx.strokeStyle = "#0d9488"; // Teal for incomplete
          }

          ctx.lineWidth = 6 * scaleRatio;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.setLineDash([12 * scaleRatio, 8 * scaleRatio]); // Dashed pattern
          ctx.stroke();
          ctx.setLineDash([]); // Reset dash

          if (isRectangleComplete && displayPoints.length > 1) {
            const prevIdx = i - 1;
            const midX = (displayPoints[prevIdx].x + displayPoints[i].x) / 2;
            const midY = (displayPoints[prevIdx].y + displayPoints[i].y) / 2;

            const lineLabel = getLineLabel(prevIdx, i);
            const textMetrics = ctx.measureText(lineLabel);
            const textWidth = textMetrics.width;

            ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            ctx.fillRect(
              midX - textWidth / 2 - 8 * scaleRatio,
              midY - 12 * scaleRatio,
              textWidth + 16 * scaleRatio,
              24 * scaleRatio,
            );

            ctx.fillStyle = "white";
            ctx.font = `600 ${13 * scaleRatio}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(lineLabel, midX, midY);
          }
        }

        if (displayPoints.length === 4) {
          // Draw the closing line (DA - width line)

          // Draw white background line first (thicker)
          ctx.beginPath();
          ctx.moveTo(displayPoints[3].x, displayPoints[3].y);
          ctx.lineTo(displayPoints[0].x, displayPoints[0].y);
          ctx.strokeStyle = "white";
          ctx.lineWidth = 10 * scaleRatio;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();

          // Draw dashed colored line on top
          ctx.beginPath();
          ctx.moveTo(displayPoints[3].x, displayPoints[3].y);
          ctx.lineTo(displayPoints[0].x, displayPoints[0].y);

          if (isRectangleComplete) {
            ctx.strokeStyle = "#1e40af"; // Dark blue for width (DA)
          } else {
            ctx.strokeStyle = "#0d9488";
          }

          ctx.lineWidth = 6 * scaleRatio;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.setLineDash([12 * scaleRatio, 8 * scaleRatio]); // Dashed pattern
          ctx.stroke();
          ctx.setLineDash([]); // Reset dash

          if (isRectangleComplete) {
            const midX = (displayPoints[displayPoints.length - 1].x + displayPoints[0].x) / 2;
            const midY = (displayPoints[displayPoints.length - 1].y + displayPoints[0].y) / 2;

            const lineLabel = getLineLabel(displayPoints.length - 1, 0);
            const textMetrics = ctx.measureText(lineLabel);
            const textWidth = textMetrics.width;

            ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            ctx.fillRect(
              midX - textWidth / 2 - 8 * scaleRatio,
              midY - 12 * scaleRatio,
              textWidth + 16 * scaleRatio,
              24 * scaleRatio,
            );

            ctx.fillStyle = "white";
            ctx.font = `600 ${13 * scaleRatio}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(lineLabel, midX, midY);
          }
        }
      }

      // Then, draw all the corner points on top of the lines
      displayPoints.forEach((point, index) => {
        // Draw white border circle first (larger)
        ctx.beginPath();
        ctx.arc(point.x, point.y, 12 * scaleRatio, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        // Draw the colored circle
        ctx.beginPath();
        ctx.arc(point.x, point.y, 10 * scaleRatio, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(
          point.x,
          point.y,
          0,
          point.x,
          point.y,
          10 * scaleRatio,
        );
        gradient.addColorStop(0, "#0d9488");
        gradient.addColorStop(1, "#134e4a");
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 6 * scaleRatio;
        ctx.shadowOffsetX = 2 * scaleRatio;
        ctx.shadowOffsetY = 2 * scaleRatio;
        ctx.fill();
        ctx.shadowColor = "transparent";

        // Draw the label with stroke for better visibility
        if (isRectangleComplete) {
          ctx.strokeStyle = "#134e4a";
          ctx.lineWidth = 3 * scaleRatio;
          ctx.font = `bold ${16 * scaleRatio}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.strokeText(getPointLabel(index), point.x, point.y);

          ctx.fillStyle = "white";
          ctx.fillText(getPointLabel(index), point.x, point.y);
        } else {
          ctx.strokeStyle = "#134e4a";
          ctx.lineWidth = 3 * scaleRatio;
          ctx.font = `bold ${14 * scaleRatio}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.strokeText((index + 1).toString(), point.x, point.y);

          ctx.fillStyle = "white";
          ctx.fillText((index + 1).toString(), point.x, point.y);
        }
      });

      if (currentPoint && points.length < 4) {
        ctx.beginPath();
        ctx.arc(currentPoint.x, currentPoint.y, 4 * scaleRatio, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(13, 148, 136, 0.6)";
        ctx.fill();
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 2 * scaleRatio;
        ctx.stroke();
      }

      if (currentPoint && points.length > 0 && points.length < 4) {
        const lastPoint = points[points.length - 1];

        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.strokeStyle = "rgba(13, 148, 136, 0.6)";
        ctx.lineWidth = 2 * scaleRatio;
        ctx.setLineDash([8 * scaleRatio, 4 * scaleRatio]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (points.length === 3) {
          ctx.beginPath();
          ctx.moveTo(currentPoint.x, currentPoint.y);
          ctx.lineTo(points[0].x, points[0].y);
          ctx.strokeStyle = "rgba(13, 148, 136, 0.4)";
          ctx.lineWidth = 2 * scaleRatio;
          ctx.setLineDash([8 * scaleRatio, 4 * scaleRatio]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }, [
    points,
    rectangle,
    currentPoint,
    calibrationComplete,
    editable,
    showVerification,
    verificationLines,
    currentVerificationLine,
  ]);

  // Mouse handlers
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

  const translateToScreen = (point: Point) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.clientWidth / canvasRef.current.width;
    const scaleY = canvasRef.current.clientHeight / canvasRef.current.height;
    return {
      x: point.x * scaleX + rect.left,
      y: point.y * scaleY + rect.top,
    };
  };

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = translateEvent(e);
    setCurrentPoint(pos);
  }, []);
  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!editable) return;

      const pos = translateEvent(e);

      if (showVerification) {
        // Verification mode - drawing lines
        if (verificationLines.length >= 3) return; // Max 3 lines

        if (!currentVerificationLine.startPoint) {
          setCurrentVerificationLine({ startPoint: pos, endPoint: null });
        } else if (!currentVerificationLine.endPoint) {
          setCurrentVerificationLine((prev) => ({ ...prev, endPoint: pos }));

          // Calculate midpoint
          const midPoint = {
            x: (currentVerificationLine.startPoint.x + pos.x) / 2,
            y: (currentVerificationLine.startPoint.y + pos.y) / 2,
          };
          const screenPoint = translateToScreen(midPoint);

          // Get canvas dimensions
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();

          // Set overlay position at the midpoint
          const overlayWidth = 200;
          const overlayHeight = 100;
          const padding = 10;

          // Center the overlay by default
          let overlayX = screenPoint.x;
          let overlayY = screenPoint.y;

          // Constrain to horizontal bounds
          overlayX = Math.max(
            rect.left + overlayWidth / 2 + padding,
            Math.min(overlayX, rect.right - overlayWidth / 2 - padding),
          );

          // Constrain to vertical bounds
          overlayY = Math.max(
            rect.top + overlayHeight / 2 + padding,
            Math.min(overlayY, rect.bottom - overlayHeight / 2 - padding),
          );

          setOverlayPosition({ x: overlayX, y: overlayY });
          setShowInputOverlay(true);
          setOverlayInput("");

          // Focus input after a short delay
          setTimeout(() => {
            overlayInputRef.current?.focus();
          }, 100);
        }
      } else {
        // Calibration mode - placing rectangle corners
        if (points.length >= 4) return;

        const minDistance = 35; // Minimum distance in pixels between points
        const isTooClose = points.some((existingPoint) => {
          const distance = calculateDistance(existingPoint, pos);
          return distance < minDistance;
        });

        if (isTooClose) {
          return;
        }

        setPoints((prev) => [...prev, pos]);

        if (points.length === 3) {
          setActiveStep(1);
          const allPoints = [...points, pos];

          try {
            const orderedCorners = orderPointsOnce(allPoints);
            const newRectangle: Rectangle = {
              points: orderedCorners,
              width: 0,
              height: 0,
            };
            setRectangle(newRectangle);

            setTimeout(() => {
              widthInputRef.current?.focus();
            }, 100);
          } catch (error) {
            console.error("Point ordering failed:", error);
            return;
          }
        }
      }
    },
    [points, editable, showVerification, verificationLines, currentVerificationLine],
  );

  // Verification handlers
  const addVerificationLine = () => {
    if (!currentVerificationLine.startPoint || !currentVerificationLine.endPoint || !overlayInput) {
      return;
    }

    const actualLength = parseFloat(overlayInput);
    if (isNaN(actualLength) || actualLength <= 0) {
      return;
    }

    const predictedLength = calculateRealWorldDistance(
      currentVerificationLine.startPoint,
      currentVerificationLine.endPoint,
      homographyMatrix,
    );

    const accuracy = Math.min(
      100,
      (Math.min(actualLength, predictedLength) / Math.max(actualLength, predictedLength)) * 100,
    );

    const newLine: VerificationLine = {
      id: `line-${Date.now()}`,
      startPoint: currentVerificationLine.startPoint,
      endPoint: currentVerificationLine.endPoint,
      actualLength,
      predictedLength,
      accuracy,
    };

    setVerificationLines((prev) => [...prev, newLine]);
    setCurrentVerificationLine({ startPoint: null, endPoint: null });
    setShowInputOverlay(false);
    setOverlayInput("");
  };

  const cancelInputOverlay = () => {
    setCurrentVerificationLine({ startPoint: null, endPoint: null });
    setShowInputOverlay(false);
    setOverlayInput("");
  };

  const resetVerification = () => {
    setVerificationLines([]);
    setCurrentVerificationLine({ startPoint: null, endPoint: null });
    setShowInputOverlay(false);
    setOverlayInput("");
  };

  const reset = useCallback(() => {
    if (!editable) return;

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setRectangle(null);
    setInitialRectangle(null);
    setPoints([]);
    setWidth("");
    setHeight("");
    setCurrentPoint(null);
    setActiveStep(0);
    setDimensionError(["", ""]);
    setShowVerification(false);
    resetVerification();

    setTimeout(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }, 50);
  }, [editable]);

  const handleDimensionChange = (type: "width" | "height", value: string) => {
    if (value.includes("-")) return; // block negatives
    if (!/^\d*\.?\d*$/.test(value)) return; // only digits + one dot

    const [integerPart, decimalPart = ""] = value.split(".");
    if ((value.match(/\./g) || []).length > 1) return; // block multiple dots

    if (!value.includes(".")) {
      if (integerPart.length > 8) return; // max 8 digits if no decimal
    } else {
      if (integerPart.length > 8) return; // max 8 before dot
      if (decimalPart.length > 5) return; // max 5 after dot
    }

    if (integerPart.length > 1 && integerPart.startsWith("0") && !value.includes(".")) {
      return; // prevent leading zeros like 012345
    }

    const parsedValue = parseFloat(value);
    let errorMessage = "";
    if (!isNaN(parsedValue) && parsedValue > 99999999.99999) {
      errorMessage = "Value must be less than 99,999,999.99999 (max 8 digits before and 5 after)";
    }

    if (type === "width") {
      setWidth(value);
      const newErrors = [...dimensionError];
      newErrors[0] = errorMessage;
      setDimensionError(newErrors);
      if (!errorMessage && !isNaN(parsedValue) && parsedValue > 0 && rectangle) {
        setRectangle((prev) => (prev ? { ...prev, width: parsedValue } : null));
      }
    } else {
      setHeight(value);
      const newErrors = [...dimensionError];
      newErrors[1] = errorMessage;
      setDimensionError(newErrors);
      if (!errorMessage && !isNaN(parsedValue) && parsedValue > 0 && rectangle) {
        setRectangle((prev) => (prev ? { ...prev, height: parsedValue } : null));
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentValue = (e.target as HTMLInputElement).value;
    const key = e.key;

    // allow navigation/controls
    if (
      e.ctrlKey ||
      e.metaKey ||
      [
        "Backspace",
        "Delete",
        "Tab",
        "Enter",
        "Escape",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
      ].includes(key)
    )
      return;

    if (key === "-") {
      e.preventDefault();
      return;
    } // no negatives
    if (!/[\d.]/.test(key)) {
      e.preventDefault();
      return;
    } // only digits & dot

    const [integerPart, decimalPart = ""] = currentValue.split(".");

    if (key === "." && currentValue.includes(".")) {
      // only one dot
      e.preventDefault();
      return;
    }

    // if no decimal yet → allow 8 digits, but always allow the dot
    if (!currentValue.includes(".")) {
      if (/\d/.test(key) && integerPart.length >= 8 && key !== ".") {
        e.preventDefault();
        return;
      }
    }

    // if decimal exists → max 5 digits after
    if (currentValue.includes(".")) {
      if (/\d/.test(key) && decimalPart.length >= 5) {
        e.preventDefault();
        return;
      }
    }

    // prevent leading zeros
    if (
      key !== "." &&
      integerPart.length > 0 &&
      integerPart.startsWith("0") &&
      !currentValue.includes(".")
    ) {
      e.preventDefault();
      return;
    }
  };

  // Update homography matrix when rectangle changes
  useEffect(() => {
    if (calibrationComplete && rectangle) {
      const { homographyMatrix: newMatrix } = computeHomography(rectangle);
      setHomographyMatrix(newMatrix);
    }
  }, [calibrationComplete, rectangle]);

  // Save handler
  const persistCalibration = async () => {
    if (!rectangle || points.length !== 4) {
      return;
    }

    // Validate dimensions
    let valid = true;
    const newErrors = [...dimensionError];

    if (!width || isNaN(parseFloat(width)) || parseFloat(width) <= 0) {
      newErrors[0] = "Please enter a valid positive number";
      valid = false;
      widthInputRef.current?.focus();
    }

    if (!height || isNaN(parseFloat(height)) || parseFloat(height) <= 0) {
      newErrors[1] = "Please enter a valid positive number";
      valid = false;
      if (width && !isNaN(parseFloat(width)) && parseFloat(width) > 0) {
        heightInputRef.current?.focus();
      }
    }

    if (!valid) {
      setDimensionError(newErrors);
      return;
    }

    if (!hasChanges || isExitingWithoutSave) {
      setDialogOpen(false);
      onClose();
      return;
    }

    setSubmitting(true);

    try {
      const finalRectangle: Rectangle = {
        ...rectangle,
        width: parseFloat(width),
        height: parseFloat(height),
      };

      const { homographyMatrix, metersPerPixel } = computeHomography(finalRectangle);

      const calibrationConfig = {
        rectangle: finalRectangle,
        homography_matrix: homographyMatrix,
        meters_per_pixel: metersPerPixel,
      };

      if (onSave) {
        onSave(calibrationConfig);
      }

      setDialogOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Initialize from props if available
  useEffect(() => {
    if (initialConfig && initialConfig.rectangle) {
      const { rectangle } = initialConfig;

      const newRectangle: Rectangle = {
        points: [...rectangle.points] as [Point, Point, Point, Point],
        width: rectangle.width,
        height: rectangle.height,
      };

      setRectangle(newRectangle);
      setInitialRectangle(newRectangle);
      setPoints([...rectangle.points]);
      setWidth(rectangle.width.toString());
      setHeight(rectangle.height.toString());
      setActiveStep(1);
    }
  }, [initialConfig]);

  // Canvas effects
  useEffect(() => {
    if (!imageRef.current) return;
    const obs = new ResizeObserver(() => {
      alignCanvas();
      draw();
    });
    obs.observe(imageRef.current);
    return () => obs.disconnect();
  }, [alignCanvas, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showInputOverlay) {
          cancelInputOverlay();
        } else if (points.length > 0 && points.length < 4 && !showVerification) {
          setPoints((prev) => prev.slice(0, -1));
        }
      } else if (e.key === "Enter" && showInputOverlay) {
        addVerificationLine();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [points, showVerification, showInputOverlay, overlayInput]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (submitting) return;

        if (!open) {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }

          setDialogOpen(false);
          setTimeout(() => {
            onClose();
          }, 100);
        }
      }}
    >
      <DialogContent className="h-auto max-h-[95vh] w-[85vw] max-w-[1200px] overflow-hidden rounded-xl border-0 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50 px-5 py-3">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold text-gray-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1.5 rounded-full bg-gradient-to-b from-teal-600 to-teal-700"></div>
              Camera Calibration: {cameraName}
              {showVerification && (
                <span className="ml-2 rounded-full bg-teal-100 px-2 py-1 text-xs font-medium text-teal-800">
                  Verification Mode
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-gray-500 hover:bg-teal-50 hover:text-teal-600"
              onClick={() => setShowGuide(true)}
            >
              <Info className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid h-full grid-cols-[1fr_280px] gap-0">
          <div className="flex h-full flex-col overflow-hidden p-4">
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-gray-50 shadow-inner">
              {loading ? (
                <div className="flex h-80 flex-col items-center justify-center text-gray-500">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-teal-600" />
                  <p className="font-medium">Loading image...</p>
                </div>
              ) : imageUrl ? (
                <>
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Calibration Source"
                    onLoad={() => {
                      setImageLoaded(true);
                      setTimeout(() => {
                        alignCanvas();
                        draw();
                      }, 100);
                    }}
                    className="block h-full w-full object-contain"
                    style={{ maxHeight: "100%", maxWidth: "100%" }}
                  />
                  <div ref={containerRef} className="absolute top-0 left-0 h-full w-full">
                    <canvas
                      ref={canvasRef}
                      onClick={onCanvasClick}
                      onMouseMove={onMouseMove}
                      className="absolute top-0 left-0 h-full w-full transition-all duration-200"
                      style={{
                        cursor: editable
                          ? points.length < 4
                            ? "crosshair"
                            : "default"
                          : "default",
                      }}
                    />
                  </div>

                  {/* Inline Input Overlay */}
                  {showInputOverlay && (
                    <div
                      className="absolute z-50 rounded-lg border-2 border-teal-300 bg-white p-3 shadow-lg"
                      style={{
                        left: `${overlayPosition.x / 1.6}px`,
                        top: `${overlayPosition.y / 1.4}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-gray-700">
                          Actual length (meters):
                        </label>
                        <div className="flex gap-2">
                          <Input
                            ref={overlayInputRef}
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="e.g., 2.5"
                            value={overlayInput}
                            onChange={(e) => setOverlayInput(e.target.value)}
                            className="h-7 w-20 border-teal-200 text-xs focus:border-teal-400"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addVerificationLine();
                              } else if (e.key === "Escape") {
                                cancelInputOverlay();
                              }
                            }}
                          />
                          <Button
                            onClick={addVerificationLine}
                            disabled={
                              !overlayInput ||
                              isNaN(parseFloat(overlayInput)) ||
                              parseFloat(overlayInput) <= 0
                            }
                            className="h-7 bg-teal-600 px-2 text-xs text-white hover:bg-teal-700"
                          >
                            ✓
                          </Button>
                          <Button
                            onClick={cancelInputOverlay}
                            variant="outline"
                            className="h-7 border-gray-300 px-2 text-xs hover:bg-gray-50"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-80 items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                      <Info className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium">No camera image available</p>
                  </div>
                </div>
              )}
            </div>

            {!showVerification && imageLoaded && points.length === 4 && (
              <div className="mt-4 rounded-lg border border-teal-100 bg-gradient-to-br from-teal-50 to-gray-50 p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-800">
                  <div className="h-0.5 w-4 rounded-full bg-teal-700"></div>
                  Rectangle Dimensions
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="rectangle-width"
                      className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-800 shadow-sm"></div>
                      Width (DA) - meters
                    </Label>
                    <Input
                      id="rectangle-width"
                      ref={widthInputRef}
                      type="text"
                      maxLength={14}
                      placeholder="e.g., 5.2"
                      value={width}
                      onChange={(e) => handleDimensionChange("width", e.target.value)}
                      onKeyDown={handleKeyPress} // Changed from onKeyPress to onKeyDown
                      className={`h-9 rounded-lg text-sm transition-all duration-200 focus:ring-2 ${
                        dimensionError[0]
                          ? "border-2 border-solid border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-[3px] border-dashed border-blue-700 focus:border-blue-800 focus:ring-blue-100"
                      }`}
                    />
                    {dimensionError[0] && (
                      <p className="text-xs font-medium text-red-600">{dimensionError[0]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="rectangle-height"
                      className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-sm"></div>
                      Height (AB) - meters
                    </Label>
                    <Input
                      id="rectangle-height"
                      ref={heightInputRef}
                      type="text"
                      maxLength={14}
                      placeholder="e.g., 3.8"
                      value={height}
                      onChange={(e) => handleDimensionChange("height", e.target.value)}
                      onKeyDown={handleKeyPress} // Changed from onKeyPress to onKeyDown
                      className={`h-9 rounded-lg text-sm transition-all duration-200 focus:ring-2 ${
                        dimensionError[1]
                          ? "border-2 border-solid border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-[3px] border-dashed border-red-600 focus:border-red-700 focus:ring-red-100"
                      }`}
                    />
                    {dimensionError[1] && (
                      <p className="text-xs font-medium text-red-600">{dimensionError[1]}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                {/* Reset button - show when any points are placed */}
                {(points.length > 0 || calibrationComplete) && !showVerification && (
                  <Button
                    variant="outline"
                    onClick={reset}
                    disabled={submitting}
                    className="flex h-9 items-center gap-2 rounded-lg border-2 border-gray-200 px-4 text-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Calibration
                  </Button>
                )}

                {/* Verify button - only show when calibration is complete */}
                {calibrationComplete && !showVerification && (
                  <Button
                    variant="outline"
                    onClick={() => setShowVerification(true)}
                    className="flex h-9 items-center gap-2 rounded-lg border-2 border-teal-200 px-4 text-sm text-teal-700 transition-all duration-200 hover:border-teal-300 hover:bg-teal-50"
                  >
                    Verify Accuracy
                  </Button>
                )}

                {/* Back button in verification mode */}
                {showVerification && (
                  <Button
                    variant="outline"
                    onClick={() => setShowVerification(false)}
                    className="flex h-9 items-center gap-2 rounded-lg border-2 border-gray-200 px-4 text-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                  >
                    Back to Calibration
                  </Button>
                )}
              </div>

              {/* Save button - only show when calibration is complete */}
              {calibrationComplete && !showVerification && (
                <Button
                  onClick={persistCalibration}
                  disabled={submitting || !calibrationComplete}
                  className="h-9 rounded-lg bg-teal-700 px-6 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-teal-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Calibration"
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto border-l border-gray-100 bg-gradient-to-b from-gray-50 to-white p-4">
            {!showVerification ? (
              // Calibration Progress Panel
              <>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1 rounded-full bg-gradient-to-b from-teal-600 to-teal-700"></div>
                  <h3 className="text-sm font-medium text-gray-800">Progress</h3>
                </div>

                <Alert className="rounded-lg border-teal-200 bg-gradient-to-r from-teal-50 to-gray-50 p-3">
                  <AlertDescription className="text-xs leading-relaxed text-teal-800">
                    <strong>Tip:</strong> Click four corners of a real-world rectangle. Point labels
                    appear after completion.
                  </AlertDescription>
                </Alert>

                <div
                  className={`rounded-lg p-3 transition-all duration-300 ${
                    activeStep === 0
                      ? "bg-teal-50 ring-2 ring-teal-300"
                      : points.length > 0
                        ? "border-2 border-teal-200 bg-teal-50"
                        : "border-2 border-gray-100 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">Step 1: Place Corners</span>
                    {points.length === 4 && (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                        ✓ Complete
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                            points.length > i
                              ? "bg-teal-700 text-white shadow-sm"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {points.length === 4 ? getPointLabel(i) : i + 1}
                        </div>
                        <span
                          className={`text-xs transition-all duration-200 ${
                            points.length > i ? "font-medium text-teal-700" : "text-gray-500"
                          }`}
                        >
                          Corner {points.length === 4 ? getPointLabel(i) : i + 1}
                          {points.length > i && <span className="ml-1 text-teal-600">✓</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={`rounded-lg p-3 transition-all duration-300 ${
                    activeStep === 1
                      ? "bg-teal-50 ring-2 ring-teal-300"
                      : rectangle && (rectangle.width > 0 || rectangle.height > 0)
                        ? "border-2 border-teal-200 bg-teal-50"
                        : points.length === 4
                          ? "border-2 border-gray-200 bg-gray-50"
                          : "border-2 border-gray-100 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">Step 2: Dimensions</span>
                    {rectangle && rectangle.width > 0 && rectangle.height > 0 && (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                        ✓ Complete
                      </span>
                    )}
                  </div>

                  <p className="mb-2 text-xs text-gray-600">
                    {points.length < 4
                      ? "Place all corners first"
                      : rectangle && rectangle.width > 0 && rectangle.height > 0
                        ? "Dimensions set successfully"
                        : "Enter real-world measurements"}
                  </p>

                  {rectangle && rectangle.width > 0 && rectangle.height > 0 && (
                    <div className="space-y-1 rounded-lg border border-teal-200 bg-teal-50 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">AD:</span>
                        <span className="text-xs font-semibold text-teal-700">
                          {rectangle.width}m
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">AB:</span>
                        <span className="text-xs font-semibold text-teal-700">
                          {rectangle.height}m
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {calibrationComplete && (
                  <div className="rounded-lg border border-teal-200 bg-gradient-to-r from-teal-50 to-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-0.5 w-4 rounded-full bg-teal-700"></div>
                      <span className="text-sm font-medium text-gray-800">
                        Optional: Verify Accuracy
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-gray-600">
                      Test your calibration by drawing lines with known lengths
                    </p>
                    <Button
                      onClick={() => setShowVerification(true)}
                      variant="outline"
                      className="h-8 w-full border-teal-200 text-xs text-teal-700 hover:border-teal-300 hover:bg-teal-50"
                    >
                      Start Verification
                    </Button>
                  </div>
                )}

                {points.length > 0 && points.length < 4 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <p className="text-center text-xs text-gray-600">
                      Press <kbd className="rounded bg-gray-200 px-1 py-0.5 text-xs">Esc</kbd> to
                      remove last point
                    </p>
                  </div>
                )}
              </>
            ) : (
              // Simplified Verification Panel
              <>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1 rounded-full bg-gradient-to-b from-teal-600 to-teal-700"></div>
                  <h3 className="text-sm font-medium text-gray-800">Verification</h3>
                </div>

                <Alert className="rounded-lg border-teal-200 bg-gradient-to-r from-teal-50 to-gray-50 p-3">
                  <AlertDescription className="text-xs leading-relaxed text-teal-800">
                    <strong>Instructions:</strong> Draw up to 3 lines with known lengths, then enter
                    actual length.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <div className="text-xs text-gray-600">
                    Progress: {verificationLines.length}/3 lines completed
                  </div>

                  {verificationLines.length > 0 && (
                    <div className="rounded-lg bg-gray-50 p-2">
                      <div className="mb-1 text-xs font-medium text-gray-700">Completed Lines:</div>
                      {verificationLines.map((line, i) => (
                        <div key={i} className="text-xs text-gray-600">
                          L{i + 1}: {line.accuracy.toFixed(1)}% accuracy
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {verificationAccuracy !== null && (
                  <div
                    className={`rounded-lg border-2 p-4 ${
                      verificationAccuracy >= 95
                        ? "border-teal-300 bg-teal-50"
                        : verificationAccuracy >= 85
                          ? "border-gray-300 bg-gray-50"
                          : "border-gray-400 bg-gray-100"
                    }`}
                  >
                    <div className="text-center">
                      <div
                        className={`mb-1 text-2xl font-bold ${
                          verificationAccuracy >= 95
                            ? "text-teal-700"
                            : verificationAccuracy >= 85
                              ? "text-gray-700"
                              : "text-gray-600"
                        }`}
                      >
                        {verificationAccuracy.toFixed(1)}%
                      </div>
                      <div className="mb-2 text-xs text-gray-600">Overall Accuracy</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={resetVerification}
                    variant="outline"
                    disabled={verificationLines.length === 0}
                    className="h-8 flex-1 border-gray-200 text-xs hover:border-gray-300 hover:bg-gray-50"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Add the guide dialog */}
      <CalibrationGuideDialog open={showGuide} onClose={() => setShowGuide(false)} />
    </Dialog>
  );
};

// Add before the CameraCalibrationModal component

const CalibrationGuideDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl rounded-xl bg-gray-100 p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Info className="h-5 w-5 text-teal-600" />
            Camera Calibration Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User-Centric Quick Start */}
          <section className="rounded-lg border border-teal-200 bg-teal-50 p-4">
            <h3 className="mb-3 font-semibold text-teal-900">Quick Start Guide</h3>
            <div className="space-y-2 text-sm text-teal-800">
              <p>
                1. Identify a rectangular area on a flat surface (e.g., road markings, parking
                space, floor tiles)
              </p>
              <p>2. Click the four corners of the rectangle in sequence</p>
              <p>3. Enter the actual width and height measurements of the rectangle</p>
              <p>4. Verify your calibration by measuring known distances</p>
            </div>
          </section>

          {/* Best Practices */}
          <section>
            <h3 className="mb-2 font-semibold text-gray-900">Best Practices</h3>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-gray-700">
              <li>Select a rectangle on a flat, horizontal surface (ground plane)</li>
              <li>Use road markings, parking spaces, or floor tiles when possible</li>
              <li>Avoid using vertical objects like doors or walls</li>
              <li>Choose an area that's clearly visible and well-lit</li>
            </ul>
          </section>

          {/* Verification Process */}
          <section>
            <h3 className="mb-2 font-semibold text-gray-900">Verification Process</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>After calibration, verify accuracy by:</p>
              <ol className="list-inside list-decimal space-y-1.5 pl-4">
                <li>Drawing test lines on the same ground plane</li>
                <li>Measuring actual distances on the ground</li>
                <li>Comparing system predictions with actual measurements</li>
              </ol>
              <p className="mt-2 text-sm font-medium text-teal-700">
                Aim for verification accuracy above 95% for optimal results
              </p>
            </div>
          </section>

          {/* Technical Details (collapsed by default) */}
          <details className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Technical Details
            </summary>
            <div className="mt-2 space-y-2 text-sm text-gray-600">
              <p>The calibration process uses homography transformation to:</p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>Map ground plane coordinates to real-world measurements</li>
                <li>Calculate accurate distances on the calibrated plane</li>
                <li>Compensate for camera perspective and angle</li>
              </ul>
              <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-xs font-medium text-yellow-800">
                  Note: This calibration method is optimized for measuring distances on the same
                  plane as your calibration rectangle. Measurements of vertical objects or objects
                  on different planes may be less accurate.
                </p>
              </div>
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCalibrationModal;
