"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Star,
  Heart,
  Users,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  UserCheck,
  BarChart3,
  ImageIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { fetcher } from "@/lib/fetcher";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import { RrMediaRefreshButton } from "@/components/rrComponents/aquila/rrMediaRefreshButton";
import { MovieEntity } from "@/types/movie.entities";
import { RrMediaInfoRow } from "@/components/rrComponents/aquila/details/rrMediaInfoRow";
import { RrMediaFriendsProgress } from "@/components/rrComponents/aquila/details/rrMediaFriendsProgress";
import { RrMediaDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";
import { RrMediaGenres } from "@/components/rrComponents/aquila/details/rrMediaGenres";
import { RrMediaCharacters } from "@/components/rrComponents/aquila/details/rrMediaCharacters";
import { RrMediaStaff } from "@/components/rrComponents/aquila/details/rrMediaStaff";
import { RrMediaRelations } from "@/components/rrComponents/aquila/details/rrMediaRelations";
import { RrMediaStatsDashboard } from "@/components/rrComponents/aquila/details/rrMediaStatsDashboard";
import { RrMediaSimilar } from "@/components/rrComponents/aquila/details/rrMediaSimilar";
import { RrMediaImages } from "@/components/rrComponents/aquila/details/rrMediaImages";

import { RrMediaTrailer } from "@/components/rrComponents/aquila/details/rrMediaTrailer";
import { RrMediaFooter } from "@/components/rrComponents/aquila/details/rrMediaFooter";
import { RrMediaDetailsSkeleton } from "@/components/rrComponents/aquila/details/rrMediaDetailsSkeleton";
import { RrMediaReviews } from "@/components/rrComponents/aquila/details/rrMediaReviews";
import { RrMediaRecommendations } from "@/components/rrComponents/aquila/details/rrMediaRecommendations";
import { MessageSquare, Sparkles } from "lucide-react";
import { MediaType } from "@/types/aquila";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ListEntry {
  id: number | string;
  status: string;
  score?: number;
  progress?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

const formatCompactNumber = (num: number | null | undefined): string => {
  if (num == null || isNaN(num)) return "0";
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "b";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
};

export default function MovieDetailsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [showMoreInfo, setShowMoreInfo] = useState<boolean>(false);

  const {
    data: movie,
    error: movieError,
    isLoading: movieLoading,
    mutate: mutateMovie,
  } = useSWR<MovieEntity>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/movie/${id}` : null,
    fetcher,
  );

  const { data: listEntry, mutate: mutateListEntry } = useSWR<ListEntry>(
    id && session.status === "authenticated" && session.data?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/list/movie/entry/${id}`,
          session.data.accessToken,
        ]
      : null,
    fetcher,
    { shouldRetryOnError: false },
  );

  const hasListEntry = !!listEntry;

  // ─── Derived display values ───────────────────────────────────────────────

  const displayTitle =
    movie?.titlePrimary || movie?.titleSecondary || t("aquila.movieDetails");

  const coverUrl =
    movie?.coverImage || movie?.images?.tvdb?.posters?.[0] || "";

  const bannerUrl =
    movie?.bannerImage || movie?.images?.tvdb?.backdrops?.[0] || "";

  // ─── Providers from sources[] + known IDs ────────────────────────────────

  const providers = useMemo(() => {
    if (!movie) return [];
    const list: { name: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const addProvider = (name: string, url?: string | null): void => {
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      list.push({ name, url });
    };

    if (movie.tvDBId) {
      addProvider(
        "TheTVDB",
        `https://thetvdb.com/dereferrer/movie/${movie.tvDBId}`,
      );
    }
    if (movie.imdbId) {
      addProvider("IMDb", `https://www.imdb.com/title/${movie.imdbId}`);
    }
    if (movie.sources) {
      for (const src of movie.sources) {
        if (src.url && src.provider) {
          addProvider(src.provider, src.url);
        }
      }
    }

    return list;
  }, [movie]);

  // ─── Trailers ────────────────────────────────────────────────────────────

  const trailerObj = useMemo(() => {
    if (!movie?.trailers || movie.trailers.length === 0) return null;
    const first = movie.trailers[0];
    let youtubeId = String(first.id);
    if (first.url && first.url.includes("youtube.com/watch?v=")) {
      youtubeId =
        first.url.split("watch?v=")[1]?.split("&")[0] || String(first.id);
    } else if (first.url && first.url.includes("youtu.be/")) {
      youtubeId =
        first.url.split("youtu.be/")[1]?.split("?")[0] || String(first.id);
    }
    return { id: youtubeId, site: "youtube" };
  }, [movie]);

  // ─── Formatted release date ──────────────────────────────────────────────

  const formattedReleaseDate = useMemo((): string | null => {
    if (!movie?.releaseDateYear) return null;
    const parts = [
      movie.releaseDateYear,
      movie.releaseDateMonth
        ? String(movie.releaseDateMonth).padStart(2, "0")
        : null,
      movie.releaseDateDay
        ? String(movie.releaseDateDay).padStart(2, "0")
        : null,
    ].filter(Boolean);
    return parts.join("-");
  }, [movie]);

  // ─── Characters (v2 shape) ───────────────────────────────────────────────

  const characters = useMemo(() => {
    if (!movie?.characters) return [];
    return movie.characters.map((mc: any) => {
      const charName =
        mc.namePrimary ||
        mc.character?.namePrimary ||
        mc.character?.nameNative ||
        mc.name ||
        t("aquila.unknownCharacter");

      const charImage = mc.image || mc.character?.image || "";
      const actorObj = mc.actor;

      return {
        id: mc.id,
        characterId: mc.characterId || mc.id,
        name: charName,
        native: mc.nameNative || mc.character?.nameNative || "",
        image: charImage,
        role: mc.role || "MAIN",
        voiceActor: actorObj
          ? {
              id: actorObj.id,
              name:
                actorObj.namePrimary ||
                actorObj.nameNative ||
                t("aquila.unknownActor"),
              image: actorObj.image || "",
              role: actorObj.role || "Actor",
            }
          : null,
      };
    });
  }, [movie, t]);

  // ─── Staff (v2 shape) ───────────────────────────────────────────────────

  const staff = useMemo(() => {
    if (!movie?.staff) return [];
    return movie.staff.map((st: any) => {
      const person = st.actor || st.staff || st;
      return {
        id: st.id,
        mediaType: "MOVIE",
        mediaId: Number(id),
        staffId: person.id || st.id,
        role: st.customRole || st.role || "Staff",
        staff: {
          id: person.id || st.id,
          namePrimary: person.namePrimary || person.name || "",
          nameNative: person.nameNative ?? "",
          image: person.image ?? "",
        },
      };
    });
  }, [movie, id]);

  // ─── Relations (v2 shape) ────────────────────────────────────────────────

  const relations = useMemo(() => {
    if (!movie?.relations) return [];
    return movie.relations.map((rel) => {
      const target = rel.targetMedia;
      const relType = rel.relationType ?? rel.type ?? "";
      const mediaType = rel.targetType ?? "MOVIE";
      return {
        id: rel.targetId,
        relationType: relType,
        title: {
          english: target?.titlePrimary ?? "",
          romaji: target?.titleSecondary ?? "",
          native: target?.titleNative ?? "",
        },
        format: target?.format ?? "",
        type: mediaType,
        coverImage: target?.coverImage ?? "",
      };
    });
  }, [movie]);

  // ─── Studios ─────────────────────────────────────────────────────────────

  const studios = useMemo(() => {
    if (!movie?.studios) return [];
    return movie.studios
      .map((s) => (typeof s === "string" ? s : s?.name))
      .filter(Boolean);
  }, [movie]);

  // ─── Aggregate stats ───────────────────────────────────────────────────────

  const displayAverageScore = useMemo(() => {
    if (!movie) return null;
    return movie.localAverageScore ?? movie.averageScore;
  }, [movie]);

  const displayFavorites = useMemo(() => {
    if (!movie) return 0;
    return Math.max(movie.localFavoritesCount ?? 0, movie.favorites ?? 0);
  }, [movie]);

  const displayPopularity = useMemo(() => {
    if (!movie) return 0;
    return Math.max(movie.localPopularity ?? 0, movie.popularity ?? 0);
  }, [movie]);

  useEffect((): void => {
    if (!movie) return;
    document.title = `Aquila > Movie > ${displayTitle}`;
  }, [movie, displayTitle]);

  if (movieLoading) {
    return <RrMediaDetailsSkeleton />;
  }

  if (movieError || !movie) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center gap-4">
        <div className="absolute top-0 right-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground z-10">
          {t("aquila.movieNotFound")}
        </h2>
        <Button asChild variant="default" className="z-10 rounded-xl">
          <Link href="/aquila/browse">{t("aquila.backToBrowse")}</Link>
        </Button>
      </div>
    );
  }

  const handleQuickAdd = async (): Promise<void> => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/movie/entry/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            movieId: Number(id),
            status: "PLANNING",
          }),
        },
      );
      if (res.ok) {
        toast.success(t("aquila.addedToList"));
        mutateListEntry();
      } else {
        toast.error(t("aquila.failedAddToList"));
      }
    } catch {
      toast.error(t("aquila.failedAddToList"));
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[20%] -left-25 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Banner Section */}
      <div className="relative h-60 md:h-90 w-full overflow-hidden shrink-0 z-10">
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-background to-transparent z-10" />
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt={displayTitle}
            fill
            sizes="100vw"
            className="object-cover scale-105 filter blur-[1px] brightness-75"
            priority
          />
        ) : (
          <div className="w-full h-full bg-muted/10" />
        )}
      </div>

      {/* Details layout container */}
      <div className="px-4 md:px-8 pb-16 -mt-16 md:-mt-24 relative z-20 w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col lg:flex-row gap-8 w-full"
        >
          {/* Left Column - Cover & Main Actions */}
          <motion.div
            variants={itemVariants}
            className="shrink-0 w-full lg:w-65 flex flex-col gap-4"
          >
            <div className="flex flex-row lg:flex-col gap-4 items-end lg:items-stretch lg:bg-card/75 lg:border lg:border-border/40 lg:backdrop-blur-xl lg:shadow-2xl lg:rounded-2xl lg:p-4">
              <div className="relative aspect-2/3 w-28 sm:w-36 lg:w-full rounded-xl overflow-hidden shadow-2xl border border-border/40 shrink-0 bg-card flex items-center justify-center">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={displayTitle}
                    fill
                    sizes="(max-width: 640px) 112px, (max-width: 1024px) 144px, 260px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                    <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2.5 w-full justify-end lg:justify-center mb-1 lg:mb-0">
                {session.status === "authenticated" && session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer rounded-xl transition-all shadow-md font-semibold"
                          size="default"
                          onClick={handleQuickAdd}
                        >
                          {t("aquila.quickAdd")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer rounded-xl bg-card/80 backdrop-blur-sm"
                          size="default"
                          onClick={(): void => setIsDialogOpen(true)}
                        >
                          {t("aquila.addToList")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full cursor-pointer rounded-xl font-semibold"
                        size="default"
                        onClick={(): void => setIsDialogOpen(true)}
                      >
                        {t("aquila.editEntry")}
                      </Button>
                    )}
                    <RrMediaEditDialog
                      media={{
                        id: movie.id.toString(),
                        type: "movie",
                        title: {
                          english: displayTitle,
                          romaji: movie.titleSecondary ?? displayTitle,
                        },
                        coverImage: { large: coverUrl },
                      }}
                      hasListEntry={hasListEntry}
                      open={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      onSaved={(): void => {
                        mutateListEntry();
                      }}
                      onDeleted={(): void => {
                        mutateListEntry();
                      }}
                    />
                    <RrMediaRefreshButton
                      mediaType="movie"
                      mediaId={movie.id.toString()}
                      onRefreshed={(): void => {
                        void mutateMovie();
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Mobile Header / Title */}
            <div className="space-y-1 lg:hidden mt-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {displayTitle}
              </h1>
              {movie.titleSecondary || movie.titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs")}{" "}
                  {[
                    movie.titleSecondary !== movie.titlePrimary
                      ? movie.titleSecondary
                      : null,
                    movie.titleNative,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </div>

            {/* Media Metadata Stats Sidebar */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              {/* Top Key Stats Block */}
              <div className="space-y-2.5">
                {/* Average Score Card (Full Width) */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 transition-all shadow-xs">
                  <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
                    <Star className="size-5 fill-primary/40" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {t("aquila.averageScore")}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-black text-primary leading-none">
                        {displayAverageScore != null
                          ? displayAverageScore.toFixed(1)
                          : "N/A"}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        / 10
                      </span>
                    </div>
                  </div>
                </div>

                {/* Favorites & Popularity (2 Columns) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Favorites */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 transition-colors min-w-0">
                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
                      <Heart className="size-4 fill-rose-500/40" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-rose-500/90 uppercase tracking-wider truncate">
                        {t("aquila.favorites")}
                      </span>
                      <span
                        className="text-base font-extrabold text-foreground tracking-tight leading-none mt-0.5"
                        title={displayFavorites.toLocaleString()}
                      >
                        {formatCompactNumber(displayFavorites)}
                      </span>
                    </div>
                  </div>

                  {/* Popularity */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 transition-colors min-w-0">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500 shrink-0">
                      <Users className="size-4 fill-blue-500/40" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-blue-500/90 uppercase tracking-wider truncate">
                        {t("aquila.popularity")}
                      </span>
                      <span
                        className="text-base font-extrabold text-foreground tracking-tight leading-none mt-0.5"
                        title={displayPopularity.toLocaleString()}
                      >
                        {formatCompactNumber(displayPopularity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Show More / Show Less Toggle Button (Mobile/Tablet only) */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground flex lg:hidden items-center justify-center gap-1.5 py-2 border border-border/30 hover:border-border/60 bg-muted/20 cursor-pointer"
                onClick={() => setShowMoreInfo(!showMoreInfo)}
              >
                <span>
                  {showMoreInfo ? t("aquila.showLess") : t("aquila.showMore")}
                </span>
                {showMoreInfo ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </Button>

              {/* Information Details (Collapsible on mobile, always shown on desktop) */}
              <div
                className={cn(
                  "space-y-4 pt-2 border-t border-border/40",
                  showMoreInfo ? "block" : "hidden lg:block",
                )}
              >
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("aquila.information")}
                </h3>
                <div className="space-y-3">
                  <RrMediaInfoRow
                    label={t("aquila.duration")}
                    value={
                      movie.runtime
                        ? t("aquila.durationMinutes", { count: movie.runtime })
                        : null
                    }
                  />
                  <RrMediaInfoRow
                    label={t("aquila.status")}
                    value={movie.status?.replace(/_/g, " ").toLowerCase()}
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.releaseDate")}
                    value={formattedReleaseDate}
                  />
                  {movie.budget && (
                    <RrMediaInfoRow
                      label={t("aquila.budget")}
                      value={
                        !isNaN(Number(movie.budget))
                          ? `$${Number(movie.budget).toLocaleString()}`
                          : movie.budget
                      }
                    />
                  )}
                  {movie.revenue && (
                    <RrMediaInfoRow
                      label={t("aquila.boxOffice")}
                      value={
                        !isNaN(Number(movie.revenue))
                          ? `$${Number(movie.revenue).toLocaleString()}`
                          : movie.revenue
                      }
                    />
                  )}
                  <RrMediaInfoRow
                    label={t("aquila.country")}
                    value={movie.countryOfOrigin}
                    className="uppercase"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.language")}
                    value={movie.originalLanguage}
                    className="uppercase"
                  />
                  {movie.ageRating && (
                    <RrMediaInfoRow
                      label={t("aquila.rating")}
                      value={
                        movie.ageRatingGuide
                          ? `${movie.ageRating} (${movie.ageRatingGuide})`
                          : movie.ageRating
                      }
                    />
                  )}
                  {studios.length > 0 && (
                    <RrMediaInfoRow
                      label={t("aquila.studiosLabel")}
                      value={
                        <span
                          className="text-right text-xs max-w-37.5 truncate block"
                          title={studios.join(", ")}
                        >
                          {studios.join(", ")}
                        </span>
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Main Content & Tabs */}
          <div className="flex-1 space-y-6 lg:pt-8 min-w-0">
            {/* Header (Desktop) */}
            <motion.div
              variants={itemVariants}
              className="space-y-2 hidden lg:block"
            >
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {displayTitle}
              </h1>
              {movie.titleSecondary || movie.titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs")}{" "}
                  {[
                    movie.titleSecondary !== movie.titlePrimary
                      ? movie.titleSecondary
                      : null,
                    movie.titleNative,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </motion.div>

            {/* Description */}
            <RrMediaDescription description={movie.description} />

            {/* Genres */}
            <RrMediaGenres genres={movie.genres} />

            {/* Tabs Navigation */}
            <Tabs defaultValue="overview" className="w-full space-y-6">
              <TabsList className="bg-card/60 border border-border/30 backdrop-blur-xl p-1.5 rounded-2xl w-full flex overflow-x-auto justify-start sm:justify-center gap-1 scrollbar-none">
                <TabsTrigger
                  value="overview"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <LayoutGrid className="size-3.5 mr-1.5" />
                  {t("aquila.overview")}
                </TabsTrigger>
                <TabsTrigger
                  value="characters"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <Users className="size-3.5 mr-1.5" />
                  {t("aquila.characters")}
                </TabsTrigger>
                <TabsTrigger
                  value="staff"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <UserCheck className="size-3.5 mr-1.5" />
                  {t("aquila.staff")}
                </TabsTrigger>
                <TabsTrigger
                  value="images"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <ImageIcon className="size-3.5 mr-1.5" />
                  {t("aquila.images")}
                </TabsTrigger>
                <TabsTrigger
                  value="stats"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <BarChart3 className="size-3.5 mr-1.5" />
                  {t("aquila.stats")}
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <MessageSquare className="size-3.5 mr-1.5" />
                  {t("aquila.reviews")}
                </TabsTrigger>
                <TabsTrigger
                  value="recommendations"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <Sparkles className="size-3.5 mr-1.5" />
                  {t("aquila.recommendations")}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab Content */}
              <TabsContent value="overview" className="space-y-6 outline-none">
                {/* Characters Preview (first 10) */}
                {characters.length > 0 && (
                  <RrMediaCharacters
                    characters={characters}
                    limitCount={10}
                    hideToggleButton={true}
                  />
                )}

                {/* Staff Preview (first 6) */}
                {staff.length > 0 && (
                  <RrMediaStaff staff={staff} limit={6} />
                )}

                {/* Relations */}
                {relations.length > 0 && (
                  <RrMediaRelations relations={relations} />
                )}

                {/* Similar Series Carousel */}
                <RrMediaSimilar mediaType="movie" mediaId={id} />

                {/* Trailer & Friends Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <RrMediaTrailer trailer={trailerObj} />
                  <RrMediaFriendsProgress
                    mediaId={movie.id.toString()}
                    mediaType="movie"
                  />
                </div>
              </TabsContent>

              {/* Characters Tab Content */}
              <TabsContent
                value="characters"
                className="space-y-6 outline-none"
              >
                {characters.length > 0 ? (
                  <RrMediaCharacters
                    characters={characters}
                    showAllInitial={true}
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
                    {t(
                      "aquila.noCharacters",
                      "No character information available",
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Staff Tab Content */}
              <TabsContent value="staff" className="space-y-6 outline-none">
                {staff.length > 0 ? (
                  <RrMediaStaff staff={staff} showAllInitial={true} />
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
                    {t("aquila.noStaff", "No staff information available")}
                  </div>
                )}
              </TabsContent>

              {/* Images Tab Content */}
              <TabsContent value="images" className="space-y-6 outline-none">
                <RrMediaImages anime={movie as any} />
              </TabsContent>

              {/* Stats Tab Content */}
              <TabsContent value="stats" className="space-y-6 outline-none">
                <RrMediaStatsDashboard
                  localAverageScore={movie.localAverageScore ?? movie.averageScore}
                  localPopularity={movie.localPopularity ?? movie.popularity}
                  localFavoritesCount={
                    movie.localFavoritesCount ?? movie.favorites
                  }
                  localStatusDistribution={
                    movie.localStatusDistribution ?? movie.statusDistribution
                  }
                  localScoreDistribution={
                    movie.localScoreDistribution ?? movie.scoreDistribution
                  }
                  showCounters={true}
                />
              </TabsContent>

              {/* Reviews Tab Content */}
              <TabsContent value="reviews" className="space-y-6 outline-none">
                <RrMediaReviews mediaType={MediaType.MOVIE} mediaId={Number(id)} />
              </TabsContent>

              {/* Recommendations Tab Content */}
              <TabsContent value="recommendations" className="space-y-6 outline-none">
                <RrMediaRecommendations mediaType={MediaType.MOVIE} mediaId={Number(id)} />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

        {/* Media Footer */}
        <RrMediaFooter
          providers={providers}
          updatedAt={movie.updatedAt}
          mediaType="movie"
          mediaId={Number(id)}
          mediaData={{
            ...movie,
            relations,
            characters,
          }}
        />
      </div>
    </div>
  );
}
