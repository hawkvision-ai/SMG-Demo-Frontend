import React, { useState } from "react";
import { motion } from "framer-motion";
import { Edit, Trash2, MapPin, Camera, Wifi, WifiOff } from "lucide-react";
import fallbackPreview from "@/assets/image.jpg";
import { CameraData } from "../types";
import { Button } from "@/components/ui/button";

interface ShowCamerasProps {
  cameras: CameraData[];
  onEditCamera: (camera: CameraData) => void;
  onSelectCamera: (cameraId: string) => void;
  onDeleteCamera?: (cameraId: string) => void;
}

const ShowCameras: React.FC<ShowCamerasProps> = ({
  cameras,
  onEditCamera,
  onSelectCamera,
  onDeleteCamera,
}) => {
  const [hoveredCameraId, setHoveredCameraId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cameras.map((camera) => (
        <motion.div
          key={camera.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ y: -2, scale: 1.01 }}
          className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-slate-300/80 transition-all duration-300"
          onMouseEnter={() => setHoveredCameraId(camera.id)}
          onMouseLeave={() => setHoveredCameraId(null)}
        >
          {/* Compact Header with Image and Info */}
          <div
            className="relative h-50 cursor-pointer overflow-hidden"
            onClick={() => onSelectCamera(camera.id)}
          >
            <img
              src={camera.imageUrl || fallbackPreview}
              onError={(e) => {
                e.currentTarget.src = fallbackPreview;
              }}
              alt={camera.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            

            {/* Camera Title and Location - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-end justify-between">
                {/* Left side - Camera name and location */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white drop-shadow-lg truncate">{camera.name}</h2>
                  <div className="flex items-center text-sm text-white/90 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    <span className="truncate">{camera.locationTags.join(", ") || "No location tags"}</span>
                  </div>
                </div>
                
                {/* Right side - Camera icon */}
                <div className="flex items-center text-white/90 px-2 py-1 rounded ml-4">
                  <Camera className="h-5 text-gray-200" />
                </div>
              </div>
            </div>

            {/* Action Buttons - Top Right */}
            <div className={`absolute top-3 right-3 flex gap-1.5 transition-all duration-200 ${
              hoveredCameraId === camera.id ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            }`}>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCamera(camera);
                }}
                size="sm"
                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white p-0 text-slate-700 hover:text-blue-600 shadow-lg backdrop-blur-sm border-0"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              {onDeleteCamera && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${camera.name}"?`)) {
                      onDeleteCamera(camera.id);
                    }
                  }}
                  size="sm"
                  className="h-8 w-8 rounded-full bg-white/90 hover:bg-white p-0 text-slate-700 hover:text-red-600 shadow-lg backdrop-blur-sm border-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Compact Content */}
          {/* <div className="p-4" onClick={() => onSelectCamera(camera.id)}>
            <div className="space-y-2"> */}

              {/* Additional Info */}
              {/* <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center">
                  <Camera className="h-3 w-3 mr-1" />
                  <span>Camera Stream</span>
                </div>
                <div>
                  {camera.locationTags.length > 0 
                    ? `${camera.locationTags.length} tag${camera.locationTags.length > 1 ? 's' : ''}`
                    : 'No tags'}
                </div>
              </div> */}
            {/* </div>
          </div> */}
        </motion.div>
      ))}
    </div>
  );
};

export default ShowCameras;
