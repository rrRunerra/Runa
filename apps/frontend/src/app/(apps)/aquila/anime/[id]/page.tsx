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
    transition: { type: ("spring" as any), stiffness: 100, damping: 15 },
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
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-x-hidden">
        {/* Soft blur backgrounds */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground">Anime not found</h2>
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
        {anime.bannerImage ? (
          <img
            src={anime.bannerImage}
            alt={anime.title?.romaji}
            className="w-full h-full object-cover scale-105 filter blur-[1px] brightness-75"
          />
        ) : (
          <div className="w-full h-full bg-card" />
        )}

        {/* AniList Attribution */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="container mx-auto px-4 pt-4 flex justify-end items-start pointer-events-auto">
            <div className="flex flex-col gap-1 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 shadow-md">
              <span className="text-[8px] text-foreground/60 uppercase font-bold tracking-widest leading-none">
                Data Provided By
              </span>
              <Link
                href="https://anilist.co"
                target="_blank"
                className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
              >
                AniList
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
          {/* Left Column - Cover & Main Actions (Glassmorphic) */}
          <motion.div
            variants={itemVariants}
            className="shrink-0 w-full lg:w-[280px] flex flex-col gap-4"
          >
            <div className="bg-card/70 border border-border/60 backdrop-blur-xl shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center sm:items-start lg:items-stretch">
              <div className="aspect-2/3 w-40 sm:w-44 lg:w-full rounded-xl overflow-hidden shadow-lg border border-border/30 shrink-0">
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
                          className="w-full cursor-pointer bg-primary hover:bg-primary/90 text-foreground font-medium rounded-xl transition-all shadow-lg shadow-primary/20"
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
                    className="w-full border-border/60 hover:bg-muted text-foreground hover:text-foreground rounded-xl"
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
            <div className="bg-card/60 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
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
                        <span
                          key={idx}
                          className="bg-muted/70 text-foreground/90 text-xs px-2 py-0.5 rounded border border-border"
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
              <div className="bg-card/60 border border-border/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-sm tracking-wide text-muted-foreground uppercase mb-3">
                  External Links
                </h4>
                <div className="flex flex-wrap gap-2">
                  {anime.externalLinks.map((link, qid) => (
                    <a
                      key={qid}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-muted hover:bg-zinc-700 text-foreground/90 border border-border/40 px-3 py-1.5 rounded-xl transition-all"
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
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                {anime.title.english || anime.title.romaji}
              </h1>
              {(anime.title.romaji &&
                anime.title.romaji !== anime.title.english) ||
              anime.title.native ? (
                <p className="text-sm text-muted-foreground italic">
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
              <div className="bg-card/55 border border-border/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary/20" />
                  <span>Average Score</span>
                </div>
                <span className="text-2xl font-extrabold text-primary">
                  {anime.averageScore ? `${anime.averageScore}%` : "N/A"}
                </span>
              </div>
              <div className="bg-card/55 border border-border/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                  <span>Mean Score</span>
                </div>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {anime.meanScore ? `${anime.meanScore}%` : "N/A"}
                </span>
              </div>
              <div className="bg-card/55 border border-border/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Popularity</span>
                </div>
                <span className="text-2xl font-extrabold text-amber-400">
                  {anime.popularity ? anime.popularity.toLocaleString() : "N/A"}
                </span>
              </div>
              <div className="bg-card/55 border border-border/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
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
              className="bg-card/40 border border-border/30 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-lg font-bold text-foreground mb-3">Synopsis</h3>
              <div
                className="prose prose-neutral dark:prose-invert dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm md:text-base prose-p:my-2 prose-a:text-primary hover:prose-a:text-primary transition-colors"
                dangerouslySetInnerHTML={{ __html: anime.description }}
              />
            </motion.div>

            {/* Genres & Tags */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">Genres & Tags</h3>
              <div className="flex flex-wrap gap-2">
                {anime.genres?.map((genre, qid) => (
                  <Badge
                    key={qid}
                    className="bg-primary/10 border border-primary/30 hover:bg-primary/15 text-primary px-3 py-1 rounded-xl text-xs font-medium"
                  >
                    {genre}
                  </Badge>
                ))}
                {anime.tags?.slice(0, 8).map((tag, qid) => (
                  <Badge
                    key={qid}
                    variant="outline"
                    className="border-border/50 hover:bg-card text-muted-foreground hover:text-foreground px-3 py-1 rounded-xl text-xs"
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
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">Characters & Voice Actors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {anime.characters.slice(0, 10).map((char, qid) => (
                    <div
                      key={qid}
                      className="flex items-center justify-between bg-card/50 border border-border/40 backdrop-blur-md p-3 rounded-xl overflow-hidden hover:border-border/60 transition-all group"
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
                        <div className="flex items-center gap-3 text-right min-w-0 border-l border-border/80 pl-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-foreground/90">
                              {char.voiceActor.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">JA Voice</p>
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
                <h3 className="text-lg font-bold text-foreground">Relations</h3>
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
                        className="flex items-center justify-between bg-card/40 border border-border/40 p-4 rounded-xl hover:bg-muted/70 hover:border-border/60 transition-all group"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-foreground transition-colors">
                            {relation.title.romaji}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {relation.format}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-muted/50 border-border/30 text-muted-foreground capitalize"
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
