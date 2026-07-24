"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Check,
  Star,
  Heart,
  Users,
  ChevronDown,
  ChevronUp,
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
import { TvEntity } from "@/types/tv.entities";
import { RrMediaInfoRow } from "@/components/rrComponents/aquila/details/rrMediaInfoRow";
import { RrMediaFriendsProgress } from "@/components/rrComponents/aquila/details/rrMediaFriendsProgress";
import { RrMediaDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";
import { RrMediaGenres } from "@/components/rrComponents/aquila/details/rrMediaGenres";
import { RrMediaCharacters } from "@/components/rrComponents/aquila/details/rrMediaCharacters";
import { RrMediaStatsDashboard } from "@/components/rrComponents/aquila/details/rrMediaStatsDashboard";
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

  // SWR queries replacing sequential imperative fetching
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

  const titleEnglish = tv?.titleEnglish ?? "";
  const titleRomaji = tv?.titleRomaji ?? "";
  const titleNative = tv?.titleNative ?? "";
  const displayTitle = titleEnglish || titleRomaji || t("aquila.tvDetails");
  const coverUrl = tv?.coverImage ?? "";
  const bannerUrl = tv?.bannerImage ?? "";

  const providers = useMemo(() => {
    const list: { name: string; url: string }[] = [];
    if (tv?.tvdbId) {
      list.push({
        name: "TheTVDB",
        url: `https://thetvdb.com/dereferrer/series/${tv.tvdbId}`,
      });
    }
    return list;
  }, [tv]);

  const trailerObj = useMemo(() => {
    if (!tv?.trailers || tv.trailers.length === 0) return null;
    const first = tv.trailers[0];
    let youtubeId = first.id;
    if (first.url && first.url.includes("youtube.com/watch?v=")) {
      youtubeId = first.url.split("watch?v=")[1]?.split("&")[0] || first.id;
    } else if (first.url && first.url.includes("youtu.be/")) {
      youtubeId = first.url.split("youtu.be/")[1]?.split("?")[0] || first.id;
    }
    return { id: youtubeId, site: "youtube" };
  }, [tv]);

  const formattedFirstAired = useMemo((): string | null => {
    if (!tv?.firstAired) return null;
    try {
      return new Date(tv.firstAired).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return tv.firstAired;
    }
  }, [tv?.firstAired]);

  const characters = useMemo(() => {
    if (!tv?.characters) return [];
    return tv.characters.map((tc) => ({
      id: tc.id,
      name: tc.name || t("aquila.unknownCharacter"),
      native: "",
      role: tc.role || "Actor",
      image: tc.image || "",
      voiceActor: tc.actorId
        ? {
            id: tc.actorId,
            name: tc.personName || t("aquila.unknownActor"),
            image: tc.image || "",
            role: "Actor",
          }
        : null,
    }));
  }, [tv, t]);

  useEffect((): void => {
    if (!tv) return;
    document.title = `Aquila > TV > ${titleEnglish || titleRomaji || ""}`;
  }, [tv, titleEnglish, titleRomaji]);

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

  const totalEpisodes = useMemo((): number => {
    if (!tv) return 0;
    return tv.seasons?.reduce((acc, s) => acc + s.episodeCount, 0) ?? 0;
  }, [tv]);

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

  const networks = tv.studios
    ? tv.studios
        .map((s) => (typeof s === "string" ? s : (s as any)?.name))
        .filter(Boolean)
    : [];

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
            alt={titleRomaji || "Banner"}
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
                    alt={titleRomaji || "Cover"}
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
                        title: { english: titleEnglish, romaji: titleRomaji },
                        coverImage: { large: coverUrl },
                        seasons: tv.seasons ?? undefined,
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
              {(titleEnglish && titleEnglish !== displayTitle) ||
              (titleRomaji && titleRomaji !== displayTitle) ||
              titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs")}{" "}
                  {[
                    titleEnglish && titleEnglish !== displayTitle
                      ? titleEnglish
                      : null,
                    titleRomaji && titleRomaji !== displayTitle
                      ? titleRomaji
                      : null,
                    titleNative,
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
                        {tv.localAverageScore
                          ? tv.localAverageScore.toFixed(1)
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
                        title={
                          tv.localFavoritesCount != null
                            ? tv.localFavoritesCount.toLocaleString()
                            : "0"
                        }
                      >
                        {formatCompactNumber(tv.localFavoritesCount)}
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
                        title={
                          tv.localPopularity != null
                            ? tv.localPopularity.toLocaleString()
                            : "0"
                        }
                      >
                        {formatCompactNumber(tv.localPopularity)}
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
                    value={tv.originalCountry}
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
                      tv.contentRating ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5"
                        >
                          {tv.contentRating}
                        </Badge>
                      ) : null
                    }
                  />
                  {networks.length > 0 && (
                    <RrMediaInfoRow
                      label={t("aquila.networks")}
                      value={
                        <span
                          className="text-right text-xs max-w-37.5 truncate block"
                          title={networks.join(", ")}
                        >
                          {networks.join(", ")}
                        </span>
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-6 lg:pt-8 min-w-0">
            {/* Header (Desktop) */}
            <motion.div
              variants={itemVariants}
              className="space-y-2 hidden lg:block"
            >
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {displayTitle}
              </h1>
              {(titleEnglish && titleEnglish !== displayTitle) ||
              (titleRomaji && titleRomaji !== displayTitle) ||
              titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs")}{" "}
                  {[
                    titleEnglish && titleEnglish !== displayTitle
                      ? titleEnglish
                      : null,
                    titleRomaji && titleRomaji !== displayTitle
                      ? titleRomaji
                      : null,
                    titleNative,
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

            {/* Characters */}
            {characters && characters.length > 0 && (
              <RrMediaCharacters characters={characters} />
            )}

            {/* Seasons List & Modal */}
            {tv.seasons && tv.seasons.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-lg font-bold text-foreground">
                  {t("aquila.seasons")}
                </h3>
                <div className="max-h-96.25 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                  {tv.seasons.map((season) => {
                    const watchedInSeason = watchedEpisodes.filter(
                      (ep: any) => ep.seasonNum === season.number,
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
                            {season.image || coverUrl ? (
                              <Image
                                src={season.image || coverUrl}
                                alt={
                                  season.name ||
                                  t("aquila.seasonName", {
                                    number: season.number,
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
                                  number: season.number,
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
                                number: selectedSeason.number,
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
                            {titleEnglish}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto custom-scrollbar my-2 divide-y divide-border/20 pr-1">
                          {selectedSeason.episodes?.map((episode: any) => {
                            const watched = watchedEpisodes.some(
                              (ep: any) =>
                                ep.seasonNum === selectedSeason.number &&
                                ep.episodeNum === episode.number,
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
                                    selectedSeason.number,
                                    episode.number,
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
                                  {watched && <Check className="size-3.5" />}
                                </div>
                                {episode.image && (
                                  <div className="relative w-16 md:w-24 aspect-16/10 rounded-lg overflow-hidden shrink-0 border border-border/30 bg-muted">
                                    <Image
                                      src={
                                        episode.image.startsWith("http")
                                          ? episode.image
                                          : `https://www.thetvdb.com${episode.image}`
                                      }
                                      alt={episode.name}
                                      fill
                                      sizes="(max-width: 768px) 64px, 96px"
                                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-foreground">
                                      {episode.number}. {episode.name}
                                    </span>
                                    {episode.airDate && (
                                      <span className="text-[10px] text-muted-foreground font-medium">
                                        {episode.airDate}
                                      </span>
                                    )}
                                  </div>
                                  {episode.overview && (
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                      {episode.overview}
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

            {/* Stats Dashboard (Score & Status distribution charts) */}
            <RrMediaStatsDashboard
              localAverageScore={tv.localAverageScore}
              localPopularity={tv.localPopularity}
              localFavoritesCount={tv.localFavoritesCount}
              localStatusDistribution={tv.localStatusDistribution}
              localScoreDistribution={tv.localScoreDistribution}
              showCounters={false}
            />

            {/* Trailer & Friends Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              <RrMediaTrailer trailer={trailerObj} />
              <RrMediaFriendsProgress
                mediaId={tv.id.toString()}
                mediaType="tv"
              />
            </div>
          </div>
        </motion.div>

        {/* Media Footer */}
        <RrMediaFooter providers={providers} updatedAt={tv.updatedAt} />
      </div>
    </div>
  );
}
