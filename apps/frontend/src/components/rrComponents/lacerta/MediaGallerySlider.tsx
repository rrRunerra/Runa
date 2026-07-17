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
import { decrypt } from "@runa/crypto/browser";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [percent, setPercent] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);

  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blobCacheRef = useRef<Map<string, string>>(new Map());

  // Revoke all blob URLs when modal is closed/unmounted
  useEffect(() => {
    return () => {
      blobCacheRef.current.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
      blobCacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Load and decrypt file when index changes
  useEffect(() => {
    if (!isOpen || currentIndex < 0 || currentIndex >= files.length) return;
    const file = files[currentIndex];
    if (!file.decryptedKey) return;

    let active = true;
    const abortController = new AbortController();
    setZoom(1);

    // Clear current preview to show loader
    setBlobUrl(null);

    // Check if we already have the decrypted URL cached (either blob or stream URL)
    const cachedUrl = blobCacheRef.current.get(file.key);
    if (cachedUrl) {
      setBlobUrl(cachedUrl);
      setLoading(false);
      return;
    }

    setLoading(true);


    const fetchAndDecrypt = async () => {
      try {
        setPercent(0);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.key}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: abortController.signal,
          },
        );
        if (!res.ok) throw new Error(t("lacerta.mediaGallery.downloadFailed", "Failed to download media file."));

        const contentLength = res.headers.get("content-length");
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

        let decryptedBuffer: ArrayBuffer;
        if (res.body && totalBytes > 0) {
          const reader = res.body.getReader();
          const chunks: Uint8Array[] = [];
          let receivedBytes = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!active) return;
            if (value) {
              chunks.push(value);
              receivedBytes += value.length;
              setPercent(Math.round((receivedBytes / totalBytes) * 100));
            }
          }

          const concatenated = new Uint8Array(receivedBytes);
          let offset = 0;
          for (const chunk of chunks) {
            concatenated.set(chunk, offset);
            offset += chunk.length;
          }
          decryptedBuffer = await decrypt(concatenated.buffer, file.decryptedKey!);
        } else {
          const encryptedBuffer = await res.arrayBuffer();
          if (!active) return;
          decryptedBuffer = await decrypt(encryptedBuffer, file.decryptedKey!);
          setPercent(100);
        }

        const resolvedMimeType = getMimeType(file.name, file.type);
        const blob = new Blob([decryptedBuffer], {
          type: resolvedMimeType,
        });
        const url = URL.createObjectURL(blob);

        if (active) {
          blobCacheRef.current.set(file.key, url);
          setBlobUrl(url);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }
        console.error(err);
        if (active) {
          toast.error(t("lacerta.mediaGallery.decryptFailed", "Failed to decrypt media file."));
          setLoading(false);
        }
      }
    };

    fetchAndDecrypt();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [currentIndex, isOpen, accessToken, files, t]);

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

const getMimeType = (fileName: string, mimeType: string | null): string => {
  if (mimeType && mimeType !== "application/octet-stream" && mimeType !== "octet-stream") {
    return mimeType;
  }
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3": return "audio/mpeg";
    case "wav": return "audio/wav";
    case "flac": return "audio/flac";
    case "m4a": return "audio/x-m4a";
    case "aac": return "audio/aac";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    default: return mimeType || "application/octet-stream";
  }
};

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % files.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
  };

  const currentFile = files[currentIndex];
  const resolvedMime = getMimeType(currentFile?.name || "", currentFile?.type || null);
  const isVideo = false; // Video playback disabled
  const isAudio = resolvedMime.startsWith("audio/");

  const handleDownload = () => {
    if (!blobUrl || !currentFile) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const isVideoOrAudio = isAudio;

  const getMediaUrl = (file: GalleryFileItem) => {
    return blobUrl;
  };


  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 select-none">
      {/* Top Bar */}
      <div className="flex h-16 w-full items-center justify-between px-6 bg-linear-to-b from-black/50 to-transparent shrink-0 z-10">
        <div className="flex flex-col text-white">
          <span className="text-sm font-semibold tracking-tight">
            {currentFile?.name || t("lacerta.mediaGallery.decryptingTitle", "Decrypting Media...")}
          </span>
          <span className="text-xs text-white/60">
            {t("lacerta.mediaGallery.count", { index: currentIndex + 1, total: files.length, defaultValue: "{{index}} of {{total}}" })}
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title={t("lacerta.mediaGallery.zoomOut", "Zoom Out")}
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title={t("lacerta.mediaGallery.zoomIn", "Zoom In")}
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title={isPlaying ? t("lacerta.mediaGallery.pauseSlideshow", "Pause Slideshow") : t("lacerta.mediaGallery.playSlideshow", "Play Slideshow")}
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
            title={t("lacerta.mediaGallery.downloadDecrypted", "Download Decrypted File")}
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
              {t("lacerta.mediaGallery.decryptingProgress", { percent: percent > 0 ? ` (${percent}%)` : "", defaultValue: "Decrypting in browser...{{percent}}" })}
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
              ) : isAudio ? (
                <div className="flex flex-col items-center justify-center p-8 bg-black/45 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full gap-4 animate-in zoom-in-95 duration-200">
                  <div className="h-16 w-16 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                    <Play className="h-6 w-6 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-white/90 text-center truncate max-w-[280px]" title={currentFile?.name}>
                    {currentFile?.name}
                  </span>
                  <audio
                    src={blobUrl}
                    controls
                    autoPlay
                    className="w-full mt-2"
                  />
                </div>
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
