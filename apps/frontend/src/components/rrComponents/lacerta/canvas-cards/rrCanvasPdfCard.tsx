"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ShieldAlert, FileText } from "lucide-react";
import { importRawKey, decryptFileBuffer } from "@/lib/lacertaCrypto";
import { CanvasNode } from "../CanvasEditor";

interface RrCanvasPdfCardProps {
  node: CanvasNode;
  accessToken: string;
}

export default function RrCanvasPdfCard({ node, accessToken }: RrCanvasPdfCardProps) {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (node.videoUrl && node.videoUrl.endsWith(".pdf")) {
      setPdfUrl(node.videoUrl);
      setLoading(false);
      setError(null);
      return;
    }

    if (!node.lacertaFileId || !node.lacertaFileKey) {
      setPdfUrl("");
      return;
    }

    let active = true;
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${node.lacertaFileKey}`,
          { headers }
        );
        if (!res.ok) throw new Error("Failed to fetch PDF file");

        const encBuffer = await res.arrayBuffer();
        const keyToImport =
          node.lacertaFileDecryptionKey || node.lacertaFileKey;
        if (!keyToImport) throw new Error("No decryption key present");
        const fileKey = await importRawKey(keyToImport);
        const decBuffer = await decryptFileBuffer(encBuffer, fileKey);

        if (!active) return;
        const blob = new Blob([decBuffer], {
          type: "application/pdf",
        });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        console.error("Failed to load E2EE PDF:", err);
        if (active) setError(err.message || "Failed to decrypt PDF");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      active = false;
      if (pdfUrl && pdfUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [node.lacertaFileId, node.lacertaFileKey, node.videoUrl, accessToken]);

  let content = null;
  if (loading) {
    content = (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 h-full w-full bg-slate-950/20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        <span className="text-[9px] font-semibold">Decrypting PDF Document...</span>
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex-1 flex flex-col items-center justify-center text-rose-500 gap-2 h-full w-full bg-slate-950/20">
        <ShieldAlert className="h-6 w-6 text-rose-600 animate-bounce" />
        <span className="text-[9px] font-semibold text-center px-2">
          {error}
        </span>
      </div>
    );
  } else if (!pdfUrl) {
    content = (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 h-full w-full bg-slate-950/20">
        <FileText className="h-8 w-8 text-slate-700" />
        <span className="text-[10px] font-semibold">No PDF Document Loaded</span>
      </div>
    );
  } else {
    content = (
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0`}
        className="w-full flex-1 border-0 select-none bg-slate-900"
        title="PDF Preview"
      />
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      {/* Header bar */}
      <div className="h-9 flex items-center justify-between px-3 bg-slate-950/90 border-b border-slate-800/80 text-slate-200 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-rose-500 shrink-0" />
          <span className="text-[10px] font-bold truncate text-slate-100">
            {node.lacertaFileName || "PDF Document"}
          </span>
        </div>
        <div className="text-[8px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 uppercase shrink-0">
          E2EE Preview
        </div>
      </div>

      {content}
    </div>
  );
}
