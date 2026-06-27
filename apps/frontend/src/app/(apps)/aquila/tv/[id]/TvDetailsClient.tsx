"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Play, Check, Globe, Clock, Tv2 } from "lucide-react";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { Season, Media } from "@/types/aquila";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";

interface TvMedia extends Media {
  seasons: Season[];
}

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

export default function TvDetailsPage(): React.JSX.Element {
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // SWR queries replacing sequential imperative fetching
  const { data: tv, error: tvError, isLoading: tvLoading } = useSWR<TvMedia>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/tv/details/${id}` : null,
    fetcher
  );

  const { data: listEntry, mutate: mutateListEntry } = useSWR<ListEntry>(
    id && session.status === "authenticated" && session.data?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${id}`, session.data.accessToken]
      : null,
    fetcher,
    { shouldRetryOnError: false }
  );

  const hasListEntry = !!listEntry;
  const watchedEpisodes = listEntry?.watchedEpisodes || [];
  const watchedCount = watchedEpisodes.length;

  useEffect((): void => {
    if (!tv) return;
    document.title = `Aquila > TV > ${tv.title.english ?? tv.title.romaji ?? ""}`;
  }, [tv]);

  const toggleEpisode = async (seasonNum: number, episodeNum: number): Promise<void> => {
    if (!tv || session.status !== "authenticated" || !session.data?.accessToken) return;
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
      toast.error("Failed to update episode progress");
    }
  };

  const toggleSeason = async (seasonNum: number, watched: boolean): Promise<void> => {
    if (!tv || session.status !== "authenticated" || !session.data?.accessToken) return;
    const season = tv.seasons.find((s) => s.number === seasonNum);
    if (!season) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${tv.id}/season`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.accessToken}`,
          },
          body: JSON.stringify({
            seasonNum,
            episodes: season.episodes,
            watched,
          }),
        },
      );
      if (res.ok) {
        mutateListEntry();
        toast.success(
          watched ? "Season marked as watched" : "Season marked as unwatched",
        );
      }
    } catch {
      toast.error("Failed to update season progress");
    }
  };

  const totalEpisodes = useMemo((): number => {
    if (!tv) return 0;
    return tv.seasons.reduce((acc, s) => acc + s.episodeCount, 0);
  }, [tv]);

  const progressPercent =
    totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

  if (tvLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin z-10" />
      </div>
    );
  }

  if (tvError || !tv) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center gap-4">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground z-10">TV show not found</h2>
        <Button asChild variant="default" className="z-10 rounded-xl">
          <Link href="/aquila/browse">Back to Browse</Link>
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
            tvdbId: parseInt(tv.id),
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
    <div className="flex flex-col flex-1 min-h-screen bg-background text-foreground relative overflow-x-hidden p-0">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[20%] left-[-100px] w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Banner Section */}
      <div className="relative h-[240px] md:h-[360px] w-full overflow-hidden shrink-0 z-10">
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-background to-transparent z-10" />
        {tv.bannerImage ? (
          <Image
            src={tv.bannerImage}
            alt={tv.title?.romaji ?? "Banner"}
            fill
            sizes="100vw"
            className="object-cover scale-105 filter blur-[1px] brightness-75"
            priority
          />
        ) : (
          <div className="w-full h-full bg-muted/10" />
        )}

        {/* TheTVDB Attribution */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="mx-auto px-4 pt-4 flex justify-end items-start pointer-events-auto">
            <div className="flex flex-col gap-1 bg-card/85 backdrop-blur-sm p-2 rounded-xl border border-border/40 shadow-md">
              <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest leading-none">
                Data Provided By
              </span>
              <Link
                href="https://thetvdb.com"
                target="_blank"
                className="opacity-80 hover:opacity-100 transition-opacity"
              >
                <Image
                  src="https://thetvdb.com/images/logo.png"
                  alt="TheTVDB Logo"
                  width={80}
                  height={20}
                  style={{ width: "80px", height: "auto" }}
                />
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
          {/* Left Column - Poster & Actions */}
          <motion.div
            variants={itemVariants}
            className="shrink-0 w-full lg:w-[260px] flex flex-col gap-4"
          >
            <div className="bg-card/75 border border-border/40 backdrop-blur-xl shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center sm:items-start lg:items-stretch">
              <div className="relative aspect-2/3 w-36 sm:w-40 lg:w-full rounded-xl overflow-hidden shadow-lg border border-border/30 shrink-0 bg-muted flex items-center justify-center">
                {tv.coverImage.large ? (
                  <Image
                    src={tv.coverImage.large}
                    alt={tv.title?.romaji ?? "Cover"}
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
                        id: tv.id.toString(),
                        type: "tv",
                        title: tv.title,
                        coverImage: { large: tv.coverImage.large },
                        seasons: tv.seasons,
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
                  </>
                )}
                {tv.trailers && tv.trailers.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    asChild
                  >
                    <a
                      href={tv.trailers[0].url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <Play className="size-4 fill-current" />
                      Watch Trailer
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Info Sidebar */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium text-foreground">{tv.format}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Episodes</span>
                  <span className="font-medium text-foreground">{totalEpisodes}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Seasons</span>
                  <span className="font-medium text-foreground">{tv.seasons.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-foreground capitalize">
                    {tv.status?.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                {tv.originalCountry && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Country</span>
                    <span className="font-medium text-foreground">{tv.originalCountry}</span>
                  </div>
                )}
                {tv.originalLanguage && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Language</span>
                    <span className="font-medium text-foreground uppercase">{tv.originalLanguage}</span>
                  </div>
                )}
                {tv.averageRuntime && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Avg Runtime</span>
                    <span className="font-medium text-foreground">{tv.averageRuntime} min</span>
                  </div>
                )}
                {tv.contentRating && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Rating</span>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {tv.contentRating}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Networks */}
            {tv.studios && tv.studios.length > 0 && (
              <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-xs tracking-wide text-muted-foreground uppercase mb-3">
                  Networks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tv.studios.map((studio) => (
                    <span
                      key={studio.name}
                      className="text-xs bg-secondary text-secondary-foreground border border-border/40 px-3 py-1.5 rounded-xl"
                    >
                      {studio.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Trailers */}
            {tv.trailers && tv.trailers.length > 1 && (
              <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-xs tracking-wide text-muted-foreground uppercase mb-3">
                  Trailers
                </h4>
                <div className="flex flex-col gap-2">
                  {tv.trailers.slice(1).map((trailer, idx) => (
                    <a
                      key={idx}
                      href={trailer.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/40 px-3 py-2 rounded-xl transition-all"
                    >
                      <Play className="size-3 fill-current" />
                      {trailer.name || `Trailer ${idx + 2}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-6 lg:pt-8 min-w-0">
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {tv.title.english || tv.title.romaji}
              </h1>
              {tv.title.romaji && tv.title.romaji !== tv.title.english && (
                <p className="text-xs text-muted-foreground italic">
                  Also known as: {tv.title.romaji}
                </p>
              )}
            </motion.div>

            {/* Quick Info Badges */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                <Tv2 className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground capitalize">
                  {tv.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              {tv.averageRuntime && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{tv.averageRuntime} min/ep</span>
                </div>
              )}
              {tv.originalCountry && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Globe className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{tv.originalCountry}</span>
                </div>
              )}
              {tv.contentRating && (
                <Badge variant="outline" className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground">
                  {tv.contentRating}
                </Badge>
              )}
            </motion.div>

            {/* Watch Progress */}
            {hasListEntry && totalEpisodes > 0 && (
              <motion.div
                variants={itemVariants}
                className="bg-card/30 border border-border/20 backdrop-blur-sm p-5 rounded-2xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground/90">Watch Progress</span>
                  <span className="text-xs font-bold text-primary tabular-nums">
                    {watchedCount} / {totalEpisodes} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* Description */}
            <motion.div
              variants={itemVariants}
              className="bg-card/30 border border-border/20 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-base font-bold text-foreground mb-3">Synopsis</h3>
              <div
                className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm prose-p:my-2 prose-a:text-primary hover:prose-a:text-primary transition-colors"
                dangerouslySetInnerHTML={{ __html: tv.description }}
              />
            </motion.div>

            {/* Genres */}
            {tv.genres && tv.genres.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {tv.genres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="rounded-xl px-3 py-1 text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Cast */}
            {tv.characters && tv.characters.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">Cast</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tv.characters.slice(0, 12).map((char, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-card/45 border border-border/30 backdrop-blur-md p-3 rounded-xl overflow-hidden hover:border-border/50 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {char.image && char.image.length > 0 ? (
                          <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                            <Image
                              src={char.image}
                              alt={char.name}
                              fill
                              sizes="48px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <div className="size-12 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">
                            ?
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">
                            {char.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize truncate">
                            {char.role?.toLowerCase()}
                          </p>
                        </div>
                      </div>
                      {char.personName && (
                        <span className="text-xs text-muted-foreground truncate ml-3 shrink-0">
                          {char.personName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Seasons Accordion */}
            {tv.seasons && tv.seasons.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-lg font-bold text-foreground">Seasons</h3>
                <Accordion type="multiple" className="w-full space-y-3">
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
                      <AccordionItem
                        key={season.id}
                        value={season.id}
                        className="border border-border/30 rounded-2xl overflow-hidden bg-card/25 backdrop-blur-md shadow-none"
                      >
                        <AccordionTrigger className="hover:no-underline px-4 py-3 transition-colors hover:bg-muted/30">
                          <div className="flex items-center gap-6 w-full pr-8">
                            <div className="shrink-0 w-12 aspect-2/3 rounded-lg overflow-hidden border border-border/50 bg-muted relative flex items-center justify-center">
                              {(season.image || tv.coverImage.large) ? (
                                <Image
                                  src={season.image || tv.coverImage.large}
                                  alt={season.name || `Season ${season.number}`}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                                  <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 flex items-center gap-8 text-left min-w-0">
                              <div className="flex flex-col">
                                <h4 className="text-sm font-bold text-foreground truncate">
                                  Season {season.number}
                                </h4>
                                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-tight">
                                  {season.episodeCount} Episodes
                                </span>
                              </div>

                              {hasListEntry && (
                                <div className="flex-1 flex items-center gap-4 max-w-[300px]">
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
                        </AccordionTrigger>
                        <AccordionContent className="p-0 border-t border-border/20">
                          <div className="divide-y divide-border/20">
                            {season.episodes.map((episode) => {
                              const watched = watchedEpisodes.some(
                                (ep: any) =>
                                  ep.seasonNum === season.number &&
                                  ep.episodeNum === episode.number,
                              );
                              return (
                                <div
                                  key={episode.id}
                                  className={cn(
                                    "flex items-center gap-4 p-3 hover:bg-muted/20 transition-colors group cursor-pointer",
                                    watched && "bg-primary/5",
                                  )}
                                  onClick={(): Promise<void> =>
                                    toggleEpisode(season.number, episode.number)
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
                                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                        {episode.overview}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
