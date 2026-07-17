"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { CanvasNodeType, CanvasNode } from "./types";
import { useTranslation } from "react-i18next";

interface RrCanvasGifInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
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

export default function RrCanvasGifInsertModal({
  isOpen,
  onClose,
  x,
  y,
  createNodeAtPos,
}: RrCanvasGifInsertModalProps) {
  const { t } = useTranslation();
  const [gifSearchQuery, setGifSearchQuery] = useState<string>("");
  const [gifResults, setGifResults] = useState<string[]>([]);
  const [gifLoading, setGifLoading] = useState<boolean>(false);

  const handleGifSearch = async (query: string) => {
    const apiKey = process.env.NEXT_PUBLIC_KLIPY_API_KEY || "";
    if (!apiKey) {
      console.warn("Klipy API key is not configured in environment variables.");
      setGifResults([]);
      return;
    }

    setGifLoading(true);
    try {
      const url = query.trim()
        ? `https://api.klipy.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=12`
        : `https://api.klipy.com/v2/trending?key=${apiKey}&limit=12`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Klipy API returned status: ${res.status}`);
      }
      const data = await res.json();
      const items = data.results || data.data || [];
      const urls = items
        .map((item: any) => {
          if (item.media_formats?.tinygif?.url) {
            return item.media_formats.tinygif.url;
          }
          if (item.media_formats?.gif?.url) {
            return item.media_formats.gif.url;
          }
          return item.url || item.preview_url || "";
        })
        .filter(Boolean);
      setGifResults(urls);
    } catch (err) {
      console.error("Klipy API error:", err);
    } finally {
      setGifLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleGifSearch("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col select-text">
        <h3 className="text-sm font-bold text-card-foreground mb-4">
          {t("lacerta.canvasGifInsert.title", "Embed GIF Card")}
        </h3>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder={t("lacerta.canvasGifInsert.placeholder", "Search Klipy...")}
            value={gifSearchQuery}
            onChange={(e) => setGifSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleGifSearch(gifSearchQuery);
              }
            }}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-medium"
          />
          <button
            onClick={() => handleGifSearch(gifSearchQuery)}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 rounded-lg text-xs font-semibold text-primary-foreground transition-all shadow-sm active:scale-98"
          >
            {t("lacerta.canvasGifInsert.search", "Search")}
          </button>
        </div>

        {/* Results grid */}
        <div className="min-h-[140px] max-h-[220px] overflow-y-auto border border-border/40 rounded-xl p-2 bg-muted/10 no-scrollbar">
          {gifLoading ? (
            <div className="h-[140px] flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : gifResults.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {t("lacerta.canvasGifInsert.noGifs", "No GIFs found.")}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gifResults.map((url, idx) => (
                <button
                  key={`${url}-${idx}`}
                  onClick={() => {
                    createNodeAtPos(
                      "gif",
                      x,
                      y,
                      undefined,
                      undefined,
                      undefined,
                      undefined,
                      { gifUrl: url }
                    );
                    onClose();
                    setGifResults([]);
                    setGifSearchQuery("");
                  }}
                  className="h-16 rounded overflow-hidden hover:ring-2 hover:ring-primary transition-all relative group bg-muted"
                >
                  <img
                    src={url}
                    alt={t("lacerta.canvasGifInsert.gifPreviewAlt", "gif preview")}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-6">
          {/* Or Direct URL option */}
          <input
            type="text"
            placeholder={t("lacerta.canvasGifInsert.directUrlPlaceholder", "Or enter direct GIF URL...")}
            className="w-[200px] bg-background border border-border rounded-lg px-2.5 py-1 text-[10px] text-foreground focus:outline-none focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value.trim()) {
                createNodeAtPos(
                  "gif",
                  x,
                  y,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  { gifUrl: e.currentTarget.value.trim() }
                );
                onClose();
                setGifResults([]);
                setGifSearchQuery("");
              }
            }}
          />

          <button
            onClick={() => {
              onClose();
              setGifResults([]);
              setGifSearchQuery("");
            }}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground transition-all active:scale-98"
          >
            {t("lacerta.canvasGifInsert.cancel", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
