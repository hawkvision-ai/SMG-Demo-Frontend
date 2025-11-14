import React from "react";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center",
        className
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        {icon || <Eye className="h-10 w-10" />}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-gray-500">{description}</p>
        )}
      </div>

      {action && (
        <Button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 transition-all hover:scale-105"
          variant="outline"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
