"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ShieldAlert, Image as ImageIcon } from "lucide-react";
import { importRawKey, decryptFileBuffer } from "@/lib/lacertaCrypto";
import { CanvasNode } from "../CanvasEditor";

interface RrCanvasImageCardProps {
  node: CanvasNode;
  accessToken: string;
}

export default function RrCanvasImageCard({ node, accessToken }: RrCanvasImageCardProps) {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (node.imageUrl) {
      setSrc(node.imageUrl);
      setLoading(false);
      setError(null);
      return;
    }

    if (!node.lacertaFileId || !node.lacertaFileKey) {
      setSrc("");
      return;
    }

    let active = true;
    const loadImg = async () => {
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
        if (!res.ok) throw new Error("Failed to fetch image");

        const encBuffer = await res.arrayBuffer();
        const keyToImport =
          node.lacertaFileDecryptionKey || node.lacertaFileKey;
        if (!keyToImport) throw new Error("No decryption key present");
        const fileKey = await importRawKey(keyToImport);
        const decBuffer = await decryptFileBuffer(encBuffer, fileKey);

        if (!active) return;
        const blob = new Blob([decBuffer], {
          type: node.lacertaFileType || "image/png",
        });
        const url = URL.createObjectURL(blob);
        setSrc(url);
      } catch (err: any) {
        console.error("Failed to load embedded Lacerta image:", err);
        if (active) setError(err.message || "Failed to decrypt image");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadImg();

    return () => {
      active = false;
      if (src && src.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
    };
  }, [node.imageUrl, node.lacertaFileId, node.lacertaFileKey, accessToken]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 h-full w-full">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        <span className="text-[9px] font-semibold">Decrypting Image...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-rose-500 gap-2 h-full w-full">
        <ShieldAlert className="h-6 w-6 text-rose-600 animate-bounce" />
        <span className="text-[9px] font-semibold text-center px-2">
          {error}
        </span>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 h-full w-full">
        <ImageIcon className="h-8 w-8 text-slate-700" />
        <span className="text-[10px] font-semibold">No Image Loaded</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Spatial Image"
      className="w-full h-full object-contain select-none pointer-events-none"
    />
  );
}
