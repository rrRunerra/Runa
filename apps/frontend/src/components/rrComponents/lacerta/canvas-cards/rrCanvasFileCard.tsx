"use client";

import React from "react";
import { FileText, Download, ExternalLink } from "lucide-react";
import { importRawKey, decrypt } from "@runa/crypto/browser";
import { toast } from "sonner";
import { CanvasNode } from "../CanvasEditor";

interface RrCanvasFileCardProps {
  node: CanvasNode;
  accessToken: string;
}

export default function RrCanvasFileCard({ node, accessToken }: RrCanvasFileCardProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.lacertaFileKey || !node.lacertaFileId) return;
    const tId = toast.loading(`Downloading & decrypting ${node.lacertaFileName}...`);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${node.lacertaFileKey}`,
        { headers }
      );
      if (!res.ok) throw new Error("Download failed");
      const encBuf = await res.arrayBuffer();
      const decryptionKeyToUse =
        node.lacertaFileDecryptionKey || node.lacertaFileKey;
      if (!decryptionKeyToUse) throw new Error("No decryption key present");
      const fileKey = await importRawKey(decryptionKeyToUse);
      const decBuf = await decrypt(encBuf, fileKey);
      const blob = new Blob([decBuf], {
        type: node.lacertaFileType || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = node.lacertaFileName || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Downloaded successfully", { id: tId });
    } catch (err: any) {
      toast.error(err.message || "Download failed", { id: tId });
    }
  };

  const handleOpenShared = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.lacertaFileId) {
      const decryptionKey = node.lacertaFileDecryptionKey || node.lacertaFileKey;
      const shareUrl = `${window.location.origin}/lacerta/share/${node.lacertaFileId}#${decryptionKey}`;
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col p-3.5 text-foreground bg-card/65"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      <div className="flex items-center gap-3 mb-2 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate text-foreground select-all">
            {node.lacertaFileName || "Attached File"}
          </div>
          <div className="text-[9px] text-muted-foreground select-none">
            {node.lacertaFileSize
              ? `${(node.lacertaFileSize / 1024).toFixed(1)} KB`
              : "Size Unknown"}
          </div>
        </div>
      </div>
      <div className="mt-auto flex gap-2 pt-2 border-t border-border/30">
        <button
          onClick={handleDownload}
          className="flex-1 py-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded text-[9px] flex items-center justify-center gap-1 transition-all active:scale-95"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
        <button
          onClick={handleOpenShared}
          className="flex-1 py-1 bg-muted hover:bg-muted/80 text-foreground font-semibold border border-border rounded text-[9px] flex items-center justify-center gap-1 transition-all active:scale-95"
        >
          <ExternalLink className="h-3 w-3" />
          Open Shared
        </button>
      </div>
    </div>
  );
}
