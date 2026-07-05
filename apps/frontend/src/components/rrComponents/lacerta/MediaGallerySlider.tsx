"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Pause,
  Download,
  ZoomIn,
  ZoomOut,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { decryptFileBuffer } from "@/lib/lacertaCrypto";

interface GalleryFileItem {
  id: string;
  key: string;
  name: string; // Decrypted name
  type: string; // Decrypted mimetype
  decryptedKey: CryptoKey | null;
}

interface MediaGallerySliderProps {
  isOpen: boolean;
  onClose: () => void;
  files: GalleryFileItem[];
  initialIndex: number;
  accessToken: string;
}

export default function MediaGallerySlider({
  isOpen,
  onClose,
  files,
  initialIndex,
  accessToken,
}: MediaGallerySliderProps): React.JSX.Element | null {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);

  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Load and decrypt file when index changes
  useEffect(() => {
    if (!isOpen || currentIndex < 0 || currentIndex >= files.length) return;
    const file = files[currentIndex];
    if (!file.decryptedKey) return;

    let active = true;
    setLoading(true);
    setZoom(1);

    // Revoke previous blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }

    const fetchAndDecrypt = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.key}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!res.ok) throw new Error("Failed to download media file.");

        const encryptedBuffer = await res.arrayBuffer();
        if (!active) return;

        const decryptedBuffer = await decryptFileBuffer(
          encryptedBuffer,
          file.decryptedKey!,
        );

        const blob = new Blob([decryptedBuffer], {
          type: file.type || "image/jpeg",
        });
        const url = URL.createObjectURL(blob);

        if (active) {
          setBlobUrl(url);
          setLoading(false);
        }
      } catch (err: any) {
        console.error(err);
        if (active) {
          toast.error("Failed to decrypt media file.");
          setLoading(false);
        }
      }
    };

    fetchAndDecrypt();

    return () => {
      active = false;
    };
  }, [currentIndex, isOpen]);

  // Handle slideshow play timer
  useEffect(() => {
    if (isPlaying) {
      slideshowTimerRef.current = setInterval(() => {
        handleNext();
      }, 3000);
    } else if (slideshowTimerRef.current) {
      clearInterval(slideshowTimerRef.current);
    }
    return () => {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    };
  }, [isPlaying, currentIndex, files.length]);

  if (!isOpen) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % files.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
  };

  const currentFile = files[currentIndex];
  const isVideo = currentFile?.type?.startsWith("video/");

  const handleDownload = () => {
    if (!blobUrl || !currentFile) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 select-none">
      {/* Top Bar */}
      <div className="flex h-16 w-full items-center justify-between px-6 bg-linear-to-b from-black/50 to-transparent shrink-0 z-10">
        <div className="flex flex-col text-white">
          <span className="text-sm font-semibold tracking-tight">
            {currentFile?.name || "Decrypting Media..."}
          </span>
          <span className="text-xs text-white/60">
            {currentIndex + 1} of {files.length}
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Zoom In"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-primary" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={!blobUrl}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-40 rounded-lg transition-all"
            title="Download Decrypted File"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              if (blobUrl) URL.revokeObjectURL(blobUrl);
              onClose();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Navigation Buttons */}
        <button
          onClick={handlePrev}
          className="absolute left-6 p-3 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-white/80 hover:text-white active:scale-95 transition-all z-10"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-xs text-white/60">
              Decrypting in browser...
            </span>
          </div>
        ) : (
          blobUrl && (
            <div
              className="transition-all duration-200 ease-out flex items-center justify-center max-w-[85vw] max-h-[80vh]"
              style={{ transform: `scale(${zoom})` }}
            >
              {isVideo ? (
                <video
                  src={blobUrl}
                  controls
                  autoPlay
                  className="rounded-lg shadow-2xl max-w-full max-h-full object-contain"
                />
              ) : (
                <img
                  src={blobUrl}
                  alt={currentFile?.name}
                  className="rounded-lg shadow-2xl max-w-full max-h-full object-contain pointer-events-none"
                />
              )}
            </div>
          )
        )}

        <button
          onClick={handleNext}
          className="absolute right-6 p-3 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-white/80 hover:text-white active:scale-95 transition-all z-10"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
