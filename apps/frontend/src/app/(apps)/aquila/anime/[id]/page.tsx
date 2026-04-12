"use client";

import { Play } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Heart, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

// Define the shape of the data based on the user provided JSON
interface MediaTrailer {
  id: string;
  name: string;
  url: string;
  language?: string;
  site?: string;
}

interface MediaCharacter {
  id: string;
  name: string;
  personName?: string;
  image: string;
  role?: string;
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
  relations?: MediaRelation[];
  characters?: MediaCharacter[];
  trailers?: MediaTrailer[];
  externalLinks?: MediaExternalLink[];
  studios?: MediaStudio[];
}

export default function AnimeDetailsPage() {
  const params = useParams();
  const id: string = params?.id as string;
  const session = useSession();

  const [anime, setAnime] = useState<Media | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasListEntry, setHasListEntry] = useState(false);
  const [listStatus, setListStatus] = useState<string>("PLANNING");
  const [score, setScore] = useState<string>("");
  const [progress, setProgress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [finishDate, setFinishDate] = useState<Date | undefined>();
  const [rewatches, setRewatches] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Connection State
  const [updateConnection, setUpdateConnection] = useState<boolean>(false);
  const [connections, setConnections] = useState<Record<string, string>>({});
  const [activeSearchProvider, setActiveSearchProvider] = useState<
    "anilist" | "mal" | null
  >(null);
  const [isConnectionSearchOpen, setIsConnectionSearchOpen] =
    useState<boolean>(false);
  const [connectionSearchQuery, setConnectionSearchQuery] =
    useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Search function for the connections modal
  const performConnectionSearch = async (query: string) => {
    if (!query) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      if (activeSearchProvider === "anilist") {
        const graphqlQuery = `
          query ($search: String) {
            Page(page: 1, perPage: 10) {
              media(search: $search, type: ANIME) {
                id
                title {
                  romaji
                  english
                }
                coverImage {
                  medium
                }
                format
                episodes
              }
            }
          }
        `;
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: graphqlQuery,
            variables: { search: query },
          }),
        });
        const data = await res.json();
        const results = data.data?.Page?.media || [];
        setSearchResults(
          results.map((item: any) => ({
            id: item.id.toString(),
            title: item.title.english || item.title.romaji,
            image: item.coverImage.medium,
            format: item.format,
            episodes: item.episodes,
          })),
        );
      } else if (activeSearchProvider === "mal") {
        // Use Jikan API for MyAnimeList searches
        const res = await fetch(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10`,
        );
        const data = await res.json();
        const results = data.data || [];
        setSearchResults(
          results.map((item: any) => ({
            id: item.mal_id.toString(),
            title: item.title_english || item.title,
            image: item.images?.jpg?.image_url,
            format: item.type,
            episodes: item.episodes,
          })),
        );
      }
    } catch (err) {
      console.error(`Failed to search ${activeSearchProvider}`, err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (session.data?.user?.id && id) {
      const fetchEntry = async () => {
        try {
          const res = await fetch(
            `/aquila/api/list/anime?userId=${session.data.user.id}&animeId=${id}`,
          );
          if (res.ok) {
            const data = await res.json();

            if (data) {
              setListStatus(data.status || "PLANNING");
              setScore(data.score ? data.score.toString() : "");
              setProgress(data.progress ? data.progress.toString() : "");
              setNotes(data.notes || "");
              setStartDate(
                data.startDate ? new Date(data.startDate * 1000) : undefined,
              );
              setFinishDate(
                data.endDate ? new Date(data.endDate * 1000) : undefined,
              );
              setRewatches(data.rewatched ? data.rewatched.toString() : "0");
              setConnections(data.connections || {});
              setUpdateConnection(
                Object.keys(data?.connections || {}).length > 0,
              );
              setHasListEntry(true);
            } else {
              setHasListEntry(false);
            }
          }
        } catch (e) {
          console.error("Failed to fetch custom entry", e);
        }
      };
      fetchEntry();
    }
  }, [session.data?.user?.id, id]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/aquila/api/list/anime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data?.accessToken}`,
        },
        body: JSON.stringify({
          userId: session.data?.user?.id,
          animeId: Number(id),
          status: listStatus,
          startDate: startDate
            ? Math.floor(startDate.getTime() / 1000)
            : undefined,
          endDate: finishDate
            ? Math.floor(finishDate.getTime() / 1000)
            : undefined,
          score: score ? Number(score) : undefined,
          progress: progress ? Number(progress) : undefined,
          notes: notes || undefined,
          rewatched: rewatches ? Number(rewatches) : undefined,
          updateConnection,
          connections,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("Added to list!");
        setIsDialogOpen(false);
        setHasListEntry(true);
      } else {
        toast.error(
          data.message || data.error?.message || "Failed to add to list",
        );
      }
    } catch {
      toast.error("Failed to add to list");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/aquila/api/list/anime?userId=${session.data?.user?.id}&animeId=${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
        },
      );
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("Removed from list!");
        setIsDialogOpen(false);
        setHasListEntry(false);
        setListStatus("PLANNING");
        setScore("");
        setProgress("");
        setNotes("");
        setStartDate(undefined);
        setFinishDate(undefined);
        setRewatches("0");
      } else {
        toast.error(
          data.message || data.error?.message || "Failed to remove from list",
        );
      }
    } catch {
      toast.error("Failed to remove from list");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function fetchAnime() {
      if (!id) return;
      try {
        const res = await fetch(`/aquila/api/anime/${id}`);
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAnime(data);
      } catch (_err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchAnime();
  }, [id]);

  useEffect(() => {
    if (!anime) return;
    document.title = `Aquila | ${anime?.title.english ?? anime?.title.romaji ?? ""} `;
  }, [anime?.title.romaji]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Anime not found</h2>
        <Button asChild>
          <Link href="/aquila/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Banner Section */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent z-10" />
        {anime.bannerImage ? (
          <img
            src={anime.bannerImage}
            alt={anime.title?.romaji}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-20">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column - Cover & Main Actions */}
          <div className="shrink-0 w-full md:w-[280px] flex flex-col gap-4">
            <div className="aspect-2/3 w-full rounded-xl overflow-hidden shadow-2xl border-4 border-background">
              <img
                src={anime.coverImage.extraLarge || anime.coverImage.large}
                alt={anime.title?.romaji}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-2">
              {session.data?.user && !hasListEntry && (
                <>
                  <Button
                    className="w-full cursor-pointer hover:bg-primary  hover:border-primary"
                    size="lg"
                    onClick={async () => {
                      try {
                        const res = await fetch("/aquila/api/list/anime", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session.data?.accessToken}`,
                          },
                          body: JSON.stringify({
                            userId: session.data?.user?.id,
                            animeId: Number(id),
                            status: "PLANNING",
                          }),
                        });
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
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full cursor-pointer hover:bg-primary hover:text-primary hover:border-primary"
                        size="lg"
                      >
                        <DialogTitle>Add to List</DialogTitle>
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-popover border-border text-popover-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground">
                      <div className="relative h-48 w-full bg-muted">
                        {anime.bannerImage && (
                          <img
                            src={anime.bannerImage}
                            alt="banner"
                            className="w-full h-full object-cover opacity-60"
                          />
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-popover to-transparent" />
                        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-6 z-10">
                          <img
                            src={anime.coverImage.large}
                            alt="cover"
                            className="w-24 rounded shadow-lg object-cover bg-muted"
                          />
                          <div className="flex-1 pb-1">
                            <h2 className="text-xl font-bold line-clamp-2 text-foreground">
                              {anime.title.english || anime.title.romaji}
                            </h2>
                          </div>
                          <div className="pb-1 flex gap-4 items-center">
                            <Button
                              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md font-medium px-6"
                              onClick={handleSave}
                              disabled={isSubmitting}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 pt-4 bg-popover">
                        <div className="grid grid-cols-6 gap-x-6 gap-y-4">
                          <div className="col-span-2 flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-muted-foreground">
                              Status
                            </Label>
                            <Select
                              value={listStatus}
                              onValueChange={(val) => {
                                setListStatus(val);
                                if (val === "COMPLETED" && !finishDate) {
                                  setFinishDate(new Date());
                                  if (anime.episodes && !progress)
                                    setProgress(anime.episodes.toString());
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
                                <SelectItem value="WATCHING">
                                  Watching
                                </SelectItem>
                                <SelectItem value="PLANNING">
                                  Plan to watch
                                </SelectItem>
                                <SelectItem value="COMPLETED">
                                  Completed
                                </SelectItem>
                                <SelectItem value="REPEATING">
                                  Rewatching
                                </SelectItem>
                                <SelectItem value="PAUSED">Paused</SelectItem>
                                <SelectItem value="DROPPED">Dropped</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-2 flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-muted-foreground">
                              Score
                            </Label>
                            <div className="flex bg-background border border-input rounded-md overflow-hidden">
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={score}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (Number(val) > 10) val = "10";
                                  setScore(val);
                                }}
                                className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full"
                              />
                            </div>
                          </div>

                          <div className="col-span-2 flex flex-col gap-2">
                            <Label className="text-sm font-semibold text-muted-foreground">
                              Episode Progress
                            </Label>
                            <div className="flex bg-background border border-input rounded-md overflow-hidden">
                              <Input
                                type="number"
                                min="0"
                                max={anime.episodes || undefined}
                                value={progress}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (
                                    anime.episodes &&
                                    Number(val) >= anime.episodes
                                  ) {
                                    val = anime.episodes.toString();
                                    setListStatus("COMPLETED");
                                    if (!finishDate) setFinishDate(new Date());
                                  }
                                  setProgress(val);
                                }}
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
                              className="bg-background border-input text-foreground min-h-[80px] resize-y h-10"
                            />
                          </div>

                          <div className="col-span-6 flex flex-col gap-2 mt-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="update-connection-add"
                                checked={updateConnection}
                                onCheckedChange={(checked) =>
                                  setUpdateConnection(checked as boolean)
                                }
                              />
                              <Label
                                htmlFor="update-connection-add"
                                className="text-sm font-semibold text-muted-foreground cursor-pointer"
                              >
                                Update anime from connection
                              </Label>
                            </div>

                            {updateConnection && (
                              <div className="flex gap-4 items-center pl-6">
                                <div className="flex items-center">
                                  <Button
                                    type="button"
                                    variant={
                                      connections["anilist"]
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    className={
                                      connections["anilist"]
                                        ? "rounded-r-none"
                                        : ""
                                    }
                                    onClick={() => {
                                      setActiveSearchProvider("anilist");
                                      setIsConnectionSearchOpen(true);
                                    }}
                                  >
                                    AniList{" "}
                                    {connections["anilist"]
                                      ? `(${connections["anilist"]})`
                                      : ""}
                                  </Button>
                                  {connections["anilist"] && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="rounded-l-none px-2 h-9"
                                      onClick={() => {
                                        setConnections((p) => {
                                          const newP = { ...p };
                                          delete newP["anilist"];
                                          return newP;
                                        });
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                                <div className="flex items-center">
                                  <Button
                                    type="button"
                                    variant={
                                      connections["mal"] ? "default" : "outline"
                                    }
                                    size="sm"
                                    className={
                                      connections["mal"] ? "rounded-r-none" : ""
                                    }
                                    onClick={() => {
                                      setActiveSearchProvider("mal");
                                      setIsConnectionSearchOpen(true);
                                    }}
                                  >
                                    MyAnimeList{" "}
                                    {connections["mal"]
                                      ? `(${connections["mal"]})`
                                      : ""}
                                  </Button>
                                  {connections["mal"] && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="rounded-l-none px-2 h-9"
                                      onClick={() => {
                                        setConnections((p) => {
                                          const newP = { ...p };
                                          delete newP["mal"];
                                          return newP;
                                        });
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end">
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
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure you want to delete this?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently remove this anime from your list.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDelete}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {session.data?.user && hasListEntry && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                      size="lg"
                    >
                      <DialogTitle>Edit Entry</DialogTitle>
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-popover border-border text-popover-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground">
                    <div className="relative h-48 w-full bg-muted">
                      {anime.bannerImage && (
                        <img
                          src={anime.bannerImage}
                          alt="banner"
                          className="w-full h-full object-cover opacity-60"
                        />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-popover to-transparent" />
                      <div className="absolute bottom-4 left-6 right-6 flex items-end gap-6 z-10">
                        <img
                          src={anime.coverImage.large}
                          alt="cover"
                          className="w-24 rounded shadow-lg object-cover bg-muted"
                        />
                        <div className="flex-1 pb-1">
                          <h2 className="text-xl font-bold line-clamp-2 text-foreground">
                            {anime.title.english || anime.title.romaji}
                          </h2>
                        </div>
                        <div className="pb-1 flex gap-4 items-center">
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <Heart className="w-6 h-6 fill-current" />
                          </button>
                          <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md font-medium px-6"
                            onClick={handleSave}
                            disabled={isSubmitting}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 pt-4 bg-popover">
                      <div className="grid grid-cols-6 gap-x-6 gap-y-4">
                        <div className="col-span-2 flex flex-col gap-2">
                          <Label className="text-sm font-semibold text-muted-foreground">
                            Status
                          </Label>
                          <Select
                            value={listStatus}
                            onValueChange={(val) => {
                              setListStatus(val);
                              if (val === "COMPLETED" && !finishDate) {
                                setFinishDate(new Date());
                                if (anime.episodes && !progress)
                                  setProgress(anime.episodes.toString());
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
                              <SelectItem value="PLANNING">
                                Plan to watch
                              </SelectItem>
                              <SelectItem value="COMPLETED">
                                Completed
                              </SelectItem>
                              <SelectItem value="REPEATING">
                                Rewatching
                              </SelectItem>
                              <SelectItem value="PAUSED">Paused</SelectItem>
                              <SelectItem value="DROPPED">Dropped</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2 flex flex-col gap-2">
                          <Label className="text-sm font-semibold text-muted-foreground">
                            Score
                          </Label>
                          <div className="flex bg-background border border-input rounded-md overflow-hidden">
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={score}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (Number(val) > 10) val = "10";
                                setScore(val);
                              }}
                              className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full"
                            />
                          </div>
                        </div>

                        <div className="col-span-2 flex flex-col gap-2">
                          <Label className="text-sm font-semibold text-muted-foreground">
                            Episode Progress
                          </Label>
                          <div className="flex bg-background border border-input rounded-md overflow-hidden">
                            <Input
                              type="number"
                              min="0"
                              max={anime.episodes || undefined}
                              value={progress}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (
                                  anime.episodes &&
                                  Number(val) >= anime.episodes
                                ) {
                                  val = anime.episodes.toString();
                                  setListStatus("COMPLETED");
                                  if (!finishDate) setFinishDate(new Date());
                                }
                                setProgress(val);
                              }}
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
                            className="bg-background border-input text-foreground min-h-[80px] resize-y h-10"
                          />
                        </div>

                        <div className="col-span-6 flex flex-col gap-2 mt-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="update-connection-edit"
                              checked={updateConnection}
                              onCheckedChange={(checked) =>
                                setUpdateConnection(checked as boolean)
                              }
                            />
                            <Label
                              htmlFor="update-connection-edit"
                              className="text-sm font-semibold text-muted-foreground cursor-pointer"
                            >
                              Update anime from connection
                            </Label>
                          </div>

                          {updateConnection && (
                            <div className="flex gap-4 items-center pl-6">
                              <div className="flex items-center">
                                <Button
                                  type="button"
                                  variant={
                                    connections["anilist"]
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className={
                                    connections["anilist"]
                                      ? "rounded-r-none"
                                      : ""
                                  }
                                  onClick={() => {
                                    setActiveSearchProvider("anilist");
                                    setIsConnectionSearchOpen(true);
                                  }}
                                >
                                  AniList{" "}
                                  {connections["anilist"]
                                    ? `(${connections["anilist"]})`
                                    : ""}
                                </Button>
                                {connections["anilist"] && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="rounded-l-none px-2 h-9"
                                    onClick={() => {
                                      setConnections((p) => {
                                        const newP = { ...p };
                                        delete newP["anilist"];
                                        return newP;
                                      });
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="flex items-center">
                                <Button
                                  type="button"
                                  variant={
                                    connections["mal"] ? "default" : "outline"
                                  }
                                  size="sm"
                                  className={
                                    connections["mal"] ? "rounded-r-none" : ""
                                  }
                                  onClick={() => {
                                    setActiveSearchProvider("mal");
                                    setIsConnectionSearchOpen(true);
                                  }}
                                >
                                  MyAnimeList{" "}
                                  {connections["mal"]
                                    ? `(${connections["mal"]})`
                                    : ""}
                                </Button>
                                {connections["mal"] && (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="rounded-l-none px-2 h-9"
                                    onClick={() => {
                                      setConnections((p) => {
                                        const newP = { ...p };
                                        delete newP["mal"];
                                        return newP;
                                      });
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end">
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
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you sure you want to delete this?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently remove this anime from your list.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {anime.trailers && anime.trailers.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={anime.trailers[0].url}
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

            <div className="bg-card rounded-xl p-4 space-y-3 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium">{anime.format}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Episodes</span>
                <span className="font-medium">{anime.episodes || "?"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{anime.duration} mins</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">
                  {anime.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Season</span>
                <span className="font-medium capitalize">
                  {anime.season?.toLowerCase()} {anime.seasonYear}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium capitalize">
                  {anime.source?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
            </div>

            {/* External Links */}
            {anime.externalLinks && anime.externalLinks.length > 0 && (
              <div className="bg-card rounded-xl p-4 space-y-2 border border-border">
                <h4 className="font-semibold text-sm mb-2">Links</h4>
                <div className="flex flex-wrap gap-2">
                  {anime.externalLinks.map((link, qid) => (
                    <Link
                      key={qid}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded transition-colors"
                    >
                      {link.site}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-8 pt-4 md:pt-32 mb-32">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-2">
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
            </div>

            {/* Description */}
            <div
              className="prose prose-zinc dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: anime.description }}
            />

            {/* Genres & Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Genres & Tags</h3>
              <div className="flex flex-wrap gap-2">
                {anime.genres?.map((genre, qid) => (
                  <Badge key={qid} variant="secondary">
                    {genre}
                  </Badge>
                ))}
                {anime.tags?.slice(0, 10).map((tag, qid) => (
                  <Badge key={qid} variant="outline" className="border-dashed">
                    {tag.name}
                    {tag.rank && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {tag.rank}%
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Characters */}
            {anime.characters && anime.characters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Characters</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {anime.characters.slice(0, 10).map((char, qid) => (
                    <div
                      key={qid}
                      className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border"
                    >
                      <img
                        src={char.image}
                        alt={char.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {char.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {char.role?.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Relations */}
            {anime.relations && anime.relations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Relations</h3>
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
                        className="flex items-center justify-between bg-card p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {relation.title.romaji}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {relation.format}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {relation.relationType.replace(/_/g, " ")}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Search Dialog */}
      <Dialog
        open={isConnectionSearchOpen}
        onOpenChange={(open) => {
          setIsConnectionSearchOpen(open);
          if (!open) {
            setConnectionSearchQuery("");
            setSearchResults([]);
            setIsSearching(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px] bg-popover border-border">
          <DialogHeader>
            <DialogTitle>
              Search{" "}
              {activeSearchProvider === "anilist" ? "AniList" : "MyAnimeList"}
            </DialogTitle>
            <DialogDescription>
              Search for this anime to link it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="flex bg-background border border-input rounded-md flex-1 overflow-hidden">
              <Input
                placeholder="Search anime..."
                className="border-0 bg-transparent text-foreground focus-visible:ring-0"
                value={connectionSearchQuery}
                onChange={(e) => setConnectionSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    performConnectionSearch(connectionSearchQuery);
                  }
                }}
              />
            </div>
            <Button
              onClick={() => performConnectionSearch(connectionSearchQuery)}
              disabled={isSearching || !connectionSearchQuery.trim()}
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2 mt-4">
            {searchResults.length === 0 && !isSearching ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                {connectionSearchQuery
                  ? "No results found."
                  : "Type and press enter to search..."}
              </div>
            ) : (
              <>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex gap-3 items-center p-2 border border-border rounded-md cursor-pointer hover:bg-accent"
                    onClick={() => {
                      if (activeSearchProvider) {
                        setConnections((prev) => ({
                          ...prev,
                          [activeSearchProvider]: result.id,
                        }));
                      }
                      setIsConnectionSearchOpen(false);
                    }}
                  >
                    {result.image ? (
                      <img
                        src={result.image}
                        alt={result.title}
                        className="w-10 h-14 bg-muted rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-muted rounded"></div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-1">
                        {result.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.format?.replace(/_/g, " ") || "Unknown"} •{" "}
                        {result.episodes ? `${result.episodes} eps` : "? eps"}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
