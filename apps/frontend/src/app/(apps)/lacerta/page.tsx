"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useSession } from "next-auth/react";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { Lock, Unlock, ShieldAlert, Loader2, FolderClosed, FileText, Grid3X3, Plus, Upload, FolderPlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Image from "next/image";

import {
  encrypt,
  decrypt,
  wrapKey,
  unwrapKey,
  generateFileKey,
  exportRawKey,
} from "@runa/crypto/browser";

// Import local components
import FileGrid from "@/components/rrComponents/lacerta/FileGrid";
import { RrEncryptionLocked } from "@/components/rrComponents/rrEncryptionLocked";

import { LacertaTab, UploadQueueTask, DecryptedFileItem, RawFileItem } from "./types";
export type { LacertaTab };

import { CreateFileModal } from "./components/CreateFileModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { UploadHUD } from "./components/UploadHUD";

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
import { isOnlyOfficeFile } from "@/lib/onlyoffice";

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
    return decrypt(buffer, decryptedKey);
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

  return decrypt(concatenated.buffer, decryptedKey);
};


export default function LacertaPage({
  tab = "files",
}: {
  tab?: LacertaTab;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { isEncryptionUnlocked, privateKey, setShowUnlockDialog, lockEncryption, userPublicKey } = useRRCrypto();

  const currentTab = tab;
  const router = useRouter();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Background uploads tracking
  const [uploadQueue, setUploadQueue] = useState<UploadQueueTask[]>([]);

  // Decrypted items states

  const [decryptedFiles, setDecryptedFiles] = useState<DecryptedFileItem[]>([]);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  // Modal open states
  const [selectedFileForShare, setSelectedFileForShare] = useState<DecryptedFileItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isVaultAuthOpen, setIsVaultAuthOpen] = useState<boolean>(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<DecryptedFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (currentTab === "vault" && !isVaultUnlocked) {
      setIsVaultAuthOpen(true);
    }
  }, [currentTab, isVaultUnlocked]);

  // Editors open states
  const [activeTextEditorFile, setActiveTextEditorFile] = useState<DecryptedFileItem | null>(null);
  const [activeTextEditorContent, setActiveTextEditorContent] = useState<string>("");
  const [activeDocEditorFile, setActiveDocEditorFile] = useState<DecryptedFileItem | null>(null);
  const [activeDocEditorContent, setActiveDocEditorContent] = useState<string>("");
  const [activeSheetEditorFile, setActiveSheetEditorFile] = useState<DecryptedFileItem | null>(null);
  const [activeSheetEditorContent, setActiveSheetEditorContent] = useState<string>("");
  const [activeCanvasEditorFile, setActiveCanvasEditorFile] = useState<DecryptedFileItem | null>(null);
  const [activeCanvasEditorContent, setActiveCanvasEditorContent] = useState<string>("");
  const [activeMermaidEditorFile, setActiveMermaidEditorFile] = useState<DecryptedFileItem | null>(null);
  const [activeMermaidEditorContent, setActiveMermaidEditorContent] = useState<string>("");
  const [activeUmlEditorFile, setActiveUmlEditorFile] = useState<DecryptedFileItem | null>(null);
  const [activeUmlEditorContent, setActiveUmlEditorContent] = useState<string>("");
  const [activeOnlyOfficeFile, setActiveOnlyOfficeFile] = useState<DecryptedFileItem | null>(null);

  // File creation modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createType, setCreateType] = useState<"doc" | "sheet" | "note" | "slide" | "canvas" | "mermaid" | "uml" | null>(null);
  const [createName, setCreateName] = useState<string>("");
  const [createFormat, setCreateFormat] = useState<string>("");

  // Gallery slider states
  const [galleryFiles, setGalleryFiles] = useState<DecryptedFileItem[]>([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState<number>(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);

  // Query files listing from NestJS API SWR
  const { data, error, mutate, isLoading } = useSWR<RawFileItem[]>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/list`, session.accessToken]
      : null,
    fetcher
  );

  // Decrypt metadata of file list whenever data or Encryption status updates
  useEffect(() => {
    if (!isEncryptionUnlocked || !data || !privateKey) {
      setDecryptedFiles([]);
      return;
    }

    const decryptAll = async () => {
      setIsDecrypting(true);
      const list: DecryptedFileItem[] = [];
      for (const file of data) {
        try {
          const isOwner = file.userId === session?.user?.id;
          const shareRecord = file.shares?.find((s) => s.userId === session?.user?.id);
          const wrappedKeyToUse = isOwner ? file.wrappedKey : (shareRecord ? shareRecord.wrappedKey : null);

          if (!wrappedKeyToUse) continue;

          // Decrypt symmetric file key using recipient's private ECDH key
          // Decrypt symmetric file key using recipient's private ECDH key
          const fileKey = await unwrapKey(wrappedKeyToUse, privateKey);
          const rawKeyStr = await exportRawKey(fileKey);

          // Decrypt name and mimetype
          let decryptedName = file.name;
          try {
            decryptedName = await decrypt(file.name, fileKey);
          } catch (nameErr) {
            console.warn(`File ${file.id} name is not encrypted or failed to decrypt:`, file.name, nameErr);
          }

          let decryptedType = file.isFolder ? null : file.type;
          if (file.type && !file.isFolder) {
            try {
              decryptedType = await decrypt(file.type, fileKey);
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
            shares: file.shares || [],
          });
        } catch (err) {
          console.error("Failed to decrypt file metadata:", file.id, err);
        }
      }
      setDecryptedFiles(list);
      setIsDecrypting(false);
    };

    decryptAll();
  }, [data, isEncryptionUnlocked, privateKey, session?.user?.id]);

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
        const encName = await encrypt(fileToUpload.name, fileKey);
        const encType = await encrypt(fileToUpload.type || "application/octet-stream", fileKey);

        // 4. Encrypt file binary buffer
        const rawBuffer = await fileToUpload.arrayBuffer();
        const encBuffer = await encrypt(rawBuffer, fileKey);

        // 5. Wrap key
        const wrappedKey = JSON.stringify(await wrapKey(rawKeyStr, userPublicKey));

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
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Failed";
        setUploadQueue((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: "error", errorMsg: errMsg } : t))
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

      const encName = await encrypt(name, fileKey);
      const wrappedKey = JSON.stringify(await wrapKey(rawKeyStr, userPublicKey));

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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to create folder";
      toast.error(errMsg);
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
    else if (ext === ".doc") mime = "application/msword";
    else if (ext === ".odt") mime = "application/vnd.oasis.opendocument.text";
    else if (ext === ".rtf") mime = "application/rtf";
    else if (ext === ".txt") mime = "text/plain";
    else if (ext === ".html") mime = "text/html";
    else if (ext === ".epub") mime = "application/epub+zip";
    else if (ext === ".pages") mime = "application/x-iwork-pages-sffpages";
    else if (ext === ".hwp") mime = "application/x-hwp";
    else if (ext === ".xlsx") mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    else if (ext === ".xls") mime = "application/vnd.ms-excel";
    else if (ext === ".xlsm") mime = "application/vnd.ms-excel.sheet.macroEnabled.12";
    else if (ext === ".xlsb") mime = "application/vnd.ms-excel.sheet.binary.macroEnabled.12";
    else if (ext === ".ods") mime = "application/vnd.oasis.opendocument.spreadsheet";
    else if (ext === ".csv") mime = "text/csv";
    else if (ext === ".numbers") mime = "application/x-iwork-numbers-sffnumbers";
    else if (ext === ".pptx") mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    else if (ext === ".ppt") mime = "application/vnd.ms-powerpoint";
    else if (ext === ".odp") mime = "application/vnd.oasis.opendocument.presentation";
    else if (ext === ".ppsx") mime = "application/vnd.openxmlformats-officedocument.presentationml.slideshow";
    else if (ext === ".potx") mime = "application/vnd.openxmlformats-officedocument.presentationml.template";
    else if (ext === ".key" || ext === ".keynote") mime = "application/x-iwork-keynote-sffkey";

    const createToast = toast.loading(`Creating ${baseName}${ext}...`);

    try {
      // Generate E2EE key
      const fileKey = await generateFileKey();
      const rawKeyStr = await exportRawKey(fileKey);

      const encName = await encrypt(baseName + ext, fileKey);
      const encType = await encrypt(mime, fileKey);
      const wrappedKey = JSON.stringify(await wrapKey(rawKeyStr, userPublicKey));

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
      const encBuffer = await encrypt(rawData, fileKey);

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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to create doc";
      toast.error(errMsg, { id: createToast });
    }
  };

  // Open file (double-click) flow
  const handleOpenFile = async (item: DecryptedFileItem) => {
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

    const isOfficeFile = isOnlyOfficeFile(item.name, mime);

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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to decrypt file content";
      toast.error(errMsg, { id: downloadToast });
    }
  };

  // Download file flow (decrypted locally, saved to download folder)
  const handleDownloadFile = async (item: DecryptedFileItem) => {
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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Download failed";
      toast.error(errMsg, { id: downloadToast });
    }
  };


  // Save a copy of shared file locally under user's own account
  const handleSaveCopy = async (item: DecryptedFileItem) => {
    if (!item.decryptedKey || !userPublicKey || !session?.accessToken) return;
    const copyToast = toast.loading(`Creating a copy of ${item.name}...`);
    try {
      // 1. Download and decrypt current file content
      const downloadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${item.key}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!downloadRes.ok) throw new Error("Failed to download source file content");

      const encryptedBuffer = await downloadRes.arrayBuffer();
      const decryptedBuffer = await decrypt(encryptedBuffer, item.decryptedKey);

      // 2. Generate a new symmetric key for the copy
      const fileKey = await generateFileKey();
      const rawKeyStr = await exportRawKey(fileKey);

      // 3. Encrypt name and type using the new key
      const encName = await encrypt(item.name, fileKey);
      const encType = await encrypt(item.type || "application/octet-stream", fileKey);

      // 4. Encrypt the file content with the new key
      const encBuffer = await encrypt(decryptedBuffer, fileKey);

      // 5. Wrap the new key for current user (this recipient)
      const wrappedKey = JSON.stringify(await wrapKey(rawKeyStr, userPublicKey));

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

      toast.success(t("lacerta.copySavedSuccess", { name: item.name }), { id: copyToast });
      mutate();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to save copy";
      toast.error(errMsg, { id: copyToast });
    }
  };

  // Move to trash or restore
  const handleToggleTrash = async (item: DecryptedFileItem) => {
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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to update status";
      toast.error(errMsg);
    }
  };

  // Move to vault or remove
  const handleToggleVault = async (item: DecryptedFileItem) => {
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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to update status";
      toast.error(errMsg);
    }
  };

  // Permanent delete — opens confirm modal (replaces window.confirm which gets suppressed)
  const handleDeleteForever = (item: DecryptedFileItem) => {
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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Delete failed";
      toast.error(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShareClick = (item: DecryptedFileItem) => {
    setSelectedFileForShare(item);
    setIsShareModalOpen(true);
  };

  // Locked Landing Page UI
  if (!isEncryptionUnlocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
        <RrEncryptionLocked />
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-background">
      {/* Main Grid Area */}
      {isDecrypting || isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <span className="text-xs">{t("lacerta.decryptingFolderIndex")}</span>
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
          onLockEncryption={lockEncryption}
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
          file={(decryptedFiles.find((f) => f.id === selectedFileForShare.id) || selectedFileForShare) as unknown as React.ComponentProps<typeof ShareModal>["file"]}
          rawFileKey={selectedFileForShare.rawFileKey || null}
          onUpdate={mutate}
          allItems={decryptedFiles as unknown as React.ComponentProps<typeof ShareModal>["allItems"]}
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
          file={activeTextEditorFile as unknown as React.ComponentProps<typeof TextEditor>["file"]}
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
          file={activeDocEditorFile as unknown as React.ComponentProps<typeof BuiltinDocEditor>["file"]}
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
          file={activeSheetEditorFile as unknown as React.ComponentProps<typeof BuiltinSheetEditor>["file"]}
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
          file={{
            id: activeOnlyOfficeFile.id,
            name: activeOnlyOfficeFile.name,
            type: activeOnlyOfficeFile.type || null,
            updatedAt: activeOnlyOfficeFile.createdAt,
          } as unknown as React.ComponentProps<typeof OnlyOfficeEditor>["file"]}
          fileKey={activeOnlyOfficeFile.rawFileKey || ""}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
        />
      )}

      <CreateFileModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        createType={createType}
        createName={createName}
        setCreateName={setCreateName}
        createFormat={createFormat}
        setCreateFormat={setCreateFormat}
        onSubmit={submitCreateDoc}
      />

      {activeCanvasEditorFile && (
        <CanvasEditor
          isOpen={!!activeCanvasEditorFile}
          onClose={() => {
            setActiveCanvasEditorFile(null);
            setActiveCanvasEditorContent("");
          }}
          file={activeCanvasEditorFile as unknown as React.ComponentProps<typeof CanvasEditor>["file"]}
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
          file={activeMermaidEditorFile as unknown as React.ComponentProps<typeof MermaidEditor>["file"]}
          initialContent={activeMermaidEditorContent}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
          isReadOnly={
            activeMermaidEditorFile
              ? activeMermaidEditorFile.userId !== session?.user?.id &&
                !activeMermaidEditorFile.shares?.find((s) => s.userId === session?.user?.id)?.allowEdit
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
          file={activeUmlEditorFile as unknown as React.ComponentProps<typeof UmlEditor>["file"]}
          initialContent={activeUmlEditorContent}
          accessToken={session?.accessToken || ""}
          onSaveSuccess={mutate}
          isReadOnly={
            activeUmlEditorFile
              ? activeUmlEditorFile.userId !== session?.user?.id &&
                !activeUmlEditorFile.shares?.find((s) => s.userId === session?.user?.id)?.allowEdit
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
          files={galleryFiles.map((f) => ({ ...f, type: f.type || "application/octet-stream" })) as unknown as React.ComponentProps<typeof MediaGallerySlider>["files"]}
          initialIndex={galleryInitialIndex}
          accessToken={session?.accessToken || ""}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        fileToDelete={fileToDelete}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteForever}
      />

      <UploadHUD
        uploadQueue={uploadQueue}
        onClearFinished={() => setUploadQueue((prev) => prev.filter((t) => t.status === "uploading"))}
      />
    </div>
  );
}

