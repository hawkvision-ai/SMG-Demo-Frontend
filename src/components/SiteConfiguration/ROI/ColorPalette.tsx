import React from "react";
import { COLOR_PALETTE } from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  disabled?: boolean;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorSelect,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">ROI Color</label>
      <div className="grid grid-cols-8 gap-2">
        {COLOR_PALETTE.map((color) => (
          <Button
            key={color}
            type="button"
            onClick={() => !disabled && onColorSelect(color)}
            disabled={disabled}
            className={cn(
              "group relative h-8 w-8 rounded-full p-0 transition-all duration-200",
              "hover:scale-110 hover:shadow-lg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              selectedColor === color && "ring-2 ring-offset-2 ring-teal-500"
            )}
            style={{ backgroundColor: color }}
          >
            <span className="sr-only">Select color {color}</span>
            <div
              className={cn(
                "absolute inset-0 rounded-full transition-opacity",
                selectedColor === color
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-20",
                "bg-white"
              )}
            />
          </Button>
        ))}
      </div>
    </div>
  );
};
