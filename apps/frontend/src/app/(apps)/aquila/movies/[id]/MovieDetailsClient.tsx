"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Play,
  Star,
  TrendingUp,
  Heart,
  Film,
  Globe,
  Clock,
  Calendar,
  ExternalLink,
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

import { fetcher } from "@/lib/fetcher";
import { Media } from "@/types/aquila";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import { RrMediaRefreshButton } from "@/components/rrComponents/aquila/rrMediaRefreshButton";
import { MovieEntity } from "@/types/movie.entities";
import { RrMediaInfoRow } from "@/components/rrComponents/aquila/details/rrMediaInfoRow";
import { RrMediaFriendsProgress } from "@/components/rrComponents/aquila/details/rrMediaFriendsProgress";
import { RrMediaDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";
import { RrMediaGenres } from "@/components/rrComponents/aquila/details/rrMediaGenres";
import { RrMediaCharacters } from "@/components/rrComponents/aquila/details/rrMediaCharacters";
import { RrMediaStatsDashboard } from "@/components/rrComponents/aquila/details/rrMediaStatsDashboard";
import { useTranslation } from "react-i18next";

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

export default function MovieDetailsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [showAllCharacters, setShowAllCharacters] = useState<boolean>(false);

  // SWR queries replacing sequential imperative fetching
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

  const titleEnglish = movie?.titleEnglish ?? "";
  const titleRomaji = movie?.titleRomaji ?? "";
  const titleNative = movie?.titleNative ?? "";
  const displayTitle = titleEnglish || titleRomaji || t("aquila.movieDetails", "Movie Details");
  const coverUrl = movie?.coverImage ?? "";
  const bannerUrl = movie?.bannerImage ?? "";

  const formattedReleaseDate = useMemo((): string | null => {
    if (!movie?.releaseDate) return null;
    try {
      return new Date(movie.releaseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return movie.releaseDate;
    }
  }, [movie?.releaseDate]);

  const releaseYear = useMemo((): string | null => {
    if (!movie?.releaseDate) return null;
    try {
      return new Date(movie.releaseDate).getFullYear().toString();
    } catch {
      return null;
    }
  }, [movie?.releaseDate]);

  const characters = useMemo(() => {
    if (!movie?.characters) return [];
    return movie.characters.map((mc) => ({
      id: mc.id,
      name: mc.name || t("aquila.unknownCharacter", "Unknown Character"),
      native: "",
      role: mc.role || "Actor",
      image: mc.image || "",
      voiceActor: mc.actorId ? {
        id: mc.actorId,
        name: mc.personName || t("aquila.unknownActor", "Unknown Actor"),
        image: mc.image || "",
        role: "Actor",
      } : null,
    }));
  }, [movie, t]);

  useEffect((): void => {
    if (!movie) return;
    document.title = `Aquila > Movie > ${titleEnglish || titleRomaji || ""}`;
  }, [movie, titleEnglish, titleRomaji]);

  if (movieLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin z-10" />
      </div>
    );
  }

  if (movieError || !movie) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center gap-4">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground z-10">
          {t("aquila.movieNotFound", "Movie not found")}
        </h2>
        <Button asChild variant="default" className="z-10 rounded-xl">
          <Link href="/aquila/browse">{t("aquila.backToBrowse", "Back to Browse")}</Link>
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
    <div className="flex flex-col flex-1 min-h-screen bg-background text-foreground relative overflow-x-hidden p-0">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[20%] left-[-100px] w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Banner Section */}
      <div className="relative h-[240px] md:h-[360px] w-full overflow-hidden shrink-0 z-10">
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
                          {t("aquila.quickAdd", "Quick Add")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer rounded-xl"
                          size="lg"
                          onClick={(): void => setIsDialogOpen(true)}
                        >
                          {t("aquila.addToList", "Add to List")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full cursor-pointer rounded-xl"
                        size="lg"
                        onClick={(): void => setIsDialogOpen(true)}
                      >
                        {t("aquila.editEntry", "Edit Entry")}
                      </Button>
                    )}
                    <RrMediaEditDialog
                      media={{
                        id: movie.id.toString(),
                        type: "movie",
                        title: { english: titleEnglish, romaji: titleRomaji },
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
                {movie.trailers && movie.trailers.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    asChild
                  >
                    <a
                      href={movie.trailers[0].url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <Play className="size-4 fill-current" />
                      {t("aquila.watchTrailer", "Watch Trailer")}
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Info Sidebar */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("aquila.information", "Information")}
              </h3>
              <div className="space-y-3">
                <RrMediaInfoRow
                  label={t("aquila.duration", "Runtime")}
                  value={movie.runtime ? t("aquila.durationMinutes", "{{count}} mins", { count: movie.runtime }) : null}
                />
                <RrMediaInfoRow
                  label={t("aquila.status", "Status")}
                  value={movie.status?.replace(/_/g, " ").toLowerCase()}
                  className="capitalize"
                />
                <RrMediaInfoRow label={t("aquila.releaseDate", "Release Date")} value={formattedReleaseDate} />
                <RrMediaInfoRow label={t("aquila.budget", "Budget")} value={movie.budget} />
                <RrMediaInfoRow label={t("aquila.boxOffice", "Box Office")} value={movie.boxOffice} />
                <RrMediaInfoRow label={t("aquila.country", "Country")} value={movie.originalCountry} />
                <RrMediaInfoRow
                  label={t("aquila.language", "Language")}
                  value={movie.originalLanguage}
                  className="uppercase"
                />
                <RrMediaInfoRow
                  label={t("aquila.rating", "Rating")}
                  value={
                    movie.contentRating ? (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {movie.contentRating}
                      </Badge>
                    ) : null
                  }
                />
              </div>
            </div>

            {/* Studios */}
            {movie.studios && movie.studios.length > 0 && (
              <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-xs tracking-wide text-muted-foreground uppercase mb-3">
                  {t("aquila.studiosLabel", "Studios")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {movie.studios.map((studio, idx) => {
                    const name =
                      typeof studio === "string"
                        ? studio
                        : (studio as any)?.name;
                    if (!name) return null;
                    return (
                      <span
                        key={idx}
                        className="text-xs bg-secondary text-secondary-foreground border border-border/40 px-3 py-1.5 rounded-xl"
                      >
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional Trailers */}
            {movie.trailers && movie.trailers.length > 1 && (
              <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-xs tracking-wide text-muted-foreground uppercase mb-3">
                  {t("aquila.trailers", "Trailers")}
                </h4>
                <div className="flex flex-col gap-2">
                  {movie.trailers.slice(1).map((trailer, idx) => (
                    <a
                      key={idx}
                      href={trailer.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/40 px-3 py-2 rounded-xl transition-all"
                    >
                      <Play className="size-3 fill-current" />
                      {trailer.name || t("aquila.trailerName", "Trailer {{number}}", { number: idx + 2 })}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            {(movie.tvdbId || movie.tmdbId || movie.imdbId) && (
              <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-xs tracking-wide text-muted-foreground uppercase mb-3">
                  {t("aquila.externalLinks", "External Links")}
                </h4>
                <div className="flex flex-col gap-2">
                  {movie.tvdbId && (
                    <a
                      href={`https://thetvdb.com/dereferrer/movie/${movie.tvdbId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/40 px-3 py-2 rounded-xl transition-all"
                    >
                      <span className="font-medium">TheTVDB</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                  )}
                  {movie.tmdbId && (
                    <a
                      href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/40 px-3 py-2 rounded-xl transition-all"
                    >
                      <span className="font-medium">TMDB</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                  )}
                  {movie.imdbId && (
                    <a
                      href={`https://www.imdb.com/title/${movie.imdbId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/40 px-3 py-2 rounded-xl transition-all"
                    >
                      <span className="font-medium">IMDb</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <RrMediaFriendsProgress mediaId={movie.id.toString()} mediaType="movie" />
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-6 lg:pt-8 min-w-0">
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {displayTitle}
              </h1>
              {(titleEnglish && titleEnglish !== displayTitle) ||
              (titleRomaji && titleRomaji !== displayTitle) ||
              titleNative ? (
                <p className="text-xs text-muted-foreground italic">
                  {t("aquila.alsoKnownAs", "Also known as:")}{" "}
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

            {/* Quick Info Badges */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-3"
            >
              {releaseYear && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {releaseYear}
                  </span>
                </div>
              )}
              {movie.runtime && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {t("aquila.durationMinutes", "{{count}} min", { count: movie.runtime })}
                  </span>
                </div>
              )}
              <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                <Film className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground capitalize">
                  {movie.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              {movie.originalCountry && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Globe className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {movie.originalCountry}
                  </span>
                </div>
              )}
              {movie.contentRating && (
                <Badge
                  variant="outline"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground"
                >
                  {movie.contentRating}
                </Badge>
              )}
            </motion.div>

            {/* Stats Dashboard */}
            <RrMediaStatsDashboard
              localAverageScore={movie.localAverageScore}
              localPopularity={movie.localPopularity}
              localFavoritesCount={movie.localFavoritesCount}
              localStatusDistribution={movie.localStatusDistribution}
              localScoreDistribution={movie.localScoreDistribution}
            />

            {/* Description */}
            <RrMediaDescription description={movie.description} />

            {/* Genres */}
            <RrMediaGenres genres={movie.genres} />

            {/* Characters */}
            {characters && characters.length > 0 && (
              <RrMediaCharacters characters={characters} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
