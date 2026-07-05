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
} from "lucide-react";
import FileCard, { RenderFileItem } from "./FileCard";

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
  onCreateDoc: (type: "doc" | "sheet" | "note" | "slide") => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSharedTab: boolean;
  onLockE2ee?: () => void;
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
  onLockE2ee,
}: FileGridProps): React.JSX.Element {
  const [search, setSearch] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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
      return !item.parentId || !items.some(p => p.id === item.parentId);
    }
    return item.parentId === currentFolderId;
  });

  // Apply search
  const filteredItems = currentItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Apply sort
  const sortedItems = [...filteredItems].sort((a, b) => {
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

  const handleCreateFolderPrompt = () => {
    const name = prompt("Enter folder name:");
    if (name && name.trim()) {
      onCreateFolder(name.trim());
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col p-6 min-h-0 relative select-none"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary m-6 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm z-50 pointer-events-none">
          <Upload className="h-12 w-12 text-primary animate-bounce mb-3" />
          <span className="text-sm font-bold text-foreground">
            Drop files to upload E2EE encrypted
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 shrink-0">
        {/* Left: Breadcrumbs & Back */}
        <div className="flex items-center gap-2">
          {currentFolderId && (
            <button
              onClick={() => onFolderChange(null)}
              className="p-1 border border-border hover:bg-muted/15 rounded-lg text-muted-foreground hover:text-foreground transition-all mr-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
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

        {/* Right: Search & Create Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-48 max-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted/5 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {onLockE2ee && (
            <button
              onClick={onLockE2ee}
              className="p-2 border border-border hover:bg-muted/10 text-muted-foreground hover:text-foreground rounded-lg transition-all"
              title="Lock Cryptographic Session"
            >
              <Key className="h-4 w-4" />
            </button>
          )}

          {!isSharedTab && (
            <div className="flex items-center gap-2">
              <button
                onClick={triggerUploadClick}
                className="p-2 border border-border hover:bg-muted/10 text-muted-foreground hover:text-foreground rounded-lg transition-all"
                title="Upload Files"
              >
                <Upload className="h-4 w-4" />
              </button>

              <div className="w-px h-6 bg-border mx-1" />

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsNewDropdownOpen(!isNewDropdownOpen)}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-98"
                >
                  <Plus className="h-4 w-4" />
                  New
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
                      <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
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
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Text File (.txt)
                    </button>
                    <button
                      onClick={() => {
                        setIsNewDropdownOpen(false);
                        onCreateDoc("doc");
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      Word Document (.odt)
                    </button>
                    <button
                      onClick={() => {
                        setIsNewDropdownOpen(false);
                        onCreateDoc("sheet");
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-500" />
                      Spreadsheet (.ods)
                    </button>
                    <button
                      onClick={() => {
                        setIsNewDropdownOpen(false);
                        onCreateDoc("slide");
                      }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-muted/10 text-foreground flex items-center gap-2 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      Presentation (.odp)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid Sorting Header */}
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

      {/* Main Files Scroll Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
        {sortedItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-border/60 rounded-2xl bg-card/5">
            <FolderClosed className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <span className="text-xs font-semibold text-muted-foreground">
              This folder is empty
            </span>
            <span className="text-[10px] text-muted-foreground/60 mt-1">
              Drag and drop files to upload E2EE encrypted.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                isSharedTab={isSharedTab}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
