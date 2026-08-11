"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";
import {
  Star,
  Heart,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink as ExternalLinkIcon,
  ShieldAlert,
  LayoutGrid,
  UserCheck,
  Film,
  Tv,
  BarChart3,
  ImageIcon,
  MessageSquare,
} from "lucide-react";
import { MediaType } from "@/types/aquila";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { fetcher } from "@/lib/fetcher";
import { AnimeEntity } from "@/types/anime.entities";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import { RrMediaRefreshButton } from "@/components/rrComponents/aquila/rrMediaRefreshButton";

// Import reusable details components
import { RrMediaCountdownTimer } from "@/components/rrComponents/aquila/details/rrMediaCountdownTimer";
import { RrMediaStatsDashboard } from "@/components/rrComponents/aquila/details/rrMediaStatsDashboard";
import { RrMediaDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";
import { RrMediaReviews } from "@/components/rrComponents/aquila/details/rrMediaReviews";
import { RrMediaRecommendations } from "@/components/rrComponents/aquila/details/rrMediaRecommendations";
import { RrMediaGenres } from "@/components/rrComponents/aquila/details/rrMediaGenres";
import { RrMediaCharacters } from "@/components/rrComponents/aquila/details/rrMediaCharacters";
import { RrMediaRelations } from "@/components/rrComponents/aquila/details/rrMediaRelations";
import { RrMediaSimilar } from "@/components/rrComponents/aquila/details/rrMediaSimilar";
import { RrMediaEpisodes } from "@/components/rrComponents/aquila/details/rrMediaEpisodes";
import { RrMediaThemeSongs } from "@/components/rrComponents/aquila/details/rrMediaThemeSongs";
import { RrMediaStaff } from "@/components/rrComponents/aquila/details/rrMediaStaff";
import { RrMediaImages } from "@/components/rrComponents/aquila/details/rrMediaImages";

import { RrMediaInfoRow } from "@/components/rrComponents/aquila/details/rrMediaInfoRow";
import { RrMediaFriendsProgress } from "@/components/rrComponents/aquila/details/rrMediaFriendsProgress";
import { RrMediaTrailer } from "@/components/rrComponents/aquila/details/rrMediaTrailer";
import { RrMediaFooter } from "@/components/rrComponents/aquila/details/rrMediaFooter";
import { RrMediaDetailsSkeleton } from "@/components/rrComponents/aquila/details/rrMediaDetailsSkeleton";
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

export default function AnimeDetailsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [showMoreInfo, setShowMoreInfo] = useState<boolean>(false);
  const [showAllSynonyms, setShowAllSynonyms] = useState<boolean>(false);
  const [selectedVaLanguage, setSelectedVaLanguage] =
    useState<string>("Japanese");

  // SWR query for V2 Anime
  const {
    data: anime,
    error: animeError,
    isLoading: animeLoading,
    mutate: mutateAnime,
  } = useSWR<AnimeEntity>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/anime/${id}` : null,
    fetcher,
  );

  const { data: listEntry, mutate: mutateListEntry } = useSWR<ListEntry>(
    id && session.status === "authenticated" && session.data?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/list/anime/entry/${id}`,
          session.data.accessToken,
        ]
      : null,
    fetcher,
    { shouldRetryOnError: false },
  );

  const hasListEntry = !!listEntry;
  const isUserFavorite = !!(listEntry as any)?.isFavorite;

  const displayTitle =
    anime?.titlePrimary ||
    anime?.titleSecondary ||
    t("aquila.animeDetails", "Anime Details");
  const coverUrl =
    anime?.coverImage ||
    anime?.images?.anilist?.cover?.extraLarge ||
    anime?.images?.anilist?.cover?.large ||
    "";
  const bannerUrl = anime?.bannerImage || anime?.images?.anilist?.banner || "";

  const displayFavorites = useMemo(() => {
    if (!anime) return 0;
    const base = Math.max(anime.favorites ?? 0, anime.localFavoritesCount ?? 0);
    if (isUserFavorite && base === 0) return 1;
    return base;
  }, [anime, isUserFavorite]);

  const displayPopularity = useMemo(() => {
    if (!anime) return 0;
    const base = Math.max(anime.popularity ?? 0, anime.localPopularity ?? 0);
    if (hasListEntry && base === 0) return 1;
    return base;
  }, [anime, hasListEntry]);

  // Local score only (strictly local averageScore)
  const localScore = anime?.averageScore;

  const providers = useMemo(() => {
    if (!anime) return [];
    const list: { name: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const addProvider = (name: string, url?: string | null) => {
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      list.push({ name, url });
    };

    if (anime.anilistId) {
      addProvider("AniList", `https://anilist.co/anime/${anime.anilistId}`);
    }
    if (anime.malId) {
      addProvider(
        "MyAnimeList",
        `https://myanimelist.net/anime/${anime.malId}`,
      );
    }
    if (anime.aniDBId) {
      addProvider("AniDB", `https://anidb.net/anime/${anime.aniDBId}`);
    }
    if (anime.tvDBId) {
      addProvider(
        "TheTVDB",
        `https://thetvdb.com/dereferrer/series/${anime.tvDBId}`,
      );
    }
    if (anime.bangumiId) {
      addProvider("Bangumi", `https://bgm.tv/subject/${anime.bangumiId}`);
    }
    if (anime.sources) {
      for (const src of anime.sources) {
        if (src.url && src.provider) {
          addProvider(src.provider, src.url);
        }
      }
    }
    return list;
  }, [anime]);

  const studios = useMemo(() => {
    if (!anime?.studios) return [];
    return anime.studios
      .map((as) => as.studio?.name)
      .filter(Boolean) as string[];
  }, [anime]);

  const animeStartDate = useMemo(() => {
    if (!anime?.startDateYear) return null;
    const parts = [
      anime.startDateYear,
      anime.startDateMonth
        ? String(anime.startDateMonth).padStart(2, "0")
        : null,
      anime.startDateDay ? String(anime.startDateDay).padStart(2, "0") : null,
    ].filter(Boolean);
    return parts.join("-");
  }, [anime]);

  const animeEndDate = useMemo(() => {
    if (!anime?.endDateYear) return null;
    const parts = [
      anime.endDateYear,
      anime.endDateMonth ? String(anime.endDateMonth).padStart(2, "0") : null,
      anime.endDateDay ? String(anime.endDateDay).padStart(2, "0") : null,
    ].filter(Boolean);
    return parts.join("-");
  }, [anime]);

  // Extract available voice actor languages
  const vaLanguages = useMemo(() => {
    if (!anime?.characters) return [];
    const set = new Set<string>();
    for (const ac of anime.characters) {
      if (ac.actor?.language) {
        set.add(ac.actor.language);
      }
    }
    return Array.from(set).sort();
  }, [anime]);

  // Characters grouped with selected voice actor by language
  const characters = useMemo(() => {
    if (!anime?.characters) return [];

    const charMap = new Map<
      number,
      {
        ac: (typeof anime.characters)[0];
        actors: Array<{
          actor: NonNullable<(typeof anime.characters)[0]["actor"]>;
          role: string | null;
        }>;
      }
    >();

    for (const ac of anime.characters) {
      if (!ac.character) continue;
      const charId = ac.character.id;
      if (!charMap.has(charId)) {
        charMap.set(charId, { ac, actors: [] });
      }
      const entry = charMap.get(charId)!;
      if (ac.actor) {
        entry.actors.push({ actor: ac.actor, role: ac.role });
      }
    }

    const list = [];
    for (const { ac, actors } of charMap.values()) {
      const char = ac.character;

      let chosenActor = actors.find(
        (a) =>
          a.actor.language?.toLowerCase() === selectedVaLanguage.toLowerCase(),
      )?.actor;
      if (!chosenActor && selectedVaLanguage !== "Japanese") {
        chosenActor = actors.find(
          (a) => a.actor.language?.toLowerCase() === "japanese",
        )?.actor;
      }
      if (!chosenActor && actors.length > 0) {
        chosenActor = actors[0].actor;
      }

      list.push({
        id: ac.id || `${char.id}_${chosenActor?.id || 0}`,
        characterId: char.id,
        name:
          char.namePrimary ||
          char.nameNative ||
          t("aquila.unknownCharacter", "Unknown Character"),
        native: char.nameNative ?? "",
        image: char.image ?? "",
        role: ac.role ?? "",
        description: char.description ?? "",
        gender: char.gender ?? "",
        age: char.age ?? "",
        bloodType: char.bloodType ?? "",
        dateOfBirth: {
          year: char.dateOfBirthYear,
          month: char.dateOfBirthMonth,
          day: char.dateOfBirthDay,
        },
        nameAlternative: char.nameAlternative ?? [],
        nameAlternativeSpoiler: char.nameAlternativeSpoiler ?? [],
        voiceActor: chosenActor
          ? {
              id: chosenActor.id,
              name:
                chosenActor.namePrimary ||
                chosenActor.nameNative ||
                t("aquila.unknownActor", "Unknown Actor"),
              image: chosenActor.image ?? "",
              role: chosenActor.language
                ? `${chosenActor.language} Voice`
                : "Voice Actor",
            }
          : null,
        allActors: actors,
      });
    }

    return list.sort((a, b) => {
      const aMain = a.role?.toUpperCase() === "MAIN" ? 1 : 0;
      const bMain = b.role?.toUpperCase() === "MAIN" ? 1 : 0;
      return bMain - aMain;
    });
  }, [anime, selectedVaLanguage, t]);

  const relations = useMemo(() => {
    if (!anime?.relations) return [];
    return anime.relations.map((rel) => {
      const target = rel.targetMedia;
      const relType = rel.relationType || rel.type || "";
      const mediaType = rel.targetType || rel.sourceType || "ANIME";
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
  }, [anime]);

  useEffect((): void => {
    if (!anime) return;
    document.title = `Aquila > Anime > ${displayTitle}`;
  }, [anime, displayTitle]);

  if (animeLoading) {
    return <RrMediaDetailsSkeleton />;
  }

  if (animeError || !anime) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center gap-4">
        <div className="absolute top-0 right-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground z-10">
          {t("aquila.animeNotFound", "Anime not found")}
        </h2>
        <Button asChild variant="default" className="z-10 rounded-xl">
          <Link href="/aquila/browse">
            {t("aquila.backToBrowse", "Back to Browse")}
          </Link>
        </Button>
      </div>
    );
  }

  const handleQuickAdd = async (): Promise<void> => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/anime/entry/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            animeId: Number(id),
            status: "PLANNING",
          }),
        },
      );
      if (res.ok) {
        toast.success(t("aquila.addedToList", "Added to list!"));
        mutateListEntry();
      } else {
        toast.error(t("aquila.failedAddToList", "Failed to add to list"));
      }
    } catch {
      toast.error(t("aquila.failedAddToList", "Failed to add to list"));
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
                          {t("aquila.quickAdd", "Quick Add")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer rounded-xl bg-card/80 backdrop-blur-sm"
                          size="default"
                          onClick={(): void => setIsDialogOpen(true)}
                        >
                          {t("aquila.addToList", "Add to List")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full cursor-pointer rounded-xl font-semibold"
                        size="default"
                        onClick={(): void => setIsDialogOpen(true)}
                      >
                        {t("aquila.editEntry", "Edit Entry")}
                      </Button>
                    )}
                    <RrMediaEditDialog
                      media={{
                        id: anime.id.toString(),
                        type: "anime",
                        title: {
                          english: anime.titlePrimary,
                          romaji: anime.titleSecondary ?? "",
                        },
                        coverImage: { large: coverUrl },
                        episodes:
                          anime.episodeCount ??
                          (anime.episodes?.length || undefined),
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
                      mediaType="anime"
                      mediaId={anime.id.toString()}
                      onRefreshed={(): void => {
                        void mutateAnime();
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
              {anime.titleSecondary || anime.titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs", "Also known as:")}{" "}
                  {[anime.titleSecondary, anime.titleNative]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </div>

            {/* Media Metadata Stats Sidebar */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              {/* Top Key Stats Block */}
              <div className="space-y-2.5">
                {/* Average Score Card */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 transition-all shadow-xs">
                  <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
                    <Star className="size-5 fill-primary/40" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {t("aquila.averageScore", "Average Score")}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-black text-primary leading-none">
                        {localScore != null ? localScore.toFixed(1) : "N/A"}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        / 10
                      </span>
                    </div>
                  </div>
                </div>

                {/* Favorites & Popularity */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 transition-colors min-w-0">
                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
                      <Heart className="size-4 fill-rose-500/40" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-rose-500/90 uppercase tracking-wider truncate">
                        {t("aquila.favorites", "Favorites")}
                      </span>
                      <span
                        className="text-base font-extrabold text-foreground tracking-tight leading-none mt-0.5"
                        title={displayFavorites.toLocaleString()}
                      >
                        {formatCompactNumber(displayFavorites)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 transition-colors min-w-0">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500 shrink-0">
                      <Users className="size-4 fill-blue-500/40" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-blue-500/90 uppercase tracking-wider truncate">
                        {t("aquila.popularity", "Popularity")}
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
                  {showMoreInfo
                    ? t("aquila.showLess", "Show Less")
                    : t("aquila.showMore", "Show More")}
                </span>
                {showMoreInfo ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </Button>

              {/* Information Details */}
              <div
                className={cn(
                  "space-y-4 pt-2 border-t border-border/40",
                  showMoreInfo ? "block" : "hidden lg:block",
                )}
              >
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("aquila.information", "Information")}
                </h3>
                <div className="space-y-3">
                  <RrMediaInfoRow
                    label={t("aquila.format", "Format")}
                    value={anime.format}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.episodes")}
                    value={
                      anime.episodeCount || (anime.episodes?.length ?? "?")
                    }
                  />
                  <RrMediaInfoRow
                    label={t("aquila.duration")}
                    value={
                      anime.episodeDuration
                        ? `${anime.episodeDuration} mins`
                        : "?"
                    }
                  />
                  <RrMediaInfoRow
                    label={t("aquila.status")}
                    value={
                      anime.status
                        ? t(`aquila.statuses.${anime.status.toUpperCase()}`)
                        : "?"
                    }
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.season")}
                    value={
                      anime.seasonSeason
                        ? `${anime.seasonSeason.toLowerCase()} ${anime.seasonYear ?? ""}`
                        : null
                    }
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.source")}
                    value={
                      anime.source?.replace(/_/g, " ").toLowerCase() || "?"
                    }
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.studiosLabel")}
                    value={
                      studios && studios.length > 0 ? (
                        <span
                          className="text-right text-xs max-w-37.5 truncate block"
                          title={studios.join(", ")}
                        >
                          {studios.join(", ")}
                        </span>
                      ) : null
                    }
                  />
                  {anime.ageRating && (
                    <RrMediaInfoRow
                      label={t("aquila.ageRating")}
                      value={
                        <span className="inline-flex items-center gap-1">
                          <span>
                            {anime.ageRating}{" "}
                            {anime.ageRatingGuide
                              ? `(${anime.ageRatingGuide})`
                              : ""}
                          </span>
                        </span>
                      }
                    />
                  )}
                  <RrMediaInfoRow
                    label={t("aquila.startDate")}
                    value={animeStartDate}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.endDate")}
                    value={animeEndDate}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.country")}
                    value={anime.countryOfOrigin}
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.hashtag")}
                    value={anime.hashtag}
                    className="text-primary"
                  />
                  {anime.synonyms && anime.synonyms.length > 0 && (
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground text-xs">
                        {t("aquila.synonymsLabel")}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {anime.synonyms
                          .slice(0, showAllSynonyms ? undefined : 4)
                          .map((syn, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[10px] max-w-full truncate block bg-muted/20"
                              title={syn}
                            >
                              {syn}
                            </Badge>
                          ))}
                      </div>
                      {anime.synonyms.length > 4 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllSynonyms(!showAllSynonyms)}
                          className="h-6 text-[10px] p-0 text-muted-foreground hover:text-foreground cursor-pointer self-start mt-1 font-semibold"
                        >
                          {showAllSynonyms
                            ? t("aquila.showLess", "Show Less")
                            : `+${anime.synonyms.length - 4} ${t("aquila.more", "More")}`}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-6 lg:pt-8 min-w-0">
            {/* Countdown timer */}
            {anime.status === "RELEASING" && anime.nextAiringAt && (
              <RrMediaCountdownTimer
                airingAt={Math.floor(
                  new Date(anime.nextAiringAt).getTime() / 1000,
                )}
                episode={anime.nextAiringEpisodeNumber ?? 1}
              />
            )}

            {/* Header (Desktop) */}
            <motion.div
              variants={itemVariants}
              className="space-y-2 hidden lg:block"
            >
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {displayTitle}
              </h1>
              {anime.titleSecondary || anime.titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs", "Also known as:")}{" "}
                  {[anime.titleSecondary, anime.titleNative]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </motion.div>

            {/* External Links / Streaming Badges */}
            {anime.externalLinks && anime.externalLinks.length > 0 && (
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-2 flex-wrap"
              >
                {anime.externalLinks.map((link, idx) => (
                  <Button
                    key={idx}
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs rounded-xl bg-card/60 border-border/30 hover:bg-accent/20 cursor-pointer"
                  >
                    <Link href={link.url} target="_blank" rel="noreferrer">
                      {link.icon ? (
                        <Image
                          src={link.icon}
                          alt={link.site}
                          width={14}
                          height={14}
                          className="rounded-xs"
                        />
                      ) : (
                        <ExternalLinkIcon className="size-3.5 text-primary" />
                      )}
                      <span>{link.site}</span>
                    </Link>
                  </Button>
                ))}
              </motion.div>
            )}

            {/* Description */}
            <RrMediaDescription description={anime.description} />

            {/* Genres */}
            <RrMediaGenres genres={anime.genres} />

            {/* Tabs Navigation under Description */}
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
                  value="trailers"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <Tv className="size-3.5 mr-1.5" />
                  {t("aquila.trailers")}
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
                {/* Overview Characters (first 10, MAIN role prioritized) */}
                {characters && characters.length > 0 && (
                  <RrMediaCharacters
                    characters={characters}
                    limitCount={10}
                    hideToggleButton={true}
                  />
                )}

                {/* Theme Songs */}
                <RrMediaThemeSongs themeSongs={anime.themeSongs} />

                {/* Relations */}
                {relations && relations.length > 0 && (
                  <RrMediaRelations relations={relations} />
                )}

                {/* Similar Series Carousel */}
                <RrMediaSimilar mediaType="anime" mediaId={id} />

                {/* Friend Progress */}
                <RrMediaFriendsProgress
                  mediaId={anime.id.toString()}
                  mediaType="anime"
                />
              </TabsContent>

              {/* Characters Tab Content */}
              <TabsContent
                value="characters"
                className="space-y-6 outline-none"
              >
                {/* Voice Actor Language Filter */}
                {vaLanguages.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none mb-4 bg-card/45 border border-border/30 p-2 rounded-2xl">
                    <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0 pl-1">
                      {t("aquila.voiceActorLanguage")}:
                    </span>
                    {vaLanguages.map((lang) => (
                      <Button
                        key={lang}
                        variant={
                          selectedVaLanguage === lang ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setSelectedVaLanguage(lang)}
                        className="rounded-xl text-xs h-7 px-2.5 font-semibold cursor-pointer shrink-0"
                      >
                        {t(`aquila.languages.${lang.toUpperCase()}`)}
                      </Button>
                    ))}
                  </div>
                )}
                {characters && characters.length > 0 ? (
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
                {anime.staff && anime.staff.length > 0 ? (
                  <RrMediaStaff staff={anime.staff} showAllInitial={true} />
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
                    {t("aquila.noStaff", "No staff information available")}
                  </div>
                )}
              </TabsContent>

              {/* Episodes Tab Content */}
              <TabsContent value="episodes" className="space-y-6 outline-none">
                {(anime.episodes?.length > 0 || anime.airingSchedule?.length > 0) ? (
                  <RrMediaEpisodes
                    episodes={anime.episodes}
                    airingSchedule={anime.airingSchedule}
                    showAllInitial={true}
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
                    {t("aquila.noEpisodes", "No episode information available")}
                  </div>
                )}
              </TabsContent>

              {/* Images Tab Content */}
              <TabsContent value="images" className="space-y-6 outline-none">
                <RrMediaImages anime={anime} />
              </TabsContent>

              {/* Trailers Tab Content */}
              <TabsContent value="trailers" className="space-y-6 outline-none">
                {anime.trailers && anime.trailers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {anime.trailers.map((tr, idx) => (
                      <RrMediaTrailer key={tr.id || idx} trailer={tr} />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
                    {t("aquila.noTrailers", "No trailer available")}
                  </div>
                )}
              </TabsContent>

              {/* Stats Tab Content */}
              <TabsContent value="stats" className="space-y-6 outline-none">
                <RrMediaStatsDashboard
                  localAverageScore={localScore}
                  localPopularity={displayPopularity}
                  localFavoritesCount={displayFavorites}
                  localStatusDistribution={
                    anime.localStatusDistribution || anime.statusDistribution
                  }
                  localScoreDistribution={
                    anime.localScoreDistribution || anime.scoreDistribution
                  }
                  alAverageScore={anime.alAverageScore}
                  alFavorites={anime.alFavorites}
                  alPopularity={anime.alPopularity}
                  malAverageScore={anime.malAverageScore}
                  malFavorites={anime.malFavorites}
                  malPopularity={anime.malPopularity}
                  showCounters={true}
                />
              </TabsContent>

              {/* Reviews Tab Content */}
              <TabsContent value="reviews" className="space-y-6 outline-none">
                <RrMediaReviews mediaType={MediaType.ANIME} mediaId={Number(id)} />
              </TabsContent>

              {/* Recommendations Tab Content */}
              <TabsContent value="recommendations" className="space-y-6 outline-none">
                <RrMediaRecommendations mediaType={MediaType.ANIME} mediaId={Number(id)} />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

        {/* Media Footer */}
        <RrMediaFooter
          providers={providers}
          updatedAt={anime.updatedAt}
          mediaType="anime"
          mediaId={Number(id)}
          mediaData={{ ...anime, relations, characters }}
        />
      </div>
    </div>
  );
}
