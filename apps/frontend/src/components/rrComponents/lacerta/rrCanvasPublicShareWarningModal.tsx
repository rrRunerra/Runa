"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { CanvasNodeType, CanvasNode } from "./CanvasEditor";
import { useTranslation } from "react-i18next";

interface RrCanvasPublicShareWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingFileShare: any;
  accessToken: string;
  createNodeAtPos: (
    type: CanvasNodeType,
    x: number,
    y: number,
    initialText?: string,
    cardStyle?: "document" | "sticky" | "header",
    imageUrl?: string,
    tableData?: string[][],
    extraProps?: Partial<CanvasNode>
  ) => void;
}

export default function RrCanvasPublicShareWarningModal({
  isOpen,
  onClose,
  pendingFileShare,
  accessToken,
  createNodeAtPos,
}: RrCanvasPublicShareWarningModalProps) {
  const { t } = useTranslation();
  if (!isOpen || !pendingFileShare) return null;

  const handleProceedShare = async () => {
    const tId = toast.loading(
      t("lacerta.canvasPublicWarning.sharingToast", { name: pendingFileShare.fileObj.name, defaultValue: "Sharing \"{{name}}\" publicly..." }),
    );
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${pendingFileShare.fileObj.key}/visibility`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) throw new Error(t("lacerta.canvasPublicWarning.changeVisibilityError", "Failed to change visibility"));
      toast.success(t("lacerta.canvasPublicWarning.fileSharedSuccess", "File shared publicly"), { id: tId });

      createNodeAtPos(
        pendingFileShare.type,
        pendingFileShare.x,
        pendingFileShare.y,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          lacertaFileId: pendingFileShare.fileObj.id,
          lacertaFileName: pendingFileShare.fileObj.name,
          lacertaFileType: pendingFileShare.fileObj.type,
          lacertaFileSize: pendingFileShare.fileObj.size,
          lacertaFileKey: pendingFileShare.fileObj.key,
          lacertaFileDecryptionKey: pendingFileShare.fileObj.rawFileKey,
          lacertaWrappedKey: pendingFileShare.fileObj.wrappedKey,
        },
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || t("lacerta.canvasPublicWarning.shareFailed", "Failed to share file"), { id: tId });
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col select-text">
        <div className="flex items-center gap-2 text-rose-500 mb-2">
          <ShieldAlert className="h-5 w-5 text-rose-600 animate-bounce shrink-0" />
          <h3 className="text-sm font-bold text-card-foreground">
            {t("lacerta.canvasPublicWarning.title", "Public Sharing Warning")}
          </h3>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 mb-6">
          {t("lacerta.canvasPublicWarning.descPart1", "This spatial canvas is **public**. If you embed the private file")}
          <strong className="text-foreground mx-1">
            "{pendingFileShare.fileObj.name}"
          </strong>
          {t("lacerta.canvasPublicWarning.descPart2", ", it will be automatically shared publicly to allow visitors to view/download it.")}
          <br />
          <br />
          {t("lacerta.canvasPublicWarning.descQuestion", "Are you sure you want to proceed and make this file public?")}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground transition-all active:scale-98"
          >
            {t("lacerta.canvasPublicWarning.cancel", "Cancel")}
          </button>
          <button
            onClick={handleProceedShare}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md active:scale-98"
          >
            {t("lacerta.canvasPublicWarning.proceed", "Proceed & Share Publicly")}
          </button>
        </div>
      </div>
    </div>
  );
}
