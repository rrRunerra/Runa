"use client";

import { Play, Clock, Film, Globe } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import { MovieEditDialog } from "@/components/aquila/MovieEditDialog";
import { motion } from "framer-motion";

import { MediaCharacter, MediaStudio, MediaTrailer, Media } from "@/types/aquila";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: ("spring" as any), stiffness: 100, damping: 15 },
  },
};

export default function MovieDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [movie, setMovie] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasListEntry, setHasListEntry] = useState(false);

  useEffect(() => {
    async function fetchMovie() {
      if (!id) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/movie/details/${id}`,
        );
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setMovie(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchMovie();
  }, [id]);

  const fetchEntry = async () => {
    if (session.status !== "authenticated" || !movie?.id) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/movie/entry/${movie.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.data.accessToken}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setHasListEntry(!!data);
      } else {
        setHasListEntry(false);
      }
    } catch (e) {
      console.error("Failed to fetch movie list entry", e);
    }
  };

  useEffect(() => {
    fetchEntry();
  }, [session.status, movie?.id]);

  useEffect(() => {
    document.title = `Aquila > Movie > ${movie?.title.english ?? movie?.title.romaji ?? ""}`;
  }, [movie?.title]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground">Movie not found</h2>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/aquila/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 relative overflow-x-hidden">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] left-[-100px] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Banner Section */}
      <div className="relative h-[250px] md:h-[380px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />
        {movie.bannerImage ? (
          <img
            src={movie.bannerImage}
            alt={movie.title?.romaji}
            className="w-full h-full object-cover scale-105 filter blur-[1px] brightness-75"
          />
        ) : (
          <div className="w-full h-full bg-card" />
        )}

        {/* TheTVDB Attribution */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="container mx-auto px-4 pt-4 flex justify-end items-start pointer-events-auto">
            <div className="flex flex-col gap-1 bg-black/50 backdrop-blur-sm p-2 rounded-xl border border-white/10 shadow-md">
              <span className="text-[8px] text-foreground/60 uppercase font-bold tracking-widest leading-none">
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

      <div className="container mx-auto px-4 -mt-24 md:-mt-36 relative z-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col lg:flex-row gap-8"
        >
          {/* Left Column - Poster & Actions */}
          <motion.div
            variants={itemVariants}
            className="shrink-0 w-full lg:w-[280px] flex flex-col gap-4"
          >
            <div className="bg-card/70 border border-border/60 backdrop-blur-xl shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center sm:items-start lg:items-stretch">
              <div className="aspect-2/3 w-40 sm:w-44 lg:w-full rounded-xl overflow-hidden shadow-lg border border-border/30 shrink-0">
                <img
                  src={movie.coverImage.large}
                  alt={movie.title?.romaji}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full justify-center">
                {session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer bg-primary hover:bg-primary/90 text-foreground font-medium rounded-xl transition-all shadow-lg shadow-primary/20"
                          size="lg"
                          onClick={async () => {
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
                                setHasListEntry(true);
                              } else {
                                toast.error("Failed to add to list");
                              }
                            } catch {
                              toast.error("Failed to add to list");
                            }
                          }}
                        >
                          Quick Add
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer border-border/60 hover:bg-muted text-foreground hover:text-foreground rounded-xl"
                          size="lg"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          Add to List
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full cursor-pointer bg-muted hover:bg-zinc-700 border border-border/60 text-foreground rounded-xl"
                        size="lg"
                        onClick={() => setIsDialogOpen(true)}
                      >
                        Edit Entry
                      </Button>
                    )}
                    <MovieEditDialog
                      media={movie}
                      hasListEntry={hasListEntry}
                      open={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      onSaved={() => fetchEntry()}
                      onDeleted={() => setHasListEntry(false)}
                    />
                  </>
                )}
                {movie.trailers && movie.trailers.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full border-border/60 hover:bg-muted text-foreground hover:text-foreground rounded-xl"
                    asChild
                  >
                    <a
                      href={movie.trailers[0].url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Watch Trailer
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Info Sidebar */}
            <div className="bg-card/60 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
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
                    <span className="font-medium text-foreground uppercase">
                      {movie.originalLanguage}
                    </span>
                  </div>
                )}
                {movie.contentRating && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Rating</span>
                    <Badge className="bg-amber-500/15 border border-primary/30 text-primary text-xs px-2 py-0.5">
                      {movie.contentRating}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Studios */}
            {movie.studios && movie.studios.length > 0 && (
              <div className="bg-card/60 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-sm tracking-wide text-muted-foreground uppercase mb-3">
                  Studios
                </h4>
                <div className="flex flex-wrap gap-2">
                  {movie.studios.map((studio) => (
                    <span
                      key={studio.name}
                      className="text-xs bg-muted text-foreground/90 border border-border/40 px-3 py-1.5 rounded-xl"
                    >
                      {studio.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Trailers */}
            {movie.trailers && movie.trailers.length > 1 && (
              <div className="bg-card/60 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-sm tracking-wide text-muted-foreground uppercase mb-3">
                  Trailers
                </h4>
                <div className="flex flex-col gap-2">
                  {movie.trailers.slice(1).map((trailer, idx) => (
                    <a
                      key={idx}
                      href={trailer.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs bg-muted hover:bg-zinc-700 text-foreground/90 border border-border/40 px-3 py-2 rounded-xl transition-all"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      {trailer.name || `Trailer ${idx + 2}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-8 lg:pt-8 mb-32">
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                {movie.title.english || movie.title.romaji}
              </h1>
              {movie.title.romaji &&
                movie.title.romaji !== movie.title.english && (
                  <p className="text-sm text-muted-foreground italic">
                    Also known as: {movie.title.romaji}
                  </p>
                )}
            </motion.div>

            {/* Quick Info Badges */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              {movie.runtime && (
                <div className="bg-card/55 border border-border/40 backdrop-blur-md px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{movie.runtime} min</span>
                </div>
              )}
              <div className="bg-card/55 border border-border/40 backdrop-blur-md px-4 py-2.5 rounded-xl flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground capitalize">
                  {movie.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              {movie.originalCountry && (
                <div className="bg-card/55 border border-border/40 backdrop-blur-md px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{movie.originalCountry}</span>
                </div>
              )}
              {movie.contentRating && (
                <Badge className="bg-primary/10 border border-primary/30 text-primary px-4 py-2.5 rounded-xl text-sm font-bold">
                  {movie.contentRating}
                </Badge>
              )}
            </motion.div>

            {/* Description */}
            <motion.div
              variants={itemVariants}
              className="bg-card/40 border border-border/30 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-lg font-bold text-foreground mb-3">Synopsis</h3>
              <div
                className="prose prose-neutral dark:prose-invert dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm md:text-base prose-p:my-2 prose-a:text-primary hover:prose-a:text-primary transition-colors"
                dangerouslySetInnerHTML={{ __html: movie.description }}
              />
            </motion.div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <Badge
                      key={genre}
                      className="bg-primary/10 border border-primary/30 hover:bg-primary/15 text-primary px-3 py-1 rounded-xl text-xs font-medium"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Cast */}
            {movie.characters && movie.characters.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">Cast</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {movie.characters.slice(0, 12).map((char, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-card/50 border border-border/40 backdrop-blur-md p-3 rounded-xl overflow-hidden hover:border-border/60 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {char.image && char.image.length > 0 ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                            <img
                              src={char.image}
                              alt={char.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">
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
