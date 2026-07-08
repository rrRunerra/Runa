"use client";

import React from "react";
import {
  FolderClosed,
  Image as ImageIcon,
  Video,
  Grid3X3,
  FileText,
  Sparkles,
  File,
  MoreVertical,
  ArrowUpRight,
  Download,
  Share2,
  Shield,
  Trash2,
  UserPlus,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { RenderFileItem } from "./FileCard";
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

interface FileRowProps {
  item: RenderFileItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: (item: RenderFileItem) => void;
  onDownload: (item: RenderFileItem) => void;
  onShare: (item: RenderFileItem) => void;
  onToggleTrash: (item: RenderFileItem) => void;
  onToggleVault: (item: RenderFileItem) => void;
  onDelete: (item: RenderFileItem) => void;
  onSaveCopy?: (item: RenderFileItem) => void;
  isSharedTab: boolean;
}

export default function FileRow({
  item,
  isSelected,
  onToggleSelect,
  onOpen,
  onDownload,
  onShare,
  onToggleTrash,
  onToggleVault,
  onDelete,
  onSaveCopy,
  isSharedTab,
}: FileRowProps): React.JSX.Element {
  const formatSize = (bytes: number | null) => {
    if (bytes === null) return "--";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getIcon = () => {
    if (item.isFolder) {
      return (
        <RrLapplandFolder className="h-7 w-7 text-amber-500 dark:text-amber-400" />
      );
    }
    const mime = item.type || "";
    if (mime.startsWith("image/"))
      return <ImageIcon className="h-5 w-5 text-sky-500" />;
    if (mime.startsWith("video/"))
      return <Video className="h-5 w-5 text-rose-500" />;

    const parts = item.name.split(".");
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";

    if (["xlsx", "xls", "ods", "csv"].includes(ext)) {
      return (
        <RrLapplandSpreadsheet className="h-7 w-7 text-green-600 dark:text-green-400" />
      );
    }
    if (["docx", "doc", "odt", "rtf"].includes(ext)) {
      return (
        <RrLapplandDocument className="h-7 w-7 text-blue-600 dark:text-blue-400" />
      );
    }
    if (["pptx", "ppt", "odp"].includes(ext)) {
      return (
        <RrLapplandPresentation className="h-7 w-7 text-orange-600 dark:text-orange-400" />
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
        <RrLapplandTextFile className="h-7 w-7 text-slate-600 dark:text-slate-300" />
      );
    }
    if (ext === "canvas") {
      return (
        <RrLapplandCanvas className="h-7 w-7 text-violet-600 dark:text-violet-400" />
      );
    }
    if (ext === "mermaid") {
      return (
        <RrLapplandMermaid className="h-7 w-7 text-teal-600 dark:text-teal-400" />
      );
    }
    if (ext === "uml") {
      return (
        <RrLapplandUml className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
      );
    }
    return (
      <RrLapplandPlaceholderFile className="h-7 w-7 text-slate-400 dark:text-slate-500" />
    );
  };

  return (
    <tr
      onDoubleClick={() => onOpen(item)}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest("button") ||
          (e.target as HTMLElement).closest(".popover-trigger") ||
          (e.target as HTMLElement).closest("[role='menuitem']") ||
          (e.target as HTMLElement).closest(".checkbox") ||
          (e.target as HTMLElement).closest("a")
        ) {
          return;
        }
        onToggleSelect();
      }}
      className={`group border-b border-border/40 hover:bg-muted/10 transition-colors select-none cursor-pointer text-xs ${
        isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
      }`}
    >
      {/* Checkbox Column */}
      <td className="p-3 pl-4 w-12 align-middle">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
        </div>
      </td>

      {/* Name / Icon Column */}
      <td className="p-3 font-semibold text-foreground align-middle max-w-[200px] sm:max-w-[300px]">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-muted/10 rounded border border-border/40 shrink-0">
            {getIcon()}
          </div>
          <span className="truncate" title={item.name}>
            {item.name}
          </span>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {item.shares && item.shares.length > 0 && (
              <div
                className="p-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                title={`Shared with ${item.shares.length} users`}
              >
                <Share2 className="h-3 w-3" />
              </div>
            )}
            {item.isVault && (
              <div
                className="p-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                title="Secure Vault Storage"
              >
                <Shield className="h-3 w-3" />
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Sharing Actions Inline Column */}
      <td className="p-3 align-middle text-right w-16">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isSharedTab && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(item);
              }}
              className="p-1.5 hover:bg-muted/25 rounded-md text-sky-500 hover:text-sky-600 transition-all shrink-0"
              title="Share File"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>

      {/* Size Column */}
      <td className="p-3 text-muted-foreground align-middle w-24 hidden sm:table-cell">
        {item.isFolder ? "--" : formatSize(item.size)}
      </td>

      {/* Modified Date Column */}
      <td className="p-3 text-muted-foreground align-middle w-32 hidden md:table-cell">
        {isSharedTab && item.user ? (
          <UserProfileCard user={item.user}>
            @{item.user.username}
          </UserProfileCard>
        ) : (
          new Date(item.createdAt).toLocaleDateString()
        )}
      </td>

      {/* Actions (Three-Dots Dropdown) Column */}
      <td className="p-3 pr-4 align-middle text-right w-12">
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-muted/25 rounded text-muted-foreground hover:text-foreground transition-all shrink-0">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="bg-popover border-border w-40"
              align="end"
            >
              <DropdownMenuItem
                onClick={() => onOpen(item)}
                className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Open
              </DropdownMenuItem>
              {isSharedTab && onSaveCopy && (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={() => onSaveCopy(item)}
                    className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Save a Copy
                  </DropdownMenuItem>
                </>
              )}
              {!item.isFolder && (
                <DropdownMenuItem
                  onClick={() => onDownload(item)}
                  className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </DropdownMenuItem>
              )}
              {!isSharedTab && (
                <>
                  <DropdownMenuItem
                    onClick={() => onShare(item)}
                    className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={() => onToggleVault(item)}
                    className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {item.isVault ? "Remove Vault" : "Move to Vault"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onToggleTrash(item)}
                    className="cursor-pointer text-xs focus:bg-accent font-semibold gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {item.isTrash ? "Restore" : "Send to Trash"}
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
                    Delete Forever
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
