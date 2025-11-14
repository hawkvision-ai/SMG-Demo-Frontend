import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import React, { useState } from "react";
import { ROI } from "./types";

interface ROIListProps {
  rois: ROI[];
  onDeleteROI: (roiId: string) => void;
  onSelect: (roi: string) => void;
  selectedROIId: string | null;
  onConfigureBoundaries?: (roi: ROI) => void;
}

export const ROIList: React.FC<ROIListProps> = ({
  rois,
  selectedROIId,
  onDeleteROI,
  onSelect,
  onConfigureBoundaries,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roiToDelete, setRoiToDelete] = useState<ROI | null>(null);

  const handleDelete = (roi: ROI) => {
    setRoiToDelete(roi);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (roiToDelete) {
      onDeleteROI(roiToDelete.id);
      setDialogOpen(false);
      setRoiToDelete(null);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setRoiToDelete(null);
  };

  if (rois.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">
        No ROIs defined yet. Start drawing on the image.
      </div>
    );
  }

  return (
    <>
      <div className="max-h-[450px] overflow-y-auto">
        {rois.map((roi, index) => (
          <div
            key={roi.id || index}
            className={`mb-3 cursor-pointer rounded-lg border p-3 shadow-sm ${
              selectedROIId === roi.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
            }`}
            onClick={() => onSelect(roi.id)}
          >
            <div className="flex items-center justify-between">
              <div
                className="h-6 w-6 flex-shrink-0 rounded-full"
                style={{ backgroundColor: roi.color }}
              ></div>
              <div className="flex-grow px-2">
                <p className="font-medium">{roi.name}</p>
                {roi.functionalTag && <p className="text-xs text-gray-500">{roi.functionalTag}</p>}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(roi);
                }}
                className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            {/* Second row */}
            {onConfigureBoundaries && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigureBoundaries(roi);
                }}
                className="mt-2 w-full bg-gray-100 text-xs hover:bg-gray-200"
              >
                Set-Up Boundaries
              </Button>
            )}
          </div>
        ))}
      </div>

      {roiToDelete && (
        <ConfirmationDialog
          open={dialogOpen}
          title="Delete ROI"
          description={`Are you sure you want to delete ROI "${roiToDelete.name}"? The associated use cases will also be deleted.`}
          primaryButtonText="Delete"
          onClose={closeDialog}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
};
