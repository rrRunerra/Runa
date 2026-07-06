"use client";

import React, { useState } from "react";
import { Folder, FileText, Grid3X3, Image as ImageIcon, Video, File, MoreVertical, Share2, Trash2, Download, ArrowUpRight, Shield, ShieldAlert, RefreshCw, FolderClosed, Sparkles, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import UserProfileCard from "./UserProfileCard";

interface SharedUser {
  id: string;
  username: string;
  email: string;
}

interface LaceraFileShare {
  id: string;
  userId: string;
  user: SharedUser;
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
}: FileCardProps): React.JSX.Element {
  const formatSize = (bytes: number | null) => {
    if (bytes === null) return "--";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getIcon = () => {
    if (item.isFolder) return <FolderClosed className="h-10 w-10 text-amber-500 fill-amber-500/10" />;
    const mime = item.type || "";
    if (mime.startsWith("image/")) return <ImageIcon className="h-10 w-10 text-sky-500" />;
    if (mime.startsWith("video/")) return <Video className="h-10 w-10 text-rose-500" />;
    if (mime.includes("spreadsheet") || mime.includes("csv")) return <Grid3X3 className="h-10 w-10 text-emerald-500" />;
    if (mime.includes("document") || mime.includes("word") || mime.includes("odt")) return <FileText className="h-10 w-10 text-indigo-500" />;
    if (mime.includes("mermaid") || item.name.endsWith(".mermaid")) return <Sparkles className="h-10 w-10 text-pink-500" />;
    if (mime.includes("uml") || item.name.endsWith(".uml")) return <Sparkles className="h-10 w-10 text-purple-500" />;
    return <File className="h-10 w-10 text-slate-400" />;
  };

  return (
    <div
      onDoubleClick={() => onOpen(item)}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest("button") ||
          (e.target as HTMLElement).closest(".popover-trigger") ||
          (e.target as HTMLElement).closest("[role='menuitem']")
        ) {
          return;
        }
        onToggleSelect?.();
      }}
      className={`group relative flex flex-col p-4 rounded-xl border transition-all select-none cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] ${
        isSelected
          ? "border-primary bg-primary/10 hover:bg-primary/15"
          : "border-border/80 bg-card/30 hover:bg-card/60"
      }`}
    >
      {/* Top Details & Context Action */}
      <div className="flex items-start justify-between">
        <div className="p-2 bg-muted/10 rounded-lg border border-border/40 shrink-0">
          {getIcon()}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-muted/25 rounded text-muted-foreground hover:text-foreground transition-all shrink-0">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border w-40" align="end">
            <DropdownMenuItem onClick={() => onOpen(item)} className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Open
            </DropdownMenuItem>
            {isSharedTab && onSaveCopy && (
              <>
                <DropdownMenuItem onClick={() => onSaveCopy(item)} className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2">
                  <Copy className="h-3.5 w-3.5" />
                  Save a Copy
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
              </>
            )}
            {!item.isFolder && (
              <DropdownMenuItem onClick={() => onDownload(item)} className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2">
                <Download className="h-3.5 w-3.5" />
                Download
              </DropdownMenuItem>
            )}
            {!isSharedTab && (
              <>
                <DropdownMenuItem onClick={() => onShare(item)} className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2">
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={() => onToggleVault(item)} className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  {item.isVault ? "Remove Vault" : "Move to Vault"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleTrash(item)} className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  {item.isTrash ? "Restore" : "Send to Trash"}
                </DropdownMenuItem>
              </>
            )}
            {item.isTrash && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={() => onDelete(item)} className="cursor-pointer text-xs text-destructive focus:bg-destructive/10 focus:text-destructive font-semibold gap-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Forever
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title & Info */}
      <div className="mt-4 flex flex-col min-w-0">
        <span className="text-xs font-bold text-foreground truncate" title={item.name}>
          {item.name}
        </span>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{item.isFolder ? "Folder" : formatSize(item.size)}</span>
          <span className="truncate max-w-[80px]">
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

      {/* Share/Lock Badge Overlay */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.shares && item.shares.length > 0 && (
          <div className="p-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" title={`Shared with ${item.shares.length} users`}>
            <Share2 className="h-3 w-3" />
          </div>
        )}
        {item.isVault && (
          <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" title="Secure Vault Storage">
            <Shield className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
