"use client";

import React, { useState } from "react";
import { Lock, Unlock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface VaultAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (pin: string) => void;
}

export default function VaultAuthModal({
  isOpen,
  onClose,
  onAuthenticate,
}: VaultAuthModalProps): React.JSX.Element | null {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        // Automatically check pin
        if (nextPin === "1234") {
          toast.success("Secure Vault unlocked!");
          onAuthenticate(nextPin);
          setPin("");
        } else {
          setError(true);
          toast.error("Incorrect Vault PIN!");
          setPin("");
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card/60 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground text-sm"
        >
          Cancel
        </button>

        {/* Lock Icon Wrapper */}
        <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-full border ${error ? "border-destructive bg-destructive/10 text-destructive animate-bounce" : "border-primary/20 bg-primary/5 text-primary"}`}>
          {error ? <ShieldAlert className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
        </div>

        <h3 className="text-xl font-bold tracking-tight text-foreground">Secure Vault</h3>
        <p className="mt-2 text-center text-xs text-muted-foreground max-w-[240px]">
          Enter your 4-digit security PIN to decrypt and access vault storage. (Default: 1234)
        </p>

        {/* Dot Indicators */}
        <div className="my-8 flex gap-4">
          {[0, 1, 2, 3].map((index) => (
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

        {/* PIN Pad Grid */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-muted/5 text-lg font-semibold text-foreground hover:bg-muted/20 active:scale-95 transition-all mx-auto"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin("")}
            className="flex h-14 w-14 items-center justify-center rounded-full text-xs font-medium text-muted-foreground hover:text-foreground mx-auto"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-muted/5 text-lg font-semibold text-foreground hover:bg-muted/20 active:scale-95 transition-all mx-auto"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="flex h-14 w-14 items-center justify-center rounded-full text-xs font-medium text-muted-foreground hover:text-foreground mx-auto"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
