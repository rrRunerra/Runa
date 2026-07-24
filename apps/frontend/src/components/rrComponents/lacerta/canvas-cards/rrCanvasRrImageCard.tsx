"use client";

import React from "react";
import Image from "next/image";
import { ImageIcon, Loader2 } from "lucide-react";

import { CanvasNode } from "../types";
import { SVG_COMPONENTS } from "../rrImageRegistry";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface RrCanvasRrImageCardProps {
  node: CanvasNode;
}

// ---------------------------------------------------------------------------
// Suspense fallback
// ---------------------------------------------------------------------------
function SvgLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export default function RrCanvasRrImageCard({ node }: RrCanvasRrImageCardProps) {
  const { rrImageId, rrImageType } = node;

  const transform = node.imageTransform;
  const transformStyle: React.CSSProperties = transform
    ? {
        transform: `rotate(${transform.rotation || 0}deg) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`,
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
    : {};

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!rrImageId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground select-none">
        <ImageIcon className="h-8 w-8 opacity-30" />
        <span className="text-[10px] font-semibold">No image selected</span>
      </div>
    );
  }

  // ── Public image (served from /public) ──────────────────────────────────
  if (rrImageType === "image") {
    return (
      <div className="relative w-full h-full overflow-hidden" style={transformStyle}>
        <Image
          src={rrImageId}
          alt="Canvas image"
          fill
          className="select-none pointer-events-none transition-all duration-150"
          style={{ objectFit: transform?.objectFit || "contain" }}
          unoptimized={rrImageId.endsWith(".svg")}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    );
  }

  // ── SVG React component (auto-discovered from rrImages/) ─────────────────
  const SvgComponent = SVG_COMPONENTS[rrImageId];

  if (!SvgComponent) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-destructive select-none">
        <ImageIcon className="h-8 w-8 opacity-30" />
        <span className="text-[10px] font-semibold">Unknown component:</span>
        <code className="text-[9px] bg-muted px-1.5 py-0.5 rounded">{rrImageId}</code>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden transition-all duration-150" style={transformStyle}>
      <SvgComponent className="w-full h-full" />
    </div>
  );
}
