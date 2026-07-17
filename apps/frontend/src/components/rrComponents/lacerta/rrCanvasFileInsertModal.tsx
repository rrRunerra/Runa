"use client";

import React from "react";
import { FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { wrapKey } from "@runa/crypto/browser";
import { CanvasNodeType, CanvasNode } from "./types";
import { useTranslation } from "react-i18next";

interface RrCanvasFileInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  embedType: "file" | "pdf";
  decryptedLacertaFiles: any[];
  canvasFile: any;
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
  setPendingFileShare: (share: any) => void;
}

export default function RrCanvasFileInsertModal({
  isOpen,
  onClose,
  x,
  y,
  embedType,
  decryptedLacertaFiles,
  canvasFile,
  createNodeAtPos,
  setPendingFileShare,
}: RrCanvasFileInsertModalProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();

  const shareFileWithCanvasCollaborators = async (f: any) => {
    if (!session?.accessToken || !canvasFile) return;

    const currentUserId = session.user?.id;
    const collaboratorsToShareWith: { id: string; userPublicKey: string; username: string }[] = [];

    // 1. Owner
    if (canvasFile.userId && canvasFile.userId !== currentUserId) {
      const ownerPublicKey = canvasFile.user?.userPublicKey;
      if (ownerPublicKey) {
        const isAlreadyShared = f.shares?.some((s: any) => s.userId === canvasFile.userId);
        if (!isAlreadyShared) {
          collaboratorsToShareWith.push({
            id: canvasFile.userId,
            userPublicKey: ownerPublicKey,
            username: canvasFile.user?.username || "owner",
          });
        }
      }
    }

    // 2. Shares
    if (canvasFile.shares && Array.isArray(canvasFile.shares)) {
      for (const share of canvasFile.shares) {
        if (share.userId && share.userId !== currentUserId) {
          const recipientPublicKey = share.user?.userPublicKey;
          if (recipientPublicKey) {
            const isAlreadyShared = f.shares?.some((s: any) => s.userId === share.userId);
            if (!isAlreadyShared) {
              collaboratorsToShareWith.push({
                id: share.userId,
                userPublicKey: recipientPublicKey,
                username: share.user?.username || "collaborator",
              });
            }
          }
        }
      }
    }

    if (collaboratorsToShareWith.length === 0) return;

    for (const collab of collaboratorsToShareWith) {
      try {
        const recipientWrappedKey = JSON.stringify(
          await wrapKey(f.rawFileKey, collab.userPublicKey)
        );

        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${f.id}/share`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({
              recipientId: collab.id,
              wrappedKey: recipientWrappedKey,
              allowEdit: true,
            }),
          }
        );
        console.log(`Successfully shared embedded file ${f.name} with collaborator @${collab.username}`);
      } catch (err) {
        console.error(`Failed to share embedded file ${f.name} with collaborator @${collab.username}:`, err);
      }
    }
  };

  if (!isOpen) return null;

  const filteredFiles = decryptedLacertaFiles.filter((f) => {
    if (embedType === "pdf") {
      return f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf";
    }
    return true;
  });

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col select-text">
        <h3 className="text-sm font-bold text-card-foreground">
          {embedType === "pdf" ? t("lacerta.canvasFileInsert.embedPdfTitle", "Embed PDF Document") : t("lacerta.canvasFileInsert.embedFileTitle", "Embed Lacerta File")}
        </h3>
        <p className="text-[11px] text-muted-foreground leading-normal mt-1 mb-4">
          {embedType === "pdf"
            ? t("lacerta.canvasFileInsert.embedPdfDesc", "Select a decrypted PDF file from your vault to display a live preview card.")
            : t("lacerta.canvasFileInsert.embedFileDesc", "Select a file from your decrypted vault to place as an E2EE file download card.")}
        </p>

        <div className="max-h-[180px] overflow-y-auto border border-border/40 rounded-xl divide-y divide-border/20 no-scrollbar">
          {filteredFiles.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {t("lacerta.canvasFileInsert.noFiles", "No matching decrypted files available.")}
            </div>
          ) : (
            filteredFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  const isCanvasPublic = canvasFile?.isPublic;
                  if (isCanvasPublic && !f.isPublic) {
                    setPendingFileShare({
                      type: embedType,
                      fileObj: f,
                      x,
                      y,
                    });
                    onClose();
                    return;
                  }

                  shareFileWithCanvasCollaborators(f);

                  createNodeAtPos(
                    embedType,
                    x,
                    y,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    {
                      lacertaFileId: f.id,
                      lacertaFileName: f.name,
                      lacertaFileType: f.type,
                      lacertaFileSize: f.size,
                      lacertaFileKey: f.key,
                      lacertaFileDecryptionKey: f.rawFileKey,
                      lacertaWrappedKey: f.wrappedKey,
                    }
                  );
                  onClose();
                }}
                className="w-full text-left p-2.5 hover:bg-muted/10 text-xs font-semibold truncate transition-colors flex items-center gap-2"
              >
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-foreground">
                    {f.name}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    {f.size
                      ? `${(f.size / 1024).toFixed(1)} KB`
                      : t("lacerta.canvasFileInsert.sizeUnknown", "Size Unknown")}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground transition-all active:scale-98"
          >
            {t("lacerta.canvasFileInsert.cancel", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
