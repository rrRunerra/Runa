"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo, useRef } from "react";
import { Plus, Play, BookOpen, Tv, Film, Loader2, Menu, Gamepad2 } from "lucide-react";
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



export default function AquilaHome(): React.JSX.Element {
  const { data: session, status } = useSession();
  const [watching, setWatching] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const sections = useMemo(() => {
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
            {sections.anime.length > 0 && (
              <MediaSection
                title="Anime"
                icon={<Play className="w-5 h-5" />}
                items={sections.anime}
                onIncrement={handleIncrement}
                updatingId={updatingId}
                onRefresh={fetchWatching}
              />
            )}
            {sections.manga.length > 0 && (
              <MediaSection
                title="Manga"
                icon={<BookOpen className="w-5 h-5" />}
                items={sections.manga}
                onIncrement={handleIncrement}
                updatingId={updatingId}
                onRefresh={fetchWatching}
              />
            )}
            {sections.tv.length > 0 && (
              <MediaSection
                title="TV Shows"
                icon={<Tv className="w-5 h-5" />}
                items={sections.tv}
                onIncrement={handleIncrement}
                updatingId={updatingId}
                onRefresh={fetchWatching}
              />
            )}
            {sections.movie.length > 0 && (
              <MediaSection
                title="Movies"
                icon={<Film className="w-5 h-5" />}
                items={sections.movie}
                onIncrement={handleIncrement}
                updatingId={updatingId}
                onRefresh={fetchWatching}
              />
            )}
            {sections.game.length > 0 && (
              <MediaSection
                title="Games"
                icon={<Gamepad2 className="w-5 h-5" />}
                items={sections.game}
                onIncrement={handleIncrement}
                updatingId={updatingId}
                onRefresh={fetchWatching}
              />
            )}
            {sections.book.length > 0 && (
              <MediaSection
                title="Books"
                icon={<BookOpen className="w-5 h-5" />}
                items={sections.book}
                onIncrement={handleIncrement}
                updatingId={updatingId}
                onRefresh={fetchWatching}
              />
            )}
          </div>
        )}
      </div>

      {/* Image source credit */}
      <div className="absolute bottom-4 right-6 z-20">
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
}: MediaSectionProps): React.JSX.Element {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <Badge
          variant="secondary"
          className="ml-2 bg-primary/5 text-primary border-primary/10"
        >
          {items.length} items
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
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
        className="group relative aspect-2/3 rounded-2xl overflow-hidden border border-border bg-card shadow-sm lg:hover:shadow-2xl lg:hover:border-primary/50 transition-all duration-500 cursor-pointer block"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 lg:group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-40 lg:group-hover:opacity-80 transition-opacity duration-500" />
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

        {/* Hover Content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-500 bg-black/50 backdrop-blur-none lg:bg-black/40 lg:backdrop-blur-[2px]">
          <div className="flex justify-between items-start w-full">
            <Badge className="bg-primary/20 backdrop-blur-md border-primary/20 text-primary-foreground text-[10px] font-bold">
              {item.format}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 hover:border-primary/30 text-white/80 hover:text-primary transition-all cursor-pointer pointer-events-auto flex items-center justify-center p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditDialogOpen(true);
              }}
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>

          {/* Bottom Info & Increment Button */}
          <div className="flex items-end justify-between gap-1.5 w-full transform translate-y-0 lg:translate-y-4 lg:group-hover:translate-y-0 transition-transform duration-500">
            <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
              <h3 className="font-bold text-xs sm:text-sm text-white leading-tight line-clamp-1">
                {item.title}
              </h3>
              <p className="text-[9px] sm:text-[10px] font-bold text-white/70 uppercase tracking-widest">
                {item.type === "tv"
                  ? item.meta?.season
                    ? `S${item.meta.season} E${item.meta.episode}`
                    : "In Progress"
                  : item.type === "game"
                    ? `Played ${item.progress} hr`
                    : item.type === "book"
                      ? `Ch ${item.progress}`
                      : `${item.type === "manga" ? "Ch" : "Ep"} ${item.progress}`}
                {item.episodes ? ` / ${item.episodes}` : ""}
              </p>
            </div>
            
            <Button
              size="icon"
              className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0 shadow-lg shrink-0 pointer-events-auto cursor-pointer hover:scale-105 transition-all duration-300",
                isUpdating ? "bg-primary/50 cursor-not-allowed" : "bg-primary hover:scale-110",
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
