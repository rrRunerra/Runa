"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DecryptedFileItem } from "../types";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileToDelete: DecryptedFileItem | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  fileToDelete,
  isDeleting,
  onConfirm,
}: DeleteConfirmModalProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!isOpen || !fileToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl animate-in zoom-in duration-150">
        <h3 className="text-sm font-bold text-foreground mb-1">
          {t("lacerta.deleteForeverQuestion")}
        </h3>
        <p className="text-xs text-muted-foreground mb-1">
          {t("lacerta.permanentlyDeleteDesc")}
        </p>
        <p className="text-xs font-semibold text-foreground bg-muted/20 rounded-lg px-3 py-2 mb-4 truncate">
          {fileToDelete.name}
        </p>
        <p className="text-xs text-destructive mb-5">
          {t("lacerta.irreversibleActionDesc")}
        </p>
        <div className="flex justify-end items-center gap-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-1.5 border border-border hover:bg-muted/10 rounded-lg text-xs font-semibold text-foreground transition-all disabled:opacity-50"
          >
            {t("lacerta.cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-3.5 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {t("lacerta.deleteForever")}
          </button>
        </div>
      </div>
    </div>
  );
}
