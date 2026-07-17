"use client";

import React, { useState } from "react";
import {
  Folder,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  Video,
  File,
  MoreVertical,
  Share2,
  Trash2,
  Download,
  ArrowUpRight,
  Shield,
  ShieldAlert,
  RefreshCw,
  FolderClosed,
  Sparkles,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import UserProfileCard from "./UserProfileCard";
import RrLapplandDocument from "../rrImages/rrLapplandDocument";
import RrLapplandSpreadsheet from "../rrImages/rrLapplandSpreadsheet";
import RrLapplandPresentation from "../rrImages/rrLapplandPresentation";
import RrLapplandTextFile from "../rrImages/rrLapplandTextFile";
import RrLapplandCanvas from "../rrImages/rrLapplandCanvas";
import RrLapplandMermaid from "../rrImages/rrLapplandMermaid";
import RrLapplandUml from "../rrImages/rrLapplandUml";
import RrLapplandFolder from "../rrImages/rrLapplandFolder";
import RrLapplandPlaceholderFile from "../rrImages/rrLapplandPlaceholderFile";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SharedUser {
  id: string;
  username: string;
  email: string;
}

interface LaceraFileShare {
  id: string;
  userId: string;
  user: SharedUser;
  allowEdit?: boolean;
}

export interface RenderFileItem {
  id: string;
  key: string;
  name: string; // Decrypted
  size: number | null;
  type: string | null; // Decrypted
  isFolder: boolean;
  isTrash: boolean;
  isVault: boolean;
  isPublic: boolean;
  createdAt: string;
  userId: string;
  parentId: string | null;
  user: {
    id: string;
    username: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    createdAt?: string | Date;
  };
  shares: LaceraFileShare[];
  decryptedKey?: CryptoKey | null;
  rawFileKey?: string | null;
  wrappedKey?: string;
  /** null/undefined = single-block old format; N = chunked E2EE (N × 32 MiB parts) */
  chunkCount?: number | null;
}

interface FileCardProps {
  item: RenderFileItem;
  onOpen: (item: RenderFileItem) => void;
  onDownload: (item: RenderFileItem) => void;
  onShare: (item: RenderFileItem) => void;
  onToggleTrash: (item: RenderFileItem) => void;
  onToggleVault: (item: RenderFileItem) => void;
  onDelete: (item: RenderFileItem) => void;
  onSaveCopy?: (item: RenderFileItem) => void;
  isSharedTab: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  hasSelection?: boolean;
}

export default function FileCard({
  item,
  onOpen,
  onDownload,
  onShare,
  onToggleTrash,
  onToggleVault,
  onDelete,
  onSaveCopy,
  isSharedTab,
  isSelected = false,
  onToggleSelect,
  hasSelection = false,
}: FileCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = React.useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setMenuOpen(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 1000);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  };

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return "--";
    if (bytes === 0) return t("lacerta.fileCard.sizeBytesZero", "0 Bytes");
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getIcon = () => {
    if (item.isFolder) {
      return (
        <RrLapplandFolder className="h-24 w-24 text-amber-500 dark:text-amber-400" />
      );
    }
    const mime = item.type || "";
    if (mime.startsWith("image/"))
      return <ImageIcon className="h-18 w-18 text-sky-500" />;
    if (mime.startsWith("video/"))
      return <Video className="h-18 w-18 text-rose-500" />;

    const parts = item.name.split(".");
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";

    if (["xlsx", "xls", "ods", "csv"].includes(ext)) {
      return (
        <RrLapplandSpreadsheet className="h-24 w-24 text-green-600 dark:text-green-400" />
      );
    }
    if (["docx", "doc", "odt", "rtf"].includes(ext)) {
      return (
        <RrLapplandDocument className="h-24 w-24 text-blue-600 dark:text-blue-400" />
      );
    }
    if (["pptx", "ppt", "odp"].includes(ext)) {
      return (
        <RrLapplandPresentation className="h-24 w-24 text-orange-600 dark:text-orange-400" />
      );
    }
    if (
      [
        "txt",
        "md",
        "json",
        "js",
        "ts",
        "tsx",
        "jsx",
        "css",
        "html",
        "yaml",
        "yml",
        "ini",
        "conf",
        "log",
      ].includes(ext) ||
      mime.startsWith("text/")
    ) {
      return (
        <RrLapplandTextFile className="h-24 w-24 text-slate-600 dark:text-slate-300" />
      );
    }
    if (ext === "canvas") {
      return (
        <RrLapplandCanvas className="h-24 w-24 text-violet-600 dark:text-violet-400" />
      );
    }
    if (ext === "mermaid") {
      return (
        <RrLapplandMermaid className="h-24 w-24 text-teal-600 dark:text-teal-400" />
      );
    }
    if (ext === "uml") {
      return (
        <RrLapplandUml className="h-24 w-24 text-indigo-600 dark:text-indigo-400" />
      );
    }
    return (
      <RrLapplandPlaceholderFile className="h-24 w-24 text-slate-400 dark:text-slate-500" />
    );
  };

  return (
    <div
      onDoubleClick={() => onOpen(item)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest("button") ||
          (e.target as HTMLElement).closest(".popover-trigger") ||
          (e.target as HTMLElement).closest("[role='menuitem']") ||
          (e.target as HTMLElement).closest('[data-slot="checkbox"]')
        ) {
          return;
        }
        if (hasSelection) {
          onToggleSelect?.();
        } else {
          onOpen(item);
        }
      }}
      className={`group relative flex flex-col rounded-xl border overflow-hidden transition-all select-none cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] h-[164px] ${
        isSelected
          ? "border-primary bg-card/25 hover:bg-card/45 ring-1 ring-primary/30"
          : "border-border/60 bg-card/25 hover:bg-card/45"
      }`}
    >
      {/* Action Menu button (absolute positioned top-right) */}
      <div className="absolute top-1.5 right-1.5 z-10">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button className="p-1 bg-background/60 hover:bg-background/80 backdrop-blur-sm rounded-lg text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 shadow-sm shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-popover border-border w-40"
            side="right"
            align="start"
            sideOffset={8}
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
            >
              <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
              <span>{t("lacerta.fileCard.select", "Select")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuItem
              onClick={() => onOpen(item)}
              className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              {t("lacerta.fileCard.open", "Open")}
            </DropdownMenuItem>
            {isSharedTab && onSaveCopy && (
              <>
                <DropdownMenuItem
                  onClick={() => onSaveCopy(item)}
                  className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("lacerta.fileCard.saveCopy", "Save a Copy")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
              </>
            )}
            {!item.isFolder && (
              <DropdownMenuItem
                onClick={() => onDownload(item)}
                className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                {t("lacerta.fileCard.download", "Download")}
              </DropdownMenuItem>
            )}
            {!isSharedTab && (
              <>
                <DropdownMenuItem
                  onClick={() => onShare(item)}
                  className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {t("lacerta.fileCard.share", "Share")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => onToggleVault(item)}
                  className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
                >
                  <Shield className="h-3.5 w-3.5" />
                  {item.isVault ? t("lacerta.fileCard.removeVault", "Remove Vault") : t("lacerta.fileCard.moveToVault", "Move to Vault")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToggleTrash(item)}
                  className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {item.isTrash ? t("lacerta.fileCard.restore", "Restore") : t("lacerta.fileCard.sendTrash", "Send to Trash")}
                </DropdownMenuItem>
              </>
            )}
            {item.isTrash && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  className="cursor-pointer text-xs text-destructive focus:bg-destructive/10 focus:text-destructive font-semibold gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("lacerta.fileCard.deleteForever", "Delete Forever")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Top half: Icon Area */}
      <div className="flex-1 flex items-center justify-center bg-muted/10 group-hover:bg-muted/15 transition-all">
        {getIcon()}
      </div>

      {/* Thin colored bar underneath the icon section */}
      <div
        className={`h-[3px] w-full transition-colors ${
          isSelected ? "bg-primary" : "bg-border/30 group-hover:bg-border/60"
        }`}
      />

      {/* Bottom half: Details Area */}
      <div className="p-3 bg-card/65 flex flex-col gap-0.5 min-w-0 text-left">
        <span
          className="text-xs font-bold text-foreground truncate"
          title={item.name}
        >
          {item.name}
        </span>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 mt-0.5 w-full">
          <span>{item.isFolder ? t("lacerta.fileCard.folder", "Folder") : formatSize(item.size)}</span>
          <span className="truncate max-w-[80px] text-right">
            {isSharedTab && item.user ? (
              <UserProfileCard user={item.user}>
                @{item.user.username}
              </UserProfileCard>
            ) : (
              new Date(item.createdAt).toLocaleDateString()
            )}
          </span>
        </div>
      </div>

      {/* Shared/Public Badge Overlay (Positioned in the top-left corner) */}
      {(() => {
        const isPublic = item.isPublic;
        const isShared = item.shares && item.shares.length > 0;
        if (isPublic && isShared) {
          return (
            <div
              className="absolute top-2 left-2 z-10 p-1 rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400 shadow-sm"
              title={t("lacerta.fileCard.publicSharedFile", "Public & Shared File")}
            >
              <Share2 className="h-3 w-3" />
            </div>
          );
        }
        if (isPublic) {
          return (
            <div
              className="absolute top-2 left-2 z-10 p-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shadow-sm"
              title={t("lacerta.fileCard.publicFile", "Public File")}
            >
              <Share2 className="h-3 w-3" />
            </div>
          );
        }
        if (isShared) {
          return (
            <div
              className="absolute top-2 left-2 z-10 p-1 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 shadow-sm"
              title={t("lacerta.fileCard.sharedWithUsers", { defaultValue: "Shared with {{count}} users", count: item.shares.length })}
            >
              <Share2 className="h-3 w-3" />
            </div>
          );
        }
        return null;
      })()}

      {/* Secure Vault Badge Overlay */}
      {item.isVault && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            title={t("lacerta.fileCard.secureVaultStorage", "Secure Vault Storage")}
          >
            <Shield className="h-3 w-3" />
          </div>
        </div>
      )}
    </div>
  );
}
