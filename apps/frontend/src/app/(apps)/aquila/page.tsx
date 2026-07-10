"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Tv, BookOpen, Gamepad2, Film, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { MediaItem } from "@/types/aquila";
import { RrMediaSection } from "@/components/rrComponents/aquila/rrMediaSection";
import RrLapplandBook from "@/components/rrComponents/rrImages/rrLapplandBook";

type CategoryType = "anime" | "manga" | "tv" | "movie" | "game" | "book";

const DEFAULT_ORDER: CategoryType[] = [
  "anime",
  "manga",
  "tv",
  "movie",
  "game",
  "book",
];

const CATEGORY_CONFIG: Record<
  CategoryType,
  { title: string; icon: React.JSX.Element }
> = {
  anime: { title: "Anime", icon: <Play className="size-4" /> },
  manga: { title: "Manga", icon: <BookOpen className="size-4" /> },
  tv: { title: "TV Shows", icon: <Tv className="size-4" /> },
  movie: { title: "Movies", icon: <Film className="size-4" /> },
  game: { title: "Games", icon: <Gamepad2 className="size-4" /> },
  book: { title: "Books", icon: <BookOpen className="size-4" /> },
};

export default function AquilaHome(): React.JSX.Element {
  const { data: session, status } = useSession();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [categoryOrder, setCategoryOrder] =
    useState<CategoryType[]>(DEFAULT_ORDER);
  const [draggedCategory, setDraggedCategory] = useState<CategoryType | null>(
    null,
  );
  const [dragAllowedCategory, setDragAllowedCategory] =
    useState<CategoryType | null>(null);

  const handleDragStart = (e: React.DragEvent, category: CategoryType) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", category);
    setDraggedCategory(category);
  };

  const handleDragEnter = (
    e: React.DragEvent,
    targetCategory: CategoryType,
  ) => {
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
      localStorage.setItem(
        "aquila_category_order",
        JSON.stringify(categoryOrder),
      );
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

  // Fetch watching list using standard SWR hook
  const {
    data: rawWatching = [],
    isLoading: isSWRClassLoading,
    mutate,
  } = useSWR<MediaItem[]>(
    status === "authenticated" && session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/list/watching`,
          session.accessToken,
        ]
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  // Filter out malformed entries that lack an id to prevent runtime crashes
  const watching = rawWatching.filter((item) => item.id != null);

  useEffect(() => {
    const savedOrder = localStorage.getItem("aquila_category_order");
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder) as CategoryType[];
        const validCategories = [
          "anime",
          "manga",
          "tv",
          "movie",
          "game",
          "book",
        ];
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
    if (status !== "authenticated" || !session?.accessToken) return;

    const mediaType = item.type;
    const key = `${mediaType}-${item.id}`;

    if (updatingId === key) return;

    // Optimistic Update of local SWR cache
    const updatedWatching = watching.map((i) => {
      if (i.id === item.id && i.format === item.format) {
        return { ...i, progress: (i.progress || 0) + 1 };
      }
      return i;
    });
    mutate(updatedWatching, false);

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
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({ mediaType, id: item.id, count }),
          },
        );

        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            toast.success(`Progress updated for ${item.title}`);
            mutate();
          } else {
            toast.error(result.message);
            mutate();
          }
        } else {
          toast.error("Failed to update progress");
          mutate();
        }
      } catch (e) {
        toast.error("An error occurred");
        mutate();
      } finally {
        setUpdatingId(null);
      }
    }, 1000);
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
      <div className="relative w-full min-h-full flex flex-col flex-1 p-6 md:p-8">
        {/* Fixed SVG Background Wallpaper */}
        <RrLapplandBook className="fixed right-0 top-0 h-screen w-auto opacity-[0.06] text-foreground pointer-events-none select-none z-0 object-contain -scale-x-100 transition-opacity duration-300 " />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground bg-clip-text bg-linear-to-r from-foreground via-foreground/95 to-primary">
            Welcome to Aquila
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Keep track of your active anime, manga series, movies, games, and
            reading books in one highly responsive, centralized, and customized
            dashboard.
          </p>
          <Button
            size="lg"
            className="rounded-xl px-8 font-semibold tracking-wide cursor-pointer"
            asChild
          >
            <Link href="/auth/login">Get Started</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isSWRClassLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-full flex flex-col flex-1 p-6 md:p-8">
      {/* Fixed SVG Background Wallpaper */}
      <RrLapplandBook className="fixed right-0 top-0 h-screen w-auto opacity-[0.06] text-foreground pointer-events-none select-none z-0 object-contain -scale-x-100 transition-opacity duration-300" />

      {/* Main Content Pane */}
      <div className="relative z-10 flex-1 flex flex-col gap-8">
        {watching.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center py-16 px-4 select-none relative z-10">
            <div className="space-y-4 max-w-sm">
              <h2 className="text-4xl font-black tracking-wider text-muted-foreground/20 uppercase leading-none">
                Nothing Here
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                It looks like your watch list is empty. Start browsing to find
                and track your favorite media.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="px-6 rounded-xl border border-border/80 bg-background/50 hover:bg-accent transition-all text-xs tracking-wider uppercase font-bold cursor-pointer"
                  asChild
                >
                  <Link href="/aquila/browse">Browse Media</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-10 pb-16">
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
                    "transition-all duration-300 rounded-3xl p-4 border border-transparent",
                    draggedCategory === category &&
                      "opacity-30 border-2 border-dashed border-primary/45 bg-primary/5 scale-[0.99] shadow-lg",
                  )}
                >
                  <RrMediaSection
                    title={config.title}
                    icon={config.icon}
                    items={items}
                    onIncrement={handleIncrement}
                    updatingId={updatingId}
                    onRefresh={mutate}
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
      <div className="relative self-end mt-auto pt-8 pb-2 pr-2 z-20"></div>
    </div>
  );
}
