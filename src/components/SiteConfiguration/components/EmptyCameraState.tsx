import React from "react";
import { Button } from "@/components/ui/button";
import camImg from '@/assets/icons/CameraImage.svg'

interface EmptyCameraStateProps {
  onAddCamera: () => void;
}

const EmptyCameraState: React.FC<EmptyCameraStateProps> = ({ onAddCamera }) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      <img src={camImg} alt="No Camera" className="mb-4 h-52 w-52" />
      <p className="mb-4 text-gray-500">No cameras added for this site yet.</p>
      <Button
        onClick={onAddCamera}
        className="rounded-xl bg-teal-800 text-white transition-colors hover:bg-teal-700"
      >
        + Add Camera
      </Button>
    </div>
  );
};

export default EmptyCameraState;
