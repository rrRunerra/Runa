"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import RrLapplandEncryptionLocked from "./rrImages/rrLapplandEncryptionLocked";

export function RrEncryptionLocked(): React.JSX.Element {
  const { t } = useTranslation();
  const { setShowUnlockDialog } = useRRCrypto();

  return (
    <div className="w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden grid md:grid-cols-2 animate-in fade-in zoom-in duration-200">
      {/* Left side: Form/Text */}
      <div className="p-8 md:p-12 flex flex-col justify-center items-start text-left min-h-[400px] md:h-[480px]">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {t("lacerta.encryptionLocked", "Encryption Locked")}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          {t(
            "lacerta.encryptionLockedDesc",
            "Your data is encrypted. Please unlock your decryption keys with button below"
          )}
        </p>
        <button
          onClick={() => setShowUnlockDialog(true)}
          className="mt-8 px-8 py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl text-sm flex items-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
        >
          {t("lacerta.unlockDecryptionKeys", "Unlock Decryption Keys")}
        </button>
      </div>

      {/* Right side: Cover Panel */}
      <div className="relative hidden bg-muted border-l border-border md:flex items-center justify-center overflow-hidden w-full h-full min-h-[400px] md:h-[480px]">
        <div className="absolute inset-0 w-full h-full flex items-center justify-center scale-[1.1]">
          <RrLapplandEncryptionLocked className="w-full h-full object-cover object-[65%_50%] select-none pointer-events-none text-foreground" />
        </div>
      </div>
    </div>
  );
}
