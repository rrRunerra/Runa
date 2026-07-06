"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Download, Loader2, File, CheckCircle2, ShieldCheck, Play, ArrowLeft, Grid3X3 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import CanvasEditor from "@/components/rrComponents/lacerta/CanvasEditor";
import OnlyOfficeEditor from "@/components/rrComponents/lacerta/OnlyOfficeEditor";

import {
  importRawKey,
  decryptMetadataString,
  decryptFileBuffer,
} from "@/lib/lacertaCrypto";

export default function LacertaSharePage(): React.JSX.Element {
  const params = useParams();
  const fileId = params.id as string;
  const { data: session } = useSession();

  const [loading, setLoading] = useState<boolean>(true);
  const [decrypting, setDecrypting] = useState<boolean>(false);
  const [fileMeta, setFileMeta] = useState<any | null>(null);
  const [decryptedName, setDecryptedName] = useState<string>("");
  const [decryptedType, setDecryptedType] = useState<string>("");
  const [decryptedBlobUrl, setDecryptedBlobUrl] = useState<string | null>(null);
  const [rawKeyStr, setRawKeyStr] = useState<string | null>(null);

  const [showCanvasEditor, setShowCanvasEditor] = useState<boolean>(false);
  const [showOfficeEditor, setShowOfficeEditor] = useState<boolean>(false);
  const [canvasContent, setCanvasContent] = useState<string>("");
  const [decryptedKey, setDecryptedKey] = useState<CryptoKey | null>(null);

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
            const fileKey = await importRawKey(rawKey);
            const decName = await decryptMetadataString(meta.name, fileKey);
            const decType = await decryptMetadataString(meta.type || "", fileKey);
            setDecryptedName(decName);
            setDecryptedType(decType);
          } catch (decErr) {
            console.error("Failed to decrypt metadata:", decErr);
            toast.error("Invalid decryption key in URL.");
          }
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load shared file metadata.");
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
    const downloadToast = toast.loading("Downloading and decrypting file...");

    try {
      // 1. Fetch encrypted binary file from server
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${fileMeta.key}`);
      if (!res.ok) throw new Error("Download from server failed.");

      const encryptedBuffer = await res.arrayBuffer();

      // 2. Import file key and decrypt
      const fileKey = await importRawKey(rawKeyStr);
      const decryptedBuffer = await decryptFileBuffer(encryptedBuffer, fileKey);

      // 3. Create blob URL
      const blob = new Blob([decryptedBuffer], { type: decryptedType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      setDecryptedBlobUrl(url);

      // 4. Download file
      const a = document.createElement("a");
      a.href = url;
      a.download = decryptedName || "shared-file";
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast.success("File decrypted and downloaded successfully!", { id: downloadToast });
    } catch (err: any) {
      toast.error(err.message || "Decryption failed.", { id: downloadToast });
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

      const decryptedBuffer = await decryptFileBuffer(encryptedBuffer, fileKey);
      const text = new TextDecoder().decode(decryptedBuffer);

      setCanvasContent(text);
      setShowCanvasEditor(true);
      toast.success("Canvas decrypted successfully!", { id: loadToast });
    } catch (err: any) {
      toast.error(err.message || "Failed to load canvas.", { id: loadToast });
    } finally {
      setDecrypting(false);
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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <span className="text-xs">Loading secure link metadata...</span>
      </div>
    );
  }

  if (!fileMeta) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center">
          <ShieldCheck className="h-12 w-12 text-destructive mb-3" />
          <h3 className="text-lg font-bold text-foreground">Link Invalid or Private</h3>
          <p className="mt-2 text-center text-xs text-muted-foreground leading-normal max-w-sm">
            This file does not exist, has been deleted, or is not publicly shared. Check your share link.
          </p>
          <Link
            href="/lacerta"
            className="mt-6 px-4 py-2 bg-muted/10 border hover:bg-muted/20 text-foreground font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Go to Storage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary">
          <File className="h-8 w-8 text-primary" />
        </div>

        <h3 className="text-lg font-bold tracking-tight text-foreground truncate max-w-full px-4">
          {decryptedName || "Encrypted Shared File"}
        </h3>
        <span className="text-xs text-muted-foreground mt-1">
          Size: {formatSize(fileMeta.size)}
        </span>

        {rawKeyStr ? (
          <div className="mt-6 w-full flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full mb-6">
              <ShieldCheck className="h-3.5 w-3.5" />
              Decryption Key Found in URL (E2EE Active)
            </div>

            {/* Content Preview for Images */}
            {decryptedBlobUrl && decryptedType.startsWith("image/") && (
              <div className="w-full max-w-[280px] aspect-video border rounded-xl overflow-hidden shadow-md mb-6 bg-muted/10">
                <img src={decryptedBlobUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}

            {/* Content Preview for Videos */}
            {decryptedBlobUrl && decryptedType.startsWith("video/") && (
              <div className="w-full max-w-[280px] aspect-video border rounded-xl overflow-hidden shadow-md mb-6 bg-black flex items-center justify-center">
                <video src={decryptedBlobUrl} controls className="w-full h-full object-contain" />
              </div>
            )}

            {decryptedType.includes("jsoncanvas") || decryptedName.endsWith(".canvas") ? (
              <button
                onClick={handleOpenCanvas}
                disabled={decrypting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
              >
                {decrypting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Grid3X3 className="h-4 w-4" />
                )}
                {decrypting ? "Decrypting..." : "Open Collaborative Canvas"}
              </button>
            ) : decryptedType.includes("document") ||
              decryptedType.includes("word") ||
              decryptedType.includes("odt") ||
              decryptedType.includes("spreadsheet") ||
              decryptedType.includes("sheet") ||
              decryptedType.includes("ods") ||
              decryptedType.includes("presentation") ||
              decryptedType.includes("slide") ||
              decryptedType.includes("odp") ||
              decryptedName.endsWith(".docx") ||
              decryptedName.endsWith(".xlsx") ||
              decryptedName.endsWith(".pptx") ||
              decryptedName.endsWith(".odt") ||
              decryptedName.endsWith(".ods") ||
              decryptedName.endsWith(".odp") ? (
              <button
                onClick={() => setShowOfficeEditor(true)}
                disabled={decrypting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
              >
                <Play className="h-4 w-4" />
                Open Collaborative Editor
              </button>
            ) : (
              <button
                onClick={handleDecryptAndDownload}
                disabled={decrypting}
                className="w-full py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
              >
                {decrypting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {decrypting ? "Decrypting..." : "Decrypt & Download"}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 w-full">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl leading-normal text-left mb-6">
              <ShieldCheck className="h-4 w-4 shrink-0" />
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
          className="mt-6 text-xs text-muted-foreground hover:text-foreground hover:underline transition-all"
        >
          Back to Lacerta Storage
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
            updatedAt: fileMeta.updatedAt || new Date().toISOString(),
          }}
          fileKey={rawKeyStr}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={() => {}}
        />
      )}
    </div>
  );
}
