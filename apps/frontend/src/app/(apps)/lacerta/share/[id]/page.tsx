"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Download, Loader2, File, CheckCircle2, ShieldCheck, Play, ArrowLeft, Grid3X3, FolderPlus, LogIn } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import CanvasEditor from "@/components/rrComponents/lacerta/CanvasEditor";
import OnlyOfficeEditor from "@/components/rrComponents/lacerta/OnlyOfficeEditor";
import { isOnlyOfficeFile } from "@/lib/onlyoffice";
import { RawFileItem } from "../../types";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { FolderPickerModal } from "./FolderPickerModal";
import { RrLanguageSelector } from "@/components/rrComponents/rrLanguageSelector";

import {
  importRawKey,
  decrypt,
} from "@runa/crypto/browser";

// Overhead per chunk: 12 B IV + 16 B auth tag = 28 B
const CHUNK_OVERHEAD = 28;
const CHUNK_PLAINTEXT_SIZE = 32 * 1024 * 1024; // 32 MiB

/**
 * Decrypt a single AES-256-GCM chunk that was encrypted with a unique IV and AAD.
 * Wire format: [12 B IV][16 B tag][ciphertext]
 * AAD format:  "${fileId}|${partNumber}|${chunkCount}|${originalSize}"
 */
async function decryptChunk(
  wire: ArrayBuffer,
  key: CryptoKey,
  fileId: string,
  partNumber: number,
  chunkCount: number,
  originalSize: number,
): Promise<ArrayBuffer> {
  if (wire.byteLength < CHUNK_OVERHEAD) {
    throw new Error(`Chunk ${partNumber} too small to be valid ciphertext`);
  }
  const iv = wire.slice(0, 12);
  const tag = wire.slice(12, 28);
  const ciphertext = wire.slice(28);

  const ciphertextWithTag = new Uint8Array(ciphertext.byteLength + tag.byteLength);
  ciphertextWithTag.set(new Uint8Array(ciphertext), 0);
  ciphertextWithTag.set(new Uint8Array(tag), ciphertext.byteLength);

  const aad = new TextEncoder().encode(
    `${fileId}|${partNumber}|${chunkCount}|${originalSize}`,
  );

  return window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv), additionalData: aad },
    key,
    ciphertextWithTag,
  );
}

const downloadAndDecryptFileWithProgress = async (
  key: string,
  decryptedKey: CryptoKey,
  fileRecord?: { id: string; chunkCount?: number | null; size?: number | null },
  onProgress?: (percent: number) => void
): Promise<ArrayBuffer> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${key}`);
  if (!res.ok) throw new Error("Download failed");

  const contentLength = res.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  // Collect the full response body (streamed with progress reporting)
  let concatenated: Uint8Array;
  if (!res.body || totalBytes === 0) {
    const buffer = await res.arrayBuffer();
    if (onProgress) onProgress(100);
    concatenated = new Uint8Array(buffer);
  } else {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        if (onProgress && totalBytes > 0) {
          onProgress(Math.round((receivedBytes / totalBytes) * 100));
        }
      }
    }
    concatenated = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }
  }

  const totalCipherBuffer = concatenated.buffer as ArrayBuffer;
  const numChunks = fileRecord?.chunkCount ?? null;

  // ── New chunked format (chunkCount > 0) ────────────────────────────────────
  if (numChunks && numChunks > 0 && fileRecord?.id) {
    const originalSize = fileRecord.size ?? 0;
    const chunkCiphertextSize = CHUNK_PLAINTEXT_SIZE + CHUNK_OVERHEAD;
    const plaintextParts: ArrayBuffer[] = [];

    for (let i = 0; i < numChunks; i++) {
      const partNumber = i + 1;
      const isLast = i === numChunks - 1;
      const start = i * chunkCiphertextSize;
      const end = isLast ? totalCipherBuffer.byteLength : start + chunkCiphertextSize;
      const chunkWire = totalCipherBuffer.slice(start, end) as ArrayBuffer;

      const plaintext = await decryptChunk(
        chunkWire,
        decryptedKey,
        fileRecord.id,
        partNumber,
        numChunks,
        originalSize,
      );
      plaintextParts.push(plaintext);
    }

    const totalPlaintextBytes = plaintextParts.reduce((s, b) => s + b.byteLength, 0);
    const result = new Uint8Array(totalPlaintextBytes);
    let offset = 0;
    for (const part of plaintextParts) {
      result.set(new Uint8Array(part), offset);
      offset += part.byteLength;
    }
    return result.buffer as ArrayBuffer;
  }

  return decrypt(totalCipherBuffer, decryptedKey);
};


export default function LacertaSharePage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const fileId = params.id as string;
  const { data: session } = useSession();
  const { isEncryptionUnlocked, privateKey, userPublicKey, wrapKey, setShowUnlockDialog } = useRRCrypto();

  const [loading, setLoading] = useState<boolean>(true);
  const [decrypting, setDecrypting] = useState<boolean>(false);
  const [copying, setCopying] = useState<boolean>(false);
  const [fileMeta, setFileMeta] = useState<RawFileItem | null>(null);
  const [decryptedName, setDecryptedName] = useState<string>("");
  const [decryptedType, setDecryptedType] = useState<string>("");
  const [decryptedBlobUrl, setDecryptedBlobUrl] = useState<string | null>(null);
  const [rawKeyStr, setRawKeyStr] = useState<string | null>(null);

  const [showCanvasEditor, setShowCanvasEditor] = useState<boolean>(false);
  const [showOfficeEditor, setShowOfficeEditor] = useState<boolean>(false);
  const [canvasContent, setCanvasContent] = useState<string>("");
  const [decryptedKey, setDecryptedKey] = useState<CryptoKey | null>(null);

  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Register sw-download service worker for streaming download emulation on Firefox/Safari
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-download.js")
        .then((reg) => reg.update())
        .catch((err) => console.warn("Failed to register sw-download worker:", err));
    }
  }, []);


  useEffect(() => {
    // 1. Get raw key from URL hash fragment
    const hash = window.location.hash;
    const rawKey = hash ? hash.substring(1) : null;
    setRawKeyStr(rawKey);

    const loadMetadata = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${fileId}/metadata`);
        if (!res.ok) throw new Error("File not found or private.");
        const meta = await res.json();
        setFileMeta(meta);

        // If we have a key in the URL, decrypt the metadata now
        if (rawKey) {
          try {
            const decName = await decrypt(meta.name, rawKey);
            const decType = await decrypt(meta.type || "", rawKey);
            setDecryptedName(decName);
            setDecryptedType(decType);
          } catch (decErr) {
            console.error("Failed to decrypt metadata:", decErr);
            toast.error("Invalid decryption key in URL.");
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Failed to load shared file metadata.";
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      loadMetadata();
    }
  }, [fileId]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (decryptedBlobUrl) {
        URL.revokeObjectURL(decryptedBlobUrl);
      }
    };
  }, [decryptedBlobUrl]);

  const handleDecryptAndDownload = async () => {
    if (!fileMeta || !rawKeyStr) return;
    setDecrypting(true);
    const downloadToast = toast.loading("Downloading and decrypting file... (0%)");

    try {
      const fileKey = await importRawKey(rawKeyStr);
      const numChunks = fileMeta.chunkCount ?? null;
      const supportsFileSystem = typeof window !== "undefined" && "showSaveFilePicker" in window;

      // ── Streaming path: chunked file + File System Access API ─────────────────
      if (numChunks && numChunks > 0 && supportsFileSystem) {
        // 1. Ask user where to save
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: decryptedName || "shared-file",
          types: [{ description: "File", accept: { [decryptedType || "application/octet-stream"]: [] } }],
        });
        const writable = await fileHandle.createWritable();

        // 2. Fetch the raw ciphertext stream
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${fileMeta.key}`);
        if (!res.ok || !res.body) throw new Error("Download failed");

        const contentLength = res.headers.get("content-length");
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
        const chunkCiphertextSize = CHUNK_PLAINTEXT_SIZE + CHUNK_OVERHEAD;
        const originalSize = fileMeta.size ?? 0;

        let receivedBytes = 0;
        let pendingBytes = new Uint8Array(0);
        let partNumber = 0;

        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          receivedBytes += value.length;
          if (totalBytes > 0) {
            toast.loading(
              `Downloading & decrypting ${decryptedName}... (${Math.round((receivedBytes / totalBytes) * 100)}%)`,
              { id: downloadToast },
            );
          }

          const merged = new Uint8Array(pendingBytes.length + value.length);
          merged.set(pendingBytes, 0);
          merged.set(value, pendingBytes.length);
          pendingBytes = merged;

          while (
            (partNumber < numChunks - 1 && pendingBytes.length >= chunkCiphertextSize) ||
            (partNumber === numChunks - 1 && pendingBytes.length > 0 && done)
          ) {
            const isLast = partNumber === numChunks - 1;
            const chunkBytes = isLast ? pendingBytes : pendingBytes.slice(0, chunkCiphertextSize);
            const plaintext = await decryptChunk(
              chunkBytes.buffer as ArrayBuffer,
              fileKey,
              fileMeta.id,
              partNumber + 1,
              numChunks,
              originalSize,
            );
            await writable.write(plaintext);
            partNumber++;
            pendingBytes = isLast ? new Uint8Array(0) : pendingBytes.slice(chunkCiphertextSize);
          }
        }

        if (pendingBytes.length > 0 && partNumber < numChunks) {
          const plaintext = await decryptChunk(
            pendingBytes.buffer as ArrayBuffer,
            fileKey,
            fileMeta.id,
            partNumber + 1,
            numChunks,
            originalSize,
          );
          await writable.write(plaintext);
        }

        await writable.close();
        toast.success("File decrypted and downloaded successfully!", { id: downloadToast });
        return;
      }

      // ── Firefox/Safari Streaming fallback: Service Worker stream piping ───────
      if (numChunks && numChunks > 0 && typeof window !== "undefined" && "serviceWorker" in navigator) {
        // Ensure the Service Worker is registered and active
        const registration = await navigator.serviceWorker.ready;
        
        // If the service worker is active but not yet controlling this page, wait/claim it
        if (!navigator.serviceWorker.controller) {
          // Send a message to claim client control immediately
          registration.active?.postMessage({ type: "CLAIM_CLIENTS" });
          // Await brief moment for controller change
          await new Promise<void>((resolve) => {
            const onControllerChange = () => {
              navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
              resolve();
            };
            navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
            // Safety timeout fallback
            setTimeout(resolve, 500);
          });
        }

        const streamId = `dl-${Date.now()}-${Math.random()}`;
        const channel = new MessageChannel();

        // 1. Establish data link with the Service Worker
        registration.active?.postMessage(
          { type: "REGISTER_STREAM", streamId },
          [channel.port2]
        );

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${fileMeta.key}`);
        if (!res.ok || !res.body) throw new Error("Download failed");

        const contentLength = res.headers.get("content-length");
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
        const chunkCiphertextSize = CHUNK_PLAINTEXT_SIZE + CHUNK_OVERHEAD;
        const originalSize = fileMeta.size ?? 0;

        let receivedBytes = 0;
        let pendingBytes = new Uint8Array(0);
        let partNumber = 0;
        let active = true;

        const reader = res.body.getReader();

        const downloadUrl = `/files/download-stream?id=${streamId}&name=${encodeURIComponent(
          decryptedName || "shared-file"
        )}&type=${encodeURIComponent(decryptedType || "application/octet-stream")}&size=${originalSize}`;
        
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = downloadUrl;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 15000);

        const decryptWorker = new Worker(
          new URL("../../workers/lacerta-download.worker.ts", import.meta.url)
        );

        channel.port1.onmessage = async (evt) => {
          const msg = evt.data;

          if (msg.type === "cancel") {
            active = false;
            reader.cancel();
            decryptWorker.terminate();
          }

          if (msg.type === "ready" || msg.type === "ack") {
            if (!active) return;

            while (pendingBytes.length < chunkCiphertextSize) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                receivedBytes += value.length;
                if (totalBytes > 0) {
                  toast.loading(
                    `Downloading & decrypting ${decryptedName}... (${Math.round((receivedBytes / totalBytes) * 100)}%)`,
                    { id: downloadToast },
                  );
                }

                const merged = new Uint8Array(pendingBytes.length + value.length);
                merged.set(pendingBytes, 0);
                merged.set(value, pendingBytes.length);
                pendingBytes = merged;
              }
            }

            if (pendingBytes.length > 0) {
              const isLast = pendingBytes.length < chunkCiphertextSize || partNumber === numChunks - 1;
              const chunkBuffer = isLast 
                ? pendingBytes.buffer.slice(pendingBytes.byteOffset, pendingBytes.byteOffset + pendingBytes.byteLength)
                : pendingBytes.buffer.slice(pendingBytes.byteOffset, pendingBytes.byteOffset + chunkCiphertextSize);

              decryptWorker.postMessage({
                type: "decrypt-chunk",
                chunkIndex: partNumber,
                wireBuffer: chunkBuffer,
                rawFileKey: rawKeyStr,
                fileId: fileMeta.id,
                partNumber: partNumber + 1,
                chunkCount: numChunks,
                originalSize
              }, [chunkBuffer]);

              decryptWorker.onmessage = (wEvt) => {
                const wMsg = wEvt.data;
                if (wMsg.type === "chunk-decrypted") {
                  partNumber++;
                  pendingBytes = isLast ? new Uint8Array(0) : pendingBytes.subarray(chunkCiphertextSize);
                  channel.port1.postMessage({ type: "chunk", chunk: wMsg.plaintext }, [wMsg.plaintext]);
                } else if (wMsg.type === "error") {
                  channel.port1.postMessage({ type: "error", error: wMsg.error });
                  toast.error(`Decryption failed: ${wMsg.error}`, { id: downloadToast });
                  active = false;
                  decryptWorker.terminate();
                }
              };
            } else {
              channel.port1.postMessage({ type: "done" });
              toast.success("File decrypted and downloaded successfully!", { id: downloadToast });
              active = false;
              decryptWorker.terminate();
            }
          }
        };
        return;
      }

      // ── Fallback path: legacy single-block ─────────────────────────────────────
      const decryptedBuffer = await downloadAndDecryptFileWithProgress(
        fileMeta.key,
        fileKey,
        fileMeta,
        (percent) => {
          toast.loading(`Downloading and decrypting file... (${percent}%)`, { id: downloadToast });
        }
      );

      const blob = new Blob([decryptedBuffer], { type: decryptedType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = decryptedName || "shared-file";
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast.success("File decrypted and downloaded successfully!", { id: downloadToast });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.dismiss(downloadToast);
        return;
      }
      const errMsg = err instanceof Error ? err.message : "Decryption failed.";
      toast.error(errMsg, { id: downloadToast });
    } finally {
      setDecrypting(false);
    }
  };


  const handleOpenCanvas = async () => {
    if (!fileMeta || !rawKeyStr) return;
    setDecrypting(true);
    const loadToast = toast.loading("Decrypting and loading canvas...");
    try {
      // 1. Fetch encrypted binary file from server
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${fileMeta.key}`);
      if (!res.ok) throw new Error("Download from S3 failed.");

      const encryptedBuffer = await res.arrayBuffer();

      // 2. Import file key and decrypt
      const fileKey = await importRawKey(rawKeyStr);
      setDecryptedKey(fileKey);

      const decryptedBuffer = await decrypt(encryptedBuffer, fileKey);
      const text = new TextDecoder().decode(decryptedBuffer);

      setCanvasContent(text);
      setShowCanvasEditor(true);
      toast.success("Canvas decrypted successfully!", { id: loadToast });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to load canvas.";
      toast.error(errMsg, { id: loadToast });
    } finally {
      setDecrypting(false);
    }
  };

  const handleCopyToStorageClick = () => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    if (!isEncryptionUnlocked) {
      setShowUnlockDialog(true);
      return;
    }
    setIsFolderPickerOpen(true);
  };

  const handleCopyToStorage = async (targetFolderId: string | null) => {
    if (!fileMeta || !rawKeyStr || !session?.accessToken) return;
    setIsFolderPickerOpen(false);
    setCopying(true);
    const copyToast = toast.loading(t("lacerta.savingCopy", { defaultValue: "Saving copy to your storage..." }));

    try {
      // Fetch the raw encrypted file content directly (no decryption needed to copy)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${fileMeta.key}`);
      if (!res.ok) throw new Error("Failed to download file from server.");

      if (!userPublicKey) {
        throw new Error("User public key is missing.");
      }

      const encryptedBuffer = await res.arrayBuffer();
      const wrappedKey = JSON.stringify(await wrapKey(rawKeyStr, userPublicKey));

      const formData = new FormData();
      const blob = new Blob([encryptedBuffer], { type: "application/octet-stream" });
      formData.append("file", blob, decryptedName || "shared-file");
      formData.append("wrappedKey", wrappedKey);
      formData.append("name", fileMeta.name);
      formData.append("size", blob.size.toString());
      formData.append("type", fileMeta.type || "");
      if (targetFolderId) {
        formData.append("parentId", targetFolderId);
      }

      const uploadRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.accessToken}` },
          body: formData,
        },
      );

      if (!uploadRes.ok) throw new Error("Copy upload failed");

      toast.success(t("lacerta.copySavedSuccess", { name: decryptedName || "file" }), { id: copyToast });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Copy failed.";
      toast.error(errMsg, { id: copyToast });
    } finally {
      setCopying(false);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return "--";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (!mounted || loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary mb-2" />
        <span className="text-xs">
          {mounted ? t("lacerta.loadingSecureLink") : "Loading secure link metadata..."}
        </span>
      </div>
    );
  }

  if (!fileMeta) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center">
          <ShieldCheck className="size-12 text-destructive mb-3" />
          <h3 className="text-lg font-bold text-foreground">{t("lacerta.sharedLinkInvalid")}</h3>
          <p className="mt-2 text-center text-xs text-muted-foreground leading-normal max-w-sm">
            {t("lacerta.sharedLinkInvalidDesc")}
          </p>
          <Link
            href="/lacerta"
            className="mt-6 px-4 py-2 bg-muted/10 border hover:bg-muted/20 text-foreground font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" /> {t("lacerta.goToStorage")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen p-6 relative overflow-hidden">
      {!session && <RrLanguageSelector />}
      {/* Redesigned Premium Glassmorphic Card Container */}
      <div className="w-full max-w-md rounded-3xl border border-border/40 bg-card/45 p-8 shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center hover:border-border/60 transition-all duration-300 group">
        
        {/* Glowing File Icon */}
        <div className="mb-6 flex size-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 text-primary shadow-lg shadow-primary/5 transition-transform duration-500 group-hover:scale-105">
          <File className="size-10 text-primary animate-pulse" />
        </div>

        <h3 className="text-lg font-bold tracking-tight text-foreground truncate max-w-full px-4 mb-1">
          {decryptedName || t("lacerta.encryptedSharedFile")}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t("lacerta.size")}: {formatSize(fileMeta.size)}
        </span>
        {fileMeta.user && (
          <span className="text-[11px] text-muted-foreground/80 mt-1">
            {t("lacerta.sharedBy")}: <span className="font-semibold text-foreground">{fileMeta.user.displayName || fileMeta.user.username}</span>
          </span>
        )}

        {rawKeyStr ? (
          <div className="mt-6 w-full flex flex-col items-center">
            {/* Content Preview for Images */}
            {decryptedBlobUrl && decryptedType.startsWith("image/") && (
              <div className="w-full max-w-[280px] aspect-video border border-border/40 rounded-xl overflow-hidden shadow-md mb-6 bg-muted/5 relative">
                <img src={decryptedBlobUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}

            {/* Content Preview for Videos */}
            {decryptedBlobUrl && decryptedType.startsWith("video/") && (
              <div className="w-full max-w-[280px] aspect-video border border-border/40 rounded-xl overflow-hidden shadow-md mb-6 bg-black flex items-center justify-center">
                <video src={decryptedBlobUrl} controls className="w-full h-full object-contain" />
              </div>
            )}

            {/* Action Buttons Grid */}
            <div className="w-full flex flex-col gap-3">
              {decryptedType.includes("jsoncanvas") || decryptedName.endsWith(".canvas") ? (
                <button
                  onClick={handleOpenCanvas}
                  disabled={decrypting || copying}
                  className="w-full py-2.5 bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  {decrypting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Grid3X3 className="size-4" />
                  )}
                  {decrypting ? t("lacerta.decrypting") : t("lacerta.openCollaborativeCanvas")}
                </button>
              ) : isOnlyOfficeFile(decryptedName, decryptedType) ? (
                <button
                  onClick={() => setShowOfficeEditor(true)}
                  disabled={decrypting || copying}
                  className="w-full py-2.5 bg-success hover:bg-success/90 disabled:opacity-50 text-success-foreground font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <Play className="size-4" />
                  {t("lacerta.openCollaborativeEditor")}
                </button>
              ) : (
                <button
                  onClick={handleDecryptAndDownload}
                  disabled={decrypting || copying}
                  className="w-full py-3 bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  {decrypting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {decrypting ? t("lacerta.decrypting") : t("lacerta.decryptAndDownload")}
                </button>
              )}

              {/* Copy to Storage Button */}
              <button
                onClick={handleCopyToStorageClick}
                disabled={decrypting || copying}
                className="w-full py-3 bg-muted/15 border border-border/40 hover:bg-muted/25 disabled:opacity-50 text-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                {copying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : session ? (
                  <FolderPlus className="size-4" />
                ) : (
                  <LogIn className="size-4" />
                )}
                {session
                  ? t("lacerta.saveToLacerta", { defaultValue: "Save to My Storage" })
                  : t("lacerta.signInToSave", { defaultValue: "Sign In to Save" })}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 w-full">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl leading-normal text-left mb-6">
              <ShieldCheck className="size-4 shrink-0" />
              <span>
                <strong>Decryption key missing.</strong> The link did not include the fragment key (hash). You must enter the decryption key manually to view this file.
              </span>
            </div>
            <input
              type="text"
              placeholder="Enter decryption key..."
              onChange={(e) => setRawKeyStr(e.target.value)}
              className="w-full bg-muted/5 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all mb-4 text-center"
            />
          </div>
        )}

        <Link
          href="/lacerta"
          className="mt-8 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-all"
        >
          <ArrowLeft className="size-3.5" /> Back to Lacerta Storage
        </Link>
      </div>

      {showCanvasEditor && fileMeta && (
        <CanvasEditor
          isOpen={showCanvasEditor}
          onClose={() => {
            setShowCanvasEditor(false);
            setCanvasContent("");
          }}
          file={{
            id: fileMeta.id,
            name: decryptedName || "shared.canvas",
            key: fileMeta.key,
            decryptedKey: decryptedKey,
            wrappedKey: "",
            parentId: null,
            isPublic: fileMeta.isPublic,
          }}
          initialContent={canvasContent}
          accessToken=""
          onSaveSuccess={() => {}}
          guestMode={true}
        />
      )}
      {showOfficeEditor && fileMeta && rawKeyStr && (
        <OnlyOfficeEditor
          isOpen={showOfficeEditor}
          onClose={() => setShowOfficeEditor(false)}
          file={{
            id: fileMeta.id,
            name: decryptedName || "shared.document",
            type: decryptedType || null,
            updatedAt: typeof fileMeta.createdAt === "string" ? fileMeta.createdAt : new Date().toISOString(),
          }}
          fileKey={rawKeyStr}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={() => {}}
        />
      )}

      {/* Folder Picker Modal */}
      <FolderPickerModal
        isOpen={isFolderPickerOpen}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelect={handleCopyToStorage}
      />
    </div>
  );
}
