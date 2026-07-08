"use client";

import React, { useState, useRef } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { wrapKey } from "@runa/crypto/browser";
import { CanvasNodeType, CanvasNode } from "./CanvasEditor";

interface RrCanvasImageInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
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

export default function RrCanvasImageInsertModal({
  isOpen,
  onClose,
  x,
  y,
  decryptedLacertaFiles,
  canvasFile,
  createNodeAtPos,
  setPendingFileShare,
}: RrCanvasImageInsertModalProps) {
  const { data: session } = useSession();
  const [imageSelectionType, setImageSelectionType] = useState<
    "url" | "upload" | "lacerta"
  >("url");
  const [imageUrl, setImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleUrlInsert = () => {
    if (imageUrl.trim()) {
      createNodeAtPos("image", x, y, undefined, undefined, imageUrl.trim());
      onClose();
      setImageUrl("");
    } else {
      toast.error("Please enter a URL");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = e.target.files?.[0];
    if (fileObj) {
      const isGif = fileObj.type === "image/gif" || fileObj.name.toLowerCase().endsWith(".gif");
      const reader = new FileReader();
      reader.onload = (event) => {
        if (isGif) {
          const gifDataUrl = event.target?.result as string;
          createNodeAtPos(
            "image",
            x,
            y,
            undefined,
            undefined,
            gifDataUrl,
          );
          onClose();
          setImageUrl("");
          return;
        }

        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
            createNodeAtPos(
              "image",
              x,
              y,
              undefined,
              undefined,
              compressedBase64,
            );
          }
          onClose();
          setImageUrl("");
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(fileObj);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-text"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col select-text">
        <h3 className="text-sm font-bold text-card-foreground">Insert Image</h3>

        {/* Tabs */}
        <div className="flex gap-2 my-3 border-b border-border pb-1">
          {(["url", "upload", "lacerta"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setImageSelectionType(t)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase transition-all",
                imageSelectionType === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/30",
              )}
            >
              {t === "lacerta" ? "From Vault" : t === "url" ? "URL" : "Upload"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 min-h-[120px]">
          {imageSelectionType === "url" && (
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                IMAGE URL
              </label>
              <input
                type="text"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-medium"
              />
            </div>
          )}

          {imageSelectionType === "upload" && (
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                UPLOAD LOCAL FILE
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer"
              />
            </div>
          )}

          {imageSelectionType === "lacerta" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">
                Select E2EE Image
              </label>
              <div className="max-h-[140px] overflow-y-auto border border-border/40 rounded-xl divide-y divide-border/20 no-scrollbar">
                {decryptedLacertaFiles.filter((f) =>
                  f.type?.startsWith("image/"),
                ).length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No decrypted images found in vault.
                  </div>
                ) : (
                  decryptedLacertaFiles
                    .filter((f) => f.type?.startsWith("image/"))
                    .map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          const isCanvasPublic = canvasFile?.isPublic;
                          if (isCanvasPublic && !f.isPublic) {
                            setPendingFileShare({
                              type: "image",
                              fileObj: f,
                              x,
                              y,
                            });
                            onClose();
                            return;
                          }

                          shareFileWithCanvasCollaborators(f);

                          createNodeAtPos(
                            "image",
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
                            },
                          );
                          onClose();
                        }}
                        className="w-full text-left p-2 hover:bg-muted/10 text-xs font-semibold truncate transition-colors flex items-center gap-2"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => {
              onClose();
              setImageUrl("");
            }}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground transition-all active:scale-98"
          >
            Cancel
          </button>
          {imageSelectionType === "url" && (
            <button
              onClick={handleUrlInsert}
              className="px-4 py-1.5 bg-primary hover:bg-primary/90 rounded-lg text-xs font-semibold text-primary-foreground transition-all shadow-sm active:scale-98"
            >
              Insert URL
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
