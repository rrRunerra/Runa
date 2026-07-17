import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-md font-bold text-destructive text-left">
            {t("securitySettings.confirmDisableTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 text-left">
            {t("securitySettings.confirmDisableDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-destructive hover:bg-destructive/95 text-destructive-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting ? t("securitySettings.processing") : t("securitySettings.confirmAndDisable")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

