import { RenderFileItem } from "@/components/rrComponents/lacerta/FileCard";

export type LacertaTab = "files" | "vault" | "shared" | "trash";

export interface UploadQueueTask {
  /** Stable file ID from the backend (used as IndexedDB key for resume) */
  id: string;
  name: string;
  /** 0-100 overall progress percentage */
  progress: number;
  status: "encrypting" | "uploading" | "paused" | "completed" | "error" | "resumable";
  /** Total number of 32 MiB chunks for this file */
  totalChunks?: number;
  /** Number of chunks successfully uploaded so far */
  completedChunks?: number;
  errorMsg?: string;
}

export interface RawFileItem {
  id: string;
  key: string;
  name: string;
  size: number | null;
  type: string | null;
  isFolder: boolean;
  isTrash: boolean;
  isVault: boolean;
  isPublic: boolean;
  createdAt: string;
  userId: string;
  parentId: string | null;
  wrappedKey?: string;
  /** null/undefined = single-block (old upload); N = chunked E2EE upload with N parts */
  chunkCount?: number | null;
  user: {
    id: string;
    username: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    createdAt?: string | Date;
  };
  shares?: {
    id: string;
    userId: string;
    wrappedKey?: string;
    allowEdit?: boolean;
    user: {
      id: string;
      username: string;
      email: string;
    };
  }[];
}

export type DecryptedFileItem = RenderFileItem;
