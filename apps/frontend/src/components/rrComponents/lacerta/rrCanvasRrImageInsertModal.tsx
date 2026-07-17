"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ImageIcon, X, Loader2, Code2 } from "lucide-react";

import { CanvasNodeType, CanvasNode } from "./types";
import { SVG_KEYS, SVG_COMPONENTS, svgKeyToLabel } from "./rrImageRegistry";
import { useTranslation } from "react-i18next";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = "svg" | "image";

interface RrCanvasRrImageInsertModalProps {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pathToLabel(p: string): string {
  return p.split("/").pop()?.replace(/\.[^.]+$/, "") ?? p;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RrCanvasRrImageInsertModal({
  isOpen,
  onClose,
  x,
  y,
  createNodeAtPos,
}: RrCanvasRrImageInsertModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("svg");
  const [svgSearch, setSvgSearch] = useState("");
  const [imgSearch, setImgSearch] = useState("");

  // Public images — fetched from the server-side scanner on first open
  const [publicImages, setPublicImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesFetched, setImagesFetched] = useState(false);

  useEffect(() => {
    if (isOpen && !imagesFetched) {
      setImagesLoading(true);
      fetch("/api/canvas/public-images")
        .then((r) => r.json())
        .then((data: string[]) => {
          setPublicImages(data);
          setImagesFetched(true);
        })
        .catch(() => setPublicImages([]))
        .finally(() => setImagesLoading(false));
    }
  }, [isOpen, imagesFetched]);

  if (!isOpen) return null;

  // ── Filtered lists ──────────────────────────────────────────────────────
  const filteredSvgs = SVG_KEYS.filter((k) =>
    k.toLowerCase().includes(svgSearch.toLowerCase()) ||
    svgKeyToLabel(k).toLowerCase().includes(svgSearch.toLowerCase())
  );

  const filteredImages = publicImages.filter((p) =>
    pathToLabel(p).toLowerCase().includes(imgSearch.toLowerCase()) ||
    p.toLowerCase().includes(imgSearch.toLowerCase())
  );

  // ── Actions ─────────────────────────────────────────────────────────────
  function handlePickSvg(key: string) {
    createNodeAtPos("rrImage", x, y, undefined, undefined, undefined, undefined, {
      rrImageId: key,
      rrImageType: "svg",
    });
    handleClose();
  }

  function handlePickImage(src: string) {
    createNodeAtPos("rrImage", x, y, undefined, undefined, undefined, undefined, {
      rrImageId: src,
      rrImageType: "image",
    });
    handleClose();
  }

  function handleClose() {
    setSvgSearch("");
    setImgSearch("");
    onClose();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-[560px] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-card-foreground">{t("lacerta.canvasRrImageInsert.title", "Insert rrImage")}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex border-b border-border shrink-0">
          {(["svg", "image"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold tracking-wide uppercase transition-all ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab === "svg" ? (
                <>
                  <Code2 className="h-3 w-3" /> {t("lacerta.canvasRrImageInsert.tabSvg", "SVG Components")}
                  <span className="ml-1 text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {SVG_KEYS.length}
                  </span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-3 w-3" /> {t("lacerta.canvasRrImageInsert.tabPublic", "Public Images")}
                  {!imagesLoading && (
                    <span className="ml-1 text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {publicImages.length}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 p-4 overflow-hidden" style={{ height: 400 }}>

          {/* SVG Components tab */}
          {activeTab === "svg" && (
            <>
              <input
                autoFocus
                type="text"
                placeholder={t("lacerta.canvasRrImageInsert.searchSvgPlaceholder", "Search SVG components…")}
                value={svgSearch}
                onChange={(e) => setSvgSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all font-medium shrink-0"
              />
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {filteredSvgs.length === 0 ? (
                  <div className="flex items-center justify-center text-xs text-muted-foreground h-full">
                    {t("lacerta.canvasRrImageInsert.noComponents", { search: svgSearch, defaultValue: "No components match \"{{search}}\"" })}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 content-start">
                    {filteredSvgs.map((key) => {
                      // Extract just the filename for display; keep folder as prefix
                      const parts = key.split("/");
                      const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
                      const label = svgKeyToLabel(key);
                      return (
                        <button
                          key={key}
                          onClick={() => handlePickSvg(key)}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-border hover:border-primary/60 hover:bg-primary/5 p-2.5 transition-all text-center group"
                        >
                          {/* Live SVG preview */}
                          <div className="h-12 w-full rounded-lg bg-muted/30 overflow-hidden shrink-0">
                            {SVG_COMPONENTS[key] ? (
                              React.createElement(SVG_COMPONENTS[key], {
                                width: "100%",
                                height: "100%",
                                className: "block",
                              })
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Code2 className="h-5 w-5 text-primary/30" />
                              </div>
                            )}
                          </div>
                          {folder && (
                            <span className="text-[8px] font-mono text-muted-foreground/60 leading-none truncate w-full text-center">
                              {folder}/
                            </span>
                          )}
                          <span className="text-[9px] font-semibold text-foreground leading-tight line-clamp-2">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Public Images tab */}
          {activeTab === "image" && (
            <>
              <input
                autoFocus
                type="text"
                placeholder={t("lacerta.canvasRrImageInsert.searchImagesPlaceholder", "Search images…")}
                value={imgSearch}
                onChange={(e) => setImgSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all font-medium shrink-0"
              />
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {imagesLoading ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground h-full">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {t("lacerta.canvasRrImageInsert.scanning", "Scanning public directory…")}
                  </div>
                ) : filteredImages.length === 0 ? (
                  <div className="flex items-center justify-center text-xs text-muted-foreground h-full">
                    {imgSearch ? t("lacerta.canvasRrImageInsert.noImagesMatch", { search: imgSearch, defaultValue: "No images match \"{{search}}\"" }) : t("lacerta.canvasRrImageInsert.noImagesFound", "No images found")}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 content-start">
                    {filteredImages.map((src) => {
                      const label = pathToLabel(src);
                      const isVectorSvg = src.endsWith(".svg");
                      // Show relative folder path as prefix
                      const parts = src.replace(/^\//, "").split("/");
                      const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
                      return (
                        <button
                          key={src}
                          onClick={() => handlePickImage(src)}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-border hover:border-primary/60 hover:bg-primary/5 p-2.5 transition-all text-center group"
                        >
                          {/* Thumbnail */}
                          <div className="relative h-12 w-full rounded-lg bg-muted/50 overflow-hidden shrink-0">
                            <Image
                              src={src}
                              alt={label}
                              fill
                              className="object-contain"
                              unoptimized={isVectorSvg}
                              sizes="120px"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                          {folder && (
                            <span className="text-[8px] font-mono text-muted-foreground/60 leading-none truncate w-full text-center">
                              {folder}/
                            </span>
                          )}
                          <span className="text-[9px] font-semibold text-foreground leading-tight line-clamp-2">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-border shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground transition-all"
          >
            {t("lacerta.canvasRrImageInsert.cancel", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
