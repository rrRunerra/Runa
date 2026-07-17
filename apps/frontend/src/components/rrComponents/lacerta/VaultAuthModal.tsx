"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  ShieldAlert,
  KeyRound,
  Trash2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface VaultAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (pin: string) => void;
  accessToken: string;
}

type Mode = "loading" | "setup" | "confirm" | "authenticate" | "reset-confirm";

export default function VaultAuthModal({
  isOpen,
  onClose,
  onAuthenticate,
  accessToken,
}: VaultAuthModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("loading");
  const [pin, setPin] = useState<string>("");
  const [firstPin, setFirstPin] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>("");

  useEffect(() => {
    if (isOpen && accessToken) {
      checkVaultStatus();
    }
  }, [isOpen, accessToken]);

  useEffect(() => {
    if (!isOpen || mode === "loading" || mode === "reset-confirm") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, mode, pin, firstPin, isProcessing]);

  if (!isOpen) return null;

  const checkVaultStatus = async () => {
    setMode("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/vault/status`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) throw new Error(t("lacerta.vaultAuth.statusLoadError", "Failed to load vault status."));
      const data = await res.json();
      if (data.hasPin) {
        setMode("authenticate");
      } else {
        setMode("setup");
      }
    } catch (err: any) {
      toast.error(err.message || t("lacerta.vaultAuth.secureVaultContactError", "Failed to contact secure vault service."));
      onClose();
    }
  };

  const handleKeyPress = async (num: string) => {
    if (pin.length < 6 && !isProcessing) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 6) {
        if (mode === "setup") {
          // Store first PIN and move to confirmation stage
          setFirstPin(nextPin);
          setPin("");
          setMode("confirm");
          toast.info(t("lacerta.vaultAuth.confirmPinToast", "Please confirm your security PIN."));
        } else if (mode === "confirm") {
          // Compare with first entered PIN
          if (nextPin === firstPin) {
            await handleSetupPin(nextPin);
          } else {
            setError(true);
            toast.error(t("lacerta.vaultAuth.pinsDoNotMatch", "PINs do not match. Please start setup again."));
            setPin("");
            setFirstPin("");
            setMode("setup");
          }
        } else if (mode === "authenticate") {
          await handleVerifyPin(nextPin);
        }
      }
    }
  };

  const handleSetupPin = async (finalPin: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/vault/setup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ pin: finalPin }),
        },
      );
      if (!res.ok) throw new Error(t("lacerta.vaultAuth.savePinFailed", "Failed to save PIN."));

      toast.success(t("lacerta.vaultAuth.pinSetupSuccess", "Security PIN configured successfully!"));
      onAuthenticate(finalPin);
      setPin("");
      setFirstPin("");
    } catch (err: any) {
      toast.error(err.message || t("lacerta.vaultAuth.setupFailed", "Setup failed."));
      setPin("");
      setFirstPin("");
      setMode("setup");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPin = async (enteredPin: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/vault/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ pin: enteredPin }),
        },
      );
      if (!res.ok) throw new Error(t("lacerta.vaultAuth.verificationError", "Verification error."));
      const data = await res.json();

      if (data.success) {
        toast.success(t("lacerta.vaultAuth.vaultUnlocked", "Secure Vault unlocked!"));
        onAuthenticate(enteredPin);
        setPin("");
      } else {
        setError(true);
        toast.error(t("lacerta.vaultAuth.incorrectPin", "Incorrect Vault PIN!"));
        setPin("");
      }
    } catch (err: any) {
      toast.error(err.message || t("lacerta.vaultAuth.verificationFailedGeneric", "Verification failed."));
      setPin("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetVault = async () => {
    if (confirmInput.toUpperCase() !== "WIPE") {
      toast.error(t("lacerta.vaultAuth.typeWipeToConfirm", "Please type WIPE to confirm."));
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/vault/reset`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) throw new Error(t("lacerta.vaultAuth.resetFailed", "Failed to reset vault."));

      toast.success(t("lacerta.vaultAuth.vaultWipedSuccess", "Vault wiped and PIN deleted successfully."));
      setConfirmInput("");
      setPin("");
      setFirstPin("");
      setMode("setup");
    } catch (err: any) {
      toast.error(err.message || t("lacerta.vaultAuth.resetFailed", "Failed to reset vault."));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card/60 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center">
        {mode !== "loading" && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground text-sm"
          >
            {t("lacerta.vaultAuth.cancel", "Cancel")}
          </button>
        )}

        {mode === "loading" && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <span className="text-sm font-semibold text-muted-foreground">
              {t("lacerta.vaultAuth.connecting", "Connecting to Secure Vault...")}
            </span>
          </div>
        )}

        {mode === "setup" && (
          <div className="flex flex-col items-center w-full">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary">
              <KeyRound className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {t("lacerta.vaultAuth.setPinTitle", "Set PIN")}
            </h3>
            <p className="mt-2 text-center text-xs text-muted-foreground max-w-[240px]">
              {t("lacerta.vaultAuth.setPinDesc", "Configure a 6-digit security PIN to protect your Secure Vault storage.")}
            </p>
          </div>
        )}

        {mode === "confirm" && (
          <div className="flex flex-col items-center w-full">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary animate-pulse">
              <KeyRound className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {t("lacerta.vaultAuth.confirmPinTitle", "Confirm PIN")}
            </h3>
            <p className="mt-2 text-center text-xs text-muted-foreground max-w-[240px]">
              {t("lacerta.vaultAuth.confirmPinDesc", "Please re-enter your 6-digit security PIN to confirm setup.")}
            </p>
          </div>
        )}

        {mode === "authenticate" && (
          <div className="flex flex-col items-center w-full">
            <div
              className={`mb-6 flex h-16 w-16 items-center justify-center rounded-full border ${error ? "border-destructive bg-destructive/10 text-destructive animate-bounce" : "border-primary/20 bg-primary/5 text-primary"}`}
            >
              {error ? (
                <ShieldAlert className="h-8 w-8" />
              ) : (
                <Lock className="h-8 w-8" />
              )}
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {t("lacerta.vaultAuth.secureVaultTitle", "Secure Vault")}
            </h3>
            <p className="mt-2 text-center text-xs text-muted-foreground max-w-[240px]">
              {t("lacerta.vaultAuth.secureVaultDesc", "Enter your 6-digit security PIN to decrypt and access vault storage.")}
            </p>
          </div>
        )}

        {mode === "reset-confirm" && (
          <div className="flex flex-col items-center w-full text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-destructive bg-destructive/10 text-destructive">
              <Trash2 className="h-8 w-8 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-destructive">
              {t("lacerta.vaultAuth.wipeVaultTitle", "Wipe Secure Vault?")}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground max-w-[280px]">
              {t("lacerta.vaultAuth.resetWarning", "Resetting your PIN will permanently delete all files and folders in your Secure Vault. This action cannot be undone.")}
            </p>
            <div className="mt-6 w-full flex flex-col gap-3">
              <input
                type="text"
                placeholder={t("lacerta.vaultAuth.typeWipePlaceholder", "Type 'WIPE' to confirm")}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full bg-muted/5 border border-destructive/30 rounded-lg px-3 py-2 text-center text-sm font-semibold tracking-wider uppercase text-destructive placeholder-muted-foreground/40 focus:outline-none focus:border-destructive transition-all"
              />
              <button
                onClick={handleResetVault}
                disabled={isProcessing || confirmInput.toUpperCase() !== "WIPE"}
                className="w-full bg-destructive text-destructive-foreground font-semibold rounded-lg text-sm py-2.5 hover:bg-destructive/90 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t("lacerta.vaultAuth.wipeResetPinBtn", "Wipe & Reset PIN")}
              </button>
              <button
                onClick={() => {
                  setConfirmInput("");
                  setMode("authenticate");
                }}
                className="w-full border border-border bg-transparent hover:bg-muted/10 font-semibold rounded-lg text-sm py-2.5 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("lacerta.vaultAuth.backToLoginBtn", "Back to Login")}
              </button>
            </div>
          </div>
        )}

        {/* PIN Entry Indicators and Keyboard Pad */}
        {mode !== "loading" && mode !== "reset-confirm" && (
          <>
            <div className="my-8 flex gap-4">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className={`h-4.5 w-4.5 rounded-full border transition-all duration-200 ${
                    index < pin.length
                      ? "bg-primary border-primary scale-110 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                      : "border-muted-foreground/30 bg-transparent"
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  disabled={isProcessing}
                  onClick={() => handleKeyPress(num)}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-muted/5 text-lg font-semibold text-foreground hover:bg-muted/20 active:scale-95 transition-all mx-auto disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <button
                disabled={isProcessing}
                onClick={() => setPin("")}
                className="flex h-14 w-14 items-center justify-center rounded-full text-xs font-medium text-muted-foreground hover:text-foreground mx-auto disabled:opacity-50"
              >
                {t("lacerta.vaultAuth.clear", "Clear")}
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleKeyPress("0")}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-muted/5 text-lg font-semibold text-foreground hover:bg-muted/20 active:scale-95 transition-all mx-auto disabled:opacity-50"
              >
                0
              </button>
              <button
                disabled={isProcessing}
                onClick={handleBackspace}
                className="flex h-14 w-14 items-center justify-center rounded-full text-xs font-medium text-muted-foreground hover:text-foreground mx-auto disabled:opacity-50"
              >
                {t("lacerta.vaultAuth.delete", "Delete")}
              </button>
            </div>

            {mode === "authenticate" && (
              <button
                onClick={() => setMode("reset-confirm")}
                className="mt-6 text-xs text-destructive hover:underline font-semibold"
              >
                {t("lacerta.vaultAuth.forgotPin", "Forgot PIN? Reset Vault")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
