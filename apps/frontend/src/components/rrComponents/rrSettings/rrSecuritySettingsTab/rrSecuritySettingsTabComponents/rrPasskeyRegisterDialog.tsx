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

export interface RrPasskeyRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nickname: string;
  setNickname: (name: string) => void;
  isSubmitting: boolean;
  onRegister: () => Promise<void>;
}

/**
 * Modal dialog component for registering a new WebAuthn Passkey device.
 */
export function RrPasskeyRegisterDialog({
  open,
  onOpenChange,
  nickname,
  setNickname,
  isSubmitting,
  onRegister,
}: RrPasskeyRegisterDialogProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl text-left">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-md font-bold text-foreground text-left">
            {t("securitySettings.registerPasskeyTitle", "Register a Passkey")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 text-left leading-relaxed">
            {t(
              "securitySettings.registerPasskeyDesc",
              "Enter a descriptive nickname for this device (e.g. MacBook Pro TouchID)."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3 text-left">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="passkey-nickname-input"
              className="text-xs font-semibold text-foreground"
            >
              {t("securitySettings.passkeyNicknameLabel", "Device Nickname")}
            </label>
            <Input
              id="passkey-nickname-input"
              type="text"
              placeholder="e.g. MacBook Pro TouchID"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="h-9 px-3 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && nickname.trim() && !isSubmitting) {
                  e.preventDefault();
                  onRegister();
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
            onClick={onRegister}
            disabled={isSubmitting || !nickname.trim()}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting
              ? t("securitySettings.registering", "Registering...")
              : t("securitySettings.continueBtn", "Continue to TouchID / Key")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
