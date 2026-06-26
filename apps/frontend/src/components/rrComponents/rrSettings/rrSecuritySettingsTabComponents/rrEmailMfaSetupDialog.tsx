import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export interface RrEmailMfaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailOtpCode: string;
  setEmailOtpCode: (code: string) => void;
  isSubmitting: boolean;
  onVerify: () => Promise<void>;
}

export function RrEmailMfaSetupDialog({
  open,
  onOpenChange,
  emailOtpCode,
  setEmailOtpCode,
  isSubmitting,
  onVerify,
}: RrEmailMfaSetupDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-md font-bold text-left">
            Setup Email MFA
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 text-left">
            Enter the 6-digit verification code sent to your primary email
            address.
          </DialogDescription>
        </DialogHeader>

        <div className="gap-4 py-3 flex flex-col items-center">
          <div className="flex flex-col gap-1.5  items-center">
            <Label htmlFor="email-setup-code" className="mb-1.5">
              Verification Code
            </Label>
            <InputOTP
              maxLength={6}
              value={emailOtpCode}
              onChange={(val) => setEmailOtpCode(val.replace(/\D/g, ""))}
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

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={onVerify}
            disabled={emailOtpCode.length !== 6 || isSubmitting}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting ? "Enabling..." : "Verify & Enable"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
