"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Image as ImageIcon, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";
import { Slider } from "./slider";

interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspectRatio: number; // e.g. 1 for 1:1, 3 for 3:1 (banner)
  title?: string;
  description?: string;
  onCrop: (croppedFile: File) => void;
}

const isSafeUrl = (url: string): boolean => {
  const trimmed = url.trim();
  // Safe relative paths
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol.toLowerCase() === "data:") {
      return parsed.pathname.startsWith("image/");
    }
    return ["http:", "https:", "blob:"].includes(parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
};

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  aspectRatio,
  title = "Edit Image",
  description = "Drag to position and use the slider or scroll to zoom.",
  onCrop,
}: ImageCropperDialogProps) {
  const safeImageSrc = imageSrc && isSafeUrl(imageSrc) ? imageSrc : "";
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [parentSize, setParentSize] = useState({ width: 0, height: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const activeNodeRef = useRef<HTMLDivElement | null>(null);
  const onWheelEventRef = useRef<((e: WheelEvent) => void) | null>(null);

  // Reset states when a new image is loaded or dialog opens
  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setIsDragging(false);
    }
  }, [open, imageSrc]);

  // Clean up observer and event listeners on unmount
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (activeNodeRef.current && onWheelEventRef.current) {
        activeNodeRef.current.removeEventListener("wheel", onWheelEventRef.current);
      }
    };
  }, []);

  // Use a callback ref to measure and observe parent element size immediately on DOM mount
  const parentRef = useCallback((node: HTMLDivElement | null) => {
    // Clean up previous listeners
    if (activeNodeRef.current && onWheelEventRef.current) {
      activeNodeRef.current.removeEventListener("wheel", onWheelEventRef.current);
    }
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    activeNodeRef.current = node;

    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setParentSize({ width, height });
        }
      });
      observer.observe(node);
      resizeObserverRef.current = observer;

      // Register non-passive wheel event listener for scroll-to-zoom
      const onWheelEvent = (e: WheelEvent) => {
        e.preventDefault();
        const zoomStep = 0.05;
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        setZoom((prev) => Math.min(3, Math.max(1, prev + delta)));
      };
      
      node.addEventListener("wheel", onWheelEvent, { passive: false });
      onWheelEventRef.current = onWheelEvent;

      // Initial measurement immediately after node mounts
      const rect = node.getBoundingClientRect();
      setParentSize({ width: rect.width, height: rect.height });
    } else {
      onWheelEventRef.current = null;
    }
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalWidth(img.naturalWidth);
    setNaturalHeight(img.naturalHeight);
  };

  // Visual dimensions under rotation
  const isRotated = (rotation / 90) % 2 !== 0;
  const w = isRotated ? naturalHeight : naturalWidth;
  const h = isRotated ? naturalWidth : naturalHeight;

  // Dynamic Crop Guide Frame size calculation based on parent container size (constrained by both width and height)
  const padding = 32; // padding around crop guide to prevent edge-clashing
  const cropWidth = parentSize.width && parentSize.height
    ? aspectRatio === 1
      ? Math.min(parentSize.width - padding, parentSize.height - padding, 340)
      : Math.min(parentSize.width - padding, (parentSize.height - padding) * aspectRatio)
    : 0;

  const cropHeight = cropWidth / aspectRatio;

  // Base scale calculation to fit the cover rule relative to the crop guide
  const baseScale =
    cropWidth && cropHeight && w && h
      ? Math.max(cropWidth / w, cropHeight / h)
      : 1;

  const currentScale = baseScale * zoom;
  const imgWidth = w * currentScale;
  const imgHeight = h * currentScale;

  // Actual element dimensions (unrotated size used in CSS width/height)
  const displayWidth = naturalWidth * currentScale;
  const displayHeight = naturalHeight * currentScale;

  // Calculate clamp boundaries relative to the crop guide
  const maxX = Math.max(0, (imgWidth - cropWidth) / 2);
  const maxY = Math.max(0, (imgHeight - cropHeight) / 2);

  // Clamp offset when zoom, rotation, or boundaries change
  useEffect(() => {
    if (cropWidth && cropHeight && w && h) {
      setOffset((prev) => ({
        x: Math.min(maxX, Math.max(-maxX, prev.x)),
        y: Math.min(maxY, Math.max(-maxY, prev.y)),
      }));
    }
  }, [zoom, rotation, cropWidth, cropHeight, w, h, maxX, maxY]);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX - offset.x,
      y: clientY - offset.y,
    };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const newX = clientX - dragStartRef.current.x;
    const newY = clientY - dragStartRef.current.y;
    setOffset({
      x: Math.min(maxX, Math.max(-maxX, newX)),
      y: Math.min(maxY, Math.max(-maxY, newY)),
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Global mouse/touch events for smooth dragging
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handleEnd();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      handleEnd();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, offset, maxX, maxY]);

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  const handleSave = () => {
    if (!imageRef.current || !cropWidth) return;

    try {
      const img = imageRef.current;
      const canvas = document.createElement("canvas");

      // Define standard target outputs for saving high-res results
      const targetWidth = aspectRatio === 1 ? 512 : aspectRatio === 5 ? 480 : 1200;
      const targetHeight = targetWidth / aspectRatio;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2D canvas context");

      // Scale multiplier from screen pixels to target output pixels
      const R = targetWidth / cropWidth;

      // Translate canvas origin to center + translation offset scaled up
      ctx.translate(targetWidth / 2 + offset.x * R, targetHeight / 2 + offset.y * R);

      // Rotate context
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply flipping
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      // Draw image centered at the origin
      const drawWidth = displayWidth * R;
      const drawHeight = displayHeight * R;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "cropped-image.png", { type: "image/png" });
          onCrop(file);
          onOpenChange(false);
        } else {
          toast.error("Could not crop image.");
        }
      }, "image/png");
    } catch (err) {
      console.error("Error cropping image:", err);
      toast.error("Failed to crop image. If using an existing image, it may be blocked by security (CORS) limits.");
    }
  };

  // Common styles for both parent and inner images to guarantee perfect alignment
  const imageStyle = {
    width: `${displayWidth || 0}px`,
    height: `${displayHeight || 0}px`,
    transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl bg-card border border-border shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-md font-bold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Viewport Parent Container (Removed flexbox centering to avoid offset rendering bugs) */}
        <div
          ref={parentRef}
          className="relative w-full h-[320px] sm:h-[400px] overflow-hidden bg-zinc-950 rounded-xl border border-zinc-800/80 cursor-move select-none touch-none"
          onMouseDown={(e) => {
            e.preventDefault();
            handleStart(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handleStart(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
        >
          {/* 1. Low-opacity background image showing the cut-off areas */}
          {safeImageSrc && (
            <img
              ref={imageRef}
              src={safeImageSrc}
              alt="Fitting background"
              crossOrigin="anonymous"
              draggable={false}
              className="absolute max-w-none select-none pointer-events-none opacity-20 transition-all duration-75 origin-center"
              style={{
                ...imageStyle,
                left: `${(parentSize.width - displayWidth) / 2 + offset.x}px`,
                top: `${(parentSize.height - displayHeight) / 2 + offset.y}px`,
              }}
              onLoad={handleImageLoad}
            />
          )}

          {/* 2. Highlighted Crop Area (Window showing full-opacity cropped region) */}
          {safeImageSrc && cropWidth > 0 && cropHeight > 0 && (
            <div
              className={`absolute overflow-hidden shadow-2xl border-2 border-white pointer-events-none transition-all duration-75 ${
                aspectRatio === 1 ? "rounded-full" : "rounded-lg"
              }`}
              style={{
                width: `${cropWidth}px`,
                height: `${cropHeight}px`,
                left: `${(parentSize.width - cropWidth) / 2}px`,
                top: `${(parentSize.height - cropHeight) / 2}px`,
              }}
            >
              {/* Duplicate high-opacity image perfectly aligned in inner coordinates */}
              <img
                src={safeImageSrc}
                alt="Fitting foreground"
                crossOrigin="anonymous"
                draggable={false}
                className="absolute max-w-none select-none pointer-events-none transition-all duration-75 origin-center"
                style={{
                  ...imageStyle,
                  left: `${(cropWidth - displayWidth) / 2 + offset.x}px`,
                  top: `${(cropHeight - displayHeight) / 2 + offset.y}px`,
                }}
              />
            </div>
          )}
        </div>

        {/* Editing Tools Bar */}
        <div className="grid grid-cols-4 gap-2 w-full mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
            className="flex items-center justify-center gap-1.5 text-[11px] h-8 rounded-lg"
          >
            <RotateCw className="size-3 -scale-x-100" />
            Rotate L
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex items-center justify-center gap-1.5 text-[11px] h-8 rounded-lg"
          >
            <RotateCw className="size-3" />
            Rotate R
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFlipH((f) => !f)}
            className={`flex items-center justify-center gap-1.5 text-[11px] h-8 rounded-lg transition-colors ${
              flipH ? "bg-primary/10 border-primary/40 text-primary" : ""
            }`}
          >
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h8l-4-4v8zM22 12h-8l-4 4 4 4" />
            </svg>
            Flip H
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFlipV((f) => !f)}
            className={`flex items-center justify-center gap-1.5 text-[11px] h-8 rounded-lg transition-colors ${
              flipV ? "bg-primary/10 border-primary/40 text-primary" : ""
            }`}
          >
            <svg className="size-3 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M2 12h8l-4-4v8zM22 12h-8l-4 4 4 4" />
            </svg>
            Flip V
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-3 w-full px-1 mt-3.5">
          <ImageIcon className="size-4 text-muted-foreground shrink-0" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={(val) => setZoom(val[0])}
            className="flex-1 cursor-pointer"
          />
          <ImageIcon className="size-5 text-muted-foreground shrink-0" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="size-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            title="Reset edits"
          >
            <RotateCw className="size-4" />
          </Button>
        </div>

        <DialogFooter className="flex justify-end pt-4 border-t border-border/50">
          <Button
            onClick={handleSave}
            className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-lg px-5 shadow-sm text-sm"
          >
            Save Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
