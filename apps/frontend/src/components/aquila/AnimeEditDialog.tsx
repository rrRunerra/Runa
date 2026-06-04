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
import { Heart, CalendarIcon, X, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BASE_CONNECTION_PROVIDERS, ConnectionCapability } from "@/lib/providers";

interface AnimeEditDialogMedia {
  id: string;
  title: { romaji: string; english?: string };
  coverImage: { large: string };
  bannerImage?: string;
  episodes?: number;
}

interface AnimeEditDialogProps {
  /** The media item to edit. */
  media: AnimeEditDialogMedia;
  /** Whether the entry already exists in the user's list. */
  hasListEntry: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
  /** Optional controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** If provided, renders a trigger button instead of relying on controlled state. */
  trigger?: React.ReactNode;
}

export function AnimeEditDialog({
  media: initialMedia,
  hasListEntry: initialHasListEntry,
  onSaved,
  onDeleted,
  open,
  onOpenChange,
  trigger,
}: AnimeEditDialogProps) {
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
  const [progress, setProgress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [finishDate, setFinishDate] = useState<Date | undefined>();
  const [rewatches, setRewatches] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSubmittingFavorite, setIsSubmittingFavorite] = useState(false);

  // Connection State
  const [updateConnection, setUpdateConnection] = useState<boolean>(false);
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [activeSearchProvider, setActiveSearchProvider] = useState<string | null>(null);
  const [expandedConnections, setExpandedConnections] = useState<Record<string, boolean>>({});
  const [userConnections, setUserConnections] = useState<string[]>([]);

  const CONNECTION_PROVIDERS = BASE_CONNECTION_PROVIDERS.filter(
    (prov) =>
      prov.capabilities.includes(ConnectionCapability.ANIME) &&
      (userConnections.includes(prov.key) || !!connections[prov.key])
  );
  const [isConnectionSearchOpen, setIsConnectionSearchOpen] =
    useState<boolean>(false);
  const [connectionSearchQuery, setConnectionSearchQuery] =
    useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Fetch existing entry when dialog opens
  useEffect(() => {
    if (open) {
      handleOpenChange(true);
    }
  }, [open]);

  // Fetch existing entry when dialog opens
  const handleOpenChange = async (v: boolean) => {
    setIsOpen(v);
    if (v) {
      try {
        const mediaRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/anime/details/${initialMedia.id}`
        );
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          setCurrentMedia(mediaData);
        }
      } catch (e) {
        console.error("Failed to fetch full anime details", e);
      }

      if (session.status === "authenticated" && session.data) {
        try {
          const favRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/favorites/status/anime/${initialMedia.id}`,
            {
              headers: {
                Authorization: `Bearer ${session.data?.accessToken}`,
              },
            }
          );
          if (favRes.ok) {
            const favData = await favRes.json();
            setIsFavorited(favData.favorited);
          }
        } catch (e) {
          console.error("Failed to fetch favorite status", e);
        }

        try {
          const connRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/connections?capabilities=ANIME`,
            {
              headers: {
                Authorization: `Bearer ${session.data?.accessToken}`,
              },
            }
          );
          if (connRes.ok) {
            const connData = await connRes.json();
            const activeProviders = Array.isArray(connData)
              ? connData.map((c: any) => c.provider.toLowerCase())
              : [];
            setUserConnections(activeProviders);
          }
        } catch (e) {
          console.error("Failed to fetch user connections", e);
        }

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/list/anime/entry/${initialMedia.id}`,
            {
              headers: {
                Authorization: `Bearer ${session.data?.accessToken}`,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data) {
              setListStatus(data.status || "PLANNING");
              setScore(data.score ? data.score.toString() : "");
              setProgress(data.progress ? data.progress.toString() : "");
              setNotes(data.notes || "");
              setStartDate(
                data.startDate ? new Date(data.startDate * 1000) : undefined
              );
              setFinishDate(
                data.endDate ? new Date(data.endDate * 1000) : undefined
              );
              setRewatches(data.rewatched ? data.rewatched.toString() : "0");
              const rawConnections = data.connections || {};
              const loadedConnections: Record<string, any> = {};
              for (const key of Object.keys(rawConnections)) {
                const conn = rawConnections[key];
                if (conn && typeof conn === 'object') {
                  let connProgress: string | undefined = undefined;
                  if (conn.progressOffset !== undefined) {
                    connProgress = (Number(data.progress || 0) + Number(conn.progressOffset)).toString();
                  } else if (conn.progress !== undefined) {
                    connProgress = conn.progress.toString();
                  }
                  loadedConnections[key.toLowerCase()] = {
                    id: conn.id,
                    status: conn.status,
                    progress: connProgress,
                    startDate: conn.startDate ? new Date(conn.startDate * 1000) : undefined,
                    endDate: conn.endDate ? new Date(conn.endDate * 1000) : undefined,
                  };
                } else {
                  loadedConnections[key.toLowerCase()] = conn;
                }
              }
              setConnections(loadedConnections);
              setUpdateConnection(
                Object.keys(loadedConnections).length > 0
              );
              setHasListEntry(true);
            }
          }
        } catch (e) {
          console.error("Failed to fetch anime entry", e);
        }
      }
    }
  };

  const handleToggleFavorite = async () => {
    if (session.status !== "authenticated" || !session.data) {
      toast.error("You must be logged in to favorite items");
      return;
    }

    setIsSubmittingFavorite(true);
    try {
      if (isFavorited) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/anime/${media.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.data.accessToken}`,
            },
          }
        );
        if (res.ok) {
          setIsFavorited(false);
          toast.success("Removed from favorites!");
        } else {
          toast.error("Failed to remove from favorites");
        }
      } else {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/favorites`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.data.accessToken}`,
            },
            body: JSON.stringify({
              type: "ANIME",
              mediaId: media.id.toString(),
            }),
          }
        );
        if (res.ok) {
          setIsFavorited(true);
          toast.success("Added to favorites!");
        } else {
          toast.error("Failed to add to favorites");
        }
      }
    } catch {
      toast.error("Failed to toggle favorite");
    } finally {
      setTimeout(() => {
        setIsSubmittingFavorite(false);
      }, 1000);
    }
  };

  const performConnectionSearch = async (query: string) => {
    if (!query || !activeSearchProvider) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const provider = BASE_CONNECTION_PROVIDERS.find((p) => p.key === activeSearchProvider);
      if (provider && provider.search) {
        const results = await provider.search(query, "ANIME");
        setSearchResults(results);
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
        `${process.env.NEXT_PUBLIC_API_URL}/list/anime/entry/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            animeId: Number(media.id),
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
            connections: Object.entries(connections).reduce((acc, [key, val]) => {
              const uppercaseKey = key.toUpperCase();
              if (val && typeof val === 'object') {
                acc[uppercaseKey] = {
                  id: val.id,
                  status: val.status,
                  progressOffset: val.progress !== undefined && val.progress !== "" 
                    ? Number(val.progress) - (progress ? Number(progress) : 0) 
                    : undefined,
                  startDate: val.startDate ? Math.floor(val.startDate.getTime() / 1000) : undefined,
                  endDate: val.endDate ? Math.floor(val.endDate.getTime() / 1000) : undefined,
                };
              } else {
                acc[uppercaseKey] = val;
              }
              return acc;
            }, {} as Record<string, any>),
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
        `${process.env.NEXT_PUBLIC_API_URL}/list/anime/entry/${media.id}`,
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
        setProgress("");
        setNotes("");
        setStartDate(undefined);
        setFinishDate(undefined);
        setRewatches("0");
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

  const toggleConnectionExpand = (provider: string) => {
    setExpandedConnections((p) => ({
      ...p,
      [provider]: !p[provider],
    }));
  };

  const toggleStatusOverride = (provider: string) => {
    setConnections((prev) => {
      const current = prev[provider];
      const id = typeof current === 'object' ? current.id : current;
      const currentDetails = typeof current === 'object' ? current : {};
      const nextDetails = { ...currentDetails, id };
      if (typeof current === 'object' && current.status !== undefined) {
        delete nextDetails.status;
      } else {
        nextDetails.status = listStatus;
      }
      return { ...prev, [provider]: nextDetails };
    });
  };

  const toggleProgressOverride = (provider: string) => {
    setConnections((prev) => {
      const current = prev[provider];
      const id = typeof current === 'object' ? current.id : current;
      const currentDetails = typeof current === 'object' ? current : {};
      const nextDetails = { ...currentDetails, id };
      if (typeof current === 'object' && current.progress !== undefined) {
        delete nextDetails.progress;
      } else {
        nextDetails.progress = progress || "0";
      }
      return { ...prev, [provider]: nextDetails };
    });
  };

  const toggleDatesOverride = (provider: string) => {
    setConnections((prev) => {
      const current = prev[provider];
      const id = typeof current === 'object' ? current.id : current;
      const currentDetails = typeof current === 'object' ? current : {};
      const nextDetails = { ...currentDetails, id };
      if (typeof current === 'object' && (current.startDate !== undefined || current.endDate !== undefined)) {
        delete nextDetails.startDate;
        delete nextDetails.endDate;
      } else {
        nextDetails.startDate = startDate;
        nextDetails.endDate = finishDate;
      }
      return { ...prev, [provider]: nextDetails };
    });
  };

  const handleStatusOverrideChange = (provider: string, val: string) => {
    setConnections((prev) => {
      const current = prev[provider];
      const id = typeof current === 'object' ? current.id : current;
      const currentDetails = typeof current === 'object' ? current : {};
      return {
        ...prev,
        [provider]: { ...currentDetails, id, status: val },
      };
    });
  };

  const handleProgressOverrideChange = (provider: string, val: string) => {
    setConnections((prev) => {
      const current = prev[provider];
      const id = typeof current === 'object' ? current.id : current;
      const currentDetails = typeof current === 'object' ? current : {};
      return {
        ...prev,
        [provider]: { ...currentDetails, id, progress: val },
      };
    });
  };

  const handleDateOverrideChange = (provider: string, field: 'startDate' | 'endDate', val: Date | undefined) => {
    setConnections((prev) => {
      const current = prev[provider];
      const id = typeof current === 'object' ? current.id : current;
      const currentDetails = typeof current === 'object' ? current : {};
      return {
        ...prev,
        [provider]: { ...currentDetails, id, [field]: val },
      };
    });
  };

  const renderConnectionCard = (provider: string, label: string) => {
    const conn = connections[provider];
    const isLinked = !!conn;
    const linkedId = conn ? (typeof conn === 'object' ? conn.id : conn) : '';
    const isExpanded = !!expandedConnections[provider];

    if (!isLinked) {
      return (
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 border-dashed border-input hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 rounded-lg bg-background/50 text-foreground"
          onClick={() => {
            setActiveSearchProvider(provider);
            setIsConnectionSearchOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Link {label}
        </Button>
      );
    }

    const connStatus = typeof conn === 'object' ? conn.status : undefined;
    const connProgress = typeof conn === 'object' ? conn.progress : undefined;
    const connStartDate = typeof conn === 'object' ? conn.startDate : undefined;
    const connEndDate = typeof conn === 'object' ? conn.endDate : undefined;

    const hasStatusOverride = typeof conn === 'object' && conn.status !== undefined;
    const hasProgressOverride = typeof conn === 'object' && conn.progress !== undefined;
    const hasDatesOverride = typeof conn === 'object' && (conn.startDate !== undefined || conn.endDate !== undefined);

    return (
      <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-background/50 w-full transition-all duration-200 text-foreground">
        <div 
          className="flex items-center justify-between p-3 hover:bg-accent/40 cursor-pointer select-none transition-colors"
          onClick={() => toggleConnectionExpand(provider)}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
              {linkedId}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setConnections((p) => {
                const newP = { ...p };
                delete newP[provider];
                return newP;
              });
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {isExpanded && (
          <div className="border-t border-border p-4 bg-muted/20 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
            {/* Status Override */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${provider}-override-status`}
                  checked={hasStatusOverride}
                  onCheckedChange={() => toggleStatusOverride(provider)}
                />
                <Label
                  htmlFor={`${provider}-override-status`}
                  className="text-xs font-medium text-muted-foreground cursor-pointer"
                >
                  Override status
                </Label>
              </div>
              {hasStatusOverride ? (
                <Select
                  value={connStatus || listStatus}
                  onValueChange={(val) => handleStatusOverrideChange(provider, val)}
                >
                  <SelectTrigger className="w-full bg-background border-input text-foreground h-9 mt-1 px-3 text-xs font-normal hover:bg-accent hover:text-accent-foreground transition-colors">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="WATCHING">Watching</SelectItem>
                    <SelectItem value="PLANNING">Plan to watch</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="REPEATING">Rewatching</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="DROPPED">Dropped</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground/80 pl-6 italic">
                  Inherited: {listStatus}
                </span>
              )}
            </div>

            {/* Progress Override */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${provider}-override-progress`}
                  checked={hasProgressOverride}
                  onCheckedChange={() => toggleProgressOverride(provider)}
                />
                <Label
                  htmlFor={`${provider}-override-progress`}
                  className="text-xs font-medium text-muted-foreground cursor-pointer"
                >
                  Override episode progress
                </Label>
              </div>
              {hasProgressOverride ? (
                <div className="flex bg-background border border-input rounded-md overflow-hidden h-9 mt-1">
                  <Input
                    type="number"
                    min="0"
                    max={media.episodes || undefined}
                    value={connProgress !== undefined ? connProgress : ""}
                    onChange={(e) => handleProgressOverrideChange(provider, e.target.value)}
                    className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-sm"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/80 pl-6 italic">
                  Inherited: {progress || "0"}
                </span>
              )}
            </div>

            {/* Dates Override */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${provider}-override-dates`}
                  checked={hasDatesOverride}
                  onCheckedChange={() => toggleDatesOverride(provider)}
                />
                <Label
                  htmlFor={`${provider}-override-dates`}
                  className="text-xs font-medium text-muted-foreground cursor-pointer"
                >
                  Override dates
                </Label>
              </div>
              {hasDatesOverride ? (
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Start Date</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-background border-input text-foreground h-9 hover:bg-accent hover:text-accent-foreground text-xs",
                            !connStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                          {connStartDate ? (
                            format(connStartDate, "yyyy-MM-dd")
                          ) : (
                            <span>Pick date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-auto p-0 bg-popover border-border z-60"
                      >
                        <Calendar
                          mode="single"
                          selected={connStartDate}
                          onSelect={(date) => handleDateOverrideChange(provider, 'startDate', date)}
                          initialFocus
                          className="bg-popover text-popover-foreground"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Finish Date</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-background border-input text-foreground h-9 hover:bg-accent hover:text-accent-foreground text-xs",
                            !connEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                          {connEndDate ? (
                            format(connEndDate, "yyyy-MM-dd")
                          ) : (
                            <span>Pick date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-auto p-0 bg-popover border-border z-60"
                      >
                        <Calendar
                          mode="single"
                          selected={connEndDate}
                          onSelect={(date) => handleDateOverrideChange(provider, 'endDate', date)}
                          initialFocus
                          className="bg-popover text-popover-foreground"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/80 pl-6 italic">
                  Inherited: {startDate ? format(startDate, "yyyy-MM-dd") : "No Start Date"} - {finishDate ? format(finishDate, "yyyy-MM-dd") : "No Finish Date"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-popover border-border text-popover-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground">
      <DialogTitle className="sr-only">
        {hasListEntry ? "Edit Anime Entry" : "Add Anime to List"}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Update your progress, score, status and custom connections for this
        anime entry.
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
            <button
              onClick={handleToggleFavorite}
              disabled={isSubmittingFavorite}
              className={cn(
                "transition-colors",
                isFavorited
                  ? "text-red-500 hover:text-red-600"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart className={cn("w-6 h-6", isFavorited && "fill-current")} />
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
                  if (media.episodes && !progress)
                    setProgress(media.episodes.toString());
                }
                if (val === "WATCHING" && !startDate)
                  setStartDate(new Date());
              }}
            >
              <SelectTrigger className="w-full bg-background border-input text-foreground h-10 px-3 text-sm font-normal hover:bg-accent hover:text-accent-foreground transition-colors">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-popover border-border text-popover-foreground">
                <SelectItem value="WATCHING">Watching</SelectItem>
                <SelectItem value="PLANNING">Plan to watch</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REPEATING">Rewatching</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
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

          {/* Episode Progress */}
          <div className="col-span-2 flex flex-col gap-2">
            <Label className="text-sm font-semibold text-muted-foreground">
              Episode Progress
            </Label>
            <div className="flex bg-background border border-input rounded-md overflow-hidden">
              <Input
                type="number"
                min="0"
                max={media.episodes || undefined}
                value={progress}
                onChange={(e) => {
                  let val = e.target.value;
                  if (media.episodes && Number(val) >= media.episodes) {
                    val = media.episodes.toString();
                    setListStatus("COMPLETED");
                    if (!finishDate) setFinishDate(new Date());
                  }
                  setProgress(val);
                }}
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
              <div className="relative w-full">
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-input text-foreground h-10 hover:bg-accent hover:text-accent-foreground pr-8",
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
                {startDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setStartDate(undefined);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
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
              <div className="relative w-full">
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-input text-foreground h-10 hover:bg-accent hover:text-accent-foreground pr-8",
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
                {finishDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFinishDate(undefined);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
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

          {/* Rewatches */}
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
                id="anime-update-connection"
                checked={updateConnection}
                onCheckedChange={(checked) =>
                  setUpdateConnection(checked as boolean)
                }
              />
              <Label
                htmlFor="anime-update-connection"
                className="text-sm font-semibold text-muted-foreground cursor-pointer"
              >
                Update anime from connection
              </Label>
            </div>

            {updateConnection && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1 w-full">
                {CONNECTION_PROVIDERS.length > 0 ? (
                  CONNECTION_PROVIDERS.map((prov) => (
                    <div key={prov.key} className="w-full">
                      {renderConnectionCard(prov.key, prov.name)}
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-4 text-xs text-muted-foreground bg-muted/20 border border-dashed border-border rounded-lg">
                    No active connections found. Please connect your accounts in settings.
                  </div>
                )}
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
                {CONNECTION_PROVIDERS.find((p) => p.key === activeSearchProvider)?.name || activeSearchProvider}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Search and select a media item to link connection IDs.
              </DialogDescription>
              <div className="flex gap-2">
                <Input
                  placeholder={`Search ${CONNECTION_PROVIDERS.find((p) => p.key === activeSearchProvider)?.name || "anime"}...`}
                  value={connectionSearchQuery}
                  onChange={(e) => setConnectionSearchQuery(e.target.value)}
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
                {searchResults.map((result, idx) => (
                  <button
                    key={`${activeSearchProvider}-${result.id}-${idx}`}
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
                        {result.episodes ? ` · ${result.episodes} eps` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete */}
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
                    this anime from your list.
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