"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Session } from "next-auth";
import {
  ChevronsUpDown,
  Bookmark,
  Loader2,
  Pencil,
  Check,
  X,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import { useBookmarks } from "@/hooks/useBookmarks";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { rrApp, rrApps } from "../../../config/rrApps";
import { SidebarMenuButton, useSidebar } from "../ui/sidebar";
import Image from "next/image";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { hasPermission } from "@runa/permissions";
import { useTranslation } from "react-i18next";

export default function RrAppMenu({
  session,
}: {
  session: Session | null;
}): React.ReactNode {
  const { isMobile } = useSidebar();
  const { t } = useTranslation();

  const visibleApps = useMemo((): rrApp[] => {
    return rrApps.filter((app: rrApp): boolean => {
      if (!app.permissions || app.permissions.length === 0) return true;
      return hasPermission(session?.user?.permissions, app.permissions, "any");
    });
  }, [session]);

  const [activeApp, setActiveApp] = useState<rrApp>(rrApps[0]);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [appOrder, setAppOrder] = useState<string[]>([]);
  const [bookmarkOrder, setBookmarkOrder] = useState<string[]>([]);
  const [pendingDeletedBookmarkIds, setPendingDeletedBookmarkIds] = useState<
    string[]
  >([]);

  const initialAppOrderRef = useRef<string[]>([]);
  const initialBookmarkOrderRef = useRef<string[]>([]);

  const [draggedAppIndex, setDraggedAppIndex] = useState<number | null>(null);
  const [draggedBookmarkIndex, setDraggedBookmarkIndex] = useState<
    number | null
  >(null);

  // Touch / Pointer Dragging state
  const [pointerDragType, setPointerDragType] = useState<
    "app" | "bookmark" | null
  >(null);
  const [pointerDragIndex, setPointerDragIndex] = useState<number | null>(null);

  const { bookmarks, loading, deleteBookmark } = useBookmarks();

  // Load custom menu order from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedApps = localStorage.getItem("runa_app_order");
        if (savedApps) {
          setAppOrder(JSON.parse(savedApps));
        }
        const savedBookmarks = localStorage.getItem("runa_bookmark_order");
        if (savedBookmarks) {
          setBookmarkOrder(JSON.parse(savedBookmarks));
        }
      } catch (e) {
        console.error("Error loading menu order from localStorage", e);
      }
    }
  }, []);

  const saveAppOrder = (newOrder: string[]) => {
    setAppOrder(newOrder);
  };

  const saveBookmarkOrder = (newOrder: string[]) => {
    setBookmarkOrder(newOrder);
  };

  // Start editing mode: snapshot current order
  const startEditing = () => {
    initialAppOrderRef.current = [...appOrder];
    initialBookmarkOrderRef.current = [...bookmarkOrder];
    setPendingDeletedBookmarkIds([]);
    setIsEditing(true);
  };

  // Cancel editing mode: revert order and discard pending deletions
  const cancelEditing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAppOrder(initialAppOrderRef.current);
    setBookmarkOrder(initialBookmarkOrderRef.current);
    setPendingDeletedBookmarkIds([]);
    setIsEditing(false);
  };

  // Finish editing mode: commit app/bookmark order & execute pending deletions
  const finishEditing = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof window !== "undefined") {
      localStorage.setItem("runa_app_order", JSON.stringify(appOrder));
      localStorage.setItem("runa_bookmark_order", JSON.stringify(bookmarkOrder));
    }

    if (pendingDeletedBookmarkIds.length > 0 && deleteBookmark) {
      for (const id of pendingDeletedBookmarkIds) {
        await deleteBookmark(id);
      }
      toast.success(
        pendingDeletedBookmarkIds.length === 1
          ? "Bookmark deleted"
          : `${pendingDeletedBookmarkIds.length} bookmarks deleted`
      );
    }

    setPendingDeletedBookmarkIds([]);
    setIsEditing(false);
  };

  // Re-ordered apps
  const sortedApps = useMemo((): rrApp[] => {
    if (!appOrder || appOrder.length === 0) return visibleApps;
    const map = new Map(visibleApps.map((a) => [a.name, a]));
    const ordered: rrApp[] = [];
    appOrder.forEach((name) => {
      const app = map.get(name);
      if (app) {
        ordered.push(app);
        map.delete(name);
      }
    });
    map.forEach((app) => ordered.push(app));
    return ordered;
  }, [visibleApps, appOrder]);

  // Re-ordered and filtered (excluding pending deleted) bookmarks
  const sortedBookmarks = useMemo(() => {
    if (!bookmarks || bookmarks.length === 0) return [];
    const activeBookmarks = bookmarks.filter(
      (b) => !pendingDeletedBookmarkIds.includes(b.id)
    );
    if (!bookmarkOrder || bookmarkOrder.length === 0) return activeBookmarks;
    const map = new Map(activeBookmarks.map((b) => [b.id, b]));
    const ordered: typeof bookmarks = [];
    bookmarkOrder.forEach((id) => {
      const b = map.get(id);
      if (b) {
        ordered.push(b);
        map.delete(id);
      }
    });
    map.forEach((b) => ordered.push(b));
    return ordered;
  }, [bookmarks, bookmarkOrder, pendingDeletedBookmarkIds]);

  // Sync active app based on route
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const currentApp = rrApps.find((app: rrApp): boolean =>
        pathname.startsWith(app.href),
      );
      if (
        currentApp &&
        visibleApps.some((app: rrApp): boolean => app.href === currentApp.href)
      ) {
        setActiveApp(currentApp);
      } else if (visibleApps.length > 0) {
        setActiveApp(visibleApps[0]);
      }
    }
  }, [visibleApps, session]);

  // Live swap during HTML5 dragging
  const handleDragEnterApp = (targetIndex: number) => {
    if (draggedAppIndex === null || draggedAppIndex === targetIndex) return;
    const newApps = [...sortedApps];
    const [moved] = newApps.splice(draggedAppIndex, 1);
    newApps.splice(targetIndex, 0, moved);
    setDraggedAppIndex(targetIndex);
    saveAppOrder(newApps.map((a) => a.name));
  };

  const handleDragEnterBookmark = (targetIndex: number) => {
    if (draggedBookmarkIndex === null || draggedBookmarkIndex === targetIndex)
      return;
    const newBookmarks = [...sortedBookmarks];
    const [moved] = newBookmarks.splice(draggedBookmarkIndex, 1);
    newBookmarks.splice(targetIndex, 0, moved);
    setDraggedBookmarkIndex(targetIndex);
    saveBookmarkOrder(newBookmarks.map((b) => b.id));
  };

  // Pointer / Touch drag handlers
  const handlePointerDown = (
    e: React.PointerEvent,
    index: number,
    type: "app" | "bookmark",
  ) => {
    if (!isEditing) return;
    setPointerDragType(type);
    setPointerDragIndex(index);
    if (type === "app") {
      setDraggedAppIndex(index);
    } else {
      setDraggedBookmarkIndex(index);
    }
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (
    e: React.PointerEvent,
    type: "app" | "bookmark",
  ) => {
    if (!isEditing || pointerDragType !== type || pointerDragIndex === null)
      return;

    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;

    const itemElement = element.closest(`[data-drag-${type}-index]`);
    if (!itemElement) return;

    const targetIndex = Number(
      itemElement.getAttribute(`data-drag-${type}-index`),
    );
    if (isNaN(targetIndex) || targetIndex === pointerDragIndex) return;

    if (type === "app") {
      const newApps = [...sortedApps];
      const [moved] = newApps.splice(pointerDragIndex, 1);
      newApps.splice(targetIndex, 0, moved);
      setPointerDragIndex(targetIndex);
      setDraggedAppIndex(targetIndex);
      saveAppOrder(newApps.map((a) => a.name));
    } else {
      const newBookmarks = [...sortedBookmarks];
      const [moved] = newBookmarks.splice(pointerDragIndex, 1);
      newBookmarks.splice(targetIndex, 0, moved);
      setPointerDragIndex(targetIndex);
      setDraggedBookmarkIndex(targetIndex);
      saveBookmarkOrder(newBookmarks.map((b) => b.id));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerDragType) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setPointerDragType(null);
      setPointerDragIndex(null);
      setDraggedAppIndex(null);
      setDraggedBookmarkIndex(null);
    }
  };

  // Button move handlers
  const moveApp = (e: React.MouseEvent, index: number, direction: -1 | 1) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedApps.length) return;
    const newApps = [...sortedApps];
    const [moved] = newApps.splice(index, 1);
    newApps.splice(targetIndex, 0, moved);
    saveAppOrder(newApps.map((a) => a.name));
  };

  const moveBookmark = (
    e: React.MouseEvent,
    index: number,
    direction: -1 | 1,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedBookmarks.length) return;
    const newBookmarks = [...sortedBookmarks];
    const [moved] = newBookmarks.splice(index, 1);
    newBookmarks.splice(targetIndex, 0, moved);
    saveBookmarkOrder(newBookmarks.map((b) => b.id));
  };

  const handleDeleteBookmark = (
    e: React.MouseEvent,
    id: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setPendingDeletedBookmarkIds((prev) => [...prev, id]);
    setBookmarkOrder((prev) => prev.filter((bId) => bId !== id));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground "
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg shrink-0 overflow-hidden">
            {activeApp.iconRightNoRing ? (
              <Image
                src={activeApp.iconRightNoRing}
                width={32}
                height={32}
                className="size-full object-contain"
                alt={activeApp.name}
              />
            ) : (
              <span className="text-xs font-bold">{activeApp.name[0]}</span>
            )}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span
              className="truncate font-medium"
              style={{ color: activeApp.color }}
            >
              {activeApp.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {activeApp.descriptionShort}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg p-1.5"
        align="start"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
      >
        {/* Header with Title and Cancel / Done buttons */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {isEditing
              ? t("reorganize", { defaultValue: "Reorganize Menu" })
              : t("applications")}
          </span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cancelEditing}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-accent transition-colors"
              >
                <X className="size-3" />
                <span>{t("cancel", { defaultValue: "Cancel" })}</span>
              </button>
              <button
                type="button"
                onClick={finishEditing}
                className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 px-2 py-0.5 rounded-md hover:bg-emerald-500/10 transition-colors font-medium"
              >
                <Check className="size-3.5" />
                <span>{t("done", { defaultValue: "Done" })}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startEditing();
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-accent transition-colors"
            >
              <Pencil className="size-3" />
              <span>{t("edit", { defaultValue: "Edit" })}</span>
            </button>
          )}
        </div>

        {/* Applications List */}
        <div className="flex flex-col gap-1 max-h-46.25 overflow-y-auto no-scrollbar">
          {sortedApps.map((app: rrApp, index: number) => (
            <DropdownMenuItem
              key={app.name}
              data-drag-app-index={index}
              onClick={() => {
                if (!isEditing) setActiveApp(app);
              }}
              onSelect={(e) => {
                if (isEditing) e.preventDefault();
              }}
              draggable={isEditing}
              onDragStart={(e) => {
                if (!isEditing) return;
                e.dataTransfer.setData("text/plain", `${index}`);
                e.dataTransfer.effectAllowed = "move";
                setDraggedAppIndex(index);
              }}
              onDragEnter={(e) => {
                if (isEditing) {
                  e.preventDefault();
                  handleDragEnterApp(index);
                }
              }}
              onDragOver={(e) => {
                if (isEditing) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDragEnd={() => {
                setDraggedAppIndex(null);
              }}
              className={`gap-2 p-2 rounded-md select-none transition-all ${
                isEditing
                  ? "cursor-grab active:cursor-grabbing hover:bg-accent/60 touch-none"
                  : ""
              } ${draggedAppIndex === index ? "opacity-40 bg-accent/80 scale-[0.98]" : ""}`}
              asChild
            >
              <Link
                href={app.href}
                onClick={(e) => {
                  if (isEditing) e.preventDefault();
                }}
              >
                {isEditing && (
                  <div
                    className="flex items-center gap-0.5 shrink-0 touch-none cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => handlePointerDown(e, index, "app")}
                    onPointerMove={(e) => handlePointerMove(e, "app")}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    <GripVertical className="size-4 text-muted-foreground/50 cursor-grab" />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => moveApp(e, index, -1)}
                        className="hover:bg-accent rounded p-0.5 disabled:opacity-30 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === sortedApps.length - 1}
                        onClick={(e) => moveApp(e, index, 1)}
                        className="hover:bg-accent rounded p-0.5 disabled:opacity-30 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown className="size-3" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex size-6 items-center justify-center shrink-0 overflow-hidden">
                  {app.iconLeftRing ? (
                    <Image
                      src={app.iconLeftRing}
                      width={24}
                      height={24}
                      className="size-full object-contain shrink-0"
                      alt={app.name}
                    />
                  ) : (
                    <span className="text-[10px] font-bold">{app.name[0]}</span>
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <span
                    className="truncate font-medium mr-2"
                    style={{ color: app.color }}
                  >
                    {app.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {app.descriptionShort}
                  </span>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>

        {/* Bookmarks Section */}
        {session && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
              {t("bookmarks")}
            </DropdownMenuLabel>

            {loading ? (
              <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                {t("loadingBookmarks")}
              </div>
            ) : !sortedBookmarks || sortedBookmarks.length === 0 ? (
              <div className="text-center py-4 px-2 text-xs text-muted-foreground/50 border border-dashed rounded-md m-2">
                {t("noBookmarksSaved")}
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto no-scrollbar">
                {sortedBookmarks.map((bookmark, index: number) => (
                  <DropdownMenuItem
                    key={bookmark.id || bookmark.name}
                    data-drag-bookmark-index={index}
                    className={`gap-2 p-2 rounded-md select-none transition-all ${
                      isEditing
                        ? "cursor-grab active:cursor-grabbing hover:bg-accent/60 touch-none"
                        : ""
                    } ${draggedBookmarkIndex === index ? "opacity-40 bg-accent/80 scale-[0.98]" : ""}`}
                    onSelect={(e) => {
                      if (isEditing) e.preventDefault();
                    }}
                    draggable={isEditing}
                    onDragStart={(e) => {
                      if (!isEditing) return;
                      e.dataTransfer.setData("text/plain", `${index}`);
                      e.dataTransfer.effectAllowed = "move";
                      setDraggedBookmarkIndex(index);
                    }}
                    onDragEnter={(e) => {
                      if (isEditing) {
                        e.preventDefault();
                        handleDragEnterBookmark(index);
                      }
                    }}
                    onDragOver={(e) => {
                      if (isEditing) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDragEnd={() => {
                      setDraggedBookmarkIndex(null);
                    }}
                    asChild
                  >
                    <Link
                      href={bookmark.redirect}
                      onClick={(e) => {
                        if (isEditing) e.preventDefault();
                      }}
                    >
                      {isEditing && (
                        <div
                          className="flex items-center gap-0.5 shrink-0 touch-none cursor-grab active:cursor-grabbing"
                          onPointerDown={(e) =>
                            handlePointerDown(e, index, "bookmark")
                          }
                          onPointerMove={(e) =>
                            handlePointerMove(e, "bookmark")
                          }
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                        >
                          <GripVertical className="size-4 text-muted-foreground/50 cursor-grab" />
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={(e) => moveBookmark(e, index, -1)}
                              className="hover:bg-accent rounded p-0.5 disabled:opacity-30 text-muted-foreground hover:text-foreground"
                            >
                              <ChevronUp className="size-3" />
                            </button>
                            <button
                              type="button"
                              disabled={index === sortedBookmarks.length - 1}
                              onClick={(e) => moveBookmark(e, index, 1)}
                              className="hover:bg-accent rounded p-0.5 disabled:opacity-30 text-muted-foreground hover:text-foreground"
                            >
                              <ChevronDown className="size-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex size-6 items-center justify-center rounded-md border shrink-0">
                        {bookmark.icon ? (
                          <img
                            src={getSafeImageUrl(bookmark.icon)}
                            className="size-4 object-contain"
                            alt=""
                          />
                        ) : (
                          <Bookmark className="size-3.5 shrink-0" />
                        )}
                      </div>
                      <span className="truncate flex-1">{bookmark.name}</span>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={(e) =>
                            handleDeleteBookmark(e, bookmark.id)
                          }
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          title="Delete bookmark"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
