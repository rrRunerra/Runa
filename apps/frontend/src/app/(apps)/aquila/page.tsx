"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { Plus, Play, BookOpen, Tv, Film, Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimeEditDialog } from "@/components/aquila/AnimeEditDialog";
import { MangaEditDialog } from "@/components/aquila/MangaEditDialog";
import { TvEditDialog } from "@/components/aquila/TvEditDialog";
import { MovieEditDialog } from "@/components/aquila/MovieEditDialog";

interface MediaItem {
  id: number;
  title: string;
  image: string;
  progress: number;
  episodes: number | null;
  format: string;
  status: string;
  last_updated: string;
  type: "anime" | "manga" | "tv" | "movie";
  meta?: {
    season?: number;
    episode?: number;
  };
}

export default function AquilaHome(): React.JSX.Element {
  const { data: session, status } = useSession();
  const [watching, setWatching] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
  }, [])

  const handleIncrement = async (item: MediaItem) => {
    if (status !== "authenticated" || updatingId) return;

    const mediaType = item.type;
    const key = `${mediaType}-${item.id}`;
    setUpdatingId(key);

    // Optimistic Update
    const oldWatching = [...watching];
    setWatching((prev) =>
      prev.map((i) => {
        if (i.id === item.id && i.format === item.format) {
          return { ...i, progress: (i.progress || 0) + 1 };
        }
        return i;
      }),
    );

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/increment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ mediaType, id: item.id }),
        },
      );

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          toast.success(`Progress updated for ${item.title}`);
          // Refresh to get potential status changes (COMPLETED) or next episode metadata
          fetchWatching();
        } else {
          toast.error(result.message);
          setWatching(oldWatching);
        }
      } else {
        toast.error("Failed to update progress");
        setWatching(oldWatching);
      }
    } catch (e) {
      toast.error("An error occurred");
      setWatching(oldWatching);
    } finally {
      setUpdatingId(null);
    }
  };

  const sections = useMemo(() => {
    const anime = watching.filter((i) => i.type === "anime");
    const manga = watching.filter((i) => i.type === "manga");
    const tv = watching.filter((i) => i.type === "tv");
    const movie = watching.filter((i) => i.type === "movie");
    return { anime, manga, tv, movie };
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

      {/* Main Content Pane */}
      <div className="relative z-10 flex-1 flex flex-col">
        {watching.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
            {/* Content on top - Glassmorphic Card */}
            <div className="flex flex-col items-center max-w-sm mx-4 p-8 rounded-3xl bg-black/65 backdrop-blur-md border border-white/10 shadow-2xl">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3 drop-shadow-md">
                Nothing here
              </h2>
              <p className="text-neutral-200 text-xs md:text-sm mb-6 leading-relaxed">
                It looks like your watch list is empty. Start browsing to find and track your favorite media.
              </p>

              <Button 
                variant="default" 
                className="w-full px-6 py-4 text-xs md:text-sm rounded-xl bg-linear-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 shadow-xl shadow-primary/20 hover:shadow-primary/35 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0" 
                asChild
              >
                <Link href="/aquila/browse">Browse Media</Link>
              </Button>
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

interface MediaSectionProps {
  title: string;
  icon: React.ReactNode;
  items: MediaItem[];
  onIncrement: (item: MediaItem) => void;
  updatingId: string | null;
  onRefresh: () => void;
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

      {/* Grid with responsive columns matching MediaListGroup */}
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
          {/* Subtle Bottom Fade for Progress Bar visibility */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-40 lg:group-hover:opacity-80 transition-opacity duration-500" />
        </div>

        {/* Progress Bar (Always visible but subtle) */}
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
                  : `${item.type === "manga" ? "Ch" : "Ep"} ${item.progress}`}
                {item.episodes ? ` / ${item.episodes}` : ""}
              </p>
            </div>
            
            <Button
              size="icon"
              className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0 shadow-lg shrink-0 pointer-events-auto cursor-pointer hover:scale-105 transition-all duration-300",
                isUpdating ? "bg-primary/50 cursor-not-allowed" : "bg-primary, hover:scale-110",
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
    </>
  );
}
