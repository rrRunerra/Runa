import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-md font-bold text-left">
            {t("securitySettings.passkeyRegisterTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 text-left">
            {t("securitySettings.passkeyRegisterDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3 text-left">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="passkey-nickname">{t("securitySettings.passkeyNameLabel")}</Label>
            <Input
              id="passkey-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t("securitySettings.passkeyNamePlaceholder")}
              className="h-10 px-3 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={onRegister}
            disabled={!nickname.trim() || isSubmitting}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting ? t("securitySettings.registering") : t("securitySettings.verifyAndRegister")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

