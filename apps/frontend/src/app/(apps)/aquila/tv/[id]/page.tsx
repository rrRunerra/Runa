"use client";

import {
  CalendarIcon,
  Play,
  Trash2,
  ChevronDown,
  Check,
  CheckCircle2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";

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
  const [listStatus, setListStatus] = useState<string>("PLANNING");
  const [score, setScore] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [finishDate, setFinishDate] = useState<Date | undefined>();
  const [rewatches, setRewatches] = useState<string>("0");
  const [watchedEpisodes, setWatchedEpisodes] = useState<
    { seasonNum: number; episodeNum: number }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          setListStatus(data.status || "PLANNING");
          setScore(data.score ? data.score.toString() : "");
          setNotes(data.notes || "");
          setStartDate(
            data.startDate ? new Date(data.startDate * 1000) : undefined,
          );
          setFinishDate(
            data.endDate ? new Date(data.endDate * 1000) : undefined,
          );
          setRewatches(data.rewatched ? data.rewatched.toString() : "0");
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

  const handleSave = async () => {
    if (!tv) return;
    setIsSubmitting(true);
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
            status: listStatus,
            startDate: startDate
              ? Math.floor(startDate.getTime() / 1000)
              : undefined,
            endDate: finishDate
              ? Math.floor(finishDate.getTime() / 1000)
              : undefined,
            score: score ? Number(score) : undefined,
            notes: notes || undefined,
            rewatched: rewatches ? Number(rewatches) : undefined,
          }),
        },
      );
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("List updated!");
        setIsDialogOpen(false);
        setHasListEntry(true);
      } else {
        toast.error(data.message || "Failed to update list");
      }
    } catch {
      toast.error("Failed to update list");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!tv) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${tv.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
        },
      );
      if (res.ok) {
        toast.success("Removed from list!");
        setHasListEntry(false);
        setIsDialogOpen(false);
        // Reset state
        setListStatus("PLANNING");
        setScore("");
        setNotes("");
        setStartDate(undefined);
        setFinishDate(undefined);
        setRewatches("0");
        setWatchedEpisodes([]);
      } else {
        toast.error("Failed to remove from list");
      }
    } catch {
      toast.error("Failed to remove from list");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    } catch (e) {
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
          // Add all season episodes to watched (avoiding duplicates)
          setWatchedEpisodes((prev) => {
            const others = prev.filter((ep) => ep.seasonNum !== seasonNum);
            const seasonEps = season.episodes.map((ep) => ({
              seasonNum,
              episodeNum: ep.number,
            }));
            return [...others, ...seasonEps];
          });
        } else {
          // Remove all season episodes
          setWatchedEpisodes((prev) =>
            prev.filter((ep) => ep.seasonNum !== seasonNum),
          );
        }
        toast.success(
          watched ? "Season marked as watched" : "Season marked as unwatched",
        );
      }
    } catch (e) {
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
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-20">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column - Poster & Actions */}
          <div className="shrink-0 w-full md:w-[280px] flex flex-col gap-4">
            <div className="aspect-2/3 w-full rounded-xl overflow-hidden shadow-2xl border-4 border-background">
              <img
                src={tv.coverImage.large}
                alt={tv.title?.romaji}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-2">
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
                              fetchListEntry(); // Refresh to get the entry
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
                      <Dialog
                        open={isDialogOpen}
                        onOpenChange={setIsDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full cursor-pointer hover:bg-primary hover:text-primary hover:border-primary"
                            size="lg"
                          >
                            Add to List
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-popover border-border text-popover-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground">
                          <DialogTitle className="sr-only">Edit TV Show List Entry</DialogTitle>
                          <TvDialogContent
                            tv={tv}
                            listStatus={listStatus}
                            setListStatus={setListStatus}
                            score={score}
                            setScore={setScore}
                            startDate={startDate}
                            setStartDate={setStartDate}
                            finishDate={finishDate}
                            setFinishDate={setFinishDate}
                            rewatches={rewatches}
                            setRewatches={setRewatches}
                            notes={notes}
                            setNotes={setNotes}
                            hasListEntry={hasListEntry}
                            handleDelete={handleDelete}
                            handleSave={handleSave}
                            isSubmitting={isSubmitting}
                            setIsDialogOpen={setIsDialogOpen}
                            watchedEpisodes={watchedEpisodes}
                            toggleEpisode={toggleEpisode}
                            toggleSeason={toggleSeason}
                            progressPercent={progressPercent}
                            watchedCount={watchedCount}
                            totalEpisodes={totalEpisodes}
                          />
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                          size="lg"
                        >
                          Edit Entry
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-popover border-border text-popover-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground">
                        <DialogTitle className="sr-only">Edit TV Show List Entry</DialogTitle>
                        <TvDialogContent
                          tv={tv}
                          listStatus={listStatus}
                          setListStatus={setListStatus}
                          score={score}
                          setScore={setScore}
                          startDate={startDate}
                          setStartDate={setStartDate}
                          finishDate={finishDate}
                          setFinishDate={setFinishDate}
                          rewatches={rewatches}
                          setRewatches={setRewatches}
                          notes={notes}
                          setNotes={setNotes}
                          hasListEntry={hasListEntry}
                          handleDelete={handleDelete}
                          handleSave={handleSave}
                          isSubmitting={isSubmitting}
                          setIsDialogOpen={setIsDialogOpen}
                          watchedEpisodes={watchedEpisodes}
                          toggleEpisode={toggleEpisode}
                          toggleSeason={toggleSeason}
                          progressPercent={progressPercent}
                          watchedCount={watchedCount}
                          totalEpisodes={totalEpisodes}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
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

            {/* TheTVDB Attribution */}
            <div className="bg-card rounded-xl p-4 border border-border flex flex-col items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                Data Provided By
              </span>
              <Link
                href="https://thetvdb.com"
                target="_blank"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <Image
                  src="https://thetvdb.com/images/logo.png"
                  alt="TheTVDB Logo"
                  width={100}
                  height={100}
                />
              </Link>
            </div>
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
                                (ep: any) =>
                                  ep.seasonNum === season.number &&
                                  ep.episodeNum === episode.number,
                              );
                              return (
                                <div
                                  key={episode.id}
                                  className={cn(
                                    "flex items-center gap-4 p-3 hover:bg-muted/20 transition-colors group",
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
                                    {watched && <Check className="w-3.5 h-3.5" />}
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

function TvDialogContent({
  tv,
  listStatus,
  setListStatus,
  score,
  setScore,
  startDate,
  setStartDate,
  finishDate,
  setFinishDate,
  rewatches,
  setRewatches,
  notes,
  setNotes,
  hasListEntry,
  handleDelete,
  handleSave,
  isSubmitting,
  setIsDialogOpen,
  watchedEpisodes,
  toggleEpisode,
  toggleSeason,
  progressPercent,
  watchedCount,
  totalEpisodes,
}: any) {
  const [activeTab, setActiveTab] = useState<"general" | "episodes">("general");

  const isEpisodeWatched = (seasonNum: number, episodeNum: number) => {
    return watchedEpisodes.some(
      (ep: any) => ep.seasonNum === seasonNum && ep.episodeNum === episodeNum,
    );
  };

  const getSeasonWatchedCount = (season: Season) => {
    return season.episodes.filter((ep) =>
      isEpisodeWatched(season.number, ep.number),
    ).length;
  };

  return (
    <>
      <div className="relative h-48 w-full bg-muted">
        {tv.bannerImage && (
          <img
            src={tv.bannerImage}
            alt="banner"
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-popover to-transparent" />
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-6 z-10">
          <img
            src={tv.coverImage.large}
            alt="cover"
            className="w-24 rounded shadow-lg object-cover bg-muted"
          />
          <div className="flex-1 pb-1">
            <h2 className="text-xl font-bold line-clamp-2 text-foreground">
              {tv.title.english || tv.title.romaji}
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 bg-muted/50 h-2 rounded-full overflow-hidden max-w-[200px]">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {watchedCount} / {totalEpisodes} episodes
              </span>
            </div>
          </div>
          <div className="pb-1 flex gap-4 items-center">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md font-medium px-6"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-popover border-b border-border flex px-6">
        <button
          onClick={() => setActiveTab("general")}
          className={cn(
            "px-4 py-3 text-sm font-semibold transition-colors border-b-2 relative",
            activeTab === "general"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          General Info
        </button>
        <button
          onClick={() => setActiveTab("episodes")}
          className={cn(
            "px-4 py-3 text-sm font-semibold transition-colors border-b-2 relative",
            activeTab === "episodes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Episode Progress
        </button>
      </div>

      <div className="p-6 pt-4 bg-popover max-h-[60vh] overflow-y-auto">
        {activeTab === "general" ? (
          <div className="grid grid-cols-6 gap-x-6 gap-y-4">
            <div className="col-span-3 flex flex-col gap-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Status
              </Label>
              <Select
                value={listStatus}
                onValueChange={(val) => {
                  setListStatus(val);
                  if (val === "COMPLETED" && !finishDate) {
                    setFinishDate(new Date());
                  }
                  if (val === "WATCHING" && !startDate) {
                    setStartDate(new Date());
                  }
                }}
              >
                <SelectTrigger className="bg-background border-input text-foreground h-10">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="WATCHING">Watching</SelectItem>
                  <SelectItem value="PLANNING">Plan to watch</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="DROPPED">Dropped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 flex flex-col gap-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Score
              </Label>
              <div className="flex bg-background border border-input rounded-md overflow-hidden">
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={score}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (Number(val) > 10) val = "10";
                    setScore(val);
                  }}
                  placeholder="0-10"
                  className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full"
                />
              </div>
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Start Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-input text-foreground h-10 hover:bg-accent hover:text-accent-foreground",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "yyyy-MM-dd")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto p-0 bg-popover border-border"
                >
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="bg-popover text-popover-foreground"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Finish Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-input text-foreground h-10 hover:bg-accent hover:text-accent-foreground",
                      !finishDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {finishDate ? (
                      format(finishDate, "yyyy-MM-dd")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto p-0 bg-popover border-border"
                >
                  <Calendar
                    mode="single"
                    selected={finishDate}
                    onSelect={setFinishDate}
                    initialFocus
                    className="bg-popover text-popover-foreground"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Total Rewatches
              </Label>
              <div className="flex bg-background border border-input rounded-md overflow-hidden">
                <Input
                  type="number"
                  min="0"
                  value={rewatches}
                  onChange={(e) => setRewatches(e.target.value)}
                  className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full"
                />
              </div>
            </div>

            <div className="col-span-6 flex flex-col gap-2">
              <Label className="text-sm font-semibold text-muted-foreground">
                Notes
              </Label>
              <Textarea
                placeholder="Your notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-input text-foreground min-h-[80px] resize-y"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!hasListEntry && (
              <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
                Add the show to your list first to track episodes.
              </div>
            )}
            {hasListEntry && (
              <Accordion type="multiple" className="w-full space-y-2">
                {tv.seasons.map((season: Season) => {
                  const watchedInSeason = getSeasonWatchedCount(season);
                  const isAllWatched = watchedInSeason === season.episodeCount;

                  return (
                    <AccordionItem
                      key={season.id}
                      value={season.id}
                      className="border border-border rounded-lg overflow-hidden px-0"
                    >
                      <AccordionTrigger className="hover:no-underline px-4 py-3 bg-muted/20">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="font-bold">
                              Season {season.number}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {watchedInSeason} / {season.episodeCount} episodes
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 px-2 text-[10px] uppercase font-bold tracking-wider",
                              isAllWatched
                                ? "text-primary hover:text-primary/80"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSeason(season.number, !isAllWatched);
                            }}
                          >
                            {isAllWatched ? "Unmark All" : "Mark All"}
                          </Button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                        <div className="divide-y divide-border">
                          {season.episodes.map((episode) => {
                            const watched = isEpisodeWatched(
                              season.number,
                              episode.number,
                            );
                            return (
                              <div
                                key={episode.id}
                                className={cn(
                                  "flex items-center gap-4 px-4 py-2 hover:bg-muted/30 transition-colors cursor-pointer",
                                  watched && "bg-primary/5",
                                )}
                                onClick={() =>
                                  toggleEpisode(season.number, episode.number)
                                }
                              >
                                <div
                                  className={cn(
                                    "shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                                    watched
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/30",
                                  )}
                                >
                                  {watched && <Check className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium truncate">
                                      <span className="text-muted-foreground mr-2">
                                        {episode.number}.
                                      </span>
                                      {episode.name}
                                    </p>
                                    {episode.airDate && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {episode.airDate}
                                      </span>
                                    )}
                                  </div>
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
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {hasListEntry && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  className="bg-background hover:bg-destructive hover:text-destructive-foreground border-input font-medium"
                >
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-popover border-border text-popover-foreground [&>button]:text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to delete this?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This action cannot be undone. This will permanently remove
                    this TV show from your list and all episode progress.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-muted text-foreground border-border hover:bg-muted/80">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </>
  );
}
