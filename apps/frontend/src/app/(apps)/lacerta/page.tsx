"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useSession } from "next-auth/react";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";
import { Lock, Unlock, ShieldAlert, Loader2, FolderClosed, FileText, Grid3X3, Plus, Upload, FolderPlus } from "lucide-react";
import { toast } from "sonner";

import {
  generateFileKey,
  exportRawKey,
  importRawKey,
  wrapFileKeyForUser,
  unwrapFileKeyForUser,
  encryptMetadataString,
  decryptMetadataString,
  encryptFileBuffer,
  decryptFileBuffer,
} from "@/lib/lacertaCrypto";

// Import local components
import FileGrid from "@/components/rrComponents/lacerta/FileGrid";

export type LacertaTab = "files" | "vault" | "shared" | "trash";
import ShareModal from "@/components/rrComponents/lacerta/ShareModal";
import VaultAuthModal from "@/components/rrComponents/lacerta/VaultAuthModal";
import BuiltinDocEditor from "@/components/rrComponents/lacerta/BuiltinDocEditor";
import BuiltinSheetEditor from "@/components/rrComponents/lacerta/BuiltinSheetEditor";
import TextEditor from "@/components/rrComponents/lacerta/TextEditor";
import MediaGallerySlider from "@/components/rrComponents/lacerta/MediaGallerySlider";
import CanvasEditor from "@/components/rrComponents/lacerta/CanvasEditor";
import MermaidEditor from "@/components/rrComponents/lacerta/MermaidEditor";
import UmlEditor from "@/components/rrComponents/lacerta/UmlEditor";

import { RenderFileItem } from "@/components/rrComponents/lacerta/FileCard";

export default function LacertaPage({
  tab = "files",
}: {
  tab?: LacertaTab;
}): React.JSX.Element {
  const { data: session } = useSession();
  const { isE2eeUnlocked, privateKey, setShowUnlockDialog, lockE2ee } = useRRe2ee();

  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.username && isE2eeUnlocked) {
      import("@/lib/indexeddb").then(({ loadKey }) => {
        loadKey(`public_key_string_${session.user.username}`).then((key) => {
          if (key) {
            setUserPublicKey(key as string);
          }
        });
      });
    } else {
      setUserPublicKey(null);
    }
  }, [session?.user?.username, isE2eeUnlocked]);

  const currentTab = tab;
  const router = useRouter();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Decrypted items states
  const [decryptedFiles, setDecryptedFiles] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  // Modal open states
  const [selectedFileForShare, setSelectedFileForShare] = useState<any | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isVaultAuthOpen, setIsVaultAuthOpen] = useState<boolean>(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);

  useEffect(() => {
    if (currentTab === "vault" && !isVaultUnlocked) {
      setIsVaultAuthOpen(true);
    }
  }, [currentTab, isVaultUnlocked]);

  // Editors open states
  const [activeTextEditorFile, setActiveTextEditorFile] = useState<any | null>(null);
  const [activeTextEditorContent, setActiveTextEditorContent] = useState<string>("");
  const [activeDocEditorFile, setActiveDocEditorFile] = useState<any | null>(null);
  const [activeDocEditorContent, setActiveDocEditorContent] = useState<string>("");
  const [activeSheetEditorFile, setActiveSheetEditorFile] = useState<any | null>(null);
  const [activeSheetEditorContent, setActiveSheetEditorContent] = useState<string>("");
  const [activeCanvasEditorFile, setActiveCanvasEditorFile] = useState<any | null>(null);
  const [activeCanvasEditorContent, setActiveCanvasEditorContent] = useState<string>("");
  const [activeMermaidEditorFile, setActiveMermaidEditorFile] = useState<any | null>(null);
  const [activeMermaidEditorContent, setActiveMermaidEditorContent] = useState<string>("");
  const [activeUmlEditorFile, setActiveUmlEditorFile] = useState<any | null>(null);
  const [activeUmlEditorContent, setActiveUmlEditorContent] = useState<string>("");

  // Gallery slider states
  const [galleryFiles, setGalleryFiles] = useState<any[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);

  // Query files listing from NestJS API SWR
  const { data, error, mutate, isLoading } = useSWR<any[]>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/list`, session.accessToken]
      : null,
    fetcher
  );

  // Decrypt metadata of file list whenever data or E2EE status updates
  useEffect(() => {
    if (!isE2eeUnlocked || !data || !privateKey) {
      setDecryptedFiles([]);
      return;
    }

    const decryptAll = async () => {
      setIsDecrypting(true);
      const list: any[] = [];
      for (const file of data) {
        try {
          const isOwner = file.userId === session?.user?.id;
          const shareRecord = file.shares?.find((s: any) => s.userId === session?.user?.id);
          const wrappedKeyToUse = isOwner ? file.wrappedKey : (shareRecord ? shareRecord.wrappedKey : null);

          if (!wrappedKeyToUse) continue;

          // Decrypt symmetric file key using recipient's private ECDH key
          const rawKeyStr = await unwrapFileKeyForUser(wrappedKeyToUse, privateKey);
          const fileKey = await importRawKey(rawKeyStr);

          // Decrypt name and mimetype
          let decryptedName = file.name;
          try {
            decryptedName = await decryptMetadataString(file.name, fileKey);
          } catch (nameErr) {
            console.warn(`File ${file.id} name is not encrypted or failed to decrypt:`, file.name, nameErr);
          }

          let decryptedType = file.isFolder ? null : file.type;
          if (file.type && !file.isFolder) {
            try {
              decryptedType = await decryptMetadataString(file.type, fileKey);
            } catch (typeErr) {
              console.warn(`File ${file.id} type is not encrypted or failed to decrypt:`, file.type, typeErr);
            }
          }

          list.push({
            ...file,
            name: decryptedName,
            type: decryptedType,
            decryptedKey: fileKey,
            rawFileKey: rawKeyStr,
            wrappedKey: file.wrappedKey,
          });
        } catch (err) {
          console.error("Failed to decrypt file metadata:", file.id, err);
        }
      }
      setDecryptedFiles(list);
      setIsDecrypting(false);
    };

    decryptAll();
  }, [data, isE2eeUnlocked, privateKey, session?.user?.id]);

  // Tab filter files selection
  const filteredFiles = decryptedFiles.filter((file) => {
    if (currentTab === "trash") return file.isTrash;
    if (file.isTrash) return false;

    if (currentTab === "vault") return file.isVault;
    if (file.isVault) return false;

    if (currentTab === "shared") return file.userId !== session?.user?.id;
    return file.userId === session?.user?.id;
  });

  const handleVaultAuth = (pin: string) => {
    setIsVaultUnlocked(true);
    setIsVaultAuthOpen(false);
    setCurrentFolderId(null);
  };

  // Upload file flow
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0 || !userPublicKey || !session?.accessToken) return;

    const fileToUpload = filesList[0];
    const uploadToast = toast.loading(`Encrypting and uploading ${fileToUpload.name}...`);

    try {
      // 1. Generate random file symmetric key
      const fileKey = await generateFileKey();
      const rawKeyStr = await exportRawKey(fileKey);

      // 2. Encrypt filename and mimetype
      const encName = await encryptMetadataString(fileToUpload.name, fileKey);
      const encType = await encryptMetadataString(fileToUpload.type || "application/octet-stream", fileKey);

      // 3. Encrypt file binary buffer
      const rawBuffer = await fileToUpload.arrayBuffer();
      const encBuffer = await encryptFileBuffer(rawBuffer, fileKey);

      // 4. Wrap file key with user's public key (ECIES)
      const wrappedKey = await wrapFileKeyForUser(rawKeyStr, userPublicKey);

      // 5. Post to server
      const formData = new FormData();
      const blob = new Blob([encBuffer], { type: "application/octet-stream" });
      formData.append("file", blob, fileToUpload.name);
      formData.append("wrappedKey", wrappedKey);
      formData.append("name", encName);
      formData.append("size", blob.size.toString());
      formData.append("type", encType);
      if (currentFolderId) formData.append("parentId", currentFolderId);
      if (currentTab === "vault") formData.append("isVault", "true");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Server upload failed");

      toast.success(`${fileToUpload.name} uploaded E2EE securely!`, { id: uploadToast });
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to encrypt/upload file", { id: uploadToast });
    }
  };

  // Create folder flow
  const handleCreateFolder = async (name: string) => {
    if (!userPublicKey || !session?.accessToken) return;
    try {
      const fileKey = await generateFileKey();
      const rawKeyStr = await exportRawKey(fileKey);

      const encName = await encryptMetadataString(name, fileKey);
      const wrappedKey = await wrapFileKeyForUser(rawKeyStr, userPublicKey);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/folder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          name: encName,
          wrappedKey,
          parentId: currentFolderId,
          isVault: currentTab === "vault",
        }),
      });

      if (!res.ok) throw new Error("Failed to create folder");

      toast.success(`Folder "${name}" created!`);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    }
  };

  // Create new document/spreadsheet file directly in-app
  const handleCreateDoc = async (type: "doc" | "sheet" | "note" | "slide" | "canvas" | "mermaid" | "uml") => {
    if (!userPublicKey || !session?.accessToken) return;
    const label =
      type === "doc"
        ? "document"
        : type === "sheet"
          ? "spreadsheet"
          : type === "slide"
            ? "presentation"
            : type === "canvas"
              ? "canvas"
              : type === "mermaid"
                ? "Mermaid Diagram"
                : type === "uml"
                  ? "UML Diagram"
                  : "note";
    const namePrompt = prompt(`Enter ${label} name:`);
    if (!namePrompt || !namePrompt.trim()) return;

    const name = namePrompt.trim();
    const ext =
      type === "canvas"
        ? ".canvas"
        : type === "doc"
          ? ".odt"
          : type === "sheet"
            ? ".ods"
            : type === "slide"
              ? ".odp"
              : type === "mermaid"
                ? ".mermaid"
                : type === "uml"
                  ? ".uml"
                  : ".txt";
    const mime =
      type === "canvas"
        ? "application/vnd.jsoncanvas"
        : type === "doc"
          ? "application/vnd.oasis.opendocument.text"
          : type === "sheet"
            ? "application/vnd.oasis.opendocument.spreadsheet"
            : type === "slide"
              ? "application/vnd.oasis.opendocument.presentation"
              : type === "mermaid"
                ? "application/mermaid"
                : type === "uml"
                  ? "application/uml"
                  : "text/plain";

    try {
      const fileKey = await generateFileKey();
      const rawKeyStr = await exportRawKey(fileKey);

      const encName = await encryptMetadataString(name + ext, fileKey);
      const encType = await encryptMetadataString(mime, fileKey);
      const wrappedKey = await wrapFileKeyForUser(rawKeyStr, userPublicKey);

      let emptyData = "";
      if (type === "sheet") {
        emptyData = "{}";
      } else if (type === "canvas" || type === "uml") {
        emptyData = '{"nodes":[],"edges":[]}';
      } else if (type === "mermaid") {
        emptyData = "graph TD\n    A[Start] --> B(Process)\n    B --> C{Decision}\n    C -- Yes --> D[Result 1]\n    C -- No --> E[Result 2]";
      }

      const encoder = new TextEncoder();
      const encBuffer = await encryptFileBuffer(
        encoder.encode(emptyData).buffer,
        fileKey,
      );

      const formData = new FormData();
      const blob = new Blob([encBuffer], { type: "application/octet-stream" });
      formData.append("file", blob, name + ext);
      formData.append("wrappedKey", wrappedKey);
      formData.append("name", encName);
      formData.append("size", blob.size.toString());
      formData.append("type", encType);
      if (currentFolderId) formData.append("parentId", currentFolderId);
      if (currentTab === "vault") formData.append("isVault", "true");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.accessToken}` },
          body: formData,
        },
      );

      if (!res.ok) throw new Error("Failed to create file");

      toast.success(`Created E2EE ${type} successfully!`);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to create doc");
    }
  };

  // Open file (double-click) flow
  const handleOpenFile = async (item: RenderFileItem) => {
    if (item.isFolder) {
      setCurrentFolderId(item.id);
      return;
    }

    if (!item.decryptedKey || !session?.accessToken) return;
    const downloadToast = toast.loading(`Decrypting ${item.name} for edit...`);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${item.key}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to download file content");

      const encryptedBuffer = await res.arrayBuffer();
      const decryptedBuffer = await decryptFileBuffer(encryptedBuffer, item.decryptedKey);
      const decoder = new TextDecoder();
      const textContent = decoder.decode(decryptedBuffer);

      toast.dismiss(downloadToast);

      const mime = item.type || "";
      if (mime.startsWith("image/") || mime.startsWith("video/")) {
        // Open media gallery slideshow
        const mediaFiles = filteredFiles.filter((f) => f.type?.startsWith("image/") || f.type?.startsWith("video/"));
        const idx = mediaFiles.findIndex((f) => f.id === item.id);
        setGalleryFiles(mediaFiles);
        setGalleryInitialIndex(idx >= 0 ? idx : 0);
        setIsGalleryOpen(true);
      } else if (mime.includes("jsoncanvas") || item.name.endsWith(".canvas")) {
        setActiveCanvasEditorFile(item);
        setActiveCanvasEditorContent(textContent);
      } else if (mime.includes("spreadsheet")) {
        setActiveSheetEditorFile(item);
        setActiveSheetEditorContent(textContent);
      } else if (mime.includes("document") || mime.includes("word") || mime.includes("odt")) {
        setActiveDocEditorFile(item);
        setActiveDocEditorContent(textContent);
      } else if (mime.includes("mermaid") || item.name.endsWith(".mermaid")) {
        setActiveMermaidEditorFile(item);
        setActiveMermaidEditorContent(textContent);
      } else if (mime.includes("uml") || item.name.endsWith(".uml")) {
        setActiveUmlEditorFile(item);
        setActiveUmlEditorContent(textContent);
      } else {
        // Fallback to text/markdown editor
        setActiveTextEditorFile(item);
        setActiveTextEditorContent(textContent);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to decrypt file content", { id: downloadToast });
    }
  };

  // Download file flow (decrypted locally, saved to download folder)
  const handleDownloadFile = async (item: RenderFileItem) => {
    if (!item.decryptedKey || !session?.accessToken) return;
    const downloadToast = toast.loading(`Downloading & decrypting ${item.name}...`);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${item.key}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error("Download failed");

      const encryptedBuffer = await res.arrayBuffer();
      const decryptedBuffer = await decryptFileBuffer(encryptedBuffer, item.decryptedKey);

      const blob = new Blob([decryptedBuffer], { type: item.type || "application/octet-stream" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(`${item.name} downloaded successfully!`, { id: downloadToast });
    } catch (err: any) {
      toast.error(err.message || "Download failed", { id: downloadToast });
    }
  };

  // Move to trash or restore
  const handleToggleTrash = async (item: RenderFileItem) => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${item.id}/metadata`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ isTrash: !item.isTrash }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      toast.success(item.isTrash ? "Restored from Recycle Bin" : "Moved to Recycle Bin");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Move to vault or remove
  const handleToggleVault = async (item: RenderFileItem) => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${item.id}/metadata`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ isVault: !item.isVault }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      toast.success(item.isVault ? "Removed from Secure Vault" : "Moved to Secure Vault");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Permanent delete
  const handleDeleteForever = async (item: RenderFileItem) => {
    if (!session?.accessToken || !confirm(`Permanently delete "${item.name}"? This action is irreversible.`)) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error("Delete failed");

      toast.success("File deleted permanently.");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleShareClick = (item: RenderFileItem) => {
    setSelectedFileForShare(item);
    setIsShareModalOpen(true);
  };

  // Locked Landing Page UI
  if (!isE2eeUnlocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">Secure Storage Locked</h3>
          <p className="mt-2 text-center text-xs text-muted-foreground leading-normal max-w-sm">
            Lacerta uses zero-knowledge cryptography. Your decryption keys are saved securely in your browser's IndexedDB and never sent to the server. Unlock secure storage to load your files.
          </p>
          <button
            onClick={() => setShowUnlockDialog(true)}
            className="mt-6 px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-98"
          >
            Unlock Decryption Keys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-background">
      {/* Main Grid Area */}
      {isDecrypting || isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <span className="text-xs">Decrypting folder index...</span>
        </div>
      ) : (
        <FileGrid
          items={filteredFiles}
          currentFolderId={currentFolderId}
          onFolderChange={setCurrentFolderId}
          onOpen={handleOpenFile}
          onDownload={handleDownloadFile}
          onShare={handleShareClick}
          onToggleTrash={handleToggleTrash}
          onToggleVault={handleToggleVault}
          onDelete={handleDeleteForever}
          onCreateFolder={handleCreateFolder}
          onCreateDoc={handleCreateDoc}
          onUploadFile={handleUploadFile}
          isSharedTab={currentTab === "shared"}
          onLockE2ee={lockE2ee}
        />
      )}

      {/* Modals */}
      {selectedFileForShare && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedFileForShare(null);
          }}
          file={decryptedFiles.find((f) => f.id === selectedFileForShare.id) || selectedFileForShare}
          rawFileKey={selectedFileForShare.rawFileKey}
          onUpdate={mutate}
          allItems={decryptedFiles}
        />
      )}

      <VaultAuthModal
        isOpen={isVaultAuthOpen}
        onClose={() => {
          setIsVaultAuthOpen(false);
          router.push("/lacerta");
        }}
        onAuthenticate={handleVaultAuth}
      />

      {/* Editors */}
      {activeTextEditorFile && (
        <TextEditor
          isOpen={!!activeTextEditorFile}
          onClose={() => {
            setActiveTextEditorFile(null);
            setActiveTextEditorContent("");
          }}
          file={activeTextEditorFile}
          initialContent={activeTextEditorContent}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
        />
      )}

      {activeDocEditorFile && (
        <BuiltinDocEditor
          isOpen={!!activeDocEditorFile}
          onClose={() => {
            setActiveDocEditorFile(null);
            setActiveDocEditorContent("");
          }}
          file={activeDocEditorFile}
          initialContent={activeDocEditorContent}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
        />
      )}

      {activeSheetEditorFile && (
        <BuiltinSheetEditor
          isOpen={!!activeSheetEditorFile}
          onClose={() => {
            setActiveSheetEditorFile(null);
            setActiveSheetEditorContent("");
          }}
          file={activeSheetEditorFile}
          initialContent={activeSheetEditorContent}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
        />
      )}

      {activeCanvasEditorFile && (
        <CanvasEditor
          isOpen={!!activeCanvasEditorFile}
          onClose={() => {
            setActiveCanvasEditorFile(null);
            setActiveCanvasEditorContent("");
          }}
          file={activeCanvasEditorFile}
          initialContent={activeCanvasEditorContent}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
        />
      )}

      {activeMermaidEditorFile && (
        <MermaidEditor
          isOpen={!!activeMermaidEditorFile}
          onClose={() => {
            setActiveMermaidEditorFile(null);
            setActiveMermaidEditorContent("");
          }}
          file={activeMermaidEditorFile}
          initialContent={activeMermaidEditorContent}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
        />
      )}

      {activeUmlEditorFile && (
        <UmlEditor
          isOpen={!!activeUmlEditorFile}
          onClose={() => {
            setActiveUmlEditorFile(null);
            setActiveUmlEditorContent("");
          }}
          file={activeUmlEditorFile}
          initialContent={activeUmlEditorContent}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
        />
      )}

      {/* Media gallery overlay */}
      {isGalleryOpen && (
        <MediaGallerySlider
          isOpen={isGalleryOpen}
          onClose={() => {
            setIsGalleryOpen(false);
            setGalleryFiles([]);
          }}
          files={galleryFiles}
          initialIndex={galleryInitialIndex}
          accessToken={session?.accessToken || ""}
        />
      )}
    </div>
  );
}
