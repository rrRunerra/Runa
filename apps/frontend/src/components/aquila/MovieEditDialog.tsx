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
import { CalendarIcon, Heart, X, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { BASE_CONNECTION_PROVIDERS, ConnectionCapability } from "@/lib/providers";

interface MovieEditDialogMedia {
  id: string;
  title: { romaji: string; english?: string };
  coverImage: { large: string };
  bannerImage?: string;
}

interface MovieEditDialogProps {
  media: MovieEditDialogMedia;
  hasListEntry: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function MovieEditDialog({
  media: initialMedia,
  hasListEntry: initialHasListEntry,
  onSaved,
  onDeleted,
  open,
  onOpenChange,
  trigger,
}: MovieEditDialogProps) {
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
      prov.capabilities.includes(ConnectionCapability.MOVIES) &&
      (userConnections.includes(prov.key) || !!connections[prov.key])
  );
  const [isConnectionSearchOpen, setIsConnectionSearchOpen] =
    useState<boolean>(false);
  const [connectionSearchQuery, setConnectionSearchQuery] =
    useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const performConnectionSearch = async (query: string, providerKey?: string) => {
    const activeProv = providerKey || activeSearchProvider;
    if (!query || !activeProv) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const provider = BASE_CONNECTION_PROVIDERS.find((p) => p.key === activeProv);
      if (provider && provider.search) {
        const results = await provider.search(query, "MOVIES");
        setSearchResults(results);
      }
    } catch (err) {
      console.error(`Failed to search ${activeProv}`, err);
    } finally {
      setIsSearching(false);
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
          className="w-full h-12 border-dashed border-zinc-800/80 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-300 flex items-center justify-center gap-2 rounded-xl bg-zinc-950/20 text-muted-foreground text-xs font-semibold cursor-pointer"
          onClick={() => {
            setActiveSearchProvider(provider);
            const title = media.title.english || media.title.romaji;
            setConnectionSearchQuery(title);
            setIsConnectionSearchOpen(true);
            performConnectionSearch(title, provider);
          }}
        >
          <Plus className="w-4 h-4" />
          Link {label}
        </Button>
      );
    }

    const connStatus = typeof conn === 'object' ? conn.status : undefined;
    const connStartDate = typeof conn === 'object' ? conn.startDate : undefined;
    const connEndDate = typeof conn === 'object' ? conn.endDate : undefined;

    const hasStatusOverride = typeof conn === 'object' && conn.status !== undefined;
    const hasDatesOverride = typeof conn === 'object' && (conn.startDate !== undefined || conn.endDate !== undefined);

    return (
      <div className="flex flex-col border border-zinc-800/50 rounded-xl overflow-hidden bg-zinc-950/40 w-full transition-all duration-200 text-foreground">
        <div 
          className="flex items-center justify-between p-3 hover:bg-zinc-900/30 cursor-pointer select-none transition-colors"
          onClick={() => toggleConnectionExpand(provider)}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-xs tracking-wide uppercase text-muted-foreground">{label}</span>
            <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">
              {linkedId}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/60" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer transition-colors"
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

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="border-t border-zinc-800/40 bg-zinc-950/60 overflow-hidden"
            >
              <div className="p-4 flex flex-col gap-4">
                {/* Status Override */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${provider}-override-status`}
                      checked={hasStatusOverride}
                      onCheckedChange={() => toggleStatusOverride(provider)}
                      className="border-zinc-700/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor={`${provider}-override-status`}
                      className="text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                    >
                      Override status
                    </Label>
                  </div>
                  {hasStatusOverride ? (
                    <Select
                      value={connStatus || listStatus}
                      onValueChange={(val) => handleStatusOverrideChange(provider, val)}
                    >
                      <SelectTrigger className="w-full bg-zinc-950/40 border border-zinc-800/50 text-foreground h-9 mt-1 px-3 text-xs font-normal hover:bg-zinc-900/60 hover:text-foreground focus:ring-1 focus:ring-primary/30 rounded-xl transition-all duration-300">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl text-foreground">
                        <SelectItem value="PLANNING">Planning</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="DROPPED">Dropped</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 pl-6 italic">
                      Inherited: {listStatus}
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
                      className="border-zinc-700/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor={`${provider}-override-dates`}
                      className="text-xs font-semibold text-muted-foreground cursor-pointer select-none"
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
                                "w-full justify-start text-left font-normal bg-zinc-950/40 border border-zinc-800/50 text-foreground h-9 hover:bg-zinc-900/60 hover:text-foreground text-xs rounded-xl transition-all duration-300",
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
                            className="w-auto p-0 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl z-60"
                          >
                            <Calendar
                              mode="single"
                              selected={connStartDate}
                              onSelect={(date) => handleDateOverrideChange(provider, 'startDate', date)}
                              initialFocus
                              className="bg-transparent text-foreground"
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
                                "w-full justify-start text-left font-normal bg-zinc-950/40 border border-zinc-800/50 text-foreground h-9 hover:bg-zinc-900/60 hover:text-foreground text-xs rounded-xl transition-all duration-300",
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
                            className="w-auto p-0 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl z-60"
                          >
                            <Calendar
                              mode="single"
                              selected={connEndDate}
                              onSelect={(date) => handleDateOverrideChange(provider, 'endDate', date)}
                              initialFocus
                              className="bg-transparent text-foreground"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 pl-6 italic">
                      Inherited: {startDate ? format(startDate, "yyyy-MM-dd") : "No Start Date"} - {finishDate ? format(finishDate, "yyyy-MM-dd") : "No Finish Date"}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

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
          `${process.env.NEXT_PUBLIC_API_URL}/movie/details/${initialMedia.id}`,
        );
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          setCurrentMedia(mediaData);
        }
      } catch (e) {
        console.error("Failed to fetch movie details on dialog open", e);
      }

      if (session.status === "authenticated" && session.data) {
        try {
          const favRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/favorites/status/movie/${initialMedia.id}`,
            {
              headers: {
                Authorization: `Bearer ${session.data.accessToken}`,
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
            `${process.env.NEXT_PUBLIC_API_URL}/connections`,
            {
              headers: {
                Authorization: `Bearer ${session.data.accessToken}`,
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
            `${process.env.NEXT_PUBLIC_API_URL}/list/movie/entry/${initialMedia.id}`,
            {
              headers: { Authorization: `Bearer ${session.data.accessToken}` },
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
              const rawConnections = data.connections || {};
              const loadedConnections: Record<string, any> = {};
              for (const key of Object.keys(rawConnections)) {
                const conn = rawConnections[key];
                if (conn && typeof conn === 'object') {
                  loadedConnections[key.toLowerCase()] = {
                    id: conn.id,
                    status: conn.status,
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
          console.error("Failed to fetch movie entry", e);
        }
      }
    }
  };

  const handleSave = async () => {
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
            tvdbId: parseInt(media.id),
            status: listStatus,
            startDate: startDate ? Math.floor(startDate.getTime() / 1000) : undefined,
            endDate: finishDate ? Math.floor(finishDate.getTime() / 1000) : undefined,
            score: score ? Number(score) : undefined,
            notes: notes || undefined,
            rewatched: rewatches ? Number(rewatches) : undefined,
            updateConnection,
            connections: Object.entries(connections).reduce((acc, [key, val]) => {
              const uppercaseKey = key.toUpperCase();
              if (val && typeof val === 'object') {
                acc[uppercaseKey] = {
                  id: val.id,
                  status: val.status,
                  startDate: val.startDate ? Math.floor(val.startDate.getTime() / 1000) : undefined,
                  endDate: val.endDate ? Math.floor(val.endDate.getTime() / 1000) : undefined,
                };
              } else {
                acc[uppercaseKey] = val;
              }
              return acc;
            }, {} as Record<string, any>),
          }),
        },
      );
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("List updated!");
        setIsOpen(false);
        setHasListEntry(true);
        onSaved?.();
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
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/movie/entry/${media.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.data?.accessToken}` },
        },
      );
      if (res.ok) {
        toast.success("Removed from list!");
        setIsOpen(false);
        setHasListEntry(false);
        setListStatus("PLANNING");
        setScore("");
        setNotes("");
        setStartDate(undefined);
        setFinishDate(undefined);
        setRewatches("0");
        onDeleted?.();
      } else {
        toast.error("Failed to remove from list");
      }
    } catch {
      toast.error("Failed to remove from list");
    } finally {
      setIsSubmitting(false);
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
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/movie/${media.id}`,
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
              type: "MOVIE",
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

  const dialogContent = (
    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/60 text-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground shadow-2xl rounded-2xl">
      <DialogTitle className="sr-only">
        {hasListEntry ? "Edit Movie Entry" : "Add Movie to List"}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Update your status, score, dates and other list entry metadata for this movie.
      </DialogDescription>

      {/* Banner header */}
      <div className="relative h-48 w-full bg-zinc-900/40">
        {media.bannerImage && (
          <img
            src={media.bannerImage}
            alt="banner"
            className="w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-6 z-10">
          <img
            src={media.coverImage.large}
            alt="cover"
            className="w-24 rounded-xl shadow-2xl object-cover bg-zinc-950/40 border border-zinc-800/40"
          />
          <div className="flex-1 pb-1">
            <h2 className="text-xl font-bold line-clamp-2 text-foreground drop-shadow-md">
              {media.title.english || media.title.romaji}
            </h2>
          </div>
          <div className="pb-1 flex gap-4 items-center">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleFavorite}
              disabled={isSubmittingFavorite}
              className={cn(
                "transition-colors cursor-pointer",
                isFavorited
                  ? "text-red-500 hover:text-red-600 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart className={cn("w-6 h-6", isFavorited && "fill-current")} />
            </motion.button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10 font-bold px-6 rounded-xl cursor-pointer"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="p-6 pt-4 bg-transparent">
        <div className="grid grid-cols-6 gap-x-6 gap-y-4">
          {/* Status */}
          <div className="col-span-3 flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-1">Status</Label>
            <Select
              value={listStatus}
              onValueChange={(val) => {
                setListStatus(val);
                if (val === "COMPLETED") {
                  const targetEndDate = finishDate || new Date();
                  if (!finishDate) setFinishDate(targetEndDate);
                  if (!startDate) setStartDate(targetEndDate);
                }
              }}
            >
              <SelectTrigger className="w-full bg-zinc-950/40 border border-zinc-800/50 text-foreground h-10 px-3 text-xs font-medium hover:bg-zinc-900/60 hover:text-foreground focus:ring-1 focus:ring-primary/30 rounded-xl transition-all duration-300 cursor-pointer">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl text-foreground">
                <SelectItem value="PLANNING">Planning</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="DROPPED">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Score */}
          <div className="col-span-3 flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-1">Score</Label>
            <div className="flex bg-zinc-950/40 border border-zinc-800/50 rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300">
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
                className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full px-3 text-xs font-medium"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="col-span-2 flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-1">Start Date</Label>
            <Popover>
              <div className="relative w-full">
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-medium bg-zinc-950/40 border border-zinc-800/50 text-foreground h-10 hover:bg-zinc-900/60 hover:text-foreground pr-8 rounded-xl transition-all duration-300 text-xs cursor-pointer",
                      !startDate && "text-muted-foreground/40",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/60" />
                    {startDate ? format(startDate, "yyyy-MM-dd") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                {startDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-zinc-800/40 text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
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
              <PopoverContent align="start" className="w-auto p-0 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl z-60">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="bg-transparent text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Finish Date */}
          <div className="col-span-2 flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-1">Finish Date</Label>
            <Popover>
              <div className="relative w-full">
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-medium bg-zinc-950/40 border border-zinc-800/50 text-foreground h-10 hover:bg-zinc-900/60 hover:text-foreground pr-8 rounded-xl transition-all duration-300 text-xs cursor-pointer",
                      !finishDate && "text-muted-foreground/40",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/60" />
                    {finishDate ? format(finishDate, "yyyy-MM-dd") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                {finishDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-zinc-800/40 text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
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
              <PopoverContent align="start" className="w-auto p-0 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl z-60">
                <Calendar
                  mode="single"
                  selected={finishDate}
                  onSelect={setFinishDate}
                  initialFocus
                  className="bg-transparent text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Rewatches */}
          <div className="col-span-2 flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-1">Total Rewatches</Label>
            <div className="flex bg-zinc-950/40 border border-zinc-800/50 rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300">
              <Input
                type="number"
                min="0"
                value={rewatches}
                onChange={(e) => setRewatches(e.target.value)}
                className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full px-3 text-xs font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="col-span-6 flex flex-col gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-1">Notes</Label>
            <Textarea
              placeholder="Your notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-950/40 border border-zinc-800/50 text-foreground min-h-[80px] resize-y rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-300 placeholder:text-muted-foreground/30 text-xs font-medium"
            />
          </div>

          {/* Connections */}
          <div className="col-span-6 flex flex-col gap-2 mt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="movie-update-connection"
                checked={updateConnection}
                onCheckedChange={(checked) =>
                  setUpdateConnection(checked as boolean)
                }
                className="border-zinc-700/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor="movie-update-connection"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 cursor-pointer select-none"
              >
                Update movie from connection
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
                  <div className="col-span-2 text-center py-4 text-xs text-muted-foreground bg-zinc-950/20 border border-dashed border-zinc-800/50 rounded-xl">
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
            <DialogContent className="sm:max-w-[500px] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl text-foreground [&>button]:text-foreground [&>button]:z-60">
              <DialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                Search on{" "}
                {CONNECTION_PROVIDERS.find((p) => p.key === activeSearchProvider)?.name || activeSearchProvider}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Search and select a media item to link connection IDs.
              </DialogDescription>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder={`Search ${CONNECTION_PROVIDERS.find((p) => p.key === activeSearchProvider)?.name || "movie"}...`}
                  value={connectionSearchQuery}
                  onChange={(e) => setConnectionSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      performConnectionSearch(connectionSearchQuery);
                  }}
                  className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl text-xs placeholder:text-muted-foreground/30 h-10"
                />
                <Button
                  onClick={() =>
                    performConnectionSearch(connectionSearchQuery)
                  }
                  disabled={isSearching}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 font-bold px-4 cursor-pointer text-xs transition-colors shrink-0"
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto mt-2 pr-1 no-scrollbar">
                {searchResults.map((result, idx) => (
                  <button
                    key={`${activeSearchProvider}-${result.id}-${idx}`}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-zinc-800/30 text-left cursor-pointer transition-all border border-transparent hover:border-zinc-800/40"
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
                        className="w-10 h-14 object-cover rounded-lg bg-zinc-950/40"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-xs text-foreground">{result.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
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

        <div className="mt-6 flex justify-end">
          {hasListEntry && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    disabled={isSubmitting}
                    className="bg-zinc-950/40 hover:bg-destructive hover:text-destructive-foreground border-zinc-850 hover:border-destructive/50 text-muted-foreground text-xs font-semibold rounded-xl cursor-pointer px-4 h-9 transition-colors"
                  >
                    Delete
                  </Button>
                </motion.div>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Are you sure you want to delete this?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-muted-foreground/80">
                    This action cannot be undone. This will permanently remove this movie
                    from your list.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="bg-zinc-950/40 hover:bg-zinc-900 border-zinc-850 text-foreground text-xs font-bold rounded-xl cursor-pointer h-9 px-4">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold rounded-xl cursor-pointer h-9 px-4"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
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
