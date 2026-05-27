"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MangaEditDialogMedia {
  id: string;
  title: { romaji: string; english?: string };
  coverImage: { large: string };
  bannerImage?: string;
  chapters?: number;
  volumes?: number;
}

interface MangaEditDialogProps {
  media: MangaEditDialogMedia;
  hasListEntry: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function MangaEditDialog({
  media: initialMedia,
  hasListEntry: initialHasListEntry,
  onSaved,
  onDeleted,
  open,
  onOpenChange,
  trigger,
}: MangaEditDialogProps) {
  const session = useSession();

  const [currentMedia, setCurrentMedia] = useState(initialMedia);

  useEffect(() => {
    setCurrentMedia(initialMedia);
  }, [initialMedia]);

  const media = currentMedia;

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };

  const [hasListEntry, setHasListEntry] = useState(initialHasListEntry);
  const [listStatus, setListStatus] = useState<string>("PLANNING");
  const [score, setScore] = useState<string>("");
  const [chapters, setChapters] = useState<string>("");
  const [volumes, setVolumes] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [finishDate, setFinishDate] = useState<Date | undefined>();
  const [rereads, setRereads] = useState<string>("0");
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

  useEffect(() => {
    if (open) {
      handleOpenChange(true);
    }
  }, [open]);

  const handleOpenChange = async (v: boolean) => {
    setIsOpen(v);
    if (v) {
      try {
        const mediaRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/manga/details/${initialMedia.id}`
        );
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          setCurrentMedia(mediaData);
        }
      } catch (e) {
        console.error("Failed to fetch full manga details", e);
      }

      if (session.status === "authenticated" && session.data) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/list/manga/entry/${initialMedia.id}`,
            {
              headers: { Authorization: `Bearer ${session.data?.accessToken}` },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data) {
              setListStatus(data.status || "PLANNING");
              setScore(data.score ? data.score.toString() : "");
              setChapters(data.chapters ? data.chapters.toString() : "");
              setVolumes(data.volumes ? data.volumes.toString() : "");
              setNotes(data.notes || "");
              setStartDate(
                data.startDate ? new Date(data.startDate * 1000) : undefined
              );
              setFinishDate(
                data.endDate ? new Date(data.endDate * 1000) : undefined
              );
              setRereads(data.reread ? data.reread.toString() : "0");
              setConnections(data.connections || {});
              setUpdateConnection(
                Object.keys(data?.connections || {}).length > 0
              );
              setHasListEntry(true);
            }
          }
        } catch (e) {
          console.error("Failed to fetch manga entry", e);
        }
      }
    }
  };

  const performConnectionSearch = async (query: string) => {
    if (!query) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      if (activeSearchProvider === "anilist") {
        const graphqlQuery = `
          query ($search: String) {
            Page(page: 1, perPage: 10) {
              media(search: $search, type: MANGA) {
                id title { romaji english } coverImage { medium } format chapters
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
        setSearchResults(
          (data.data?.Page?.media || []).map((item: any) => ({
            id: item.id.toString(),
            title: item.title.english || item.title.romaji,
            image: item.coverImage.medium,
            format: item.format,
            chapters: item.chapters,
          }))
        );
      } else if (activeSearchProvider === "mal") {
        const res = await fetch(
          `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(
            query
          )}&limit=10`
        );
        const data = await res.json();
        setSearchResults(
          (data.data || []).map((item: any) => ({
            id: item.mal_id.toString(),
            title: item.title_english || item.title,
            image: item.images?.jpg?.image_url,
            format: item.type,
            chapters: item.chapters,
          }))
        );
      }
    } catch (err) {
      console.error(`Failed to search ${activeSearchProvider}`, err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/manga/entry/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            mangaId: Number(media.id),
            status: listStatus,
            startDate: startDate
              ? Math.floor(startDate.getTime() / 1000)
              : undefined,
            endDate: finishDate
              ? Math.floor(finishDate.getTime() / 1000)
              : undefined,
            score: score ? Number(score) : undefined,
            chapters: chapters ? Number(chapters) : undefined,
            volumes: volumes ? Number(volumes) : undefined,
            notes: notes || undefined,
            reread: rereads ? Number(rereads) : undefined,
            updateConnection,
            connections,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("Saved!");
        setIsOpen(false);
        setHasListEntry(true);
        onSaved?.();
      } else {
        toast.error(data.message || data.error?.message || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/manga/entry/${media.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.data?.accessToken}` },
        }
      );
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("Removed from list!");
        setIsOpen(false);
        setHasListEntry(false);
        setListStatus("PLANNING");
        setScore("");
        setChapters("");
        setVolumes("");
        setNotes("");
        setStartDate(undefined);
        setFinishDate(undefined);
        setRereads("0");
        onDeleted?.();
      } else {
        toast.error(
          data.message || data.error?.message || "Failed to remove"
        );
      }
    } catch {
      toast.error("Failed to remove");
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-popover border-border text-popover-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground">
      <DialogTitle className="sr-only">
        {hasListEntry ? "Edit Manga Entry" : "Add Manga to List"}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Update your progress, score, status and custom connections for this
        manga entry.
      </DialogDescription>

      {/* Banner header */}
      <div className="relative h-48 w-full bg-muted">
        {media.bannerImage && (
          <img
            src={media.bannerImage}
            alt="banner"
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-popover to-transparent" />
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-6 z-10">
          <img
            src={media.coverImage.large}
            alt="cover"
            className="w-24 rounded shadow-lg object-cover bg-muted"
          />
          <div className="flex-1 pb-1">
            <h2 className="text-xl font-bold line-clamp-2 text-foreground">
              {media.title.english || media.title.romaji}
            </h2>
          </div>
          <div className="pb-1 flex gap-4 items-center">
            {hasListEntry && (
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Heart className="w-6 h-6 fill-current" />
              </button>
            )}
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
          {/* Status */}
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
                  if (media.chapters && !chapters)
                    setChapters(media.chapters.toString());
                }
                if (val === "READING" && !startDate) setStartDate(new Date());
              }}
            >
              <SelectTrigger className="bg-background border-input text-foreground h-10">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="READING">Reading</SelectItem>
                <SelectItem value="PLANNING">Plan to read</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="DROPPED">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Score */}
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

          {/* Chapter Progress */}
          <div className="col-span-2 flex flex-col gap-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Chapter Progress
            </Label>
            <div className="flex bg-background border border-input rounded-md overflow-hidden">
              <Input
                type="number"
                min="0"
                max={media.chapters || undefined}
                value={chapters}
                onChange={(e) => {
                  let val = e.target.value;
                  if (media.chapters && Number(val) >= media.chapters) {
                    val = media.chapters.toString();
                    setListStatus("COMPLETED");
                    if (!finishDate) setFinishDate(new Date());
                  }
                  setChapters(val);
                }}
                className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full"
              />
            </div>
          </div>

          {/* Volume Progress */}
          <div className="col-span-2 flex flex-col gap-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Volume Progress
            </Label>
            <div className="flex bg-background border border-input rounded-md overflow-hidden">
              <Input
                type="number"
                min="0"
                max={media.volumes || undefined}
                value={volumes}
                onChange={(e) => setVolumes(e.target.value)}
                className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full"
              />
            </div>
          </div>

          {/* Start Date */}
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
                    !startDate && "text-muted-foreground"
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

          {/* Finish Date */}
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
                    !finishDate && "text-muted-foreground"
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

          {/* Re-reads */}
          <div className="col-span-2 flex flex-col gap-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Total Re-reads
            </Label>
            <div className="flex bg-background border border-input rounded-md overflow-hidden">
              <Input
                type="number"
                min="0"
                value={rereads}
                onChange={(e) => setRereads(e.target.value)}
                className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full"
              />
            </div>
          </div>

          {/* Notes */}
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

          {/* Connections */}
          <div className="col-span-6 flex flex-col gap-2 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="manga-update-connection"
                checked={updateConnection}
                onCheckedChange={(checked) =>
                  setUpdateConnection(checked as boolean)
                }
              />
              <Label
                htmlFor="manga-update-connection"
                className="text-sm font-semibold text-muted-foreground cursor-pointer"
              >
                Update manga from connection
              </Label>
            </div>
            {updateConnection && (
              <div className="flex gap-4 items-center pl-6">
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant={connections["anilist"] ? "default" : "outline"}
                    size="sm"
                    className={connections["anilist"] ? "rounded-r-none" : ""}
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
                      onClick={() =>
                        setConnections((p) => {
                          const n = { ...p };
                          delete n["anilist"];
                          return n;
                        })
                      }
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant={connections["mal"] ? "default" : "outline"}
                    size="sm"
                    className={connections["mal"] ? "rounded-r-none" : ""}
                    onClick={() => {
                      setActiveSearchProvider("mal");
                      setIsConnectionSearchOpen(true);
                    }}
                  >
                    MyAnimeList{" "}
                    {connections["mal"] ? `(${connections["mal"]})` : ""}
                  </Button>
                  {connections["mal"] && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-l-none px-2 h-9"
                      onClick={() =>
                        setConnections((p) => {
                          const n = { ...p };
                          delete n["mal"];
                          return n;
                        })
                      }
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection search dialog */}
        {isConnectionSearchOpen && (
          <Dialog
            open={isConnectionSearchOpen}
            onOpenChange={setIsConnectionSearchOpen}
          >
            <DialogContent className="sm:max-w-[500px]">
              <DialogTitle>
                Search on{" "}
                {activeSearchProvider === "anilist"
                  ? "AniList"
                  : "MyAnimeList"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Search and select a media item to link connection IDs.
              </DialogDescription>
              <div className="flex gap-2">
                <Input
                  placeholder="Search manga..."
                  value={connectionSearchQuery}
                  onChange={(e) =>
                    setConnectionSearchQuery(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      performConnectionSearch(connectionSearchQuery);
                  }}
                />
                <Button
                  onClick={() =>
                    performConnectionSearch(connectionSearchQuery)
                  }
                  disabled={isSearching}
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    className="flex items-center gap-3 w-full p-2 rounded hover:bg-muted text-left"
                    onClick={() => {
                      setConnections((p) => ({
                        ...p,
                        [activeSearchProvider!]: result.id,
                      }));
                      setIsConnectionSearchOpen(false);
                      setConnectionSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    {result.image && (
                      <img
                        src={result.image}
                        alt={result.title}
                        className="w-10 h-14 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium text-sm">{result.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.format}
                        {result.chapters ? ` · ${result.chapters} ch` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {hasListEntry && (
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
                    This action cannot be undone. This will permanently remove
                    this manga from your list.
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
        )}
      </div>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {dialogContent}
    </Dialog>
  );
}