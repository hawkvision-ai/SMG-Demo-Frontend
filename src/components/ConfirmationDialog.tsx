import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onClose: () => void;
  onConfirm: () => void;
  onSecondary?: () => void;
  isLoading?: boolean;
  isDanger?: boolean;
}

export function ConfirmationDialog({
  open,
  title,
  description,
  primaryButtonText = "Continue",
  secondaryButtonText = "Cancel",
  onClose,
  onConfirm,
  // onSecondary,
  isLoading = false,
  isDanger = false,
}: ConfirmationDialogProps) {
  // Clean up focus when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        // Remove focus from any active element to prevent focus conflicts
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        // Reset focus to body to clear any focus traps
        document.body.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSafeClose = () => {
    // Clear any active element focus
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setTimeout(() => {
      onClose();
    }, 0);
  };

  const handleConfirm = () => {
    // Clear any active element focus
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setTimeout(() => {
      onConfirm();
    }, 0);
  };

  // Only render if open to prevent any focus conflicts when not needed
  if (!open) {
    return null;
  }

  const dialogElement = (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isLoading) {
          handleSafeClose();
        }
      }}
    >
      <AlertDialogContent
        className="z-[100] max-w-2xl"
        onEscapeKeyDown={(e) => {
          // Prevent closing with escape key if loading
          if (isLoading) {
            e.preventDefault();
          }
        }}
      >
        <AlertDialogHeader className="max-h-[60vh] overflow-y-auto pr-2">
          <AlertDialogTitle className="text-xl font-semibold break-words text-gray-800">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 break-words whitespace-pre-wrap text-gray-600">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            disabled={isLoading}
            onClick={handleSafeClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {secondaryButtonText}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className={
              isDanger ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 text-white hover:bg-teal-700"
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {primaryButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Use portal to render outside the main dialog tree
  return createPortal(dialogElement, document.body);
}
