"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo, useRef } from "react";
import { Plus, Play, BookOpen, Tv, Film, Loader2, Menu, Gamepad2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimeEditDialog } from "@/components/aquila/AnimeEditDialog";
import { MangaEditDialog } from "@/components/aquila/MangaEditDialog";
import { TvEditDialog } from "@/components/aquila/TvEditDialog";
import { MovieEditDialog } from "@/components/aquila/MovieEditDialog";
import { GameEditDialog } from "@/components/aquila/GameEditDialog";
import { BookEditDialog } from "@/components/aquila/BookEditDialog";
import { MediaItem, MediaSectionProps } from "@/types/aquila";
import { AnimatePresence, motion } from "framer-motion";

export type CategoryType = "anime" | "manga" | "tv" | "movie" | "game" | "book";

const DEFAULT_ORDER: CategoryType[] = ["anime", "manga", "tv", "movie", "game", "book"];

const getProgressIcon = (type: string) => {
  switch (type) {
    case "anime":
    case "tv":
      return <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
    case "manga":
    case "book":
      return <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
    case "game":
      return <Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
    case "movie":
      return <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
    default:
      return <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
  }
};

const CATEGORY_CONFIG: Record<
  CategoryType,
  { title: string; icon: React.JSX.Element }
> = {
  anime: { title: "Anime", icon: <Play className="w-5 h-5" /> },
  manga: { title: "Manga", icon: <BookOpen className="w-5 h-5" /> },
  tv: { title: "TV Shows", icon: <Tv className="w-5 h-5" /> },
  movie: { title: "Movies", icon: <Film className="w-5 h-5" /> },
  game: { title: "Games", icon: <Gamepad2 className="w-5 h-5" /> },
  book: { title: "Books", icon: <BookOpen className="w-5 h-5" /> },
};

export default function AquilaHome(): React.JSX.Element {
  const { data: session, status } = useSession();
  const [watching, setWatching] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [categoryOrder, setCategoryOrder] = useState<CategoryType[]>(DEFAULT_ORDER);
  const [draggedCategory, setDraggedCategory] = useState<CategoryType | null>(null);
  const [dragAllowedCategory, setDragAllowedCategory] = useState<CategoryType | null>(null);

  const handleDragStart = (e: React.DragEvent, category: CategoryType) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", category);
    setDraggedCategory(category);
  };

  const handleDragEnter = (e: React.DragEvent, targetCategory: CategoryType) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory === targetCategory) return;

    setCategoryOrder((prev) => {
      const newOrder = [...prev];
      const draggedIdx = newOrder.indexOf(draggedCategory);
      const targetIdx = newOrder.indexOf(targetCategory);
      if (draggedIdx !== -1 && targetIdx !== -1) {
        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedCategory);
      }
      return newOrder;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    if (draggedCategory) {
      localStorage.setItem("aquila_category_order", JSON.stringify(categoryOrder));
    }
    setDraggedCategory(null);
    setDragAllowedCategory(null);
  };

  const pendingIncrementsRef = useRef<
    Record<
      string,
      {
        count: number;
        originalProgress: number;
        timeoutId: NodeJS.Timeout | null;
      }
    >
  >({});

  const fetchWatching = async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/watching`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setWatching(data);
      }
    } catch (e) {
      console.error("Failed to fetch watching list", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatching();
  }, [status]);

  useEffect(() => {
    const savedOrder = localStorage.getItem("aquila_category_order");
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as CategoryType[];
        const validCategories = ["anime", "manga", "tv", "movie", "game", "book"];
        if (
          Array.isArray(parsed) &&
          parsed.every((cat) => validCategories.includes(cat))
        ) {
          const missing = validCategories.filter(
            (cat) => !parsed.includes(cat as CategoryType),
          );
          setCategoryOrder([...parsed, ...missing] as CategoryType[]);
        }
      } catch (e) {
        console.error("Failed to parse category order from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    document.title = "Aquila > Home";
    return () => {
      // Clear any pending debounced API calls on unmount
      Object.values(pendingIncrementsRef.current).forEach((pending) => {
        if (pending.timeoutId) {
          clearTimeout(pending.timeoutId);
        }
      });
    };
  }, []);

  const handleIncrement = async (item: MediaItem) => {
    if (status !== "authenticated") return;

    const mediaType = item.type;
    const key = `${mediaType}-${item.id}`;

    if (updatingId === key) return;

    // Optimistic Update
    setWatching((prev) =>
      prev.map((i) => {
        if (i.id === item.id && i.format === item.format) {
          return { ...i, progress: (i.progress || 0) + 1 };
        }
        return i;
      }),
    );

    if (!pendingIncrementsRef.current[key]) {
      pendingIncrementsRef.current[key] = {
        count: 0,
        originalProgress: item.progress || 0,
        timeoutId: null,
      };
    }

    const pending = pendingIncrementsRef.current[key];
    pending.count += 1;

    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }

    pending.timeoutId = setTimeout(async () => {
      const { count, originalProgress } = pending;
      delete pendingIncrementsRef.current[key];
      setUpdatingId(key);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/list/increment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.accessToken}`,
            },
            body: JSON.stringify({ mediaType, id: item.id, count }),
          },
        );

        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            toast.success(`Progress updated for ${item.title}`);
            fetchWatching();
          } else {
            toast.error(result.message);
            setWatching((prev) =>
              prev.map((i) => {
                if (i.id === item.id && i.format === item.format) {
                  return { ...i, progress: originalProgress };
                }
                return i;
              }),
            );
          }
        } else {
          toast.error("Failed to update progress");
          setWatching((prev) =>
            prev.map((i) => {
              if (i.id === item.id && i.format === item.format) {
                return { ...i, progress: originalProgress };
              }
              return i;
            }),
          );
        }
      } catch (e) {
        toast.error("An error occurred");
        setWatching((prev) =>
          prev.map((i) => {
            if (i.id === item.id && i.format === item.format) {
              return { ...i, progress: originalProgress };
            }
            return i;
          }),
        );
      } finally {
        setUpdatingId(null);
      }
    }, 3000);
  };

  const sections = useMemo<Record<CategoryType, MediaItem[]>>(() => {
    const anime = watching.filter((i) => i.type === "anime");
    const manga = watching.filter((i) => i.type === "manga");
    const tv = watching.filter((i) => i.type === "tv");
    const movie = watching.filter((i) => i.type === "movie");
    const game = watching.filter((i) => i.type === "game");
    const book = watching.filter((i) => i.type === "book");
    return { anime, manga, tv, movie, game, book };
  }, [watching]);

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Aquila</h1>
        <p className="text-muted-foreground text-lg max-w-md text-center">
          Track your favorite anime, manga, movies and more in one place.
        </p>
        <Button size="lg" asChild>
          <Link href="/auth/login">Get Started</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex-1 w-full min-h-[calc(100vh-4rem)] flex flex-col overflow-x-hidden">
      {/* Background Image Wallpaper */}
      <img
        src="/lappland3.png"
        alt="Lappland Background Wallpaper"
        className="fixed inset-0 w-full h-full object-cover object-right grayscale contrast-115 brightness-75 pointer-events-none z-0"
      />

      {/* Readability Overlay Gradient */}
      <div className="fixed inset-0 bg-linear-to-r from-black/85 via-black/50 to-transparent sm:from-black/55 sm:via-transparent pointer-events-none z-0" />

      {/* Main Content Pane */}
      <div className="relative z-10 flex-1 flex flex-col">
        {watching.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center sm:items-start text-center sm:text-left px-8 sm:px-16 md:px-24 lg:px-32 xl:px-40 py-12 select-none relative z-10">
            <div className="space-y-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
              <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-widest text-zinc-400/40 sm:text-zinc-500/20 mix-blend-overlay uppercase select-none font-sans leading-none">
                Nothing<br />Here
              </h2>
              <p className="text-zinc-300/60 sm:text-zinc-500/40 text-xs uppercase tracking-widest leading-relaxed max-w-xs select-none pt-4 sm:pt-6">
                It looks like your watch list is empty. Start browsing to find and track your favorite media.
              </p>
              
              <div className="pt-6 sm:pt-8">
                <Button 
                  variant="outline" 
                  className="px-6 py-5 text-[10px] tracking-widest uppercase font-bold rounded-xl border border-zinc-700/60 sm:border-zinc-800/40 bg-zinc-950/40 sm:bg-zinc-950/10 hover:bg-zinc-900/30 hover:border-zinc-700/50 hover:text-neutral-200 transition-all duration-300 w-fit shrink-0 cursor-pointer shadow-sm text-zinc-300 sm:text-zinc-500" 
                  asChild
                >
                  <Link href="/aquila/browse">Browse Media</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12 pb-20 px-4 md:px-8 mt-4">
            {categoryOrder.map((category) => {
              const items = sections[category];
              if (!items || items.length === 0) return null;

              const config = CATEGORY_CONFIG[category];

              return (
                <div
                  key={category}
                  draggable={dragAllowedCategory === category}
                  onDragStart={(e) => handleDragStart(e, category)}
                  onDragEnter={(e) => handleDragEnter(e, category)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "transition-all duration-300 rounded-3xl p-3 -m-3 border border-transparent",
                    draggedCategory === category && "opacity-30 border-2 border-dashed border-primary/40 bg-primary/2 scale-[0.98] shadow-lg backdrop-blur-xs",
                  )}
                >
                  <MediaSection
                    title={config.title}
                    icon={config.icon}
                    items={items}
                    onIncrement={handleIncrement}
                    updatingId={updatingId}
                    onRefresh={fetchWatching}
                    dragHandleProps={{
                      onMouseDown: () => setDragAllowedCategory(category),
                      onMouseUp: () => setDragAllowedCategory(null),
                      onMouseLeave: () => setDragAllowedCategory(null),
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image source credit */}
      <div className="relative self-end mt-auto pb-4 pr-6 z-20">
        <a
          href="https://www.wallpaperflare.com/arknights-lappland-arknights-meng-ziya-wallpaper-yttpm"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-neutral-400/60 hover:text-neutral-200 transition-colors duration-200 underline underline-offset-2"
        >
          Artwork by Meng Ziya (Modified)
        </a>
      </div>
    </div>
  );
}



function MediaSection({
  title,
  icon,
  items,
  onIncrement,
  updatingId,
  onRefresh,
  dragHandleProps,
}: MediaSectionProps): React.JSX.Element {
  const localStorageKey = `aquila_collapsed_${title.toLowerCase()}`;
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(localStorageKey) === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem(localStorageKey, String(nextState));
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 pb-4 group/header">
        <div
          {...(dragHandleProps || {})}
          className={cn(
            "p-2 bg-primary/10 rounded-lg text-primary select-none",
            dragHandleProps && "cursor-grab active:cursor-grabbing hover:bg-primary/20 active:bg-primary/30 transition-all duration-200 pointer-events-auto"
          )}
          title={dragHandleProps ? "Drag icon to reorder" : undefined}
        >
          {icon}
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <button onClick={toggleCollapse} className="cursor-pointer select-none">
          <Badge
            variant={isCollapsed ? "outline" : "secondary"}
            className={cn(
              "ml-2 transition-all duration-300 flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold py-0.5 px-2.5 rounded-full select-none cursor-pointer",
              isCollapsed 
                ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-dashed border-red-500/40 shadow-xs" 
                : "bg-primary/5 hover:bg-primary/15 text-primary border border-primary/10 shadow-inner"
            )}
          >
            {isCollapsed ? (
              <>
                <EyeOff className="w-3.5 h-3.5 animate-pulse" />
                <span>{items.length} hidden</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>{items.length} items</span>
              </>
            )}
          </Badge>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] pb-1">
              {items.map((item: MediaItem) => (
                <MediaCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onIncrement={() => onIncrement(item)}
                  isUpdating={updatingId === `${item.type}-${item.id}`}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function MediaCard({
  item,
  onIncrement,
  isUpdating,
  onRefresh,
}: {
  item: MediaItem;
  onIncrement: () => void;
  isUpdating: boolean;
  onRefresh: () => void;
}): React.JSX.Element {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const mediaType = item.type;
  const href = `/aquila/${mediaType === "manga"
      ? "manga"
      : mediaType === "tv"
        ? "tv"
        : mediaType === "movie"
          ? "movies"
          : mediaType === "game"
            ? "games"
            : mediaType === "book"
              ? "books"
              : "anime"
    }/${item.id}`;

  // Shared media shape for all dialogs
  const dialogMedia = {
    id: item.id.toString(),
    title: { romaji: item.title },
    coverImage: { large: item.image },
  };

  return (
    <>
      <Link
        href={href}
        className="group relative aspect-2/3 rounded-xl overflow-hidden border border-white/5 bg-card shadow-md transition-all duration-300 ease-out hover:-translate-y-1 lg:hover:scale-[1.03] lg:hover:shadow-xl lg:hover:shadow-purple-500/5 hover:border-white/10 cursor-pointer block"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out lg:group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/45 to-transparent z-15 opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        {/* Edit Button */}
        <div className="absolute top-2 right-2 z-30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 lg:group-hover:scale-100 scale-95">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-black/45 hover:bg-black/60 border border-white/10 hover:border-primary/30 text-white/90 hover:text-white backdrop-blur-md transition-all cursor-pointer pointer-events-auto flex items-center justify-center p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditDialogOpen(true);
            }}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20 z-10 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-700 shadow-[0_0_8px_rgba(var(--primary),0.5)]"
            style={{
              width: `${item.episodes ? (item.progress / item.episodes) * 100 : 50}%`,
            }}
          />
        </div>

        {/* Bottom Content Area */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3.5 pb-3 pt-6 sm:pt-8 flex flex-col gap-2 z-20 transition-transform duration-300 ease-out translate-y-1 group-hover:translate-y-0">
          <div className="flex items-center gap-1.5 order-1 transition-all duration-300 ease-out peer-hover:opacity-0 peer-hover:-translate-y-1 peer-hover:pointer-events-none">
            {item.progress !== undefined && item.progress !== null && item.progress > 0 && mediaType !== "movie" && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 py-0.5 bg-primary/10 text-[color-mix(in_srgb,var(--primary)_60%,white)] border border-primary/20 text-[10px] sm:text-xs font-semibold backdrop-blur-md">
                {getProgressIcon(mediaType)}
                <span>
                  {mediaType === "tv"
                    ? item.meta?.season
                      ? `S${item.meta.season} E${item.meta.episode}`
                      : `Ep ${item.progress}`
                    : mediaType === "game"
                      ? `${item.progress}h`
                      : mediaType === "book"
                        ? `Ch ${item.progress}`
                        : `${mediaType === "manga" ? "Ch" : "Ep"} ${item.progress}`}
                  {item.episodes ? ` / ${item.episodes}` : ""}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-end justify-between gap-1.5 w-full order-2">
            <h4 
              title={item.title}
              className="peer font-semibold text-xs sm:text-sm text-white/95 line-clamp-2 hover:line-clamp-none leading-snug group-hover:text-primary transition-colors duration-300 tracking-wide wrap-break-word flex-1 cursor-pointer"
            >
              {item.title}
            </h4>

            <Button
              size="icon"
              className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0 shadow-md shrink-0 pointer-events-auto cursor-pointer hover:scale-105 transition-all duration-300 z-30 backdrop-blur-md bg-primary/10 border border-primary/25 text-[color-mix(in_srgb,var(--primary)_60%,white)] hover:text-white hover:bg-primary/20 hover:border-primary/40",
                isUpdating ? "opacity-50 cursor-not-allowed" : "hover:scale-110",
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onIncrement();
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>
        </div>
      </Link>

      {/* Type-specific edit dialog opened by the hamburger icon */}
      {item.type === "anime" && (
        <AnimeEditDialog
          media={dialogMedia}
          hasListEntry={true}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={onRefresh}
          onDeleted={onRefresh}
        />
      )}
      {item.type === "manga" && (
        <MangaEditDialog
          media={dialogMedia}
          hasListEntry={true}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={onRefresh}
          onDeleted={onRefresh}
        />
      )}
      {item.type === "tv" && (
        <TvEditDialog
          media={{ ...dialogMedia, seasons: [] }}
          hasListEntry={true}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={onRefresh}
          onDeleted={onRefresh}
        />
      )}
      {item.type === "movie" && (
        <MovieEditDialog
          media={dialogMedia}
          hasListEntry={true}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={onRefresh}
          onDeleted={onRefresh}
        />
      )}
      {item.type === "game" && (
        <GameEditDialog
          media={dialogMedia}
          hasListEntry={true}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={onRefresh}
          onDeleted={onRefresh}
        />
      )}
      {item.type === "book" && (
        <BookEditDialog
          media={dialogMedia}
          hasListEntry={true}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={onRefresh}
          onDeleted={onRefresh}
        />
      )}
    </>
  );
}
