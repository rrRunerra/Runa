"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Film,
  Tv,
  Gamepad2,
  Book,
  BookOpen,
  Layers,
  Star,
  Heart,
  Sparkles,
  Clapperboard,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import RrLapplandBrowseNotFound from "@/components/rrComponents/rrImages/rrLapplandBrowseNotFound";
import { useTranslation } from "react-i18next";

export interface StudioMediaRelease {
  id: number;
  mediaType: "ANIME" | "MANGA" | "MOVIE" | "TV" | "GAME" | "BOOK";
  titlePrimary: string;
  titleSecondary?: string | null;
  coverImage?: string | null;
  format?: string | null;
  status?: string | null;
  year?: number | null;
  month?: number | null;
  day?: number | null;
  isMain: boolean;
  averageScore?: number | null;
}

export interface StudioDetail {
  id: number;
  anilistId?: number | null;
  malId?: number | null;
  aniDBId?: number | null;
  tvDBId?: number | null;
  bangumiId?: number | null;
  name: string;
  isAnimationStudio: boolean;
  siteUrl?: string | null;
  favorites?: number | null;
  alFavorites?: number | null;
  releases: StudioMediaRelease[];
}

const MEDIA_ROUTE_MAP: Record<string, string> = {
  ANIME: "/aquila/anime",
  MOVIE: "/aquila/movies",
  TV: "/aquila/tv",
  GAME: "/aquila/games",
  MANGA: "/aquila/manga",
  BOOK: "/aquila/books",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 120, damping: 16 },
  },
};

export default function StudioDetailPage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: session } = useSession();

  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedRole, setSelectedRole] = useState<"ALL" | "MAIN" | "PRODUCER">(
    "ALL",
  );

  const {
    data: studio,
    error,
    isLoading,
  } = useSWR<StudioDetail>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/studio/${id}` : null,
    fetcher,
  );

  const { data: favStatus, mutate: mutateFav } = useSWR<{ favorited: boolean }>(
    id && session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/STUDIO/${id}/status`,
          session.accessToken,
        ]
      : null,
    fetcher,
  );

  const toggleFavorite = async (): Promise<void> => {
    if (!session?.accessToken) return;
    const isFavorited = favStatus?.favorited;

    try {
      if (isFavorited) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/STUDIO/${id}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.accessToken}` },
          },
        );
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ type: "STUDIO", targetId: id }),
        });
      }
      mutateFav({ favorited: !isFavorited });
    } catch (e) {
      console.error("Failed to toggle favorite", e);
    }
  };

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: studio?.releases?.length || 0,
      ANIME: 0,
      MOVIE: 0,
      TV: 0,
      GAME: 0,
      MANGA: 0,
      BOOK: 0,
    };
    (studio?.releases || []).forEach((r) => {
      if (counts[r.mediaType] !== undefined) {
        counts[r.mediaType]++;
      }
    });
    return counts;
  }, [studio?.releases]);

  const groupedReleases = useMemo(() => {
    const filtered = (studio?.releases || []).filter((r) => {
      if (selectedType !== "ALL" && r.mediaType !== selectedType) return false;
      if (selectedRole === "MAIN" && !r.isMain) return false;
      if (selectedRole === "PRODUCER" && r.isMain) return false;
      return true;
    });

    const groups = new Map<number | "UNKNOWN", StudioMediaRelease[]>();
    for (const rel of filtered) {
      const key = rel.year && rel.year > 0 ? rel.year : "UNKNOWN";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(rel);
    }

    const entries = Array.from(groups.entries());
    entries.sort(([yearA], [yearB]) => {
      if (yearA === "UNKNOWN") return 1;
      if (yearB === "UNKNOWN") return -1;
      return (yearB as number) - (yearA as number);
    });

    return entries;
  }, [studio?.releases, selectedType, selectedRole]);

  const totalFilteredCount = useMemo(() => {
    return groupedReleases.reduce((acc, [, list]) => acc + list.length, 0);
  }, [groupedReleases]);

  if (isLoading) {
    return <StudioLoadingSkeleton />;
  }

  if (error || !studio) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background items-center justify-center space-y-4 p-6 text-center">
        <RrLapplandBrowseNotFound className="size-48 opacity-20 pointer-events-none mb-2" />
        <h2 className="text-xl font-bold text-muted-foreground">
          {t("aquila.studioNotFound")}
        </h2>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="rounded-xl cursor-pointer"
        >
          <ArrowLeft className="mr-2 size-4" /> {t("aquila.goBack")}
        </Button>
      </div>
    );
  }

  const typeFilterOptions = [
    {
      id: "ALL",
      label: t("aquila.allReleases"),
      count: typeCounts.ALL,
      icon: Layers,
    },
    {
      id: "ANIME",
      label: t("aquila.anime"),
      count: typeCounts.ANIME,
      icon: Tv,
    },
    {
      id: "MOVIE",
      label: t("aquila.movies"),
      count: typeCounts.MOVIE,
      icon: Film,
    },
    { id: "TV", label: t("aquila.tvShows"), count: typeCounts.TV, icon: Tv },
    {
      id: "GAME",
      label: t("aquila.games"),
      count: typeCounts.GAME,
      icon: Gamepad2,
    },
    {
      id: "MANGA",
      label: t("aquila.manga"),
      count: typeCounts.MANGA,
      icon: BookOpen,
    },
    {
      id: "BOOK",
      label: t("aquila.books"),
      count: typeCounts.BOOK,
      icon: Book,
    },
  ].filter((opt) => opt.id === "ALL" || opt.count > 0);

  return (
    <div className="flex-1 min-h-screen bg-background pb-16 relative overflow-x-hidden">
      {/* Decorative Aura */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/2 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/2 rounded-full blur-3xl pointer-events-none" />

      <div className="relative container mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl min-h-full z-10">
        {/* Studio Banner & Identity Card */}
        <div className="bg-card/40 border border-border/30 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
          {/* Top Row: Badge & Type on left, Total Releases & Favorite on right */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Building2 className="size-4.5" />
              </div>
              <Badge
                variant="outline"
                className="text-xs px-3 py-1 font-semibold rounded-xl bg-background/50 border-border/40"
              >
                {studio.isAnimationStudio
                  ? t("aquila.animationStudio")
                  : t("aquila.productionCompany")}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-muted/40 border border-border/30 px-3.5 py-1.5 rounded-xl">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t("aquila.totalReleases")}:
                </span>
                <span className="text-sm font-bold text-foreground">
                  {studio.releases.length}
                </span>
              </div>

              {session && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className="rounded-xl border-border/30 bg-muted/40 hover:bg-muted cursor-pointer size-8.5"
                  title={t("aquila.favorites")}
                >
                  <Heart
                    className={cn(
                      "size-4 transition-colors",
                      favStatus?.favorited
                        ? "fill-primary text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  />
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Row: Name on left, External Links on right */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight wrap-break-word">
              {studio.name}
            </h1>

            {/* External Links */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {studio.siteUrl && (
                <a
                  href={studio.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 transition-all hover:scale-105"
                >
                  Website <ExternalLink className="size-3" />
                </a>
              )}
              {studio.anilistId && (
                <a
                  href={`https://anilist.co/studio/${studio.anilistId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 transition-all hover:scale-105"
                >
                  AniList <ExternalLink className="size-3" />
                </a>
              )}
              {studio.malId && (
                <a
                  href={`https://myanimelist.net/anime/producer/${studio.malId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 transition-all hover:scale-105"
                >
                  MAL <ExternalLink className="size-3" />
                </a>
              )}
              {studio.bangumiId && (
                <a
                  href={`https://bgm.tv/person/${studio.bangumiId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 transition-all hover:scale-105"
                >
                  Bangumi <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/30 border border-border/30 backdrop-blur-md p-3 sm:p-4 rounded-2xl">
          {/* Media Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {typeFilterOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = selectedType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedType(opt.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{opt.label}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-md font-bold",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Role Filter Tabs (All / Main Studio / Producer) */}
          <div className="flex items-center gap-1 bg-muted/40 border border-border/30 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            {(
              [
                { id: "ALL", label: t("aquila.allReleases") },
                { id: "MAIN", label: t("aquila.mainStudio") },
                { id: "PRODUCER", label: t("aquila.producer") },
              ] as const
            ).map((roleOpt) => (
              <button
                key={roleOpt.id}
                type="button"
                onClick={() => setSelectedRole(roleOpt.id)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none",
                  selectedRole === roleOpt.id
                    ? "bg-card text-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {roleOpt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Incomplete Disclaimer */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-md text-xs text-muted-foreground shadow-xs">
          <Info className="size-4 text-primary shrink-0" />
          <p className="flex-1 leading-relaxed">{t("aquila.dataDisclaimer")}</p>
          <Link
            href="/aquila/browse"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 shrink-0 transition-colors"
          >
            {t("aquila.browse")}
          </Link>
        </div>

        {/* Releases Separated by Year */}
        <div className="space-y-10 min-h-100">
          {totalFilteredCount === 0 ? (
            <div className="text-center py-20 bg-card/20 border border-border/20 rounded-3xl space-y-3">
              <Clapperboard className="size-12 text-muted-foreground/40 mx-auto stroke-[1.2]" />
              <p className="text-muted-foreground text-sm font-medium">
                {t("aquila.noReleasesFound")}
              </p>
            </div>
          ) : (
            groupedReleases.map(([year, releases]) => {
              const yearDisplay =
                year === "UNKNOWN" ? t("aquila.unknownYear") : String(year);

              return (
                <section key={String(year)} className="space-y-4">
                  {/* Year Header Section */}
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-primary shrink-0" />
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                      {yearDisplay}
                    </h2>
                    <Badge
                      variant="secondary"
                      className="text-xs px-2 py-0.5 font-bold rounded-lg shrink-0"
                    >
                      {releases.length}
                    </Badge>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>

                  {/* Releases Grid */}
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                  >
                    {releases.map((release) => (
                      <StudioReleaseCard
                        key={`${release.mediaType}-${release.id}`}
                        release={release}
                      />
                    ))}
                  </motion.div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

interface StudioReleaseCardProps {
  release: StudioMediaRelease;
}

function StudioReleaseCard({
  release,
}: StudioReleaseCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const routePrefix =
    MEDIA_ROUTE_MAP[release.mediaType] ||
    `/aquila/${release.mediaType.toLowerCase()}`;
  const targetHref = `${routePrefix}/${release.id}`;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col gap-2 rounded-2xl w-full"
    >
      <Link
        href={targetHref}
        prefetch={false}
        className="flex flex-col gap-2 h-full"
      >
        {/* Poster Image Container */}
        <div className="relative aspect-3/4 w-full overflow-hidden rounded-2xl bg-muted shadow-xs group-hover:shadow-md border border-border/40 transition-all">
          {release.coverImage ? (
            <Image
              src={release.coverImage}
              alt={release.titlePrimary}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            />
          ) : (
            <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
              <RrLapplandImageNotFound className="size-full object-cover scale-150" />
            </div>
          )}

          {/* Top Badges (Media Type & Role) */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
            <Badge
              variant="outline"
              className="bg-background/80 backdrop-blur-md text-foreground border-border/50 text-[10px] px-1.5 py-0 font-bold shadow-xs"
            >
              {release.mediaType}
            </Badge>

            {release.isMain && (
              <Badge
                variant="secondary"
                className="bg-primary/90 text-primary-foreground backdrop-blur-md text-[9px] px-1.5 py-0 font-bold shadow-xs"
              >
                {t("aquila.mainStudio")}
              </Badge>
            )}
          </div>

          {/* Bottom Score & Format Badges */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
            {release.format && (
              <Badge
                variant="secondary"
                className="bg-black/60 text-white backdrop-blur-md text-[9px] px-1.5 py-0 font-semibold"
              >
                {release.format}
              </Badge>
            )}

            {release.averageScore !== undefined &&
              release.averageScore !== null &&
              release.averageScore > 0 && (
                <div className="flex items-center gap-1 bg-black/60 text-white backdrop-blur-md text-[10px] px-1.5 py-0.5 rounded-md font-bold ml-auto">
                  <Star className="size-2.5 fill-amber-400 text-amber-400" />
                  <span>
                    {release.averageScore > 10
                      ? Math.round(release.averageScore)
                      : release.averageScore.toFixed(1)}
                  </span>
                </div>
              )}
          </div>
        </div>

        {/* Titles */}
        <div className="flex flex-col px-1">
          <h3 className="font-bold text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors tracking-wide wrap-break-word text-foreground">
            {release.titlePrimary}
          </h3>
          {release.titleSecondary &&
            release.titleSecondary !== release.titlePrimary && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {release.titleSecondary}
              </p>
            )}
        </div>
      </Link>
    </motion.div>
  );
}

function StudioLoadingSkeleton(): React.JSX.Element {
  return (
    <div className="flex-1 min-h-screen bg-background pb-16">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 space-y-8">
        <Skeleton className="h-9 w-24 rounded-xl" />

        {/* Studio Info Skeleton */}
        <div className="bg-card/40 border border-border/30 rounded-3xl p-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-28 rounded-xl" />
            <Skeleton className="h-6 w-20 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-2/3 max-w-md rounded-2xl" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>

        {/* Filter Bar Skeleton */}
        <div className="flex gap-2 p-3 bg-card/30 border border-border/30 rounded-2xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-xl" />
          ))}
        </div>

        {/* Releases Grid Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-32 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-3/4 w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
