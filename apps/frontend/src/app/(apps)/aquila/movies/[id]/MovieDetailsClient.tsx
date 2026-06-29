"use client";

import React, { useEffect, useState } from "react";
import { Play, Clock, Film, Globe } from "lucide-react";
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
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // SWR queries replacing sequential imperative fetching
  const { data: movie, error: movieError, isLoading: movieLoading, mutate: mutateMovie } = useSWR<Media>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/movie/details/${id}` : null,
    fetcher
  );

  const { data: listEntry, mutate: mutateListEntry } = useSWR<ListEntry>(
    id && session.status === "authenticated" && session.data?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/list/movie/entry/${id}`, session.data.accessToken]
      : null,
    fetcher,
    { shouldRetryOnError: false }
  );

  const hasListEntry = !!listEntry;

  useEffect((): void => {
    if (!movie) return;
    document.title = `Aquila > Movie > ${movie.title.english ?? movie.title.romaji ?? ""}`;
  }, [movie]);

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
        <h2 className="text-2xl font-bold text-foreground z-10">Movie not found</h2>
        <Button asChild variant="default" className="z-10 rounded-xl">
          <Link href="/aquila/browse">Back to Browse</Link>
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
            tvdbId: parseInt(movie.id),
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
        {movie.bannerImage ? (
          <Image
            src={movie.bannerImage}
            alt={movie.title?.romaji ?? "Banner"}
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
                {movie.coverImage.large ? (
                  <Image
                    src={movie.coverImage.large}
                    alt={movie.title?.romaji ?? "Cover"}
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
                        id: movie.id.toString(),
                        type: "movie",
                        title: movie.title,
                        coverImage: { large: movie.coverImage.large },
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
                  <span className="font-medium text-foreground">{movie.format}</span>
                </div>
                {movie.runtime && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Runtime</span>
                    <span className="font-medium text-foreground">{movie.runtime} mins</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-foreground capitalize">
                    {movie.status?.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                {movie.originalCountry && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Country</span>
                    <span className="font-medium text-foreground">{movie.originalCountry}</span>
                  </div>
                )}
                {movie.originalLanguage && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Language</span>
                    <span className="font-medium text-foreground uppercase">{movie.originalLanguage}</span>
                  </div>
                )}
                {movie.contentRating && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Rating</span>
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {movie.contentRating}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Studios */}
            {movie.studios && movie.studios.length > 0 && (
              <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-xs tracking-wide text-muted-foreground uppercase mb-3">
                  Studios
                </h4>
                <div className="flex flex-wrap gap-2">
                  {movie.studios.map((studio) => (
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
            {movie.trailers && movie.trailers.length > 1 && (
              <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-xs tracking-wide text-muted-foreground uppercase mb-3">
                  Trailers
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
                {movie.title.english || movie.title.romaji}
              </h1>
              {movie.title.romaji && movie.title.romaji !== movie.title.english && (
                <p className="text-xs text-muted-foreground italic">
                  Also known as: {movie.title.romaji}
                </p>
              )}
            </motion.div>

            {/* Quick Info Badges */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              {movie.runtime && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{movie.runtime} min</span>
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
                  <span className="text-sm font-semibold text-foreground">{movie.originalCountry}</span>
                </div>
              )}
              {movie.contentRating && (
                <Badge variant="outline" className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground">
                  {movie.contentRating}
                </Badge>
              )}
            </motion.div>

            {/* Description */}
            <motion.div
              variants={itemVariants}
              className="bg-card/30 border border-border/20 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-base font-bold text-foreground mb-3">Synopsis</h3>
              <div
                className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm prose-p:my-2 prose-a:text-primary hover:prose-a:text-primary transition-colors"
                dangerouslySetInnerHTML={{ __html: movie.description }}
              />
            </motion.div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="rounded-xl px-3 py-1 text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Cast */}
            {movie.characters && movie.characters.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">Cast</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {movie.characters.slice(0, 12).map((char, idx) => (
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
