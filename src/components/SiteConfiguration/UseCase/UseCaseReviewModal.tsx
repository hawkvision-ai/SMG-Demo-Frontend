import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ROIResponse, UseCaseDefinitionInput } from "@/api/types";
import UseCaseConfig from "./UseCasesConfig";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */
interface UseCaseReviewModalProps {
  open: boolean;
  onClose: () => void;

  /** passed straight through to UseCaseConfig */
  useCase: string;
  useCaseData: UseCaseDefinitionInput;
  existingConfig?: UseCaseDefinitionInput;

  /** extra context */
  functionalTagName: string;
  rois: ROIResponse[];

  /** callback on final confirmation */
  onAddUseCase: () => Promise<void>;   // async so we can show spinner
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export const UseCaseReviewModal: React.FC<UseCaseReviewModalProps> = ({
  open,
  onClose,
  useCase,
  useCaseData,
  existingConfig,
  functionalTagName,
  rois,
  onAddUseCase,
}) => {
  /* -------------------------------------------------------------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  /* -------------------------------------------------------------- */
  const handleAdd = async () => {
    setAdding(true);
    try {
      await onAddUseCase();
      setConfirmOpen(false);
      onClose();
    } finally {
      setAdding(false);
    }
  };

  /* -------------------------------------------------------------- */
  return (
    <>
      {/* Main “review” dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="w-full max-w-6xl rounded-lg bg-white p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle>Review Use Case before Adding</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_260px] gap-6">
            {/* Left – read‑only config */}
            <UseCaseConfig
              useCase={useCase}
              selectedROIs={rois}
              useCaseData={useCaseData}
              existingConfig={existingConfig}
              mode="view"
              siteId=""          /* not needed in view */
              cameraId=""
            />

            {/* Right – context summary */}
            <div className="space-y-4 border-l pl-6">
              <div>
                <h4 className="mb-1 text-sm font-semibold text-gray-700">Functional Tag</h4>
                <p className="rounded bg-teal-50 px-2 py-1 text-teal-800 inline-block">
                  {functionalTagName}
                </p>
              </div>

              <div>
                <h4 className="mb-1 text-sm font-semibold text-gray-700">ROIs</h4>
                {rois.length === 0 ? (
                  <p className="text-gray-500 text-sm">— none selected —</p>
                ) : (
                  <ul className="space-y-1">
                    {rois.map((r) => (
                      <li
                        key={r.id}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                      >
                        {r.name || `ROI ${r.id}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Add Use Case
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Secondary confirmation dialog */}
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Add Use Case"
        description="Are you sure you want to add this use case with the current configuration?"
        primaryButtonText="Yes, Add"
        secondaryButtonText="Go Back"
        onConfirm={handleAdd}
        onSecondary={() => setConfirmOpen(false)}
        isLoading={adding}
      />
    </>
  );
};
