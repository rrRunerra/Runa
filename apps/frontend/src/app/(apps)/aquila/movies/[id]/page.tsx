"use client";

import { CalendarIcon, Play, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
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
import Image from "next/image";

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
  runtime?: number;
  genres: string[];
  characters?: MediaCharacter[];
  trailers?: MediaTrailer[];
  studios?: MediaStudio[];
}

export default function MovieDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [movie, setMovie] = useState<Media | null>(null);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (
      session.status === "authenticated" &&
      session.data?.user?.username &&
      movie?.id
    ) {
      const fetchEntry = async () => {
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
              setHasListEntry(true);
            }
          }
        } catch (e) {
          console.error("Failed to fetch movie list entry", e);
        }
      };
      fetchEntry();
    }
  }, [session.status, movie?.id]);

  const handleSave = async () => {
    if (!movie) return;
    setIsSubmitting(true);
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
    if (!movie) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/movie/entry/${movie.id}`,
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
      } else {
        toast.error("Failed to remove from list");
      }
    } catch {
      toast.error("Failed to remove from list");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Movie not found</h2>
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
        {movie.bannerImage ? (
          <img
            src={movie.bannerImage}
            alt={movie.title?.romaji}
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
                src={movie.coverImage.large}
                alt={movie.title?.romaji}
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
                        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-popover border-border text-popover-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground">
                          <DialogTitle className="sr-only">Edit Movie List Entry</DialogTitle>
                          <MovieDialogContent
                            movie={movie}
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
                      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-popover border-border text-popover-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground">
                        <DialogTitle className="sr-only">Edit Movie List Entry</DialogTitle>
                        <MovieDialogContent
                          movie={movie}
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
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </>
              )}
              {movie.trailers && movie.trailers.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={movie.trailers?.[0]?.url}
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
                <span className="font-medium text-foreground">
                  {movie.format}
                </span>
              </div>
              {movie.runtime && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">
                    Runtime
                  </span>
                  <span className="font-medium text-foreground">
                    {movie.runtime} mins
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-semibold">
                  Status
                </span>
                <span className="font-medium capitalize text-foreground">
                  {movie.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
            </div>

            {movie.studios && movie.studios.length > 0 && (
              <div className="bg-card rounded-xl p-4 space-y-2 border border-border">
                <h4 className="font-semibold text-sm mb-2 text-muted-foreground">
                  Studios
                </h4>
                <div className="flex flex-wrap gap-2">
                  {movie.studios.map((studio) => (
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
                {movie.title.english || movie.title.romaji}
              </h1>
              {movie.title.romaji &&
                movie.title.romaji !== movie.title.english && (
                  <p className="text-sm text-muted-foreground italic">
                    Also known as: {movie.title.romaji}
                  </p>
                )}
            </div>

            <div
              className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: movie.description }}
            />

            {movie.genres && movie.genres.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres?.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {movie.characters && movie.characters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Cast</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {movie.characters.slice(0, 10).map((char, idx) => (
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
          </div>
        </div>
      </div>
    </div>
  );
}

function MovieDialogContent({
  movie,
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
}: any) {
  return (
    <>
      <div className="relative h-48 w-full bg-muted">
        {movie.bannerImage && (
          <img
            src={movie.bannerImage}
            alt="banner"
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-popover to-transparent" />
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-6 z-10">
          <img
            src={movie.coverImage.large}
            alt="cover"
            className="w-24 rounded shadow-lg object-cover bg-muted"
          />
          <div className="flex-1 pb-1">
            <h2 className="text-xl font-bold line-clamp-2 text-foreground">
              {movie.title.english || movie.title.romaji}
            </h2>
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

      <div className="p-6 pt-4 bg-popover">
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
                if (val === "COMPLETED" && !startDate) {
                  setStartDate(new Date());
                }
              }}
            >
              <SelectTrigger className="bg-background border-input text-foreground h-10">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="PLANNING">Planning</SelectItem>
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
                    this movie from your list.
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
