"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useSession } from "next-auth/react";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { useTranslation } from "react-i18next";
import { Folder, ChevronRight, ArrowLeft, Loader2, Home, Check } from "lucide-react";
import { RawFileItem } from "../../types";

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
}

interface DecryptedFolder {
  id: string;
  name: string;
  parentId: string | null;
  isVault: boolean;
}

export function FolderPickerModal({
  isOpen,
  onClose,
  onSelect,
}: FolderPickerModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { isEncryptionUnlocked, privateKey, unwrapKey, decrypt } = useRRCrypto();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [decryptedFolders, setDecryptedFolders] = useState<DecryptedFolder[]>([]);
  const [decrypting, setDecrypting] = useState<boolean>(false);

  // Fetch file list
  const { data, error, isLoading } = useSWR<RawFileItem[]>(
    isOpen && session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/list`, session.accessToken]
      : null,
    fetcher
  );

  useEffect(() => {
    if (!isOpen) {
      setCurrentFolderId(null);
      setDecryptedFolders([]);
      return;
    }

    if (!isEncryptionUnlocked || !data || !privateKey) {
      setDecryptedFolders([]);
      return;
    }

    const decryptFolders = async () => {
      setDecrypting(true);
      const list: DecryptedFolder[] = [];
      const foldersOnly = data.filter((item) => item.isFolder && !item.isTrash && !item.isVault);

      for (const folder of foldersOnly) {
        try {
          const isOwner = folder.userId === session?.user?.id;
          const shareRecord = folder.shares?.find((s) => s.userId === session?.user?.id);
          const wrappedKeyToUse = isOwner ? folder.wrappedKey : (shareRecord ? shareRecord.wrappedKey : null);

          if (!wrappedKeyToUse) continue;

          const fileKey = await unwrapKey(wrappedKeyToUse, privateKey);
          let decryptedName = folder.name;
          try {
            decryptedName = await decrypt(folder.name, fileKey);
          } catch (err) {
            console.error("Failed to decrypt folder name:", err);
          }

          list.push({
            id: folder.id,
            name: decryptedName,
            parentId: folder.parentId,
            isVault: folder.isVault,
          });
        } catch (err) {
          console.error("Error processing folder:", err);
        }
      }
      setDecryptedFolders(list);
      setDecrypting(false);
    };

    decryptFolders();
  }, [isOpen, data, isEncryptionUnlocked, privateKey, session?.user?.id, unwrapKey, decrypt]);

  if (!isOpen) return null;

  const currentFolder = decryptedFolders.find((f) => f.id === currentFolderId);
  const visibleFolders = decryptedFolders.filter((f) => f.parentId === currentFolderId);

  const handleBack = () => {
    if (currentFolderId === null) return;
    const parent = decryptedFolders.find((f) => f.id === currentFolderId);
    setCurrentFolderId(parent ? parent.parentId : null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in duration-150 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">
            {t("lacerta.selectFolder", { defaultValue: "Select Destination Folder" })}
          </h3>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-all"
          >
            {t("lacerta.cancel", { defaultValue: "Cancel" })}
          </button>
        </div>

        {/* Navigation Breadcrumb / Header */}
        <div className="flex items-center gap-2 bg-muted/10 border border-border rounded-lg p-2.5 mb-4 text-xs">
          {currentFolderId !== null ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-primary hover:underline font-semibold"
            >
              <ArrowLeft className="size-3.5" />
              {t("lacerta.back", { defaultValue: "Back" })}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Home className="size-3.5 text-muted-foreground/75" />
              <span>{t("lacerta.rootFolder", { defaultValue: "Root Folder" })}</span>
            </div>
          )}
          {currentFolderId !== null && currentFolder && (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {currentFolder.name}
              </span>
            </>
          )}
        </div>

        {/* Folders List */}
        <div className="flex-1 overflow-y-auto min-h-[200px] border border-border rounded-xl bg-muted/5 divide-y divide-border/40 mb-6">
          {isLoading || decrypting ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-[11px]">{t("lacerta.decryptingFolderIndex", { defaultValue: "Decrypting folders..." })}</span>
            </div>
          ) : visibleFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60 text-xs">
              <Folder className="size-8 text-muted-foreground/30 mb-2" />
              {t("lacerta.noFolders", { defaultValue: "No folders found" })}
            </div>
          ) : (
            visibleFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                className="flex items-center justify-between p-3 hover:bg-muted/10 cursor-pointer transition-all active:bg-muted/20"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Folder className="size-4 text-primary shrink-0" />
                  <span className="text-xs text-foreground font-medium truncate">{folder.name}</span>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground/45" />
              </div>
            ))
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-2.5">
          <button
            onClick={() => onSelect(currentFolderId)}
            className="w-full py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Check className="size-4" />
            {t("lacerta.saveHere", { defaultValue: "Save Here" })}
          </button>
        </div>
      </div>
    </div>
  );
}
