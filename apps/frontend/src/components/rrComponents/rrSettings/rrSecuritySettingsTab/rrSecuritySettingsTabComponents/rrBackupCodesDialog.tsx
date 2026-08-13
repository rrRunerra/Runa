import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, ShieldAlert } from "lucide-react";
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
  backupCodes?: string[];
  codes?: string[];
  onCopy: () => void;
  onDownload?: () => void;
  copied: boolean;
}

/**
 * Modal dialog displaying generated MFA recovery/backup codes.
 */
export function RrBackupCodesDialog({
  open,
  onOpenChange,
  backupCodes,
  codes,
  onCopy,
  onDownload,
  copied,
}: RrBackupCodesDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const list = backupCodes || codes || [];

  const handleDefaultDownload = (): void => {
    if (onDownload) {
      onDownload();
      return;
    }
    const text = `Runa Realm MFA Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${list.join(
      "\n"
    )}\n\nStore these codes in a safe, offline place. Each code can only be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "runa-mfa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl text-left">
        <DialogHeader className="pb-2">
          <div className="size-10 rounded-xl bg-warning/10 text-warning border border-warning/20 flex items-center justify-center mb-2">
            <ShieldAlert className="size-5" />
          </div>
          <DialogTitle className="text-md font-bold text-foreground text-left">
            {t("securitySettings.saveBackupCodesTitle", "Save Your Backup Codes")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 text-left leading-relaxed">
            {t(
              "securitySettings.saveBackupCodesDesc",
              "Store these recovery codes in a safe place. Each code can only be used once if you lose access to your primary authentication method."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 p-4 bg-muted/20 border border-border/60 rounded-xl font-mono text-xs text-foreground grid grid-cols-2 gap-2 text-center">
          {list.map((code, i) => (
            <div
              key={i}
              className="p-2 bg-background border border-border/40 rounded-lg font-bold select-all tracking-wider"
            >
              {code}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCopy}
              className="h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 mr-1.5 text-success" />
                  {t("securitySettings.copiedBtn", "Copied!")}
                </>
              ) : (
                <>
                  <Copy className="size-3.5 mr-1.5" />
                  {t("securitySettings.copyBtn", "Copy Codes")}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDefaultDownload}
              className="h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Download className="size-3.5 mr-1.5" />
              {t("securitySettings.downloadBtn", "Download Text File")}
            </Button>
          </div>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-4 text-xs h-8 cursor-pointer"
          >
            {t("securitySettings.doneBtn", "I Have Saved My Codes")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
