"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, Shield, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { useTranslation } from "react-i18next";

export function RrDecryptModal() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const {
    showUnlockDialog,
    setShowUnlockDialog,
    isKeysExist,
    isEncryptionUnlocked,
    unlockEncryption,
  } = useRRCrypto();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (loading) return;
    setShowUnlockDialog(open);
    if (!open && !isEncryptionUnlocked && session?.user?.username) {
      localStorage.setItem(`runa-encryption-dismissed-${session.user?.username}`, "true");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError("");

    try {
      await unlockEncryption(password);
      setPassword("");
    } catch {
      setError(
        isKeysExist
          ? t("incorrectPasswordUnlock")
          : t("failedInitializeKeys"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={showUnlockDialog} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-card border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-md font-bold text-foreground">
            <Shield className="size-5 text-primary" />
            {isKeysExist ? t("unlockEncryption") : t("setupEncryption")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {isKeysExist
              ? t("unlockEncryptionDesc")
              : t("setupEncryptionDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="encryption-password" className="text-xs font-semibold text-muted-foreground">
              {t("accountPassword")}
            </Label>
            <div className="relative">
              <Input
                id="encryption-password"
                type="password"
                placeholder={t("enterAccountPassword")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-10 rounded-lg text-xs pr-10 transition-all"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <div className="size-5 flex items-center justify-center rounded bg-primary/10 border border-primary/20">
                  <Shield className="size-3 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-[11px] font-medium text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg transition-all">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={loading || !password}
              className="h-9 px-5 text-xs font-semibold rounded-lg cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                  {isKeysExist ? t("decrypting") : t("settingUp")}
                </>
              ) : (
                <>
                  <Lock className="size-3.5 mr-1.5" />
                  {isKeysExist ? t("unlockStorage") : t("initializeEncryption")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
