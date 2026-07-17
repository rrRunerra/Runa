import * as React from "react";
import { ShieldCheck, AlertCircle, Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RrBackupCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupCodes: string[];
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
}

export function RrBackupCodesDialog({
  open,
  onOpenChange,
  backupCodes,
  onCopy,
  onDownload,
  copied,
}: RrBackupCodesDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl flex flex-col items-center">
        <DialogHeader className="pb-2 text-center w-full">
          <div className="mx-auto size-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
            <ShieldCheck className="size-5 animate-pulse" />
          </div>
          <DialogTitle className="text-md font-bold text-center">
            {t("securitySettings.backupCodesTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center mt-1">
            {t("securitySettings.backupCodesDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* List of backup codes */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 rounded-xl border border-border bg-muted/40 font-mono font-bold tracking-wider text-sm my-4 text-center select-all leading-normal">
          {backupCodes.map((code, index) => (
            <div key={index} className="text-muted-foreground py-1 text-xs">
              {code}
            </div>
          ))}
        </div>

        {/* Warning text */}
        <div className="p-3 rounded-xl border border-warning/10 bg-warning/5 mb-3 flex items-start gap-2.5 text-left w-full text-[11px] text-warning/80">
          <AlertCircle className="size-4 shrink-0 mt-0.5 animate-bounce" />
          <p className="leading-relaxed">
            {t("securitySettings.backupCodesWarning")}
          </p>
        </div>

        <div className="flex gap-2.5 w-full">
          <Button
            onClick={onCopy}
            variant="outline"
            className="flex-1 h-9 rounded-xl border border-border hover:bg-muted text-xs font-semibold"
          >
            {copied ? (
              <Check className="size-3.5 mr-1.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5 mr-1.5" />
            )}
            {copied ? t("securitySettings.copied") : t("securitySettings.copyCodes")}
          </Button>
          <Button
            onClick={onDownload}
            variant="outline"
            className="flex-1 h-9 rounded-xl border border-border hover:bg-muted text-xs font-semibold"
          >
            <Download className="size-3.5 mr-1.5" />
            {t("securitySettings.downloadTxt")}
          </Button>
        </div>

        <Button
          onClick={() => onOpenChange(false)}
          className="w-full mt-3 h-9 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs cursor-pointer"
        >
          {t("securitySettings.savedCodesBtn")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

