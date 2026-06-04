"use client";

import { Play, Check, Globe, Clock, Tv2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TvEditDialog } from "@/components/aquila/TvEditDialog";
import { motion } from "framer-motion";

interface Episode {
  id: string;
  number: number;
  name: string;
  overview?: string;
  image?: string;
  airDate?: string;
}

interface Season {
  id: string;
  number: number;
  name: string;
  image?: string;
  episodeCount: number;
  episodes: Episode[];
}

interface MediaCharacter {
  name: string;
  personName?: string;
  image: string;
  role?: string;
}

interface MediaStudio {
  name: string;
}

interface MediaTrailer {
  id: string;
  name: string;
  url: string;
  language?: string;
  site?: string;
}

interface Media {
  id: string;
  title: {
    romaji: string;
    english?: string;
  };
  coverImage: {
    large: string;
  };
  bannerImage?: string;
  format: string;
  status: string;
  description: string;
  genres: string[];
  characters?: MediaCharacter[];
  trailers?: MediaTrailer[];
  studios?: MediaStudio[];
  seasons: Season[];
  originalCountry?: string;
  originalLanguage?: string;
  tvType?: string;
  averageRuntime?: number;
  contentRating?: string;
}

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
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function TvDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [tv, setTv] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasListEntry, setHasListEntry] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<
    { seasonNum: number; episodeNum: number }[]
  >([]);

  useEffect(() => {
    async function fetchTv() {
      if (!id) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/tv/details/${id}`,
        );
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTv(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchTv();
  }, [id]);

  const fetchListEntry = async () => {
    if (!tv?.id || session.status !== "authenticated") return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${tv.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.data.accessToken}`,
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        if (data) {
          setWatchedEpisodes(data.watchedEpisodes || []);
          setHasListEntry(true);
        }
      } else {
        setHasListEntry(false);
      }
    } catch (e) {
      console.error("Failed to fetch TV list entry", e);
    }
  };

  useEffect(() => {
    fetchListEntry();
  }, [session.status, tv?.id]);

  useEffect(() => {
    document.title = `Aquila > TV > ${tv?.title.english ?? tv?.title.romaji ?? ""}`;
  }, [tv?.title]);

  const toggleEpisode = async (seasonNum: number, episodeNum: number) => {
    if (!tv) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${tv.id}/episode`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({ seasonNum, episodeNum }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.watched) {
          setWatchedEpisodes((prev) => [...prev, { seasonNum, episodeNum }]);
        } else {
          setWatchedEpisodes((prev) =>
            prev.filter(
              (ep) =>
                !(ep.seasonNum === seasonNum && ep.episodeNum === episodeNum),
            ),
          );
        }
      }
    } catch {
      toast.error("Failed to update episode progress");
    }
  };

  const toggleSeason = async (seasonNum: number, watched: boolean) => {
    if (!tv) return;
    const season = tv.seasons.find((s) => s.number === seasonNum);
    if (!season) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${tv.id}/season`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            seasonNum,
            episodes: season.episodes,
            watched,
          }),
        },
      );
      if (res.ok) {
        if (watched) {
          setWatchedEpisodes((prev) => {
            const others = prev.filter((ep) => ep.seasonNum !== seasonNum);
            const seasonEps = season.episodes.map((ep) => ({
              seasonNum,
              episodeNum: ep.number,
            }));
            return [...others, ...seasonEps];
          });
        } else {
          setWatchedEpisodes((prev) =>
            prev.filter((ep) => ep.seasonNum !== seasonNum),
          );
        }
        toast.success(
          watched ? "Season marked as watched" : "Season marked as unwatched",
        );
      }
    } catch {
      toast.error("Failed to update season progress");
    }
  };

  const totalEpisodes = useMemo(() => {
    if (!tv) return 0;
    return tv.seasons.reduce((acc, s) => acc + s.episodeCount, 0);
  }, [tv]);

  const watchedCount = watchedEpisodes.length;
  const progressPercent =
    totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !tv) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-zinc-100">TV show not found</h2>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/aquila/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32 relative overflow-x-hidden">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] left-[-100px] w-[600px] h-[600px] bg-sky-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Banner Section */}
      <div className="relative h-[250px] md:h-[380px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />
        {tv.bannerImage ? (
          <img
            src={tv.bannerImage}
            alt={tv.title?.romaji}
            className="w-full h-full object-cover scale-105 filter blur-[1px] brightness-75"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}

        {/* TheTVDB Attribution */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="container mx-auto px-4 pt-4 flex justify-end items-start pointer-events-auto">
            <div className="flex flex-col gap-1 bg-black/50 backdrop-blur-sm p-2 rounded-xl border border-white/10 shadow-md">
              <span className="text-[8px] text-white/60 uppercase font-bold tracking-widest leading-none">
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
            <div className="bg-zinc-900/70 border border-zinc-800/60 backdrop-blur-xl shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center sm:items-start lg:items-stretch">
              <div className="aspect-2/3 w-40 sm:w-44 lg:w-full rounded-xl overflow-hidden shadow-lg border border-zinc-700/30 shrink-0">
                <img
                  src={tv.coverImage.large}
                  alt={tv.title?.romaji}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full justify-center">
                {session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20"
                          size="lg"
                          onClick={async () => {
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
                                setHasListEntry(true);
                                fetchListEntry();
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
                          className="w-full cursor-pointer border-zinc-700/60 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl"
                          size="lg"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          Add to List
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full cursor-pointer bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-100 rounded-xl"
                        size="lg"
                        onClick={() => setIsDialogOpen(true)}
                      >
                        Edit Entry
                      </Button>
                    )}
                    <TvEditDialog
                      media={tv}
                      hasListEntry={hasListEntry}
                      open={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      onSaved={() => fetchListEntry()}
                      onDeleted={() => {
                        setHasListEntry(false);
                        setWatchedEpisodes([]);
                      }}
                    />
                  </>
                )}
                {tv.trailers && tv.trailers.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full border-zinc-700/60 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl"
                    asChild
                  >
                    <a
                      href={tv.trailers[0].url}
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
            <div className="bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
                Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Format</span>
                  <span className="font-medium text-zinc-100">{tv.format}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Episodes</span>
                  <span className="font-medium text-zinc-100">{totalEpisodes}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Seasons</span>
                  <span className="font-medium text-zinc-100">{tv.seasons.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Status</span>
                  <span className="font-medium text-zinc-100 capitalize">
                    {tv.status?.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                {tv.originalCountry && (
                  <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                    <span className="text-zinc-400">Country</span>
                    <span className="font-medium text-zinc-100">{tv.originalCountry}</span>
                  </div>
                )}
                {tv.originalLanguage && (
                  <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                    <span className="text-zinc-400">Language</span>
                    <span className="font-medium text-zinc-100 uppercase">{tv.originalLanguage}</span>
                  </div>
                )}
                {tv.averageRuntime && (
                  <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                    <span className="text-zinc-400">Avg Runtime</span>
                    <span className="font-medium text-zinc-100">{tv.averageRuntime} min</span>
                  </div>
                )}
                {tv.contentRating && (
                  <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                    <span className="text-zinc-400">Rating</span>
                    <Badge className="bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs px-2 py-0.5">
                      {tv.contentRating}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Networks */}
            {tv.studios && tv.studios.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-sm tracking-wide text-zinc-400 uppercase mb-3">
                  Networks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tv.studios.map((studio) => (
                    <span
                      key={studio.name}
                      className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/40 px-3 py-1.5 rounded-xl"
                    >
                      {studio.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Trailers */}
            {tv.trailers && tv.trailers.length > 1 && (
              <div className="bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-sm tracking-wide text-zinc-400 uppercase mb-3">
                  Trailers
                </h4>
                <div className="flex flex-col gap-2">
                  {tv.trailers.slice(1).map((trailer, idx) => (
                    <a
                      key={idx}
                      href={trailer.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/40 px-3 py-2 rounded-xl transition-all"
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
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                {tv.title.english || tv.title.romaji}
              </h1>
              {tv.title.romaji && tv.title.romaji !== tv.title.english && (
                <p className="text-sm text-zinc-400 italic">
                  Also known as: {tv.title.romaji}
                </p>
              )}
            </motion.div>

            {/* Quick Info Badges */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md px-4 py-2.5 rounded-xl flex items-center gap-2">
                <Tv2 className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-zinc-200 capitalize">
                  {tv.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              {tv.averageRuntime && (
                <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-zinc-200">{tv.averageRuntime} min/ep</span>
                </div>
              )}
              {tv.originalCountry && (
                <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-zinc-200">{tv.originalCountry}</span>
                </div>
              )}
              {tv.contentRating && (
                <Badge className="bg-blue-500/10 border border-blue-500/30 text-blue-300 px-4 py-2.5 rounded-xl text-sm font-bold">
                  {tv.contentRating}
                </Badge>
              )}
            </motion.div>

            {/* Watch Progress */}
            {hasListEntry && totalEpisodes > 0 && (
              <motion.div
                variants={itemVariants}
                className="bg-zinc-900/40 border border-zinc-800/30 backdrop-blur-sm p-5 rounded-2xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-zinc-300">Watch Progress</span>
                  <span className="text-xs font-bold text-blue-400 tabular-nums">
                    {watchedCount} / {totalEpisodes} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-800/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* Description */}
            <motion.div
              variants={itemVariants}
              className="bg-zinc-900/40 border border-zinc-800/30 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-lg font-bold text-zinc-100 mb-3">Synopsis</h3>
              <div
                className="prose prose-zinc dark:prose-invert max-w-none text-zinc-300 leading-relaxed text-sm md:text-base prose-p:my-2 prose-a:text-blue-400 hover:prose-a:text-blue-300 transition-colors"
                dangerouslySetInnerHTML={{ __html: tv.description }}
              />
            </motion.div>

            {/* Genres */}
            {tv.genres && tv.genres.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-100">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {tv.genres.map((genre) => (
                    <Badge
                      key={genre}
                      className="bg-blue-500/10 border border-blue-500/35 hover:bg-blue-500/15 text-blue-300 px-3 py-1 rounded-xl text-xs font-medium"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Cast */}
            {tv.characters && tv.characters.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-100">Cast</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tv.characters.slice(0, 12).map((char, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/40 backdrop-blur-md p-3 rounded-xl overflow-hidden hover:border-zinc-700/60 transition-all group"
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
                          <div className="w-12 h-12 rounded-lg bg-zinc-800 shrink-0 flex items-center justify-center text-zinc-500 text-xs">
                            ?
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-zinc-100">
                            {char.name}
                          </p>
                          <p className="text-xs text-zinc-400 capitalize truncate">
                            {char.role?.toLowerCase()}
                          </p>
                        </div>
                      </div>
                      {char.personName && (
                        <span className="text-xs text-zinc-400 truncate ml-3 shrink-0">
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
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-xl font-bold text-zinc-100">Seasons</h3>
                <Accordion type="multiple" className="w-full space-y-3">
                  {tv.seasons.map((season) => {
                    const watchedInSeason = watchedEpisodes.filter(
                      (ep) => ep.seasonNum === season.number,
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
                        className="border border-zinc-800/40 rounded-2xl overflow-hidden bg-zinc-900/40 backdrop-blur-md shadow-none"
                      >
                        <AccordionTrigger className="hover:no-underline px-4 py-3 transition-colors hover:bg-zinc-800/30">
                          <div className="flex items-center gap-6 w-full pr-8">
                            <div className="shrink-0 w-12 aspect-2/3 rounded-lg overflow-hidden border border-zinc-800/50 bg-zinc-800">
                              <img
                                src={season.image || tv.coverImage.large}
                                alt={season.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 flex items-center gap-8 text-left min-w-0">
                              <div className="flex flex-col">
                                <h4 className="text-sm font-bold text-zinc-100 truncate">
                                  Season {season.number}
                                </h4>
                                <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-tight">
                                  {season.episodeCount} Episodes
                                </span>
                              </div>

                              {hasListEntry && (
                                <div className="flex-1 flex items-center gap-4 max-w-[300px]">
                                  <div className="flex-1 bg-zinc-800/60 h-1 rounded-full overflow-hidden">
                                    <div
                                      className="bg-blue-500 h-full transition-all duration-700 rounded-full"
                                      style={{
                                        width: `${seasonProgress}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold text-blue-400/80 tabular-nums">
                                    {watchedInSeason} / {season.episodeCount}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 border-t border-zinc-800/30">
                          <div className="divide-y divide-zinc-800/20">
                            {season.episodes.map((episode) => {
                              const watched = watchedEpisodes.some(
                                (ep) =>
                                  ep.seasonNum === season.number &&
                                  ep.episodeNum === episode.number,
                              );
                              return (
                                <div
                                  key={episode.id}
                                  className={cn(
                                    "flex items-center gap-4 p-3 hover:bg-zinc-800/20 transition-colors group cursor-pointer",
                                    watched && "bg-blue-500/5",
                                  )}
                                  onClick={() =>
                                    toggleEpisode(season.number, episode.number)
                                  }
                                >
                                  <div
                                    className={cn(
                                      "shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                      watched
                                        ? "bg-blue-500 border-blue-500 text-white"
                                        : "border-zinc-600",
                                    )}
                                  >
                                    {watched && (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-bold text-zinc-200">
                                        {episode.number}. {episode.name}
                                      </span>
                                      {episode.airDate && (
                                        <span className="text-[10px] text-zinc-500 font-medium">
                                          {episode.airDate}
                                        </span>
                                      )}
                                    </div>
                                    {episode.overview && (
                                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
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
