import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RrTotpSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totpSecret: string;
  totpQrUrl: string;
  totpCode: string;
  setTotpCode: (code: string) => void;
  isSubmitting: boolean;
  onVerify: () => Promise<void>;
}

/**
 * Modal dialog component for setting up Authenticator App (TOTP) 2FA.
 */
export function RrTotpSetupDialog({
  open,
  onOpenChange,
  totpSecret,
  totpQrUrl,
  totpCode,
  setTotpCode,
  isSubmitting,
  onVerify,
}: RrTotpSetupDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!totpQrUrl) {
      setQrDataUrl("");
      return;
    }
    if (totpQrUrl.startsWith("data:image")) {
      setQrDataUrl(totpQrUrl);
      return;
    }
    QRCode.toDataURL(totpQrUrl, { width: 160, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR code", err));
  }, [totpQrUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl text-left">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-md font-bold text-foreground text-left">
            {t("securitySettings.setupTotpTitle", "Set Up Authenticator App")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 text-left leading-relaxed">
            {t(
              "securitySettings.setupTotpDesc",
              "Scan the QR code below with your authenticator app (e.g. Google Authenticator, Bitwarden) and enter the generated 6-digit code."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-3">
          {qrDataUrl && (
            <div className="p-3 bg-white rounded-2xl border border-border shadow-sm flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="TOTP QR Code" className="size-36 object-contain" />
            </div>
          )}

          <div className="flex flex-col items-center gap-1 w-full text-center">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              {t("securitySettings.secretKeyLabel", "Secret Key (Manual Entry)")}
            </span>
            <code className="text-xs font-mono bg-muted/40 px-3 py-1.5 rounded-xl border border-border select-all font-bold text-foreground">
              {totpSecret || "—"}
            </code>
          </div>

          <div className="flex flex-col gap-1.5 w-full text-left pt-2">
            <label
              htmlFor="totp-verification-code"
              className="text-xs font-semibold text-foreground"
            >
              {t("securitySettings.enterTotpCodeLabel", "6-Digit Security Code")}
            </label>
            <Input
              id="totp-verification-code"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ""))}
              className="h-10 text-center font-mono text-base tracking-widest rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && totpCode.length === 6 && !isSubmitting) {
                  e.preventDefault();
                  onVerify();
                }
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            {t("cancel", "Cancel")}
          </Button>
          <Button
            onClick={onVerify}
            disabled={isSubmitting || totpCode.length !== 6}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting
              ? t("securitySettings.verifying", "Verifying...")
              : t("securitySettings.enableTotpBtn", "Enable Authenticator")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
