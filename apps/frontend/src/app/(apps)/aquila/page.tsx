"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { Plus, Play, BookOpen, Tv, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export default function AquilaHome() {
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
    return { anime, manga, tv };
  }, [watching]);

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Aquila</h1>
        <p className="text-muted-foreground text-lg max-w-md text-center">
          Track your favorite anime, manga, and TV shows in one place.
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
    <div className="space-y-12 pb-20 px-4 md:px-8">
      <header className="flex flex-col gap-2 pt-8">
        <h1 className="text-3xl font-bold tracking-tight">Continuing</h1>
        <p className="text-muted-foreground">
          Pick up right where you left off.
        </p>
      </header>

      {watching.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border">
          <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Nothing currently watching</h2>
          <p className="text-muted-foreground mt-2">
            Start browsing to add items to your list.
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link href="/browse">Browse Media</Link>
          </Button>
        </div>
      ) : (
        <>
          {sections.anime.length > 0 && (
            <MediaSection
              title="Anime"
              icon={<Play className="w-5 h-5" />}
              items={sections.anime}
              onIncrement={handleIncrement}
              updatingId={updatingId}
            />
          )}
          {sections.manga.length > 0 && (
            <MediaSection
              title="Manga"
              icon={<BookOpen className="w-5 h-5" />}
              items={sections.manga}
              onIncrement={handleIncrement}
              updatingId={updatingId}
            />
          )}
          {sections.tv.length > 0 && (
            <MediaSection
              title="TV Shows"
              icon={<Tv className="w-5 h-5" />}
              items={sections.tv}
              onIncrement={handleIncrement}
              updatingId={updatingId}
            />
          )}
        </>
      )}
    </div>
  );
}

function MediaSection({ title, icon, items, onIncrement, updatingId }: any) {
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
        {items.map((item: MediaItem) => (
          <MediaCard
            key={`${(item as any).type}-${item.id}`}
            item={item}
            onIncrement={() => onIncrement(item)}
            isUpdating={updatingId === `${(item as any).type}-${item.id}`}
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
}: {
  item: MediaItem;
  onIncrement: () => void;
  isUpdating: boolean;
}) {
  const mediaType = item.type;
  const href = `/aquila/${mediaType === "manga" ? "manga" : mediaType === "tv" ? "tv" : "anime"}/${item.id}`;

  return (
    <div className="group relative aspect-2/3 rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-2xl hover:border-primary/50 transition-all duration-500">
      <Link href={href} className="absolute inset-0 z-0">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Subtle Bottom Fade for Progress Bar visibility */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-500" />
      </Link>

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
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/40 backdrop-blur-[2px]">
        <div className="flex justify-between items-start">
          <Badge className="bg-primary/20 backdrop-blur-md border-primary/20 text-primary-foreground text-[10px] font-bold">
            {item.format}
          </Badge>
        </div>

        {/* Center Increment Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Button
            size="lg"
            className={cn(
              "h-14 w-14 rounded-full p-0 shadow-2xl scale-50 group-hover:scale-100 transition-all duration-500 pointer-events-auto",
              isUpdating ? "bg-primary/50" : "bg-primary",
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onIncrement();
            }}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Plus className="w-8 h-8" />
            )}
          </Button>
        </div>

        {/* Bottom Info */}
        <div className="space-y-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          <h3 className="font-bold text-sm text-white leading-tight line-clamp-1">
            {item.title}
          </h3>
          <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
            {item.type === "tv"
              ? item.meta?.season
                ? `S${item.meta.season} E${item.meta.episode}`
                : "In Progress"
              : `${item.type === "manga" ? "Ch" : "Ep"} ${item.progress}`}
            {item.episodes ? ` / ${item.episodes}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
