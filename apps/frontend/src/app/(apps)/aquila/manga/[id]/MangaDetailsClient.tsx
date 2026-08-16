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
  LayoutGrid,
  UserCheck,
  BarChart3,
  ImageIcon,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { fetcher } from "@/lib/fetcher";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import { RrMediaRefreshButton } from "@/components/rrComponents/aquila/rrMediaRefreshButton";
import { MangaEntity } from "@/types/manga.entities";

// Reusable detail components
import { RrMediaStatsDashboard } from "@/components/rrComponents/aquila/details/rrMediaStatsDashboard";
import { RrMediaDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";
import { RrMediaGenres } from "@/components/rrComponents/aquila/details/rrMediaGenres";
import { RrMediaCharacters } from "@/components/rrComponents/aquila/details/rrMediaCharacters";
import { RrMediaRelations } from "@/components/rrComponents/aquila/details/rrMediaRelations";
import { RrMediaSimilar } from "@/components/rrComponents/aquila/details/rrMediaSimilar";
import { RrMediaStaff } from "@/components/rrComponents/aquila/details/rrMediaStaff";
import { RrMediaImages } from "@/components/rrComponents/aquila/details/rrMediaImages";
import { RrMediaInfoRow } from "@/components/rrComponents/aquila/details/rrMediaInfoRow";
import { RrMediaFriendsProgress } from "@/components/rrComponents/aquila/details/rrMediaFriendsProgress";
import { RrMediaFooter } from "@/components/rrComponents/aquila/details/rrMediaFooter";
import { RrMediaReviews } from "@/components/rrComponents/aquila/details/rrMediaReviews";
import { RrMediaRecommendations } from "@/components/rrComponents/aquila/details/rrMediaRecommendations";
import { MessageSquare, Sparkles } from "lucide-react";
import { MediaType } from "@/types/aquila";
import { RrMediaDetailsSkeleton } from "@/components/rrComponents/aquila/details/rrMediaDetailsSkeleton";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ListEntry {
  id: number | string;
  status: string;
  score?: number;
  progress?: number;
  chapters?: number;
  volumes?: number;
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

export default function MangaDetailsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [showMoreInfo, setShowMoreInfo] = useState<boolean>(false);

  const {
    data: manga,
    error: mangaError,
    isLoading: mangaLoading,
    mutate: mutateManga,
  } = useSWR<MangaEntity>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/manga/${id}` : null,
    fetcher,
  );

  const { data: listEntry, mutate: mutateListEntry } = useSWR<ListEntry>(
    id && session.status === "authenticated" && session.data?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/list/manga/entry/${id}`,
          session.data.accessToken,
        ]
      : null,
    fetcher,
    { shouldRetryOnError: false },
  );

  const hasListEntry = !!listEntry;

  // ─── Derived display values ───────────────────────────────────────────────

  const displayTitle =
    manga?.titlePrimary || manga?.titleSecondary || t("aquila.mangaDetails");

  const coverUrl = manga?.coverImage || manga?.images?.anilist?.cover || "";

  const bannerUrl = manga?.bannerImage || manga?.images?.anilist?.banner || "";

  // ─── Providers from sources[] + known IDs ────────────────────────────────

  const providers = useMemo(() => {
    if (!manga) return [];
    const list: { name: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const addProvider = (name: string, url?: string | null): void => {
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      list.push({ name, url });
    };

    if (manga.anilistId) {
      addProvider("AniList", `https://anilist.co/manga/${manga.anilistId}`);
    }
    if (manga.malId) {
      addProvider(
        "MyAnimeList",
        `https://myanimelist.net/manga/${manga.malId}`,
      );
    }
    if (manga.sources) {
      for (const src of manga.sources) {
        if (src.url && src.provider) {
          addProvider(src.provider, src.url);
        }
      }
    }

    return list;
  }, [manga]);

  // ─── Start / end dates ───────────────────────────────────────────────────

  const mangaStartDate = useMemo(() => {
    if (!manga?.startDateYear) return null;
    const parts = [
      manga.startDateYear,
      manga.startDateMonth
        ? String(manga.startDateMonth).padStart(2, "0")
        : null,
      manga.startDateDay ? String(manga.startDateDay).padStart(2, "0") : null,
    ].filter(Boolean);
    return parts.join("-");
  }, [manga]);

  const mangaEndDate = useMemo(() => {
    if (!manga?.endDateYear) return null;
    const parts = [
      manga.endDateYear,
      manga.endDateMonth ? String(manga.endDateMonth).padStart(2, "0") : null,
      manga.endDateDay ? String(manga.endDateDay).padStart(2, "0") : null,
    ].filter(Boolean);
    return parts.join("-");
  }, [manga]);

  // ─── Characters (v2 shape) ───────────────────────────────────────────────

  const characters = useMemo(() => {
    if (!manga?.characters) return [];
    const seenCharIds = new Set<number>();
    const result: any[] = [];

    for (const mc of manga.characters) {
      if (!mc.character) continue;
      const char = mc.character;
      if (seenCharIds.has(char.id)) continue;
      seenCharIds.add(char.id);

      result.push({
        id: mc.id || char.id,
        characterId: char.id,
        name:
          char.namePrimary || char.nameNative || t("aquila.unknownCharacter"),
        native: char.nameNative ?? "",
        image: char.image ?? "",
        role: mc.role ?? "",
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
        voiceActor: null,
      });
    }

    return result;
  }, [manga, t]);

  // ─── Relations (v2 shape) ────────────────────────────────────────────────

  const relations = useMemo(() => {
    if (!manga?.relations) return [];
    return manga.relations.map((rel) => {
      const target = rel.targetMedia;
      const relType = rel.relationType ?? rel.type ?? "";
      const mediaType = rel.targetType ?? "MANGA";
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
  }, [manga]);

  // ─── Aggregate stats ───────────────────────────────────────────────────────

  const displayFavorites = useMemo(() => {
    if (!manga) return 0;
    return manga.favorites ?? manga.alFavorites ?? manga.malFavorites ?? 0;
  }, [manga]);

  const displayPopularity = useMemo(() => {
    if (!manga) return 0;
    return manga.popularity ?? manga.alPopularity ?? manga.malPopularity ?? 0;
  }, [manga]);

  useEffect((): void => {
    if (!manga) return;
    document.title = `Aquila > Manga > ${displayTitle}`;
  }, [manga, displayTitle]);

  // ─── Render states ───────────────────────────────────────────────────────

  if (mangaLoading) {
    return <RrMediaDetailsSkeleton />;
  }

  if (mangaError || !manga) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center gap-4">
        <div className="absolute top-0 right-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground z-10">
          {t("aquila.mangaNotFound")}
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
        `${process.env.NEXT_PUBLIC_API_URL}/list/manga/entry/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            mangaId: Number(id),
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
            alt={manga.titleSecondary ?? manga.titlePrimary ?? "Banner"}
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
                    alt={manga.titleSecondary ?? manga.titlePrimary ?? "Cover"}
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
                        id: manga.id.toString(),
                        type: "manga",
                        title: {
                          english: displayTitle,
                          romaji: manga.titleSecondary ?? displayTitle,
                        },
                        coverImage: { large: coverUrl },
                        chapters: manga.chapterCount ?? undefined,
                        volumes: manga.volumeCount ?? undefined,
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
                      mediaType="manga"
                      mediaId={manga.id.toString()}
                      onRefreshed={(): void => {
                        void mutateManga();
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
              {manga.titleSecondary || manga.titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs")}{" "}
                  {[
                    manga.titleSecondary !== manga.titlePrimary
                      ? manga.titleSecondary
                      : null,
                    manga.titleNative,
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
                        {manga.averageScore
                          ? manga.averageScore.toFixed(1)
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
                    label={t("aquila.format")}
                    value={manga.format}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.chapters")}
                    value={manga.chapterCount || "?"}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.volumes")}
                    value={manga.volumeCount || "?"}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.status")}
                    value={manga.status?.replace(/_/g, " ").toLowerCase()}
                    className="capitalize"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.source")}
                    value={
                      manga.source?.replace(/_/g, " ").toLowerCase() || "?"
                    }
                    className="capitalize"
                  />
                  {manga.serialization && (
                    <RrMediaInfoRow
                      label={t("aquila.serialization")}
                      value={manga.serialization}
                    />
                  )}
                  {manga.imprint && (
                    <RrMediaInfoRow
                      label={t("aquila.imprint")}
                      value={manga.imprint}
                    />
                  )}
                  {manga.readingDirection && (
                    <RrMediaInfoRow
                      label={t("aquila.readingDirection")}
                      value={
                        t(`aquila.readingDirections.${manga.readingDirection.toUpperCase()}`)
                      }
                    />
                  )}
                  {manga.demographics && manga.demographics.length > 0 && (
                    <RrMediaInfoRow
                      label={t("aquila.demographics")}
                      value={manga.demographics.join(", ")}
                      className="capitalize"
                    />
                  )}
                  {manga.publishers && manga.publishers.length > 0 && (
                    <RrMediaInfoRow
                      label={t("aquila.publishersLabel")}
                      value={
                        <span
                          className="text-right text-xs max-w-37.5 truncate block"
                          title={manga.publishers.join(", ")}
                        >
                          {manga.publishers.join(", ")}
                        </span>
                      }
                    />
                  )}
                  <RrMediaInfoRow
                    label={t("aquila.startDate")}
                    value={mangaStartDate}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.endDate")}
                    value={mangaEndDate}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.country")}
                    value={manga.countryOfOrigin}
                    className="capitalize"
                  />
                  {manga.ageRating && (
                    <RrMediaInfoRow
                      label={t("aquila.ageRating")}
                      value={
                        manga.ageRatingGuide
                          ? `${manga.ageRating} (${manga.ageRatingGuide})`
                          : manga.ageRating
                      }
                    />
                  )}
                  {manga.hashtag && (
                    <RrMediaInfoRow
                      label={t("aquila.hashtag")}
                      value={manga.hashtag}
                      className="text-primary"
                    />
                  )}
                  {manga.synonyms && manga.synonyms.length > 0 && (
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-muted-foreground">
                        {t("aquila.synonymsLabel")}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {manga.synonyms.slice(0, 4).map((syn, idx) => (
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
              {manga.titleSecondary || manga.titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs")}{" "}
                  {[
                    manga.titleSecondary !== manga.titlePrimary
                      ? manga.titleSecondary
                      : null,
                    manga.titleNative,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </motion.div>

            {/* External Links / Publisher Badges */}
            {manga.externalLinks && manga.externalLinks.length > 0 && (
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-2 flex-wrap"
              >
                {manga.externalLinks.map((link, idx) => (
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
            <RrMediaDescription description={manga.description} />

            {/* Genres */}
            <RrMediaGenres genres={manga.genres} />

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
                    showVoiceActors={false}
                    limitCount={10}
                    hideToggleButton={true}
                  />
                )}

                {/* Staff Preview (first 6) */}
                {manga.staff && manga.staff.length > 0 && (
                  <RrMediaStaff staff={manga.staff} limit={6} />
                )}

                {/* Relations */}
                {relations.length > 0 && (
                  <RrMediaRelations relations={relations} />
                )}

                {/* Similar Series Carousel */}
                <RrMediaSimilar mediaType="manga" mediaId={id} />

                {/* Friends Progress */}
                <RrMediaFriendsProgress
                  mediaId={manga.id.toString()}
                  mediaType="manga"
                />
              </TabsContent>

              {/* Characters Tab Content */}
              <TabsContent
                value="characters"
                className="space-y-6 outline-none"
              >
                {characters.length > 0 ? (
                  <RrMediaCharacters
                    characters={characters}
                    showVoiceActors={false}
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
                {manga.staff && manga.staff.length > 0 ? (
                  <RrMediaStaff staff={manga.staff} showAllInitial={true} />
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
                    {t("aquila.noStaff", "No staff information available")}
                  </div>
                )}
              </TabsContent>

              {/* Images Tab Content */}
              <TabsContent value="images" className="space-y-6 outline-none">
                <RrMediaImages anime={manga as any} />
              </TabsContent>

              {/* Stats Tab Content */}
              <TabsContent value="stats" className="space-y-6 outline-none">
                <RrMediaStatsDashboard
                  localAverageScore={manga.averageScore}
                  localPopularity={manga.popularity}
                  localFavoritesCount={manga.favorites}
                  localStatusDistribution={manga.statusDistribution}
                  localScoreDistribution={manga.scoreDistribution}
                  alAverageScore={manga.alAverageScore}
                  alFavorites={manga.alFavorites}
                  alPopularity={manga.alPopularity}
                  malAverageScore={manga.malAverageScore}
                  malFavorites={manga.malFavorites}
                  malPopularity={manga.malPopularity}
                  showCounters={true}
                />
              </TabsContent>

              {/* Reviews Tab Content */}
              <TabsContent value="reviews" className="space-y-6 outline-none">
                <RrMediaReviews mediaType={MediaType.MANGA} mediaId={Number(id)} />
              </TabsContent>

              {/* Recommendations Tab Content */}
              <TabsContent value="recommendations" className="space-y-6 outline-none">
                <RrMediaRecommendations mediaType={MediaType.MANGA} mediaId={Number(id)} />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

        {/* Media Footer */}
        <RrMediaFooter
          providers={providers}
          updatedAt={manga.updatedAt}
          alUpdatedAt={manga.alUpdatedAt}
          malUpdatedAt={manga.malUpdatedAt}
          mediaType="manga"
          mediaId={Number(id)}
          mediaData={{ ...manga, relations, characters }}
        />
      </div>
    </div>
  );
}
