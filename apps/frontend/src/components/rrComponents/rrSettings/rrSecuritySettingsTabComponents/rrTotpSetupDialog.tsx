import React, { useCallback } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

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
  const qrCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node && totpQrUrl) {
        QRCode.toCanvas(node, totpQrUrl, {
          width: 180,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        }).catch((err) => console.error("Error drawing QR canvas:", err));
      }
    },
    [totpQrUrl],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl flex flex-col items-center">
        <DialogHeader className="pb-2 text-center w-full">
          <DialogTitle className="text-md font-bold text-center">
            {t("securitySettings.totpSetupTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center mt-1">
            {t("securitySettings.totpSetupDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 my-4 p-4 rounded-2xl border border-border bg-white">
          <canvas ref={qrCanvasRef} className="rounded-lg" />
        </div>

        <div className="w-full flex flex-col gap-3">
          <div className="p-3.5 rounded-xl bg-muted border border-border flex flex-col gap-1 text-center relative isolate">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
              {t("securitySettings.manualSecretKey")}
            </span>
            <span className="text-xs font-mono font-bold text-primary select-all break-all tracking-wider">
              {totpSecret}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 pt-2 items-center">
            <Label
              htmlFor="totp-ver-code"
              className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              {t("securitySettings.verificationCodeLabel")}
            </Label>
            <InputOTP
              maxLength={6}
              value={totpCode}
              onChange={(val) => setTotpCode(val.replace(/\D/g, ""))}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <div className="flex justify-end gap-3 w-full pt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={onVerify}
            disabled={totpCode.length !== 6 || isSubmitting}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting ? t("securitySettings.enabling") : t("securitySettings.verifyAndEnable")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
