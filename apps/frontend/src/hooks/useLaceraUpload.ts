"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import {
  encrypt,
  exportRawKey,
  generateFileKey,
  wrapKey,
} from "@runa/crypto/browser";

import {
  LACERTA_CHUNK_SIZE_BYTES,
  LACERTA_UPLOAD_MANIFEST_STORE,
} from "@/lib/constants";

import type { UploadQueueTask } from "@/app/(apps)/lacerta/types";

// ---------------------------------------------------------------------------
// IndexedDB helpers for the upload manifest store
// (separate from the keys store in lib/indexeddb.ts)
// ---------------------------------------------------------------------------

const MANIFEST_DB_NAME = "RunaLaceraUploads";
const MANIFEST_DB_VERSION = 1;

function openManifestDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MANIFEST_DB_NAME, MANIFEST_DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(LACERTA_UPLOAD_MANIFEST_STORE)) {
        req.result.createObjectStore(LACERTA_UPLOAD_MANIFEST_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveManifest(fileId: string, data: UploadManifest): Promise<void> {
  const db = await openManifestDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LACERTA_UPLOAD_MANIFEST_STORE, "readwrite");
    const store = tx.objectStore(LACERTA_UPLOAD_MANIFEST_STORE);
    const req = store.put(data, fileId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function loadManifest(fileId: string): Promise<UploadManifest | null> {
  const db = await openManifestDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LACERTA_UPLOAD_MANIFEST_STORE, "readonly");
    const store = tx.objectStore(LACERTA_UPLOAD_MANIFEST_STORE);
    const req = store.get(fileId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteManifest(fileId: string): Promise<void> {
  const db = await openManifestDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LACERTA_UPLOAD_MANIFEST_STORE, "readwrite");
    const store = tx.objectStore(LACERTA_UPLOAD_MANIFEST_STORE);
    const req = store.delete(fileId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function loadAllManifests(): Promise<UploadManifest[]> {
  const db = await openManifestDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LACERTA_UPLOAD_MANIFEST_STORE, "readonly");
    const store = tx.objectStore(LACERTA_UPLOAD_MANIFEST_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadManifest {
  fileId: string;
  uploadId: string;
  /** Encrypted file name (for display after reload) */
  fileName: string;
  rawFileKey: string;
  chunkCount: number;
  completedParts: { partNumber: number; etag: string }[];
  /** Stored so the abort call can re-use the auth token */
  accessToken: string;
}

interface UploadContext {
  accessToken: string;
  userPublicKey: string;
  /** Optional parent folder ID */
  parentId?: string | null;
  isVault?: boolean;
}

export interface UseLaceraUploadReturn {
  uploadQueue: UploadQueueTask[];
  uploadFiles: (files: File[], ctx: UploadContext) => void;
  resumeUpload: (fileId: string, file: File, ctx: UploadContext) => void;
  abortUpload: (fileId: string) => Promise<void>;
  clearFinished: () => void;
  onFilesUploaded: (() => void) | null;
  setOnFilesUploaded: (cb: (() => void) | null) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLaceraUpload(): UseLaceraUploadReturn {
  const { t } = useTranslation();
  const [uploadQueue, setUploadQueue] = useState<UploadQueueTask[]>([]);
  const workerMap = useRef<Map<string, Worker>>(new Map());
  const onUploadedRef = useRef<(() => void) | null>(null);

  // Clean up all workers on unmount
  useEffect(() => {
    return () => {
      for (const worker of workerMap.current.values()) {
        worker.terminate();
      }
    };
  }, []);

  const setOnFilesUploaded = useCallback((cb: (() => void) | null) => {
    onUploadedRef.current = cb;
  }, []);

  /** Removes completed / errored tasks from the visible queue */
  const clearFinished = useCallback(() => {
    setUploadQueue((prev) =>
      prev.filter((t) => t.status === "uploading" || t.status === "encrypting"),
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Core: run the worker for a given file + manifest
  // ---------------------------------------------------------------------------
  const runWorker = useCallback(
    (
      file: File,
      manifest: UploadManifest,
      ctx: UploadContext,
      taskId: string,
    ) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const worker = new Worker(
        new URL("../app/(apps)/lacerta/workers/lacerta-upload.worker.ts", import.meta.url),
      );
      workerMap.current.set(taskId, worker);

      worker.postMessage({
        type: "start",
        file,
        fileId: manifest.fileId,
        uploadId: manifest.uploadId,
        rawFileKey: manifest.rawFileKey,
        accessToken: ctx.accessToken,
        chunkCount: manifest.chunkCount,
        completedParts: manifest.completedParts,
        apiUrl,
        chunkSize: LACERTA_CHUNK_SIZE_BYTES,
      });

      worker.onmessage = async (event: MessageEvent) => {
        const msg = event.data as {
          type: string;
          partNumber?: number;
          etag?: string;
          completedChunks?: number;
          totalChunks?: number;
          message?: string;
        };

        if (msg.type === "part-done") {
          // Persist progress to IndexedDB for resume
          const updated: UploadManifest = {
            ...manifest,
            completedParts: [
              ...manifest.completedParts,
              { partNumber: msg.partNumber!, etag: msg.etag! },
            ],
          };
          Object.assign(manifest, { completedParts: updated.completedParts });
          await saveManifest(manifest.fileId, updated).catch(() => {});
        }

        if (msg.type === "progress") {
          const { completedChunks = 0, totalChunks = 1 } = msg;
          const pct = Math.round((completedChunks / totalChunks) * 100);
          setUploadQueue((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? { ...t, status: "uploading", progress: pct, completedChunks, totalChunks }
                : t,
            ),
          );
        }

        if (msg.type === "done") {
          // Call CompleteMultipartUpload
          try {
            const resp = await fetch(
              `${apiUrl}/files/lacerta/upload/complete`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${ctx.accessToken}`,
                },
                body: JSON.stringify({
                  fileId: manifest.fileId,
                  parts: [...manifest.completedParts].sort(
                    (a, b) => a.partNumber - b.partNumber,
                  ),
                }),
              },
            );

            if (!resp.ok) throw new Error("Failed to complete upload");

            // Clean up
            await deleteManifest(manifest.fileId).catch(() => {});
            workerMap.current.delete(taskId);
            worker.terminate();

            setUploadQueue((prev) =>
              prev.map((t) =>
                t.id === taskId
                  ? { ...t, status: "completed", progress: 100 }
                  : t,
              ),
            );
            toast.success(`${file.name} ${t("lacerta.uploadedSecurely", { defaultValue: "uploaded securely!" })}`);
            onUploadedRef.current?.();

            // Auto-remove after 5 s
            setTimeout(() => {
              setUploadQueue((prev) => prev.filter((t) => t.id !== taskId));
            }, 5000);
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Failed to finalise upload";
            setUploadQueue((prev) =>
              prev.map((t) =>
                t.id === taskId ? { ...t, status: "error", errorMsg: errMsg } : t,
              ),
            );
            toast.error(`${t("lacerta.uploadFailed", { defaultValue: "Upload failed:" })} ${file.name}`);
          }
        }

        if (msg.type === "error") {
          workerMap.current.delete(taskId);
          worker.terminate();
          setUploadQueue((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? { ...t, status: "error", errorMsg: msg.message }
                : t,
            ),
          );
          if (msg.message !== "Upload aborted") {
            toast.error(`${t("lacerta.uploadFailed", { defaultValue: "Upload failed:" })} ${file.name}`);
          }
        }
      };

      worker.onerror = (err) => {
        workerMap.current.delete(taskId);
        setUploadQueue((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, status: "error", errorMsg: err.message }
              : t,
          ),
        );
        toast.error(`${t("lacerta.uploadFailed", { defaultValue: "Upload failed:" })} ${file.name}`);
      };
    },
    [t],
  );

  // ---------------------------------------------------------------------------
  // uploadFiles — entry point for new uploads
  // ---------------------------------------------------------------------------
  const uploadFiles = useCallback(
    (files: File[], ctx: UploadContext) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

      for (const file of files) {
        // Use a temporary client-side ID until we get the real fileId from backend
        const tempId = `tmp-${Date.now()}-${Math.random()}`;

        // Immediately show in queue as "encrypting"
        setUploadQueue((prev) => [
          ...prev,
          {
            id: tempId,
            name: file.name,
            progress: 0,
            status: "encrypting",
          },
        ]);

        (async () => {
          try {
            // 1. Generate symmetric AES-256-GCM file key
            const fileKey = await generateFileKey();
            const rawFileKey = await exportRawKey(fileKey);

            // 2. Encrypt metadata
            const encName = await encrypt(file.name, fileKey);
            const encType = await encrypt(
              file.type || "application/octet-stream",
              fileKey,
            );

            // 3. Wrap key for recipient (ECDH or hybrid)
            const wrappedKey = JSON.stringify(
              await wrapKey(rawFileKey, ctx.userPublicKey),
            );

            // 4. Calculate number of chunks
            const chunkCount = Math.max(
              1,
              Math.ceil(file.size / LACERTA_CHUNK_SIZE_BYTES),
            );

            // 5. Init multipart upload on the backend
            const initResp = await fetch(
              `${apiUrl}/files/lacerta/upload/init`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${ctx.accessToken}`,
                },
                body: JSON.stringify({
                  encName,
                  encType,
                  wrappedKey,
                  totalSize: file.size,
                  chunkCount,
                  parentId: ctx.parentId ?? undefined,
                  isVault: ctx.isVault ?? false,
                }),
              },
            );

            if (!initResp.ok) {
              let errMsg = "Failed to initialise upload";
              try {
                const errData = await initResp.json();
                if (errData && errData.message) {
                  errMsg = errData.message;
                }
              } catch (_) {}
              throw new Error(errMsg);
            }

            const { fileId, uploadId } = (await initResp.json()) as {
              fileId: string;
              uploadId: string;
            };

            // 6. Persist manifest to IndexedDB for resume capability
            const manifest: UploadManifest = {
              fileId,
              uploadId,
              fileName: file.name,
              rawFileKey,
              chunkCount,
              completedParts: [],
              accessToken: ctx.accessToken,
            };
            await saveManifest(fileId, manifest).catch(() => {});

            // 7. Replace temp ID with real fileId in queue and switch to uploading
            setUploadQueue((prev) =>
              prev.map((t) =>
                t.id === tempId
                  ? {
                      ...t,
                      id: fileId,
                      status: "uploading",
                      totalChunks: chunkCount,
                      completedChunks: 0,
                    }
                  : t,
              ),
            );

            // 8. Launch the worker
            runWorker(file, manifest, ctx, fileId);
          } catch (err: unknown) {
            const errMsg =
              err instanceof Error ? err.message : "Failed to start upload";
            setUploadQueue((prev) =>
              prev.map((t) =>
                t.id === tempId
                  ? { ...t, status: "error", errorMsg: errMsg }
                  : t,
              ),
            );
            toast.error(`${t("lacerta.uploadFailed", { defaultValue: "Upload failed:" })} ${file.name}`);
          }
        })();
      }
    },
    [runWorker, t],
  );

  // ---------------------------------------------------------------------------
  // resumeUpload — continue an interrupted upload
  // ---------------------------------------------------------------------------
  const resumeUpload = useCallback(
    (fileId: string, file: File, ctx: UploadContext) => {
      loadManifest(fileId)
        .then((manifest) => {
          if (!manifest) {
            toast.error("Resume failed: upload manifest not found");
            return;
          }

          // Update queue entry to uploading
          setUploadQueue((prev) =>
            prev.map((t) =>
              t.id === fileId
                ? {
                    ...t,
                    status: "uploading",
                    totalChunks: manifest.chunkCount,
                    completedChunks: manifest.completedParts.length,
                  }
                : t,
            ),
          );

          runWorker(file, manifest, ctx, fileId);
        })
        .catch(() => {
          toast.error("Resume failed: could not load manifest");
        });
    },
    [runWorker],
  );

  // ---------------------------------------------------------------------------
  // abortUpload — cancel an in-progress upload
  // ---------------------------------------------------------------------------
  const abortUpload = useCallback(async (fileId: string): Promise<void> => {
    // Tell the worker to stop
    const worker = workerMap.current.get(fileId);
    if (worker) {
      worker.postMessage({ type: "abort" });
      setTimeout(() => {
        worker.terminate();
        workerMap.current.delete(fileId);
      }, 200);
    }

    // Tell the backend to abort the S3 multipart upload
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    // We need the session token — retrieve it from the current queue task context
    // (the abort call will be made by the page which passes accessToken separately)
    try {
      const manifest = await loadManifest(fileId);
      await fetch(`${apiUrl}/files/lacerta/upload/${fileId}/abort`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${manifest?.accessToken ?? ""}`,
        },
      });
    } catch {
      // Best-effort; DB cleanup still proceeds
    }

    await deleteManifest(fileId).catch(() => {});
    setUploadQueue((prev) => prev.filter((t) => t.id !== fileId));
  }, []);

  return {
    uploadQueue,
    uploadFiles,
    resumeUpload,
    abortUpload,
    clearFinished,
    onFilesUploaded: onUploadedRef.current,
    setOnFilesUploaded,
  };
}
