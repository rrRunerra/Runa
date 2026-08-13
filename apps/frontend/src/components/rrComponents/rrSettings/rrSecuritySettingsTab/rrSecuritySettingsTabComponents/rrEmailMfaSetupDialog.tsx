import React from "react";
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

export interface RrEmailMfaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailOtpCode: string;
  setEmailOtpCode: (code: string) => void;
  isSubmitting: boolean;
  onVerify: () => Promise<void>;
  onResendOtp?: () => Promise<void>;
}

/**
 * Modal dialog component for setting up Email OTP 2FA.
 */
export function RrEmailMfaSetupDialog({
  open,
  onOpenChange,
  emailOtpCode,
  setEmailOtpCode,
  isSubmitting,
  onVerify,
  onResendOtp,
}: RrEmailMfaSetupDialogProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl text-left">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-md font-bold text-foreground text-left">
            {t("securitySettings.setupEmailOtpTitle", "Email Verification Setup")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 text-left leading-relaxed">
            {t(
              "securitySettings.setupEmailOtpDesc",
              "Enter the 6-digit security code sent to your email address to enable Email OTP."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3 text-left">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="email-otp-verification-code"
                className="text-xs font-semibold text-foreground"
              >
                {t("securitySettings.enterEmailOtpCodeLabel", "Security Code")}
              </label>
              {onResendOtp && (
                <Button
                  type="button"
                  variant="link"
                  onClick={onResendOtp}
                  disabled={isSubmitting}
                  className="p-0 h-auto text-xs text-primary hover:underline cursor-pointer"
                >
                  {t("securitySettings.resendCode", "Resend Code")}
                </Button>
              )}
            </div>
            <Input
              id="email-otp-verification-code"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={emailOtpCode}
              onChange={(e) =>
                setEmailOtpCode(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="h-10 text-center font-mono text-base tracking-widest rounded-xl"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  emailOtpCode.length === 6 &&
                  !isSubmitting
                ) {
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
            disabled={isSubmitting || emailOtpCode.length !== 6}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting
              ? t("securitySettings.verifying", "Verifying...")
              : t("securitySettings.enableEmailOtpBtn", "Enable Email OTP")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
