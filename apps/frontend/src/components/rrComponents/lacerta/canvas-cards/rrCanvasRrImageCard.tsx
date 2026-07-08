"use client";

import React from "react";
import Image from "next/image";
import { ImageIcon, Loader2 } from "lucide-react";

import { CanvasNode } from "../CanvasEditor";
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
      <div className="relative w-full h-full">
        <Image
          src={rrImageId}
          alt="Canvas image"
          fill
          className="object-contain select-none pointer-events-none"
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

  return <SvgComponent className="w-full h-full" />;
}
