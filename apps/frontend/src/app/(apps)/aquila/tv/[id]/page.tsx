"use client";

import { Play, Check } from "lucide-react";
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
}

export default function TvDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [tv, setTv] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const session = useSession();

  // List State
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
    document.title = `Aquila > TV > ${tv?.title.english ?? tv?.title.romaji}`
  }, [tv?.title])

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !tv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">TV show not found</h2>
        <Button asChild>
          <Link href="/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Banner */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent z-10" />
        {tv.bannerImage ? (
          <img
            src={tv.bannerImage}
            alt={tv.title?.romaji}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        {/* TheTVDB Attribution Watermark */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="container mx-auto px-4 pt-4 flex justify-end items-start pointer-events-auto">
            <div className="flex flex-col gap-1 bg-black/40 backdrop-blur-xs p-2 rounded-lg border border-white/10 shadow-md">
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

      <div className="container mx-auto px-4 -mt-32 relative z-20">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column - Poster & Actions */}
          <div className="shrink-0 w-full md:w-[280px] flex flex-col gap-4">
            <div className="flex flex-row md:flex-col gap-4 items-end md:items-stretch">
              <div className="aspect-2/3 w-32 sm:w-40 md:w-full rounded-xl overflow-hidden shadow-2xl border-4 border-background shrink-0">
                <img
                  src={tv.coverImage.large}
                  alt={tv.title?.romaji}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 flex flex-col gap-2 w-full">
                {session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer hover:bg-primary hover:border-primary"
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
                          className="w-full cursor-pointer hover:bg-primary hover:text-primary hover:border-primary"
                          size="lg"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          Add to List
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
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
                      onSaved={() => {
                        fetchListEntry();
                      }}
                      onDeleted={() => {
                        setHasListEntry(false);
                        setWatchedEpisodes([]);
                      }}
                    />
                  </>
                )}
                {tv.trailers && tv.trailers.length > 0 && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={tv.trailers?.[0]?.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Watch Trailer
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Info Cards */}
            <div className="bg-card rounded-xl p-4 space-y-3 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-semibold">
                  Format
                </span>
                <span className="font-medium text-foreground">{tv.format}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-semibold">
                  Episodes
                </span>
                <span className="font-medium text-foreground">
                  {totalEpisodes}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-semibold">
                  Status
                </span>
                <span className="font-medium capitalize text-foreground">
                  {tv.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
            </div>

            {tv.studios && tv.studios.length > 0 && (
              <div className="bg-card rounded-xl p-4 space-y-2 border border-border">
                <h4 className="font-semibold text-sm mb-2 text-muted-foreground">
                  Networks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tv.studios.map((studio) => (
                    <span
                      key={studio.name}
                      className="text-xs bg-muted text-foreground px-2 py-1 rounded transition-colors"
                    >
                      {studio.name}
                    </span>
                  ))}
                </div>
              </div>
            )}


          </div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-8 pt-4 md:pt-32 mb-32">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-2">
                {tv.title.english || tv.title.romaji}
              </h1>
              {tv.title.romaji && tv.title.romaji !== tv.title.english && (
                <p className="text-sm text-muted-foreground italic">
                  Also known as: {tv.title.romaji}
                </p>
              )}
            </div>

            <div
              className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: tv.description }}
            />

            {tv.genres && tv.genres.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tv.genres?.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {tv.characters && tv.characters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Cast</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tv.characters.slice(0, 10).map((char, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border"
                    >
                      <img
                        src={char.image.length > 0 ? char.image : undefined}
                        alt={char.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {char.name}
                        </p>
                        {char.personName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {char.personName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tv.seasons && tv.seasons.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">Seasons</h3>
                <Accordion type="multiple" className="w-full space-y-2">
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
                        className="border border-border/40 rounded-lg overflow-hidden bg-card/50 shadow-none"
                      >
                        <AccordionTrigger className="hover:no-underline px-4 py-3 transition-colors hover:bg-muted/30">
                          <div className="flex items-center gap-6 w-full pr-8">
                            <div className="shrink-0 w-12 aspect-2/3 rounded-md overflow-hidden border border-border/50 bg-muted">
                              <img
                                src={season.image || tv.coverImage.large}
                                alt={season.name}
                                className="w-full h-full object-cover"
                              />
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
                                  <div className="flex-1 bg-muted/40 h-0.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-primary h-full transition-all duration-700"
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
                          <div className="divide-y divide-border/20 bg-muted/5">
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
                                    "flex items-center gap-4 p-3 hover:bg-muted/20 transition-colors group cursor-pointer",
                                    watched && "bg-primary/5",
                                  )}
                                  onClick={() =>
                                    toggleEpisode(season.number, episode.number)
                                  }
                                >
                                  <div
                                    className={cn(
                                      "shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                      watched
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-muted-foreground/20",
                                    )}
                                  >
                                    {watched && (
                                      <Check className="w-3.5 h-3.5" />
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
