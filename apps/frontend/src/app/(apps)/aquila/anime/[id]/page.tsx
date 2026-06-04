"use client";

import { Play, Calendar, Star, TrendingUp, Heart, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AnimeEditDialog } from "@/components/aquila/AnimeEditDialog";
import { motion } from "framer-motion";

interface MediaTrailer {
  id: string;
  name: string;
  url: string;
  language?: string;
  site?: string;
}

interface MediaCharacter {
  name: string;
  personName?: string;
  image: string;
  role?: string;
  voiceActor?: {
    name: string;
    image: string;
  } | null;
}

interface MediaStudio {
  id: string;
  name: string;
  isAnimationStudio?: boolean;
}

interface MediaRelation {
  id: string;
  relationType: string;
  title: { romaji: string; english?: string };
  format: string;
  type: string;
}

interface MediaExternalLink {
  id: string;
  url: string;
  site: string;
}

interface Media {
  id: string;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  coverImage: {
    extraLarge?: string;
    large: string;
    color?: string;
  };
  bannerImage?: string;
  format: string;
  status: string;
  description: string;
  startDate?: { year: number; month: number; day: number };
  endDate?: { year: number; month: number; day: number };
  season?: string;
  seasonYear?: number;
  episodes?: number;
  duration?: number;
  genres: string[];
  source?: string;
  tags?: { id: string; name: string; rank?: number }[];
  averageScore?: number;
  popularity?: number;
  favourites?: number;
  trending?: number;
  meanScore?: number;
  synonyms?: string[];
  hashtag?: string;
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  } | null;
  relations?: MediaRelation[];
  characters?: MediaCharacter[];
  trailers?: MediaTrailer[];
  externalLinks?: MediaExternalLink[];
  studios?: MediaStudio[];
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
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function AnimeDetailsPage() {
  const params = useParams();
  const id: string = params?.id as string;
  const session = useSession();

  const [anime, setAnime] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasListEntry, setHasListEntry] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === "authenticated" && session.data?.user?.id && id) {
      const fetchEntry = async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/list/anime/entry/${id}`,
            {
              headers: {
                Authorization: `Bearer ${session.data.accessToken}`,
              },
            },
          );
          if (res.ok) {
            const data = await res.json();
            setHasListEntry(!!data);
          }
        } catch (e) {
          console.error("Failed to fetch anime list entry", e);
        }
      };
      fetchEntry();
    }
  }, [session.data?.user?.id, id, session.status]);

  useEffect(() => {
    async function fetchAnime() {
      if (!id) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/anime/details/${id}`,
        );
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        console.log(data)
        setAnime(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchAnime();
  }, [id]);

  useEffect(() => {
    if (!anime) return;
    document.title = `Aquila > Anime > ${anime?.title.english ?? anime?.title.romaji ?? ""}`;
  }, [anime?.title.romaji, anime?.title.english]);

  useEffect(() => {
    if (!anime?.nextAiringEpisode) return;
    const targetTime = anime.nextAiringEpisode.airingAt * 1000;

    const updateTimer = () => {
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

      setTimeLeft(
        `${days > 0 ? days + "d " : ""}${hours}h ${mins}m ${secs}s`,
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [anime?.nextAiringEpisode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-x-hidden">
        {/* Soft blur backgrounds */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-violet-500 animate-spin" />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-zinc-100">Anime not found</h2>
        <Button asChild className="bg-violet-600 hover:bg-violet-700">
          <Link href="/aquila/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32 relative overflow-x-hidden">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] left-[-100px] w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Banner Section */}
      <div className="relative h-[250px] md:h-[380px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />
        {anime.bannerImage ? (
          <img
            src={anime.bannerImage}
            alt={anime.title?.romaji}
            className="w-full h-full object-cover scale-105 filter blur-[1px] brightness-75"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
      </div>

      <div className="container mx-auto px-4 -mt-24 md:-mt-36 relative z-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col lg:flex-row gap-8"
        >
          {/* Left Column - Cover & Main Actions (Glassmorphic) */}
          <motion.div
            variants={itemVariants}
            className="shrink-0 w-full lg:w-[280px] flex flex-col gap-4"
          >
            <div className="bg-zinc-900/70 border border-zinc-800/60 backdrop-blur-xl shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center sm:items-start lg:items-stretch">
              <div className="aspect-2/3 w-40 sm:w-44 lg:w-full rounded-xl overflow-hidden shadow-lg border border-zinc-700/30 shrink-0">
                <img
                  src={anime.coverImage.extraLarge || anime.coverImage.large}
                  alt={anime.title?.romaji}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full justify-center">
                {session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-600/20"
                          size="lg"
                          onClick={async () => {
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
                    <AnimeEditDialog
                      media={anime}
                      hasListEntry={hasListEntry}
                      open={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      onSaved={() => setHasListEntry(true)}
                      onDeleted={() => setHasListEntry(false)}
                    />
                  </>
                )}
                {anime.trailers && anime.trailers.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full border-zinc-700/60 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl"
                    asChild
                  >
                    <a
                      href={anime.trailers[0].url}
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

            {/* Media Metadata Stats Sidebar (Glassmorphic) */}
            <div className="bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
                Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Format</span>
                  <span className="font-medium text-zinc-100">
                    {anime.format}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Episodes</span>
                  <span className="font-medium text-zinc-100">
                    {anime.episodes || "?"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Duration</span>
                  <span className="font-medium text-zinc-100">
                    {anime.duration ? `${anime.duration} mins` : "?"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Status</span>
                  <span className="font-medium text-zinc-100 capitalize">
                    {anime.status?.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Season</span>
                  <span className="font-medium text-zinc-100 capitalize">
                    {anime.season?.toLowerCase()} {anime.seasonYear}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Source</span>
                  <span className="font-medium text-zinc-100 capitalize">
                    {anime.source?.replace(/_/g, " ").toLowerCase() || "?"}
                  </span>
                </div>
                {anime.hashtag && (
                  <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                    <span className="text-zinc-400">Hashtag</span>
                    <span className="font-medium text-violet-400">
                      {anime.hashtag}
                    </span>
                  </div>
                )}
                {anime.synonyms && anime.synonyms.length > 0 && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-400">Synonyms</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {anime.synonyms.slice(0, 4).map((syn, idx) => (
                        <span
                          key={idx}
                          className="bg-zinc-850 text-zinc-300 text-xs px-2 py-0.5 rounded border border-zinc-800"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* External Links */}
            {anime.externalLinks && anime.externalLinks.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-sm tracking-wide text-zinc-400 uppercase mb-3">
                  External Links
                </h4>
                <div className="flex flex-wrap gap-2">
                  {anime.externalLinks.map((link, qid) => (
                    <a
                      key={qid}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/40 px-3 py-1.5 rounded-xl transition-all"
                    >
                      {link.site}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-8 lg:pt-8 mb-32">
            {/* Countdown timer (if airing) */}
            {timeLeft && anime?.nextAiringEpisode && (
              <motion.div
                variants={itemVariants}
                className="bg-red-500/10 border border-red-500/30 text-red-400 px-5 py-3.5 rounded-2xl flex items-center justify-between gap-4 animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Next Episode: {anime.nextAiringEpisode.episode}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold">{timeLeft}</span>
              </motion.div>
            )}

            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                {anime.title.english || anime.title.romaji}
              </h1>
              {(anime.title.romaji &&
                anime.title.romaji !== anime.title.english) ||
              anime.title.native ? (
                <p className="text-sm text-zinc-400 italic">
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
              <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 text-violet-400 fill-violet-400/20" />
                  <span>Average Score</span>
                </div>
                <span className="text-2xl font-extrabold text-violet-400">
                  {anime.averageScore ? `${anime.averageScore}%` : "N/A"}
                </span>
              </div>
              <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                  <span>Mean Score</span>
                </div>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {anime.meanScore ? `${anime.meanScore}%` : "N/A"}
                </span>
              </div>
              <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Popularity</span>
                </div>
                <span className="text-2xl font-extrabold text-amber-400">
                  {anime.popularity ? anime.popularity.toLocaleString() : "N/A"}
                </span>
              </div>
              <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                  <span>Favorites</span>
                </div>
                <span className="text-2xl font-extrabold text-rose-400">
                  {anime.favourites ? anime.favourites.toLocaleString() : "N/A"}
                </span>
              </div>
            </motion.div>

            {/* Description (Glassmorphic Container) */}
            <motion.div
              variants={itemVariants}
              className="bg-zinc-900/40 border border-zinc-800/30 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-lg font-bold text-zinc-100 mb-3">Synopsis</h3>
              <div
                className="prose prose-zinc dark:prose-invert max-w-none text-zinc-300 leading-relaxed text-sm md:text-base prose-p:my-2 prose-a:text-violet-400 hover:prose-a:text-violet-300 transition-colors"
                dangerouslySetInnerHTML={{ __html: anime.description }}
              />
            </motion.div>

            {/* Genres & Tags */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-lg font-bold text-zinc-100">Genres & Tags</h3>
              <div className="flex flex-wrap gap-2">
                {anime.genres?.map((genre, qid) => (
                  <Badge
                    key={qid}
                    className="bg-violet-500/10 border border-violet-500/35 hover:bg-violet-500/15 text-violet-300 px-3 py-1 rounded-xl text-xs font-medium"
                  >
                    {genre}
                  </Badge>
                ))}
                {anime.tags?.slice(0, 8).map((tag, qid) => (
                  <Badge
                    key={qid}
                    variant="outline"
                    className="border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 px-3 py-1 rounded-xl text-xs"
                  >
                    {tag.name}
                    {tag.rank && (
                      <span className="ml-1 text-[10px] text-zinc-500">
                        {tag.rank}%
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </motion.div>

            {/* Characters with Japanese Voice Actor dual-cards */}
            {anime.characters && anime.characters.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-100">Characters & Voice Actors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {anime.characters.slice(0, 10).map((char, qid) => (
                    <div
                      key={qid}
                      className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/40 backdrop-blur-md p-3 rounded-xl overflow-hidden hover:border-zinc-700/60 transition-all group"
                    >
                      {/* Character Side */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                          <img
                            src={char.image}
                            alt={char.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-zinc-100">
                            {char.name}
                          </p>
                          <p className="text-xs text-zinc-400 capitalize">
                            {char.role?.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      {/* Voice Actor Side */}
                      {char.voiceActor && (
                        <div className="flex items-center gap-3 text-right min-w-0 border-l border-zinc-800/80 pl-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-zinc-300">
                              {char.voiceActor.name}
                            </p>
                            <p className="text-[10px] text-zinc-500">JA Voice</p>
                          </div>
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                            <img
                              src={char.voiceActor.image}
                              alt={char.voiceActor.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-100">Relations</h3>
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
                        className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/40 p-4 rounded-xl hover:bg-zinc-850 hover:border-zinc-700/60 transition-all group"
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                            {relation.title.romaji}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {relation.format}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-zinc-850/50 border-zinc-700/30 text-zinc-400 capitalize"
                        >
                          {relation.relationType.replace(/_/g, " ").toLowerCase()}
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
