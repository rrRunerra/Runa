import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RrConfirmDisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onConfirm: () => Promise<void>;
  method: string | null;
}

export function RrConfirmDisableDialog({
  open,
  onOpenChange,
  isSubmitting,
  onConfirm,
  method: _method,
}: RrConfirmDisableDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-md font-bold text-destructive text-left">
            Confirm Disconnection
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 text-left">
            Are you sure you want to disable or remove this authentication
            method? This could weaken your account security.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-destructive hover:bg-destructive/95 text-destructive-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting ? "Processing..." : "Confirm & Disable"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
