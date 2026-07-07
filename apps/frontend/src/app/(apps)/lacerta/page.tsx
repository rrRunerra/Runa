"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useSession } from "next-auth/react";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { Lock, Unlock, ShieldAlert, Loader2, FolderClosed, FileText, Grid3X3, Plus, Upload, FolderPlus, ShieldCheck } from "lucide-react";
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
import OnlyOfficeEditor from "@/components/rrComponents/lacerta/OnlyOfficeEditor";
import {
  BLANK_DOCX,
  BLANK_XLSX,
  BLANK_PPTX,
  BLANK_ODT,
  BLANK_ODS,
  BLANK_ODP
} from "@/lib/officeTemplates";

import { RenderFileItem } from "@/components/rrComponents/lacerta/FileCard";

const downloadAndDecryptFileWithProgress = async (
  key: string,
  decryptedKey: CryptoKey,
  accessToken: string,
  onProgress?: (percent: number) => void
): Promise<ArrayBuffer> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${key}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Download failed");

  const contentLength = res.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (!res.body || totalBytes === 0) {
    const buffer = await res.arrayBuffer();
    if (onProgress) onProgress(100);
    return decryptFileBuffer(buffer, decryptedKey);
  }

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

  const concatenated = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    concatenated.set(chunk, offset);
    offset += chunk.length;
  }

  return decryptFileBuffer(concatenated.buffer, decryptedKey);
};


export default function LacertaPage({
  tab = "files",
}: {
  tab?: LacertaTab;
}): React.JSX.Element {
  const { data: session } = useSession();
  const { isE2eeUnlocked, privateKey, setShowUnlockDialog, lockE2ee } = useRRCrypto();

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

  // Background uploads tracking
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);

  // Decrypted items states

  const [decryptedFiles, setDecryptedFiles] = useState<any[]>([]);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  // Modal open states
  const [selectedFileForShare, setSelectedFileForShare] = useState<any | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isVaultAuthOpen, setIsVaultAuthOpen] = useState<boolean>(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<RenderFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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
  const [activeOnlyOfficeFile, setActiveOnlyOfficeFile] = useState<any | null>(null);

  // File creation modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createType, setCreateType] = useState<"doc" | "sheet" | "note" | "slide" | "canvas" | "mermaid" | "uml" | null>(null);
  const [createName, setCreateName] = useState<string>("");
  const [createFormat, setCreateFormat] = useState<string>("");

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

  // Upload file flow (runs in the background via XHR)
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0 || !userPublicKey || !session?.accessToken) return;

    // Convert FileList to array and process each file in the background
    Array.from(filesList).forEach(async (fileToUpload) => {
      const taskId = `${fileToUpload.name}-${Date.now()}-${Math.random()}`;
      
      // 1. Add to upload queue
      setUploadQueue((prev) => [
        ...prev,
        { id: taskId, name: fileToUpload.name, progress: 0, status: "encrypting" },
      ]);

      try {
        // 2. Generate random file symmetric key
        const fileKey = await generateFileKey();
        const rawKeyStr = await exportRawKey(fileKey);

        // 3. Encrypt metadata
        const encName = await encryptMetadataString(fileToUpload.name, fileKey);
        const encType = await encryptMetadataString(fileToUpload.type || "application/octet-stream", fileKey);

        // 4. Encrypt file binary buffer
        const rawBuffer = await fileToUpload.arrayBuffer();
        const encBuffer = await encryptFileBuffer(rawBuffer, fileKey);

        // 5. Wrap key
        const wrappedKey = await wrapFileKeyForUser(rawKeyStr, userPublicKey);

        // Update queue status
        setUploadQueue((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: "uploading" } : t))
        );

        // 6. XHR Upload
        const formData = new FormData();
        const blob = new Blob([encBuffer], { type: "application/octet-stream" });
        formData.append("file", blob, fileToUpload.name);
        formData.append("wrappedKey", wrappedKey);
        formData.append("name", encName);
        formData.append("size", blob.size.toString());
        formData.append("type", encType);
        if (currentFolderId) formData.append("parentId", currentFolderId);
        if (currentTab === "vault") formData.append("isVault", "true");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/upload`);
        xhr.setRequestHeader("Authorization", `Bearer ${session.accessToken}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadQueue((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, progress: percent } : t))
            );
          }
        };

        const uploadPromise = new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error during upload"));
        });

        xhr.send(formData);
        await uploadPromise;

        // 7. Success
        setUploadQueue((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: "completed", progress: 100 } : t))
        );
        toast.success(`${fileToUpload.name} uploaded securely!`);
        mutate();

        // Remove from list after a delay
        setTimeout(() => {
          setUploadQueue((prev) => prev.filter((t) => t.id !== taskId));
        }, 5000);
      } catch (err: any) {
        setUploadQueue((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: "error", errorMsg: err.message || "Failed" } : t))
        );
        toast.error(`Upload failed: ${fileToUpload.name}`);
      }
    });
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
  const handleCreateDoc = (type: "doc" | "sheet" | "note" | "slide" | "canvas" | "mermaid" | "uml") => {
    setCreateType(type);
    setCreateName("");
    if (type === "doc") setCreateFormat(".docx");
    else if (type === "sheet") setCreateFormat(".xlsx");
    else if (type === "slide") setCreateFormat(".pptx");
    else setCreateFormat("");
    setIsCreateModalOpen(true);
  };

  const submitCreateDoc = async () => {
    if (!createName.trim()) {
      toast.error("Please enter a file name");
      return;
    }
    if (!userPublicKey || !session?.accessToken) return;

    setIsCreateModalOpen(false);
    const baseName = createName.trim();
    const type = createType!;
    
    // Resolve extension
    const ext = createFormat || (
      type === "canvas" ? ".canvas" :
      type === "mermaid" ? ".mermaid" :
      type === "uml" ? ".uml" :
      ".txt"
    );

    // Resolve mime type
    let mime = "text/plain";
    if (type === "canvas") mime = "application/vnd.jsoncanvas";
    else if (type === "mermaid") mime = "application/mermaid";
    else if (type === "uml") mime = "application/uml";
    else if (ext === ".docx") mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === ".xlsx") mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    else if (ext === ".pptx") mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    else if (ext === ".odt") mime = "application/vnd.oasis.opendocument.text";
    else if (ext === ".ods") mime = "application/vnd.oasis.opendocument.spreadsheet";
    else if (ext === ".odp") mime = "application/vnd.oasis.opendocument.presentation";

    const createToast = toast.loading(`Creating ${baseName}${ext}...`);

    try {
      // Generate E2EE key
      const fileKey = await generateFileKey();
      const rawKeyStr = await exportRawKey(fileKey);

      const encName = await encryptMetadataString(baseName + ext, fileKey);
      const encType = await encryptMetadataString(mime, fileKey);
      const wrappedKey = await wrapFileKeyForUser(rawKeyStr, userPublicKey);

      // Resolve initial data
      let rawData: ArrayBuffer;
      if (ext === ".docx") {
        rawData = Uint8Array.from(atob(BLANK_DOCX), c => c.charCodeAt(0)).buffer;
      } else if (ext === ".xlsx") {
        rawData = Uint8Array.from(atob(BLANK_XLSX), c => c.charCodeAt(0)).buffer;
      } else if (ext === ".pptx") {
        rawData = Uint8Array.from(atob(BLANK_PPTX), c => c.charCodeAt(0)).buffer;
      } else if (ext === ".odt") {
        rawData = Uint8Array.from(atob(BLANK_ODT), c => c.charCodeAt(0)).buffer;
      } else if (ext === ".ods") {
        rawData = Uint8Array.from(atob(BLANK_ODS), c => c.charCodeAt(0)).buffer;
      } else if (ext === ".odp") {
        rawData = Uint8Array.from(atob(BLANK_ODP), c => c.charCodeAt(0)).buffer;
      } else {
        let emptyText = "";
        if (type === "sheet") {
          emptyText = "{}";
        } else if (type === "canvas" || type === "uml") {
          emptyText = '{"nodes":[],"edges":[]}';
        } else if (type === "mermaid") {
          emptyText = "graph TD\n    A[Start] --> B(Process)\n    B --> C{Decision}\n    C -- Yes --> D[Result 1]\n    C -- No --> E[Result 2]";
        }
        rawData = new TextEncoder().encode(emptyText).buffer;
      }

      // Encrypt contents
      const encBuffer = await encryptFileBuffer(rawData, fileKey);

      const formData = new FormData();
      const blob = new Blob([encBuffer], { type: "application/octet-stream" });
      formData.append("file", blob, baseName + ext);
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

      toast.success(`Created E2EE ${baseName}${ext} successfully!`, { id: createToast });
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to create doc", { id: createToast });
    }
  };

  // Open file (double-click) flow
  const handleOpenFile = async (item: RenderFileItem) => {
    if (item.isFolder) {
      setCurrentFolderId(item.id);
      return;
    }

    if (!item.decryptedKey || !session?.accessToken) return;

    const mime = item.type || "";

    const isVideo =
      mime.startsWith("video/") ||
      item.name.endsWith(".mp4") ||
      item.name.endsWith(".mkv") ||
      item.name.endsWith(".webm") ||
      item.name.endsWith(".ogg") ||
      item.name.endsWith(".mov");
    if (isVideo) return;

    const isOfficeFile =
      mime.includes("document") ||
      mime.includes("word") ||
      mime.includes("odt") ||
      mime.includes("spreadsheet") ||
      mime.includes("sheet") ||
      mime.includes("ods") ||
      mime.includes("presentation") ||
      mime.includes("slide") ||
      mime.includes("odp") ||
      item.name.endsWith(".docx") ||
      item.name.endsWith(".xlsx") ||
      item.name.endsWith(".pptx") ||
      item.name.endsWith(".odt") ||
      item.name.endsWith(".ods") ||
      item.name.endsWith(".odp");

    if (isOfficeFile) {
      setActiveOnlyOfficeFile(item);
      return;
    }

    const isMediaFile =
      mime.startsWith("image/") ||
      mime.startsWith("audio/") ||
      item.name.endsWith(".mp3") ||
      item.name.endsWith(".wav") ||
      item.name.endsWith(".flac") ||
      item.name.endsWith(".m4a") ||
      item.name.endsWith(".aac");

    if (isMediaFile) {
      // Open media gallery slideshow immediately without downloading/decrypting in the parent
      const mediaFiles = filteredFiles.filter((f) => {
        const fMime = f.type || "";
        return (
          fMime.startsWith("image/") ||
          fMime.startsWith("audio/") ||
          f.name.endsWith(".mp3") ||
          f.name.endsWith(".wav") ||
          f.name.endsWith(".flac") ||
          f.name.endsWith(".m4a") ||
          f.name.endsWith(".aac")
        );
      });
      const idx = mediaFiles.findIndex((f) => f.id === item.id);
      setGalleryFiles(mediaFiles);
      setGalleryInitialIndex(idx >= 0 ? idx : 0);
      setIsGalleryOpen(true);
      return;
    }

    const downloadToast = toast.loading(`Decrypting ${item.name} for edit... (0%)`);

    try {
      const decryptedBuffer = await downloadAndDecryptFileWithProgress(
        item.key,
        item.decryptedKey,
        session.accessToken,
        (percent) => {
          toast.loading(`Decrypting ${item.name} for edit... (${percent}%)`, { id: downloadToast });
        }
      );
      const decoder = new TextDecoder();
      const textContent = decoder.decode(decryptedBuffer);

      toast.dismiss(downloadToast);

      const mime = item.type || "";
      if (mime.includes("jsoncanvas") || item.name.endsWith(".canvas")) {

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
    const downloadToast = toast.loading(`Downloading & decrypting ${item.name}... (0%)`);
    try {
      const decryptedBuffer = await downloadAndDecryptFileWithProgress(
        item.key,
        item.decryptedKey,
        session.accessToken,
        (percent) => {
          toast.loading(`Downloading & decrypting ${item.name}... (${percent}%)`, { id: downloadToast });
        }
      );

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


  // Save a copy of shared file locally under user's own account
  const handleSaveCopy = async (item: RenderFileItem) => {
    if (!item.decryptedKey || !userPublicKey || !session?.accessToken) return;
    const copyToast = toast.loading(`Creating a copy of ${item.name}...`);
    try {
      // 1. Download and decrypt current file content
      const downloadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${item.key}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!downloadRes.ok) throw new Error("Failed to download source file content");

      const encryptedBuffer = await downloadRes.arrayBuffer();
      const decryptedBuffer = await decryptFileBuffer(encryptedBuffer, item.decryptedKey);

      // 2. Generate a new symmetric key for the copy
      const fileKey = await generateFileKey();
      const rawKeyStr = await exportRawKey(fileKey);

      // 3. Encrypt name and type using the new key
      const encName = await encryptMetadataString(item.name, fileKey);
      const encType = await encryptMetadataString(item.type || "application/octet-stream", fileKey);

      // 4. Encrypt the file content with the new key
      const encBuffer = await encryptFileBuffer(decryptedBuffer, fileKey);

      // 5. Wrap the new key for current user (this recipient)
      const wrappedKey = await wrapFileKeyForUser(rawKeyStr, userPublicKey);

      // 6. Post to server as a new file (owned by current user)
      const formData = new FormData();
      const blob = new Blob([encBuffer], { type: "application/octet-stream" });
      formData.append("file", blob, item.name);
      formData.append("wrappedKey", wrappedKey);
      formData.append("name", encName);
      formData.append("size", blob.size.toString());
      formData.append("type", encType);
      
      // Save it under root or current folder
      if (currentFolderId) formData.append("parentId", currentFolderId);
      if (currentTab === "vault") formData.append("isVault", "true");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to save copy to server");

      toast.success(`Successfully saved copy of ${item.name} to your files!`, { id: copyToast });
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Failed to save copy", { id: copyToast });
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

  // Permanent delete — opens confirm modal (replaces window.confirm which gets suppressed)
  const handleDeleteForever = (item: RenderFileItem) => {
    setFileToDelete(item);
  };

  const confirmDeleteForever = async () => {
    if (!fileToDelete || !session?.accessToken) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${fileToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Delete failed (${res.status})`);
      }
      toast.success("File deleted permanently.");
      setFileToDelete(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setIsDeleting(false);
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
          onSaveCopy={handleSaveCopy}
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
        accessToken={session?.accessToken || ""}
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

      {activeOnlyOfficeFile && (
        <OnlyOfficeEditor
          isOpen={!!activeOnlyOfficeFile}
          onClose={() => {
            setActiveOnlyOfficeFile(null);
          }}
          file={activeOnlyOfficeFile}
          fileKey={activeOnlyOfficeFile.rawFileKey}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
        />
      )}

      {/* Create File Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-sm font-bold text-foreground mb-4">
              Create New {createType === "doc" ? "Document" : createType === "sheet" ? "Spreadsheet" : createType === "slide" ? "Presentation" : createType}
            </h3>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground">File Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Enter name"
                  className="bg-muted/10 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/60 w-full"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitCreateDoc();
                  }}
                />
              </div>

              {(createType === "doc" || createType === "sheet" || createType === "slide") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">File Format</label>
                  <select
                    value={createFormat}
                    onChange={(e) => setCreateFormat(e.target.value)}
                    className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none w-full"
                  >
                    {createType === "doc" && (
                      <>
                        <option value=".docx">Microsoft Word (.docx)</option>
                        <option value=".odt">OpenDocument Text (.odt)</option>
                      </>
                    )}
                    {createType === "sheet" && (
                      <>
                        <option value=".xlsx">Microsoft Excel (.xlsx)</option>
                        <option value=".ods">OpenDocument Spreadsheet (.ods)</option>
                      </>
                    )}
                    {createType === "slide" && (
                      <>
                        <option value=".pptx">Microsoft PowerPoint (.pptx)</option>
                        <option value=".odp">OpenDocument Presentation (.odp)</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">E2EE Active</span>
                  <span className="text-[10px] text-muted-foreground leading-normal">
                    This file is encrypted locally in your browser. Real-time collaboration is supported via in-memory secure key exchange.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-1.5 border border-border hover:bg-muted/10 rounded-lg text-xs font-semibold text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={submitCreateDoc}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg transition-all shadow-md"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
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
          isReadOnly={
            activeMermaidEditorFile
              ? activeMermaidEditorFile.userId !== session?.user?.id &&
                !activeMermaidEditorFile.shares?.find((s: any) => s.userId === session?.user?.id)?.allowEdit
              : false
          }
          userPublicKey={userPublicKey}
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
          isReadOnly={
            activeUmlEditorFile
              ? activeUmlEditorFile.userId !== session?.user?.id &&
                !activeUmlEditorFile.shares?.find((s: any) => s.userId === session?.user?.id)?.allowEdit
              : false
          }
          userPublicKey={userPublicKey}
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
      {/* Permanent delete confirmation modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-sm font-bold text-foreground mb-1">Delete Forever?</h3>
            <p className="text-xs text-muted-foreground mb-1">
              This will permanently delete:
            </p>
            <p className="text-xs font-semibold text-foreground bg-muted/20 rounded-lg px-3 py-2 mb-4 truncate">
              {fileToDelete.name}
            </p>
            <p className="text-xs text-destructive/80 mb-5">
              This action is irreversible. The file will be removed from storage permanently.
            </p>
            <div className="flex justify-end items-center gap-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 border border-border hover:bg-muted/10 rounded-lg text-xs font-semibold text-foreground transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteForever}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Background Uploads HUD */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-neutral-950/90 border border-neutral-800 text-white rounded-xl shadow-2xl p-4 flex flex-col gap-3 max-h-72 overflow-y-auto animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs font-bold tracking-wide uppercase text-neutral-400">Uploads ({uploadQueue.length})</span>
            <button
              onClick={() => setUploadQueue((prev) => prev.filter((t) => t.status === "uploading"))}
              className="text-[10px] text-neutral-500 hover:text-white transition-colors"
            >
              Clear Finished
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {uploadQueue.map((task) => (
              <div key={task.id} className="flex flex-col gap-1.5 p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-semibold truncate max-w-[180px]" title={task.name}>
                    {task.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 shrink-0 font-medium">
                    {task.status === "encrypting" && "Encrypting..."}
                    {task.status === "uploading" && `${task.progress}%`}
                    {task.status === "completed" && <span className="text-emerald-400 font-semibold">Done</span>}
                    {task.status === "error" && <span className="text-rose-400 font-semibold">Error</span>}
                  </span>
                </div>
                {task.status === "uploading" && (
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300 rounded-full"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
                {task.errorMsg && (
                  <span className="text-[9px] text-rose-400/80 leading-none truncate">
                    {task.errorMsg}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

