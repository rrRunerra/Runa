"use client";

import React, { useEffect, useState } from "react";
import { Play, Calendar, Star, TrendingUp, Heart } from "lucide-react";
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
import { Media } from "@/types/aquila";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";

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
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // SWR queries replacing sequential imperative fetching
  const {
    data: anime,
    error: animeError,
    isLoading: animeLoading,
  } = useSWR<Media>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/anime/details/${id}` : null,
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

  useEffect((): void => {
    if (!anime) return;
    document.title = `Aquila > Anime > ${anime.title.english ?? anime.title.romaji ?? ""}`;
  }, [anime]);

  useEffect((): (() => void) | undefined => {
    if (!anime?.nextAiringEpisode) return;
    const targetTime = anime.nextAiringEpisode.airingAt * 1000;

    const updateTimer = (): void => {
      const now = Date.now();
      const diff = targetTime - now;
      if (diff <= 0) {
        setTimeLeft("Airing now!");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days > 0 ? days + "d " : ""}${hours}h ${mins}m ${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return (): void => clearInterval(interval);
  }, [anime]);

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
        {anime.bannerImage ? (
          <Image
            src={anime.bannerImage}
            alt={anime.title?.romaji ?? "Banner"}
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
                {anime.coverImage.extraLarge || anime.coverImage.large ? (
                  <Image
                    src={anime.coverImage.extraLarge || anime.coverImage.large}
                    alt={anime.title?.romaji ?? "Cover"}
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
                        title: anime.title,
                        coverImage: { large: anime.coverImage.large },
                        episodes: anime.episodes,
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
                {anime.trailers && anime.trailers.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    asChild
                  >
                    <a
                      href={anime.trailers[0].url}
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

            {/* Media Metadata Stats Sidebar */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium text-foreground">
                    {anime.format}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Episodes</span>
                  <span className="font-medium text-foreground">
                    {anime.episodes || "?"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">
                    {anime.duration ? `${anime.duration} mins` : "?"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-foreground capitalize">
                    {anime.status?.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Season</span>
                  <span className="font-medium text-foreground capitalize">
                    {anime.season?.toLowerCase()} {anime.seasonYear}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium text-foreground capitalize">
                    {anime.source?.replace(/_/g, " ").toLowerCase() || "?"}
                  </span>
                </div>
                {anime.hashtag && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Hashtag</span>
                    <span className="font-medium text-primary">
                      {anime.hashtag}
                    </span>
                  </div>
                )}
                {anime.synonyms && anime.synonyms.length > 0 && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Synonyms</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {anime.synonyms.slice(0, 4).map((syn, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {syn}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* External Links */}
            {anime.externalLinks && anime.externalLinks.length > 0 && (
              <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-xs tracking-wide text-muted-foreground uppercase mb-3">
                  External Links
                </h4>
                <div className="flex flex-wrap gap-2">
                  {anime.externalLinks.map((link, qid) => (
                    <a
                      key={qid}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/40 px-3 py-1.5 rounded-xl transition-all"
                    >
                      {link.site}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-6 lg:pt-8 min-w-0">
            {/* Countdown timer (if airing) */}
            {timeLeft && anime.nextAiringEpisode && (
              <motion.div
                variants={itemVariants}
                className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-3.5 rounded-2xl flex items-center justify-between gap-4 animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Next Episode: {anime.nextAiringEpisode.episode}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold">{timeLeft}</span>
              </motion.div>
            )}

            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {anime.title.english || anime.title.romaji}
              </h1>
              {(anime.title.romaji &&
                anime.title.romaji !== anime.title.english) ||
              anime.title.native ? (
                <p className="text-xs text-muted-foreground italic">
                  Also known as:{" "}
                  {[
                    anime.title.romaji !== anime.title.english
                      ? anime.title.romaji
                      : null,
                    anime.title.native,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </motion.div>

            {/* Stats Dashboard Panels */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="bg-card/45 border border-border/30 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                  <Star className="size-3.5 text-primary fill-primary/20" />
                  <span>Average Score</span>
                </div>
                <span className="text-xl font-extrabold text-primary">
                  {anime.averageScore ? `${anime.averageScore}%` : "N/A"}
                </span>
              </div>
              <div className="bg-card/45 border border-border/30 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                  <Star className="size-3.5 text-primary fill-primary/20" />
                  <span>Mean Score</span>
                </div>
                <span className="text-xl font-extrabold text-primary">
                  {anime.meanScore ? `${anime.meanScore}%` : "N/A"}
                </span>
              </div>
              <div className="bg-card/45 border border-border/30 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                  <TrendingUp className="size-3.5 text-primary" />
                  <span>Popularity</span>
                </div>
                <span className="text-xl font-extrabold text-primary">
                  {anime.popularity ? anime.popularity.toLocaleString() : "N/A"}
                </span>
              </div>
              <div className="bg-card/45 border border-border/30 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                  <Heart className="size-3.5 text-primary fill-primary/20" />
                  <span>Favorites</span>
                </div>
                <span className="text-xl font-extrabold text-primary">
                  {anime.favourites ? anime.favourites.toLocaleString() : "N/A"}
                </span>
              </div>
            </motion.div>

            {/* Description (Glassmorphic Container) */}
            <motion.div
              variants={itemVariants}
              className="bg-card/30 border border-border/20 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-base font-bold text-foreground mb-3">
                Synopsis
              </h3>
              <div
                className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm prose-p:my-2 prose-a:text-primary hover:prose-a:text-primary transition-colors"
                dangerouslySetInnerHTML={{ __html: anime.description }}
              />
            </motion.div>

            {/* Genres & Tags */}
            <motion.div variants={itemVariants} className="space-y-3">
              <h3 className="text-base font-bold text-foreground">
                Genres & Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {anime.genres?.map((genre, qid) => (
                  <Badge
                    key={qid}
                    variant="secondary"
                    className="rounded-xl px-3 py-1 text-xs"
                  >
                    {genre}
                  </Badge>
                ))}
                {anime.tags?.slice(0, 8).map((tag, qid) => (
                  <Badge
                    key={qid}
                    variant="outline"
                    className="rounded-xl px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tag.name}
                    {tag.rank && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {tag.rank}%
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </motion.div>

            {/* Characters with Japanese Voice Actor dual-cards */}
            {anime.characters && anime.characters.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">
                  Characters & Voice Actors
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {anime.characters.slice(0, 10).map((char, qid) => (
                    <div
                      key={qid}
                      className="flex items-center justify-between bg-card/45 border border-border/30 backdrop-blur-md p-3 rounded-xl overflow-hidden hover:border-border/50 transition-all group"
                    >
                      {/* Character Side */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                          <Image
                            src={char.image}
                            alt={char.name}
                            fill
                            sizes="48px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">
                            {char.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {char.role?.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      {/* Voice Actor Side */}
                      {char.voiceActor && (
                        <div className="flex items-center gap-3 text-right min-w-0 border-l border-border/60 pl-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-foreground/90">
                              {char.voiceActor.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              JA Voice
                            </p>
                          </div>
                          <div className="relative size-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                            <Image
                              src={char.voiceActor.image}
                              alt={char.voiceActor.name}
                              fill
                              sizes="40px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Relations */}
            {anime.relations && anime.relations.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">
                  Relations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {anime.relations.map((relation, qid) => {
                    let href: string;
                    switch (relation.type) {
                      case "ANIME":
                        href = `/aquila/anime/${relation.id}`;
                        break;
                      case "MANGA":
                        href = `/aquila/manga/${relation.id}`;
                        break;
                      default:
                        href = `/aquila/${relation.type.toLowerCase()}/${relation.id}`;
                    }

                    return (
                      <Link
                        key={qid}
                        href={href}
                        className="flex items-center justify-between bg-card/35 border border-border/30 p-4 rounded-xl hover:bg-accent/50 hover:border-border/50 transition-all group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {relation.title.english || relation.title.romaji}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {relation.format}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize shrink-0"
                        >
                          {relation.relationType
                            .replace(/_/g, " ")
                            .toLowerCase()}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
