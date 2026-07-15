import { RenderFileItem } from "@/components/rrComponents/lacerta/FileCard";

export type LacertaTab = "files" | "vault" | "shared" | "trash";

export interface UploadQueueTask {
  id: string;
  name: string;
  progress: number;
  status: "encrypting" | "uploading" | "completed" | "error";
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
