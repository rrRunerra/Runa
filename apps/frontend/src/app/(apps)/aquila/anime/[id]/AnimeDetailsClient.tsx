"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";
import { Star, Heart, Users, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { fetcher } from "@/lib/fetcher";
import { AnimeEntity } from "@/types/anime.entities";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import { RrMediaRefreshButton } from "@/components/rrComponents/aquila/rrMediaRefreshButton";

// Import reusable details components
import { RrMediaCountdownTimer } from "@/components/rrComponents/aquila/details/rrMediaCountdownTimer";
import { RrMediaStatsDashboard } from "@/components/rrComponents/aquila/details/rrMediaStatsDashboard";
import { RrMediaDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";
import { RrMediaGenres } from "@/components/rrComponents/aquila/details/rrMediaGenres";
import { RrMediaCharacters } from "@/components/rrComponents/aquila/details/rrMediaCharacters";
import { RrMediaRelations } from "@/components/rrComponents/aquila/details/rrMediaRelations";
import { RrMediaInfoRow } from "@/components/rrComponents/aquila/details/rrMediaInfoRow";
import { RrMediaFriendsProgress } from "@/components/rrComponents/aquila/details/rrMediaFriendsProgress";
import { RrMediaTrailer } from "@/components/rrComponents/aquila/details/rrMediaTrailer";
import { RrMediaFooter } from "@/components/rrComponents/aquila/details/rrMediaFooter";
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

  // SWR queries replacing sequential imperative fetching
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

  const titleEnglish = anime?.titleEnglish ?? "";
  const titleRomaji = anime?.titleRomaji ?? "";
  const titleNative = anime?.titleNative ?? "";
  const displayTitle =
    titleEnglish || titleRomaji || t("aquila.animeDetails", "Anime Details");
  const coverUrl = anime?.coverImageLarge ?? "";
  const bannerUrl = anime?.bannerImage ?? "";

  const providers = useMemo(() => {
    const list: { name: string; url: string }[] = [];
    if (anime?.anilistId) {
      list.push({
        name: "AniList",
        url: `https://anilist.co/anime/${anime.anilistId}`,
      });
    }
    if (anime?.malId) {
      list.push({
        name: "MyAnimeList",
        url: `https://myanimelist.net/anime/${anime.malId}`,
      });
    }
    return list;
  }, [anime]);

  const studios = useMemo(() => {
    if (!anime) return [];
    return anime.animeStudios
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

  const characters = useMemo(() => {
    if (!anime) return [];
    return anime.animeCharacters
      .filter((ac) => ac.character)
      .map((ac) => {
        const char = ac.character!;
        const first = char.nameFirst ?? "";
        const last = char.nameLast ?? "";
        const name = [first, last].filter(Boolean).join(" ");
        return {
          id: char.id,
          name:
            name ||
            char.nameNative ||
            t("aquila.unknownCharacter", "Unknown Character"),
          first,
          last,
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
          voiceActor: ac.voiceActor
            ? {
                id: ac.voiceActor.id,
                name:
                  ac.voiceActor.name ||
                  ac.voiceActor.personName ||
                  t("aquila.unknownActor", "Unknown Actor"),
                image: ac.voiceActor.image ?? "",
                role: ac.voiceActor.peopleType ?? "Voice Actor",
              }
            : null,
        };
      });
  }, [anime, t]);

  const relations = useMemo(() => {
    if (!anime) return [];
    const combined: {
      id: number;
      relationType: string;
      title: { english: string; romaji: string; native: string };
      format: string;
      type: string;
      coverImage: string;
    }[] = [];

    anime.animeRelations.forEach((rel) => {
      const related = rel.relatedAnime ?? rel.relatedManga;
      if (related) {
        combined.push({
          id: related.id,
          relationType: rel.relationType ?? "",
          title: {
            english: related.titleEnglish ?? "",
            romaji: related.titleRomaji ?? "",
            native: related.titleNative ?? "",
          },
          format: related.format ?? "",
          type: rel.relatedAnime ? "ANIME" : "MANGA",
          coverImage: related.coverImageLarge ?? "",
        });
      }
    });

    return combined;
  }, [anime]);

  useEffect((): void => {
    if (!anime) return;
    document.title = `Aquila > Anime > ${titleEnglish || titleRomaji || ""}`;
  }, [anime, titleEnglish, titleRomaji]);

  if (animeLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center">
        <div className="absolute top-0 right-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin z-10" />
      </div>
    );
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
                        title: { english: titleEnglish, romaji: titleRomaji },
                        coverImage: { large: coverUrl },
                        episodes: anime.episodes ?? undefined,
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
              {(titleRomaji && titleRomaji !== titleEnglish) || titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs", "Also known as:")}{" "}
                  {[
                    titleRomaji !== titleEnglish ? titleRomaji : null,
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
                        {anime.localAverageScore
                          ? anime.localAverageScore.toFixed(1)
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
                          anime.localFavoritesCount != null
                            ? anime.localFavoritesCount.toLocaleString()
                            : "0"
                        }
                      >
                        {formatCompactNumber(anime.localFavoritesCount)}
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
                          anime.localPopularity != null
                            ? anime.localPopularity.toLocaleString()
                            : "0"
                        }
                      >
                        {formatCompactNumber(anime.localPopularity)}
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
                    label={t("aquila.format", "Format")}
                    value={anime.format}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.episodes", "Episodes")}
                    value={anime.episodes || "?"}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.duration", "Duration")}
                    value={
                      anime.duration
                        ? t("aquila.durationMinutes", "{{count}} mins", {
                            count: anime.duration,
                          })
                        : "?"
                    }
                  />
                  <RrMediaInfoRow
                    label={t("aquila.status", "Status")}
                    value={anime.status?.replace(/_/g, " ").toLowerCase()}
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.season", "Season")}
                    value={
                      anime.season
                        ? `${anime.season.toLowerCase()} ${anime.seasonYear ?? ""}`
                        : null
                    }
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.source", "Source")}
                    value={
                      anime.source?.replace(/_/g, " ").toLowerCase() || "?"
                    }
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.studiosLabel", "Studios")}
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
                  <RrMediaInfoRow
                    label={t("aquila.startDate", "Start Date")}
                    value={animeStartDate}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.endDate", "End Date")}
                    value={animeEndDate}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.country", "Country")}
                    value={anime.countryOfOrigin}
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.hashtag", "Hashtag")}
                    value={anime.hashtag}
                    className="text-primary"
                  />
                  {anime.synonyms && anime.synonyms.length > 0 && (
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">
                        {t("aquila.synonymsLabel", "Synonyms")}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {anime.synonyms.slice(0, 4).map((syn, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[10px] max-w-full truncate block"
                            title={syn}
                          >
                            {syn}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-6 lg:pt-8 min-w-0">
            {/* Countdown timer */}
            {anime.status === "RELEASING" && anime.nextAiringEpisode && (
              <RrMediaCountdownTimer
                airingAt={anime.nextAiringEpisode.airingAt}
                episode={anime.nextAiringEpisode.episode}
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
              {(titleRomaji && titleRomaji !== titleEnglish) || titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs", "Also known as:")}{" "}
                  {[
                    titleRomaji !== titleEnglish ? titleRomaji : null,
                    titleNative,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </motion.div>

            {/* Description */}
            <RrMediaDescription description={anime.description} />

            {/* Genres */}
            <RrMediaGenres genres={anime.genres} />

            {/* Characters */}
            {characters && characters.length > 0 && (
              <RrMediaCharacters characters={characters} />
            )}

            {/* Relations */}
            {relations && relations.length > 0 && (
              <RrMediaRelations relations={relations} />
            )}

            {/* Stats Dashboard (Score & Status distribution charts) */}
            <RrMediaStatsDashboard
              localAverageScore={anime.localAverageScore}
              localPopularity={anime.localPopularity}
              localFavoritesCount={anime.localFavoritesCount}
              localStatusDistribution={anime.localStatusDistribution}
              localScoreDistribution={anime.localScoreDistribution}
              showCounters={false}
            />

            {/* Trailer & Friend Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              <RrMediaTrailer trailer={anime.trailers} />
              <RrMediaFriendsProgress
                mediaId={anime.id.toString()}
                mediaType="anime"
              />
            </div>
          </div>
        </motion.div>

        {/* Media Footer */}
        <RrMediaFooter providers={providers} updatedAt={anime.updatedAt} />
      </div>
    </div>
  );
}
