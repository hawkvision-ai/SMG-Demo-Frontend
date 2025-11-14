// components/SiteConfiguration/Counter/EmptyCounterState.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EmptyCounterStateProps {
  onAddCounter: () => void;
}

const EmptyCounterState: React.FC<EmptyCounterStateProps> = ({ onAddCounter }) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center border border-gray-300 rounded-lg bg-gray-100">
      <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center mb-6">
        <Plus
             onClick={onAddCounter}
         className="h-12 w-12 text-teal-700" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Create Counters</h3>
      <p className="text-gray-600 mb-6">You can create variables like</p>
      
    

  
    </div>
  );
};

export default EmptyCounterState;