"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";

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

export default function AnimeDetailsPage(): React.JSX.Element {
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

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
  const displayTitle = titleEnglish || titleRomaji || "Anime Details";
  const coverUrl = anime?.coverImageLarge ?? "";
  const bannerUrl = anime?.bannerImage ?? "";

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
          name: name || char.nameNative || "Unknown Character",
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
        };
      });
  }, [anime]);

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
          Anime not found
        </h2>
        <Button asChild variant="default" className="z-10 rounded-xl">
          <Link href="/aquila/browse">Back to Browse</Link>
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
        toast.success("Added to list!");
        mutateListEntry();
      } else {
        toast.error("Failed to add to list");
      }
    } catch {
      toast.error("Failed to add to list");
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

        {/* AniList Attribution */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="mx-auto px-4 pt-4 flex justify-end items-start pointer-events-auto">
            <div className="flex flex-col gap-1 bg-card/85 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-border/40 shadow-md">
              <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest leading-none">
                Data Provided By
              </span>
              <Link
                href="https://anilist.co"
                target="_blank"
                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors hover:underline"
              >
                AniList
              </Link>
            </div>
          </div>
        </div>
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
            <div className="bg-card/75 border border-border/40 backdrop-blur-xl shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center sm:items-start lg:items-stretch">
              <div className="relative aspect-2/3 w-36 sm:w-40 lg:w-full rounded-xl overflow-hidden shadow-lg border border-border/30 shrink-0 bg-muted flex items-center justify-center">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={titleRomaji || "Cover"}
                    fill
                    sizes="(max-width: 640px) 150px, 260px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                    <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full justify-center">
                {session.status === "authenticated" && session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer rounded-xl transition-all shadow-md"
                          size="lg"
                          onClick={handleQuickAdd}
                        >
                          Quick Add
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer rounded-xl"
                          size="lg"
                          onClick={(): void => setIsDialogOpen(true)}
                        >
                          Add to List
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full cursor-pointer rounded-xl"
                        size="lg"
                        onClick={(): void => setIsDialogOpen(true)}
                      >
                        Edit Entry
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

            {/* Media Metadata Stats Sidebar */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Information
              </h3>
              <div className="space-y-3">
                <RrMediaInfoRow label="Format" value={anime.format} />
                <RrMediaInfoRow label="Episodes" value={anime.episodes || "?"} />
                <RrMediaInfoRow
                  label="Duration"
                  value={anime.duration ? `${anime.duration} mins` : "?"}
                />
                <RrMediaInfoRow
                  label="Status"
                  value={anime.status?.replace(/_/g, " ").toLowerCase()}
                  className="capitalize"
                />
                <RrMediaInfoRow
                  label="Season"
                  value={
                    anime.season
                      ? `${anime.season.toLowerCase()} ${anime.seasonYear ?? ""}`
                      : null
                  }
                  className="capitalize"
                />
                <RrMediaInfoRow
                  label="Source"
                  value={anime.source?.replace(/_/g, " ").toLowerCase() || "?"}
                  className="capitalize"
                />
                <RrMediaInfoRow
                  label="Studios"
                  value={
                    studios && studios.length > 0 ? (
                      <span
                        className="text-right text-xs max-w-[150px] truncate block"
                        title={studios.join(", ")}
                      >
                        {studios.join(", ")}
                      </span>
                    ) : null
                  }
                />
                <RrMediaInfoRow label="Start Date" value={animeStartDate} />
                <RrMediaInfoRow label="End Date" value={animeEndDate} />
                <RrMediaInfoRow
                  label="Country"
                  value={anime.countryOfOrigin}
                  className="capitalize"
                />
                <RrMediaInfoRow
                  label="Hashtag"
                  value={anime.hashtag}
                  className="text-primary"
                />
                {anime.synonyms && anime.synonyms.length > 0 && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Synonyms</span>
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

            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {displayTitle}
              </h1>
              {(titleRomaji && titleRomaji !== titleEnglish) || titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  Also known as:{" "}
                  {[
                    titleRomaji !== titleEnglish ? titleRomaji : null,
                    titleNative,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </motion.div>

            {/* Stats Dashboard */}
            <RrMediaStatsDashboard
              averageScore={anime.averageScore}
              favourites={anime.favourites}
            />

            {/* Description */}
            <RrMediaDescription
              description={anime.description}
            />

            {/* Genres & Tags */}
            <RrMediaGenres
              genres={anime.genres}
              tags={anime.tags}
            />

            {/* Characters */}
            {characters && characters.length > 0 && (
              <RrMediaCharacters
                characters={characters}
              />
            )}

            {/* Relations */}
            {relations && relations.length > 0 && (
              <RrMediaRelations
                relations={relations}
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
