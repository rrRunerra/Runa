"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  Plus,
  Upload,
  FolderPlus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FolderClosed,
  FileText,
  Grid3X3,
  ArrowLeft,
  Key,
  Sparkles,
  LayoutGrid,
  List,
  X,
  UserPlus,
  Download,
  Shield,
  Trash2,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import FileCard, { RenderFileItem } from "./FileCard";
import FileRow from "./FileRow";
import { Checkbox } from "@/components/ui/checkbox";
import RrLapplandDocument from "../rrImages/rrLapplandDocument";
import RrLapplandSpreadsheet from "../rrImages/rrLapplandSpreadsheet";
import RrLapplandPresentation from "../rrImages/rrLapplandPresentation";
import RrLapplandTextFile from "../rrImages/rrLapplandTextFile";
import RrLapplandCanvas from "../rrImages/rrLapplandCanvas";
import RrLapplandMermaid from "../rrImages/rrLapplandMermaid";
import RrLapplandUml from "../rrImages/rrLapplandUml";
import RrLapplandFolder from "../rrImages/rrLapplandFolder";

interface FileGridProps {
  items: RenderFileItem[];
  currentFolderId: string | null;
  onFolderChange: (id: string | null) => void;
  onOpen: (item: RenderFileItem) => void;
  onDownload: (item: RenderFileItem) => void;
  onShare: (item: RenderFileItem) => void;
  onToggleTrash: (item: RenderFileItem) => void;
  onToggleVault: (item: RenderFileItem) => void;
  onDelete: (item: RenderFileItem) => void;
  onCreateFolder: (name: string) => void;
  onCreateDoc: (
    type: "doc" | "sheet" | "note" | "slide" | "canvas" | "mermaid" | "uml",
  ) => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSharedTab: boolean;
  onLockEncryption?: () => void;
  onSaveCopy?: (item: RenderFileItem) => void;
}

type SortField = "name" | "date" | "size";
type SortOrder = "asc" | "desc";

export default function FileGrid({
  items,
  currentFolderId,
  onFolderChange,
  onOpen,
  onDownload,
  onShare,
  onToggleTrash,
  onToggleVault,
  onDelete,
  onCreateFolder,
  onCreateDoc,
  onUploadFile,
  isSharedTab,
  onLockEncryption,
  onSaveCopy,
}: FileGridProps): React.JSX.Element {
  const [search, setSearch] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] =
    useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] =
    useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("lacerta_view_mode");
      if (savedMode === "grid" || savedMode === "list") {
        setViewMode(savedMode);
      }
    }
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentFolderId]);

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("lacerta_view_mode", mode);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsNewDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Compute folder breadcrumbs
  const getBreadcrumbs = () => {
    const list: { id: string | null; name: string }[] = [
      { id: null, name: "Root" },
    ];
    let currentId = currentFolderId;

    // Follow parent relations to compile paths
    while (currentId) {
      const folder = items.find((i) => i.id === currentId);
      if (folder) {
        list.splice(1, 0, { id: folder.id, name: folder.name });
        currentId = folder.key.startsWith("folder-") ? null : null; // simplified lookup or stop
      } else {
        break;
      }
    }
    return list;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Mock triggering file input change
      const fakeEvent = {
        target: {
          files: e.dataTransfer.files,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onUploadFile(fakeEvent);
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Filter items in current folder
  const currentItems = items.filter((item) => {
    if (isSharedTab) {
      if (currentFolderId) {
        return item.parentId === currentFolderId;
      }
      // At the root of Shared tab, only show items whose parent folder is not in the list of shared items
      return !item.parentId || !items.some((p) => p.id === item.parentId);
    }
    return item.parentId === currentFolderId;
  });

  // Apply search
  const filteredItems = currentItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Apply sort (folders first, then files)
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;

    let comparison = 0;
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === "date") {
      comparison =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === "size") {
      comparison = (a.size || 0) - (b.size || 0);
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === sortedItems.length && sortedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map((i) => i.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Stats for the footer
  const folderCount = sortedItems.filter((i) => i.isFolder).length;
  const fileCount = sortedItems.filter((i) => !i.isFolder).length;
  const totalSize = sortedItems.reduce((acc, i) => acc + (i.size || 0), 0);

  const handleCreateFolderPrompt = () => {
    setNewFolderName("");
    setIsCreateFolderModalOpen(true);
  };

  const handleCreateFolderConfirm = () => {
    if (newFolderName && newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setIsCreateFolderModalOpen(false);
      setNewFolderName("");
    }
  };

  const selectedItem = () => {
    return items.find((i) => selectedIds.has(i.id));
  };

  const hasVaultSelected = () => {
    return items.some((i) => selectedIds.has(i.id) && i.isVault);
  };

  const hasTrashSelected = () => {
    return items.some((i) => selectedIds.has(i.id) && i.isTrash);
  };

  const handleBulkToggleVault = async () => {
    for (const id of Array.from(selectedIds)) {
      const item = items.find((i) => i.id === id);
      if (item) await onToggleVault(item);
    }
    setSelectedIds(new Set());
  };

  const handleBulkToggleTrash = async () => {
    for (const id of Array.from(selectedIds)) {
      const item = items.find((i) => i.id === id);
      if (item) await onToggleTrash(item);
    }
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const item = items.find((i) => i.id === id);
        if (item) {
          await onDelete(item);
        }
      }
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      console.error("Bulk deletion failed:", err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col p-3.5 sm:p-6 min-h-0 relative select-none"
    >
      {/* Floating Action Toolbar for Selection */}
      {selectedIds.size > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-neutral-950/95 border border-neutral-800 rounded-full shadow-2xl px-4 py-2 flex items-center gap-3.5 text-white animate-in slide-in-from-top-4 duration-200">
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1 hover:bg-neutral-800 rounded-full transition-all text-neutral-400 hover:text-white animate-in zoom-in duration-100"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>

          <span className="text-xs font-semibold text-neutral-200 shrink-0 border-r border-neutral-800 pr-3">
            {selectedIds.size} selected
          </span>

          <div className="flex items-center gap-1">
            {/* Quick Share (only if 1 item selected and not shared tab and not trash) */}
            {selectedIds.size === 1 &&
              !isSharedTab &&
              !selectedItem()?.isTrash && (
                <button
                  onClick={() => {
                    const item = selectedItem();
                    if (item) onShare(item);
                  }}
                  className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all"
                  title="Share"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              )}

            {/* Quick Download (only if 1 file selected and not folder) */}
            {selectedIds.size === 1 && !selectedItem()?.isFolder && (
              <button
                onClick={() => {
                  const item = selectedItem();
                  if (item) onDownload(item);
                }}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            )}

            {/* Move to Vault (only if not shared tab and not trash) */}
            {!isSharedTab && !hasTrashSelected() && (
              <button
                onClick={handleBulkToggleVault}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all"
                title={
                  hasVaultSelected() ? "Remove from Vault" : "Move to Vault"
                }
              >
                <Shield className="h-4 w-4" />
              </button>
            )}

            {/* Move to Trash / Restore */}
            <button
              onClick={handleBulkToggleTrash}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all"
              title={hasTrashSelected() ? "Restore items" : "Send to Trash"}
            >
              {hasTrashSelected() ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>

            {/* Delete Forever (only if items are already in trash) */}
            {hasTrashSelected() && (
              <button
                onClick={handleBulkDelete}
                className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
                title="Delete forever"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary m-6 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm z-50 pointer-events-none">
          <Upload className="h-12 w-12 text-primary animate-bounce mb-3" />
          <span className="text-sm font-bold text-foreground">
            Drop files to upload encrypted
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            Files are fully encrypted locally in browser.
          </span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onUploadFile}
        multiple
        className="hidden"
      />

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between mb-4 sm:mb-6 shrink-0">
        {/* Left: Breadcrumbs & Back */}
        {currentFolderId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFolderChange(null)}
              className="p-1 border border-border hover:bg-muted/15 rounded-lg text-muted-foreground hover:text-foreground transition-all mr-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id || "root"}>
                  {idx > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                  )}
                  <button
                    onClick={() => onFolderChange(crumb.id)}
                    className={`hover:text-foreground transition-all ${
                      idx === breadcrumbs.length - 1
                        ? "text-foreground font-bold"
                        : ""
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Right: Search & Create Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-48 max-w-[200px] min-w-[100px]">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted/5 border border-border rounded-lg pl-7 pr-2.5 py-1 sm:py-1.5 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Action buttons wrapper for mobile grouping */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-border/80 rounded-lg p-0.5 bg-muted/5 shrink-0">
              <button
                onClick={() => handleSetViewMode("grid")}
                className={`p-1 sm:p-1.5 rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
              <button
                onClick={() => handleSetViewMode("list")}
                className={`p-1 sm:p-1.5 rounded-md transition-all ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                }`}
                title="List View"
              >
                <List className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
            </div>

            {onLockEncryption && (
              <button
                onClick={onLockEncryption}
                className="p-1 sm:p-2 border border-border hover:bg-muted/10 text-muted-foreground hover:text-foreground rounded-lg transition-all"
                title="Lock Cryptographic Session"
              >
                <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}

            {!isSharedTab && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={triggerUploadClick}
                  className="p-1 sm:p-2 border border-border hover:bg-muted/10 text-muted-foreground hover:text-foreground rounded-lg transition-all"
                  title="Upload Files"
                >
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>

                <div className="w-px h-6 bg-border mx-0.5 sm:mx-1" />

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsNewDropdownOpen(!isNewDropdownOpen)}
                    className="p-1.5 sm:px-3.5 sm:py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1 transition-all shadow-md active:scale-98"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">New</span>
                  </button>

                  {isNewDropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                      <button
                        onClick={() => {
                          setIsNewDropdownOpen(false);
                          handleCreateFolderPrompt();
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                      >
                        <RrLapplandFolder className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                        New Folder
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        onClick={() => {
                          setIsNewDropdownOpen(false);
                          onCreateDoc("note");
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                      >
                        <RrLapplandTextFile className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                        Text File
                      </button>
                      <button
                        onClick={() => {
                          setIsNewDropdownOpen(false);
                          onCreateDoc("doc");
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                      >
                        <RrLapplandDocument className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Word Document
                      </button>
                      <button
                        onClick={() => {
                          setIsNewDropdownOpen(false);
                          onCreateDoc("sheet");
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                      >
                        <RrLapplandSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
                        Spreadsheet
                      </button>
                      <button
                        onClick={() => {
                          setIsNewDropdownOpen(false);
                          onCreateDoc("canvas");
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                      >
                        <RrLapplandCanvas className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        Spatial Canvas
                      </button>
                      <button
                        onClick={() => {
                          setIsNewDropdownOpen(false);
                          onCreateDoc("slide");
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                      >
                        <RrLapplandPresentation className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        Presentation
                      </button>
                      <button
                        onClick={() => {
                          setIsNewDropdownOpen(false);
                          onCreateDoc("mermaid");
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                      >
                        <RrLapplandMermaid className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        Mermaid Diagram
                      </button>
                      <button
                        onClick={() => {
                          setIsNewDropdownOpen(false);
                          onCreateDoc("uml");
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                      >
                        <RrLapplandUml className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        UML Diagram
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Sorting Header */}
      {viewMode === "grid" && (
        <div className="flex items-center justify-between px-4 py-2 border border-border/50 bg-muted/5 rounded-lg text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 shrink-0">
          <button
            onClick={() => toggleSort("name")}
            className="flex items-center gap-1 hover:text-foreground transition-all"
          >
            Name{" "}
            {sortField === "name" &&
              (sortOrder === "asc" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              ))}
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleSort("size")}
              className="flex items-center gap-1 hover:text-foreground transition-all"
            >
              Size{" "}
              {sortField === "size" &&
                (sortOrder === "asc" ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                ))}
            </button>
            <button
              onClick={() => toggleSort("date")}
              className="flex items-center gap-1 hover:text-foreground transition-all"
            >
              Date{" "}
              {sortField === "date" &&
                (sortOrder === "asc" ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                ))}
            </button>
          </div>
        </div>
      )}

      {/* Main Files Scroll Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
        {sortedItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-border/60 rounded-2xl bg-card/5">
            <RrLapplandFolder className="h-16 w-16 text-amber-500/40 dark:text-amber-400/30 mb-3" />
            <span className="text-xs font-semibold text-muted-foreground">
              This folder is empty
            </span>
            <span className="text-[10px] text-muted-foreground/60 mt-1">
              Drag and drop files to upload encrypted.
            </span>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3 sm:gap-4">
            {sortedItems.map((item) => (
              <FileCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                onDownload={onDownload}
                onShare={onShare}
                onToggleTrash={onToggleTrash}
                onToggleVault={onToggleVault}
                onDelete={onDelete}
                onSaveCopy={onSaveCopy}
                isSharedTab={isSharedTab}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={() => handleToggleSelect(item.id)}
                hasSelection={selectedIds.size > 0}
              />
            ))}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3 pl-4 w-12 align-middle">
                    <Checkbox
                      checked={
                        sortedItems.length > 0 &&
                        selectedIds.size === sortedItems.length
                      }
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="p-3 align-middle">
                    <button
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1 hover:text-foreground transition-all"
                    >
                      Name{" "}
                      {sortField === "name" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  </th>
                  <th className="p-3 align-middle w-16 text-right"></th>
                  <th className="p-3 align-middle w-24 hidden sm:table-cell">
                    <button
                      onClick={() => toggleSort("size")}
                      className="flex items-center gap-1 hover:text-foreground transition-all"
                    >
                      Size{" "}
                      {sortField === "size" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  </th>
                  <th className="p-3 align-middle w-32 hidden md:table-cell">
                    <button
                      onClick={() => toggleSort("date")}
                      className="flex items-center gap-1 hover:text-foreground transition-all"
                    >
                      {isSharedTab ? "Owner" : "Modified"}{" "}
                      {sortField === "date" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  </th>
                  <th className="p-3 pr-4 align-middle w-12 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <FileRow
                    key={item.id}
                    item={item}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={() => handleToggleSelect(item.id)}
                    onOpen={onOpen}
                    onDownload={onDownload}
                    onShare={onShare}
                    onToggleTrash={onToggleTrash}
                    onToggleVault={onToggleVault}
                    onDelete={onDelete}
                    onSaveCopy={onSaveCopy}
                    isSharedTab={isSharedTab}
                    hasSelection={selectedIds.size > 0}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer statistics bar */}
      {sortedItems.length > 0 && (
        <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-4 text-[11px] font-medium text-muted-foreground shrink-0 px-1">
          <div>
            {fileCount} {fileCount === 1 ? "file" : "files"} • {folderCount}{" "}
            {folderCount === 1 ? "folder" : "folders"}
          </div>
          <div>Total size: {formatSize(totalSize)}</div>
        </div>
      )}
      {/* Bulk delete confirmation modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-sm font-bold text-foreground mb-1">
              Delete Selected Items?
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              This will permanently delete the {selectedIds.size} selected item
              {selectedIds.size === 1 ? "" : "s"} forever.
            </p>
            <p className="text-xs text-destructive/80 mb-5 font-medium">
              This action is irreversible and all files will be removed from
              storage permanently.
            </p>
            <div className="flex justify-end items-center gap-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={isBulkDeleting}
                className="px-3.5 py-1.5 border border-border hover:bg-muted/10 rounded-lg text-xs font-semibold text-foreground transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                disabled={isBulkDeleting}
                className="px-3.5 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {isBulkDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-sm font-bold text-foreground mb-1">
              Create New Folder
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Enter a name for your new encrypted folder.
            </p>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full bg-muted/20 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary mb-5"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolderConfirm();
                } else if (e.key === "Escape") {
                  setIsCreateFolderModalOpen(false);
                }
              }}
            />
            <div className="flex justify-end items-center gap-2">
              <button
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="px-3.5 py-1.5 border border-border hover:bg-muted/10 rounded-lg text-xs font-semibold text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolderConfirm}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-all shadow-md active:scale-98"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
