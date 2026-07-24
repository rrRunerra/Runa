"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ShieldAlert, Image as ImageIcon } from "lucide-react";
import { importRawKey, decrypt } from "@runa/crypto/browser";
import { CanvasNode } from "../types";
import { useTranslation } from "react-i18next";

interface RrCanvasImageCardProps {
  node: CanvasNode;
  accessToken: string;
}

export default function RrCanvasImageCard({ node, accessToken }: RrCanvasImageCardProps): React.JSX.Element {
  const { t } = useTranslation();
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
        if (!res.ok) throw new Error(t("lacerta.canvasEditor.failedFetchImage", "Failed to fetch image"));

        const encBuffer = await res.arrayBuffer();
        const keyToImport =
          node.lacertaFileDecryptionKey || node.lacertaFileKey;
        if (!keyToImport) throw new Error(t("lacerta.canvasEditor.noDecryptionKey", "No decryption key present"));
        const fileKey = await importRawKey(keyToImport);
        const decBuffer = await decrypt(encBuffer, fileKey);

        if (!active) return;
        const blob = new Blob([decBuffer], {
          type: node.lacertaFileType || "image/png",
        });
        const url = URL.createObjectURL(blob);
        setSrc(url);
      } catch (err: any) {
        console.error("Failed to load embedded Lacerta image:", err);
        if (active) setError(err.message || t("lacerta.canvasEditor.failedDecryptImage", "Failed to decrypt image"));
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
  }, [node.imageUrl, node.lacertaFileId, node.lacertaFileKey, accessToken, src, t]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 h-full w-full">
        <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        <span className="text-[9px] font-semibold">{t("lacerta.canvasEditor.decryptingImage", "Decrypting Image...")}</span>
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
        <span className="text-[10px] font-semibold">{t("lacerta.canvasEditor.noImageLoaded", "No Image Loaded")}</span>
      </div>
    );
  }

  const transform = node.imageTransform;
  const transformStyle: React.CSSProperties = transform
    ? {
        transform: `rotate(${transform.rotation || 0}deg) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`,
        objectFit: transform.objectFit || "contain",
        filter: [
          transform.brightness !== undefined ? `brightness(${transform.brightness}%)` : "",
          transform.contrast !== undefined ? `contrast(${transform.contrast}%)` : "",
          transform.saturation !== undefined ? `saturate(${transform.saturation}%)` : "",
          transform.blur !== undefined ? `blur(${transform.blur}px)` : "",
          transform.grayscale !== undefined ? `grayscale(${transform.grayscale}%)` : "",
          transform.sepia !== undefined ? `sepia(${transform.sepia}%)` : "",
        ].filter(Boolean).join(" ") || undefined,
        opacity: transform.opacity !== undefined ? transform.opacity / 100 : undefined,
        borderRadius: transform.borderRadius !== undefined ? `${transform.borderRadius}px` : undefined,
      }
    : { objectFit: "contain" };

  return (
    <div className="w-full h-full overflow-hidden flex items-center justify-center">
      <img
        src={src}
        alt={t("lacerta.canvasEditor.spatialImage", "Spatial Image")}
        className="w-full h-full select-none pointer-events-none transition-all duration-150"
        style={transformStyle}
      />
    </div>
  );
}
