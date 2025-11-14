import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, X } from "lucide-react";
import React, { useState } from "react";

// Type definitions
interface ROI {
  id: string;
  name: string;
  // Add other ROI properties as needed
}

interface UseCases {
  [key: string]: string; // key is the usecase ID, value is the usecase name
}

interface ROISelectorProps {
  usecases?: UseCases;
  cameraId?: string;
  ROIs?: ROI[];
  imageUrl?: string;
}

const ROISelector: React.FC<ROISelectorProps> = ({
  usecases = {},
  cameraId,
  ROIs = [],
  imageUrl,
}) => {
  const [selectedUseCase, setSelectedUseCase] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isFullView, setIsFullView] = useState<boolean>(false);
  const [selectedROIs, setSelectedROIs] = useState<ROI[]>([]);

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Toggle full view mode
  const toggleFullView = () => {
    setIsFullView(!isFullView);
  };

  // Add ROI to selected list
  const addROI = (roi: ROI) => {
    if (!selectedROIs.find((item) => item.id === roi.id)) {
      setSelectedROIs([...selectedROIs, roi]);
    }
  };

  // Remove ROI from selected list
  const removeROI = (roiId: string) => {
    setSelectedROIs(selectedROIs.filter((roi) => roi.id !== roiId));
  };

  // Handle next button click
  const handleNext = () => {
    console.log("Next button clicked");
    console.log("Selected Use Case:", selectedUseCase);
    console.log("Selected ROIs:", selectedROIs);
    console.log("Full View Mode:", isFullView);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:flex-row">
      {/* Left Section - Controls and Lists */}
      <div className="flex w-full flex-col gap-4 md:w-1/4">
        {/* Use Cases Dropdown */}
        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-teal-700">Select UseCase</label>
          <div
            className="flex cursor-pointer items-center justify-between rounded-md border border-teal-300 bg-white p-2"
            onClick={toggleDropdown}
          >
            <span className="text-gray-700">
              {selectedUseCase ? usecases[selectedUseCase] : "Select a use case"}
            </span>
            <ChevronDown className="h-5 w-5 text-teal-500" />
          </div>

          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-teal-200 bg-white shadow-lg">
              {Object.entries(usecases).map(([id, name]) => (
                <div
                  key={id}
                  className="cursor-pointer p-2 hover:bg-teal-50"
                  onClick={() => {
                    setSelectedUseCase(id);
                    setIsDropdownOpen(false);
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full View Button and Add Button */}
        <div className="flex items-center gap-2">
          <Button
            className={`rounded-md px-4 py-2 ${isFullView ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-800"} font-medium`}
            onClick={toggleFullView}
          >
            Full Vie
          </Button>

          <Button
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white"
            aria-label="Add ROI"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* ROIs List */}
        <div className="mt-4">
          <h3 className="mb-2 text-lg font-medium text-teal-800">ROIs</h3>
          <div
            className={`rounded-md border border-teal-200 p-2 ${isFullView ? "pointer-events-none opacity-50" : ""}`}
          >
            {ROIs.length > 0 ? (
              <ul className="divide-y divide-teal-100">
                {ROIs.map((roi) => (
                  <li key={roi.id} className="flex items-center justify-between py-2">
                    <span className="text-gray-700">{roi.name}</span>
                    <Button
                      onClick={() => addROI(roi)}
                      className="rounded-full p-1 hover:bg-teal-50"
                      disabled={isFullView}
                    >
                      <Plus className="h-5 w-5 text-teal-600" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-gray-500">No ROIs available</p>
            )}
          </div>
        </div>

        {/* Selected ROIs */}
        <div className="mt-4">
          <h3 className="mb-2 text-lg font-medium text-teal-800">Selected ROIs</h3>
          <div className="rounded-md border border-teal-200 p-2">
            {selectedROIs.length > 0 ? (
              <ul className="divide-y divide-teal-100">
                {selectedROIs.map((roi) => (
                  <li key={roi.id} className="flex items-center justify-between py-2">
                    <span className="text-gray-700">{roi.name}</span>
                    <Button
                      onClick={() => removeROI(roi.id)}
                      className="rounded-full p-1 hover:bg-teal-50"
                    >
                      <X className="h-5 w-5 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-gray-500">No ROIs selected</p>
            )}
          </div>
        </div>

        {/* Next Button */}
        <div className="mt-6">
          <Button
            className="rounded-md bg-teal-600 px-6 py-2 font-medium text-white transition-colors hover:bg-teal-700"
            onClick={handleNext}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Right Section - Image */}
      <div className="flex w-full items-start justify-center md:w-3/4">
        {imageUrl ? (
          <div className="overflow-hidden rounded-md border border-teal-200">
            <img
              src={imageUrl}
              alt="Camera View"
              className="h-auto min-h-96 w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-96 w-full items-center justify-center rounded-md border border-teal-200 bg-gray-100">
            <p className="text-gray-500">No image available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ROISelector;
