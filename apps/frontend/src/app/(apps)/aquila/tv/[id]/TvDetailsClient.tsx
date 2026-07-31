"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Check,
  Star,
  Heart,
  Users,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  UserCheck,
  BarChart3,
  ImageIcon,
  Film,
  Clock,
  Calendar,
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import { RrMediaRefreshButton } from "@/components/rrComponents/aquila/rrMediaRefreshButton";
import { RrMediaDetailsSkeleton } from "@/components/rrComponents/aquila/details/rrMediaDetailsSkeleton";
import { RrMediaReviews } from "@/components/rrComponents/aquila/details/rrMediaReviews";
import { MessageSquare } from "lucide-react";
import { MediaType } from "@/types/aquila";
import { TvEntity } from "@/types/tv.entities";
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
import { useTranslation } from "react-i18next";

interface ListEntry {
  id: number | string;
  status: string;
  score?: number;
  progress?: number;
  watchedEpisodes?: Array<{ seasonNum: number; episodeNum: number }>;
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

export default function TvDetailsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [showMoreInfo, setShowMoreInfo] = useState<boolean>(false);
  const [selectedSeason, setSelectedSeason] = useState<any | null>(null);
  const [activeSeasonFilter, setActiveSeasonFilter] = useState<number | null>(
    null,
  );

  const {
    data: tv,
    error: tvError,
    isLoading: tvLoading,
    mutate: mutateTv,
  } = useSWR<TvEntity>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/tv/${id}` : null,
    fetcher,
  );

  const { data: listEntry, mutate: mutateListEntry } = useSWR<ListEntry>(
    id && session.status === "authenticated" && session.data?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${id}`,
          session.data.accessToken,
        ]
      : null,
    fetcher,
    { shouldRetryOnError: false },
  );

  const hasListEntry = !!listEntry;
  const watchedEpisodes = listEntry?.watchedEpisodes || [];

  // ─── Display Titles & Images ─────────────────────────────────────────────

  const displayTitle =
    tv?.titlePrimary || tv?.titleSecondary || t("aquila.tvDetails");

  const coverUrl =
    tv?.coverImage ||
    tv?.images?.tvdb?.posters?.[0] ||
    tv?.images?.tvmaze?.cover ||
    "";

  const bannerUrl = tv?.bannerImage || tv?.images?.tvdb?.backdrops?.[0] || "";

  // ─── External Sources & Providers ───────────────────────────────────────

  const providers = useMemo(() => {
    if (!tv) return [];
    const list: { name: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const addProvider = (name: string, url?: string | null): void => {
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      list.push({ name, url });
    };

    if (tv.tvDBId) {
      addProvider(
        "TheTVDB",
        `https://thetvdb.com/dereferrer/series/${tv.tvDBId}`,
      );
    }
    if (tv.imdbId) {
      addProvider("IMDb", `https://www.imdb.com/title/${tv.imdbId}`);
    }
    if (tv.tvmazeId) {
      addProvider("TVmaze", `https://www.tvmaze.com/shows/${tv.tvmazeId}`);
    }

    if (tv.sources) {
      for (const src of tv.sources) {
        if (src.url && src.provider) {
          addProvider(src.provider, src.url);
        }
      }
    }

    return list;
  }, [tv]);

  // ─── Trailers ────────────────────────────────────────────────────────────

  const trailerObj = useMemo(() => {
    if (!tv?.trailers || tv.trailers.length === 0) return null;
    const first = tv.trailers[0];
    let youtubeId = String(first.id);
    if (first.key) {
      youtubeId = first.key;
    } else if (first.url && first.url.includes("youtube.com/watch?v=")) {
      youtubeId =
        first.url.split("watch?v=")[1]?.split("&")[0] || String(first.id);
    } else if (first.url && first.url.includes("youtu.be/")) {
      youtubeId =
        first.url.split("youtu.be/")[1]?.split("?")[0] || String(first.id);
    }
    return { id: youtubeId, site: "youtube" };
  }, [tv]);

  // ─── Formatted First Aired Date ─────────────────────────────────────────

  const formattedFirstAired = useMemo((): string | null => {
    if (!tv?.firstAiredYear) return null;
    try {
      const year = tv.firstAiredYear;
      const month = tv.firstAiredMonth ?? 1;
      const day = tv.firstAiredDay ?? 1;
      return new Date(year, month - 1, day).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }, [tv?.firstAiredYear, tv?.firstAiredMonth, tv?.firstAiredDay]);

  // ─── Characters (V2 shape with actor) ───────────────────────────────────

  const characters = useMemo(() => {
    if (!tv?.characters) return [];
    return tv.characters.map((tc: any) => {
      const charName =
        tc.namePrimary ||
        tc.character?.namePrimary ||
        tc.character?.nameNative ||
        tc.name ||
        t("aquila.unknownCharacter");

      const charImage = tc.image || tc.character?.image || "";
      const actorObj = tc.actor;

      return {
        id: tc.id,
        characterId: tc.characterId || tc.id,
        name: charName,
        native: tc.nameNative || tc.character?.nameNative || "",
        image: charImage,
        role: tc.role || "MAIN",
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
  }, [tv, t]);

  // ─── Staff (V2 shape) ───────────────────────────────────────────────────

  const staff = useMemo(() => {
    if (!tv?.staff) return [];
    return tv.staff.map((st: any) => {
      const person = st.actor || st.staff || st;
      return {
        id: st.id,
        mediaType: "TV",
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
  }, [tv, id]);

  // ─── Relations (V2 shape) ────────────────────────────────────────────────

  const relations = useMemo(() => {
    if (!tv?.relations) return [];
    return tv.relations.map((rel: any) => {
      const target = rel.targetMedia;
      const relType = rel.relationType ?? rel.type ?? "";
      const mediaType = rel.targetType ?? "TV";
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
  }, [tv]);

  // ─── Seasons with Episodes Grouping ──────────────────────────────────────

  const seasonsWithEpisodes = useMemo(() => {
    if (!tv?.seasons) return undefined;
    return tv.seasons.map((s) => ({
      number: s.seasonNumber,
      name: s.titlePrimary,
      image: s.posterImage,
      episodeCount: s.episodeCount,
      episodes: (tv.episodes ?? [])
        .filter((ep) => ep.seasonNumber === s.seasonNumber)
        .map((ep) => ({
          id: ep.id,
          number: ep.episodeNumber,
          name: ep.titlePrimary,
          overview: ep.description,
          image: ep.thumbnail,
          airDate: ep.airDate,
        })),
    }));
  }, [tv?.seasons, tv?.episodes]);

  const totalEpisodes = useMemo((): number => {
    if (!tv) return 0;
    return (
      tv.episodeCount ??
      tv.seasons?.reduce((acc, s) => acc + s.episodeCount, 0) ??
      0
    );
  }, [tv]);

  const networksAndStudios = useMemo(() => {
    if (!tv) return [];
    const list: string[] = [];
    if (tv.networks) list.push(...tv.networks);
    if (tv.studiosList) {
      for (const st of tv.studiosList) {
        if (typeof st === "string") list.push(st);
        else if (st?.name) list.push(st.name);
      }
    } else if (tv.studios) {
      list.push(...tv.studios);
    }
    return Array.from(new Set(list));
  }, [tv]);

  useEffect((): void => {
    if (!tv) return;
    document.title = `Aquila > TV > ${displayTitle}`;
  }, [tv, displayTitle]);

  const toggleEpisode = async (
    seasonNum: number,
    episodeNum: number,
  ): Promise<void> => {
    if (!tv || session.status !== "authenticated" || !session.data?.accessToken)
      return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${tv.id}/episode`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.accessToken}`,
          },
          body: JSON.stringify({ seasonNum, episodeNum }),
        },
      );
      if (res.ok) {
        mutateListEntry();
      }
    } catch {
      toast.error(t("aquila.failedUpdateEpisodeProgress"));
    }
  };

  if (tvLoading) {
    return <RrMediaDetailsSkeleton />;
  }

  if (tvError || !tv) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center gap-4">
        <div className="absolute top-0 right-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground z-10">
          {t("aquila.tvShowNotFound")}
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
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            tvId: Number(id),
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
                        id: tv.id.toString(),
                        type: "tv",
                        title: {
                          english: displayTitle,
                          romaji: tv.titleSecondary ?? displayTitle,
                        },
                        coverImage: { large: coverUrl },
                        seasons: seasonsWithEpisodes,
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
                      mediaType="tv"
                      mediaId={tv.id.toString()}
                      onRefreshed={(): void => {
                        void mutateTv();
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
              {tv.titleSecondary || tv.titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs")}{" "}
                  {[
                    tv.titleSecondary !== tv.titlePrimary
                      ? tv.titleSecondary
                      : null,
                    tv.titleNative,
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
                        {tv.averageScore ? tv.averageScore?.toFixed(1) : "N/A"}
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
                        title={(tv.favorites ?? 0).toLocaleString()}
                      >
                        {formatCompactNumber(tv.favorites)}
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
                        title={tv.popularity.toLocaleString()}
                      >
                        {formatCompactNumber(tv.popularity)}
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
                    label={t("aquila.episodes")}
                    value={totalEpisodes || "?"}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.seasons")}
                    value={tv.seasons?.length || "?"}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.status")}
                    value={tv.status?.replace(/_/g, " ").toLowerCase()}
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.firstAired")}
                    value={formattedFirstAired}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.country")}
                    value={tv.countryOfOrigin}
                    className="uppercase"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.language")}
                    value={tv.originalLanguage}
                    className="uppercase"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.avgRuntime")}
                    value={
                      tv.averageRuntime
                        ? t("aquila.durationMinutes", {
                            count: tv.averageRuntime,
                          })
                        : null
                    }
                  />
                  <RrMediaInfoRow
                    label={t("aquila.rating")}
                    value={
                      tv.ageRating ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5"
                        >
                          {tv.ageRating}
                        </Badge>
                      ) : null
                    }
                  />
                  {networksAndStudios.length > 0 && (
                    <RrMediaInfoRow
                      label={t("aquila.networks")}
                      value={
                        <span
                          className="text-right text-xs max-w-37.5 truncate block"
                          title={networksAndStudios.join(", ")}
                        >
                          {networksAndStudios.join(", ")}
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
              {tv.titleSecondary || tv.titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs")}{" "}
                  {[
                    tv.titleSecondary !== tv.titlePrimary
                      ? tv.titleSecondary
                      : null,
                    tv.titleNative,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </motion.div>

            {/* Description */}
            <RrMediaDescription description={tv.description} />

            {/* Genres */}
            <RrMediaGenres genres={tv.genres} />

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
                  value="episodes"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <Film className="size-3.5 mr-1.5" />
                  {t("aquila.episodes")}
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
                {staff.length > 0 && <RrMediaStaff staff={staff} limit={6} />}

                {/* Seasons List & Episode Drawer */}
                {tv.seasons && tv.seasons.length > 0 && (
                  <motion.div variants={itemVariants} className="space-y-3">
                    <h3 className="text-lg font-bold text-foreground">
                      {t("aquila.seasons")}
                    </h3>
                    <div className="max-h-96.25 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                      {tv.seasons.map((season) => {
                        const watchedInSeason = watchedEpisodes.filter(
                          (ep: any) => ep.seasonNum === season.seasonNumber,
                        ).length;
                        const seasonProgress =
                          season.episodeCount > 0
                            ? Math.round(
                                (watchedInSeason / season.episodeCount) * 100,
                              )
                            : 0;

                        return (
                          <div
                            key={season.id}
                            onClick={() => setSelectedSeason(season)}
                            className="flex items-center justify-between border border-border/30 rounded-2xl p-3 bg-card/25 backdrop-blur-md hover:bg-muted/30 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-6 w-full">
                              <div className="shrink-0 w-12 aspect-2/3 rounded-lg overflow-hidden border border-border/50 bg-muted relative flex items-center justify-center">
                                {season.posterImage || coverUrl ? (
                                  <Image
                                    src={season.posterImage || coverUrl}
                                    alt={
                                      season.titlePrimary ||
                                      t("aquila.seasonName", {
                                        number: season.seasonNumber,
                                      })
                                    }
                                    fill
                                    sizes="48px"
                                    className="object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                                    <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 flex items-center gap-8 text-left min-w-0">
                                <div className="flex flex-col">
                                  <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                    {t("aquila.seasonName", {
                                      number: season.seasonNumber,
                                    })}
                                  </h4>
                                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-tight">
                                    {t("aquila.episodesCount", {
                                      count: season.episodeCount,
                                    })}
                                  </span>
                                </div>

                                {hasListEntry && (
                                  <div className="flex-1 flex items-center gap-4 max-w-75">
                                    <div className="flex-1 bg-muted/60 h-1 rounded-full overflow-hidden">
                                      <div
                                        className="bg-primary h-full transition-all duration-700 rounded-full"
                                        style={{
                                          width: `${seasonProgress}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-bold text-primary/80 tabular-nums">
                                      {watchedInSeason} / {season.episodeCount}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Season Episodes Modal */}
                    <Dialog
                      open={!!selectedSeason}
                      onOpenChange={(open) => !open && setSelectedSeason(null)}
                    >
                      <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[85vh] flex flex-col p-6 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
                        {selectedSeason && (
                          <>
                            <DialogHeader className="pb-4 border-b border-border/20">
                              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                                <span>
                                  {t("aquila.seasonName", {
                                    number: selectedSeason.seasonNumber,
                                  })}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium"
                                >
                                  {t("aquila.episodesCount", {
                                    count: selectedSeason.episodeCount,
                                  })}
                                </Badge>
                              </DialogTitle>
                              <DialogDescription className="text-xs text-muted-foreground">
                                {displayTitle}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto custom-scrollbar my-2 divide-y divide-border/20 pr-1">
                              {(tv.episodes ?? [])
                                .filter(
                                  (ep) =>
                                    ep.seasonNumber ===
                                    selectedSeason.seasonNumber,
                                )
                                .map((episode) => {
                                  const watched = watchedEpisodes.some(
                                    (ep: any) =>
                                      ep.seasonNum ===
                                        selectedSeason.seasonNumber &&
                                      ep.episodeNum === episode.episodeNumber,
                                  );
                                  return (
                                    <div
                                      key={episode.id}
                                      className={cn(
                                        "flex items-center gap-4 p-3 hover:bg-muted/20 transition-colors group cursor-pointer rounded-lg",
                                        watched && "bg-primary/5",
                                      )}
                                      onClick={(): Promise<void> =>
                                        toggleEpisode(
                                          selectedSeason.seasonNumber,
                                          episode.episodeNumber,
                                        )
                                      }
                                    >
                                      <div
                                        className={cn(
                                          "shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                          watched
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : "border-border",
                                        )}
                                      >
                                        {watched && (
                                          <Check className="size-3.5" />
                                        )}
                                      </div>
                                      {episode.thumbnail && (
                                        <div className="relative w-16 md:w-24 aspect-16/10 rounded-lg overflow-hidden shrink-0 border border-border/30 bg-muted">
                                          <Image
                                            src={
                                              episode.thumbnail.startsWith(
                                                "http",
                                              )
                                                ? episode.thumbnail
                                                : `https://www.thetvdb.com${episode.thumbnail}`
                                            }
                                            alt={
                                              episode.titlePrimary ?? "Episode"
                                            }
                                            fill
                                            sizes="(max-width: 768px) 64px, 96px"
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                          />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-bold text-foreground">
                                            {episode.episodeNumber}.{" "}
                                            {episode.titlePrimary}
                                          </span>
                                          {episode.airDate && (
                                            <span className="text-[10px] text-muted-foreground font-medium">
                                              {new Date(
                                                episode.airDate,
                                              ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                              })}
                                            </span>
                                          )}
                                        </div>
                                        {episode.description && (
                                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                            {episode.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </>
                        )}
                      </DialogContent>
                    </Dialog>
                  </motion.div>
                )}

                {/* Relations */}
                {relations.length > 0 && (
                  <RrMediaRelations relations={relations} />
                )}

                {/* Similar Series Carousel */}
                <RrMediaSimilar mediaType="tv" mediaId={id} />

                {/* Trailer & Friends Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <RrMediaTrailer trailer={trailerObj} />
                  <RrMediaFriendsProgress
                    mediaId={tv.id.toString()}
                    mediaType="tv"
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

              {/* Episodes Tab Content */}
              <TabsContent value="episodes" className="space-y-6 outline-none">
                {/* Season Pills Filter */}
                {tv.seasons && tv.seasons.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none mb-4 bg-card/45 border border-border/30 p-2 rounded-2xl">
                    <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0 pl-1">
                      {t("aquila.season", "Season")}:
                    </span>
                    <Button
                      variant={
                        activeSeasonFilter === null ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setActiveSeasonFilter(null)}
                      className="rounded-xl text-xs h-7 px-2.5 font-semibold cursor-pointer shrink-0"
                    >
                      {t("aquila.allSeasons", "All Seasons")}
                    </Button>
                    {tv.seasons.map((season) => (
                      <Button
                        key={season.id}
                        variant={
                          activeSeasonFilter === season.seasonNumber
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setActiveSeasonFilter(season.seasonNumber)
                        }
                        className="rounded-xl text-xs h-7 px-2.5 font-semibold cursor-pointer shrink-0"
                      >
                        {t("aquila.seasonName", {
                          number: season.seasonNumber,
                        })}
                      </Button>
                    ))}
                  </div>
                )}

                {(() => {
                  const episodesList = (tv.episodes ?? []).filter((ep) =>
                    activeSeasonFilter === null
                      ? true
                      : ep.seasonNumber === activeSeasonFilter,
                  );

                  if (episodesList.length === 0) {
                    return (
                      <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
                        {t(
                          "aquila.noEpisodes",
                          "No episode information available",
                        )}
                      </div>
                    );
                  }

                  // Group episodes by seasonNumber
                  const seasonsMap = new Map<number, typeof episodesList>();
                  for (const ep of episodesList) {
                    const sNum = ep.seasonNumber ?? 1;
                    if (!seasonsMap.has(sNum)) {
                      seasonsMap.set(sNum, []);
                    }
                    seasonsMap.get(sNum)!.push(ep);
                  }

                  const sortedSeasonNumbers = Array.from(
                    seasonsMap.keys(),
                  ).sort((a, b) => a - b);

                  return (
                    <div className="space-y-8">
                      {sortedSeasonNumbers.map((seasonNum) => {
                        const seasonEps = seasonsMap
                          .get(seasonNum)!
                          .sort((a, b) => a.episodeNumber - b.episodeNumber);

                        const seasonObj = tv.seasons?.find(
                          (s) => s.seasonNumber === seasonNum,
                        );
                        const seasonTitle =
                          seasonObj?.titlePrimary ||
                          t("aquila.seasonName", { number: seasonNum });

                        return (
                          <div key={seasonNum} className="space-y-4">
                            {/* Season Section Header */}
                            <div className="flex items-center justify-between border-b border-border/30 pb-2">
                              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <span>{seasonTitle}</span>
                                <Badge
                                  variant="secondary"
                                  className="text-xs rounded-lg"
                                >
                                  {t("aquila.episodesCount", {
                                    count: seasonEps.length,
                                  })}
                                </Badge>
                              </h3>
                            </div>

                            {/* Episode Grid for this Season */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {seasonEps.map((ep) => {
                                const displayTitle =
                                  ep.titlePrimary ||
                                  ep.titleSecondary ||
                                  `${t("aquila.episode", "Episode")} ${ep.episodeNumber}`;
                                const formattedAirDate = ep.airDate
                                  ? new Date(ep.airDate).toLocaleDateString(
                                      undefined,
                                      {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )
                                  : null;

                                const rawImg =
                                  ep.thumbnail ||
                                  (ep as any).stillPath ||
                                  (ep as any).still_path ||
                                  (ep as any).image ||
                                  (ep as any).coverImage;

                                const epImage = rawImg
                                  ? rawImg.startsWith("http")
                                    ? rawImg
                                    : `https://www.thetvdb.com${rawImg.startsWith("/") ? "" : "/"}${rawImg}`
                                  : coverUrl;

                                return (
                                  <div
                                    key={ep.id}
                                    className="flex flex-col bg-card/45 border border-border/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-xs"
                                  >
                                    <div className="flex items-center gap-3 p-3">
                                      {/* Thumbnail */}
                                      <div className="relative w-28 sm:w-32 aspect-16/9 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/20 shadow-xs">
                                        {epImage ? (
                                          <Image
                                            src={epImage}
                                            alt={displayTitle}
                                            fill
                                            sizes="128px"
                                            className="object-cover"
                                          />
                                        ) : (
                                          <div className="size-full flex items-center justify-center bg-muted/40 text-muted-foreground/60">
                                            <Film className="size-6" />
                                          </div>
                                        )}
                                        <div className="absolute top-1 left-1 bg-black/75 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-xs z-10">
                                          S{ep.seasonNumber} E{ep.episodeNumber}
                                        </div>
                                      </div>

                                      {/* Details */}
                                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                        <p
                                          className="text-xs sm:text-sm font-bold text-foreground truncate"
                                          title={displayTitle}
                                        >
                                          {displayTitle}
                                        </p>

                                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                                          {ep.duration && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="size-3 text-primary/80" />
                                              {ep.duration} m
                                            </span>
                                          )}
                                          {formattedAirDate && (
                                            <span className="flex items-center gap-1">
                                              <Calendar className="size-3 text-muted-foreground/80" />
                                              {formattedAirDate}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {ep.description && (
                                      <div className="px-3 pb-3 pt-1 text-xs text-muted-foreground/80 border-t border-border/20 bg-muted/10 leading-relaxed line-clamp-2">
                                        {ep.description}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </TabsContent>

              {/* Images Tab Content */}
              <TabsContent value="images" className="space-y-6 outline-none">
                <RrMediaImages anime={tv as any} />
              </TabsContent>

              {/* Stats Tab Content */}
              <TabsContent value="stats" className="space-y-6 outline-none">
                <RrMediaStatsDashboard
                  localAverageScore={tv.averageScore}
                  localPopularity={tv.popularity}
                  localFavoritesCount={tv.favorites}
                  localStatusDistribution={tv.statusDistribution}
                  localScoreDistribution={tv.scoreDistribution}
                  showCounters={true}
                />
              </TabsContent>

              {/* Reviews Tab Content */}
              <TabsContent value="reviews" className="space-y-6 outline-none">
                <RrMediaReviews mediaType={MediaType.TV} mediaId={Number(id)} />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

        {/* Media Footer */}
        <RrMediaFooter
          providers={providers}
          updatedAt={tv.updatedAt}
          mediaType="tv"
          mediaId={Number(id)}
          mediaData={{
            ...tv,
            relations: tv.relations ?? [],
            characters: tv.characters || [],
          }}
        />
      </div>
    </div>
  );
}
