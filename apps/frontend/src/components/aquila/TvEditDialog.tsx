"use client";

import React, { useEffect, useState } from "react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { CalendarIcon, Check, Heart, X, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { BASE_CONNECTION_PROVIDERS, ConnectionCapability } from "@/lib/providers";

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

interface TvEditDialogMedia {
  id: string;
  title: { romaji: string; english?: string };
  coverImage: { large: string };
  bannerImage?: string;
  seasons: Season[];
}

interface TvEditDialogProps {
  media: TvEditDialogMedia;
  hasListEntry: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function TvEditDialog({
  media: initialMedia,
  hasListEntry: initialHasListEntry,
  onSaved,
  onDeleted,
  open,
  onOpenChange,
  trigger,
}: TvEditDialogProps) {
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
  const [watchedEpisodes, setWatchedEpisodes] = useState<
    { seasonNum: number; episodeNum: number }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSubmittingFavorite, setIsSubmittingFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "episodes">("general");
  const [seasons, setSeasons] = useState<Season[]>(media.seasons || []);

  useEffect(() => {
    setSeasons(media.seasons || []);
  }, [media.id, media.seasons]);

  const totalEpisodes = seasons.reduce((acc, s) => acc + s.episodeCount, 0);
  const watchedCount = watchedEpisodes.length;
  const progressPercent =
    totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

  const isEpisodeWatched = (seasonNum: number, episodeNum: number) =>
    watchedEpisodes.some(
      (ep) => ep.seasonNum === seasonNum && ep.episodeNum === episodeNum,
    );

  const getSeasonWatchedCount = (season: Season) =>
    season.episodes.filter((ep) => isEpisodeWatched(season.number, ep.number))
      .length;

  // Connection State
  const [updateConnection, setUpdateConnection] = useState<boolean>(false);
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [activeSearchProvider, setActiveSearchProvider] = useState<string | null>(null);
  const [expandedConnections, setExpandedConnections] = useState<Record<string, boolean>>({});
  const [userConnections, setUserConnections] = useState<string[]>([]);

  const CONNECTION_PROVIDERS = BASE_CONNECTION_PROVIDERS.filter(
    (prov) =>
      prov.capabilities.includes(ConnectionCapability.TV_SHOWS) &&
      (userConnections.includes(prov.key) || !!connections[prov.key])
  );
  const [isConnectionSearchOpen, setIsConnectionSearchOpen] =
    useState<boolean>(false);
  const [connectionSearchQuery, setConnectionSearchQuery] =
    useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const performConnectionSearch = async (query: string, providerKey?: string): Promise<void> => {
    const activeProv = providerKey || activeSearchProvider;
    if (!query || !activeProv) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const provider = BASE_CONNECTION_PROVIDERS.find((p) => p.key === activeProv);
      if (provider && provider.search) {
        const results = await provider.search(query, "TV_SHOWS");
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

  const renderConnectionCard = (provider: string, label: string): React.JSX.Element => {
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
                        <SelectItem value="WATCHING">Watching</SelectItem>
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
          `${process.env.NEXT_PUBLIC_API_URL}/tv/details/${initialMedia.id}`,
        );
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          setCurrentMedia(mediaData);
          if (mediaData && mediaData.seasons) {
            setSeasons(mediaData.seasons);
          }
        }
      } catch (e) {
        console.error("Failed to fetch TV details on dialog open", e);
      }

      if (session.status === "authenticated" && session.data) {
        try {
          const favRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/favorites/status/tv/${initialMedia.id}`,
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
            `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${initialMedia.id}`,
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
              setWatchedEpisodes(data.watchedEpisodes || []);
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
          console.error("Failed to fetch TV entry", e);
        }
      }
    }
  };

  const toggleEpisode = async (seasonNum: number, episodeNum: number) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${media.id}/episode`,
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
    const season = seasons.find((s) => s.number === seasonNum);
    if (!season) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${media.id}/season`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({ seasonNum, episodes: season.episodes, watched }),
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
        toast.success(watched ? "Season marked as watched" : "Season marked as unwatched");
      }
    } catch {
      toast.error("Failed to update season progress");
    }
  };

  const handleSave = async () => {
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
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${media.id}`,
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
        setWatchedEpisodes([]);
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
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/tv/${media.id}`,
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
              type: "TV",
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
        {hasListEntry ? "Edit TV Show Entry" : "Add TV Show to List"}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Update your progress, status, custom score, and detailed episode watching progress for this TV show.
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
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 bg-zinc-900/80 border border-zinc-800/40 h-2 rounded-full overflow-hidden max-w-[200px]">
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

      {/* Tabs */}
      <div className="flex bg-zinc-950/60 border border-zinc-800/50 p-1 rounded-xl w-fit mx-6 my-4">
        <button
          onClick={() => setActiveTab("general")}
          className={cn(
            "relative z-10 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
            activeTab === "general"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {activeTab === "general" && (
            <motion.div
              layoutId="tvEditActiveTabHighlight"
              className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-md"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          General Info
        </button>
        <button
          onClick={() => setActiveTab("episodes")}
          className={cn(
            "relative z-10 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
            activeTab === "episodes"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {activeTab === "episodes" && (
            <motion.div
              layoutId="tvEditActiveTabHighlight"
              className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-md"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          Episode Progress
        </button>
      </div>

      <div className="p-6 pt-0 bg-transparent max-h-[60vh] overflow-y-auto">
        {activeTab === "general" ? (
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
                  if (val === "WATCHING" && !startDate) setStartDate(new Date());
                }}
              >
                <SelectTrigger className="w-full bg-zinc-950/40 border border-zinc-800/50 text-foreground h-10 px-3 text-xs font-medium hover:bg-zinc-900/60 hover:text-foreground focus:ring-1 focus:ring-primary/30 rounded-xl transition-all duration-300 cursor-pointer">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl text-foreground">
                  <SelectItem value="WATCHING">Watching</SelectItem>
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
                className="bg-zinc-950/40 border border-zinc-800/50 text-foreground px-3 py-2 text-xs font-medium hover:bg-zinc-900/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl transition-all duration-300 min-h-[80px] resize-y"
              />
            </div>

            {/* Connections */}
            <div className="col-span-6 flex flex-col gap-2 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tv-update-connection"
                  checked={updateConnection}
                  onCheckedChange={(checked) =>
                    setUpdateConnection(checked as boolean)
                  }
                  className="border-zinc-700/80 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label
                  htmlFor="tv-update-connection"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 cursor-pointer select-none"
                >
                  Update TV show from connection
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
                    <div className="col-span-2 text-center py-4 text-xs text-muted-foreground bg-zinc-950/20 border border-dashed border-zinc-800/60 rounded-xl">
                      No active connections found. Please connect your accounts in settings.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!hasListEntry && (
              <div className="p-6 bg-zinc-950/20 border border-dashed border-zinc-800/60 rounded-xl text-center text-xs font-medium text-muted-foreground">
                Add the show to your list first to track episodes.
              </div>
            )}
            {hasListEntry && (
              <Accordion type="multiple" className="w-full space-y-3">
                {seasons.map((season) => {
                  const watchedInSeason = getSeasonWatchedCount(season);
                  const isAllWatched = watchedInSeason === season.episodeCount;
                  return (
                    <AccordionItem
                      key={season.id}
                      value={season.id}
                      className="border border-zinc-800/50 rounded-xl overflow-hidden px-0 bg-zinc-950/20"
                    >
                      <AccordionTrigger className="hover:no-underline px-4 py-3 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-zinc-800/50">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-foreground">Season {season.number}</span>
                            <span className="text-xs text-muted-foreground font-medium bg-zinc-950/40 border border-zinc-800/60 px-2 py-0.5 rounded-lg">
                              {watchedInSeason} / {season.episodeCount} episodes
                            </span>
                          </div>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 px-2.5 text-[10px] uppercase font-bold tracking-wider cursor-pointer hover:bg-zinc-800/60 rounded-lg",
                              isAllWatched
                                ? "text-primary hover:text-primary/80"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSeason(season.number, !isAllWatched);
                            }}
                          >
                            <span
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                               if (e.key === "Enter" || e.key === " ") {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 toggleSeason(season.number, !isAllWatched);
                               }
                             }}
                            >
                              {isAllWatched ? "Unmark All" : "Mark All"}
                            </span>
                          </Button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0 bg-zinc-950/40 divide-y divide-zinc-800/40">
                        <div className="divide-y divide-zinc-800/40">
                          {season.episodes.map((episode) => {
                            const watched = isEpisodeWatched(
                              season.number,
                              episode.number,
                            );
                            return (
                              <div
                                key={episode.id}
                                className={cn(
                                  "flex items-center gap-4 px-4 py-3 hover:bg-zinc-900/20 transition-colors cursor-pointer select-none",
                                  watched && "bg-primary/5",
                                )}
                                onClick={() =>
                                  toggleEpisode(season.number, episode.number)
                                }
                              >
                                <div
                                  className={cn(
                                    "shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200",
                                    watched
                                      ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105"
                                      : "border-zinc-700 hover:border-zinc-500 bg-zinc-950/50",
                                  )}
                                >
                                  {watched && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                      <span className="text-muted-foreground mr-2 font-normal">
                                        {episode.number}.
                                      </span>
                                      {episode.name}
                                    </p>
                                    {episode.airDate && (
                                      <span className="text-[10px] text-muted-foreground font-mono">
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
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    disabled={isSubmitting}
                    className="bg-zinc-950/20 border border-zinc-800 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive font-bold text-xs px-5 h-9 rounded-xl transition-all duration-300 cursor-pointer"
                  >
                    Delete
                  </Button>
                </motion.div>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 text-foreground [&>button]:text-foreground shadow-2xl rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-base font-bold">Are you sure you want to delete this?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-muted-foreground">
                    This action cannot be undone. This will permanently remove this TV show
                    from your list and all episode progress.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-foreground text-xs font-semibold px-4 h-9 rounded-xl cursor-pointer transition-colors">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold px-4 h-9 rounded-xl cursor-pointer transition-colors"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Connection search dialog */}
        <AnimatePresence>
          {isConnectionSearchOpen && (
            <Dialog
              open={isConnectionSearchOpen}
              onOpenChange={setIsConnectionSearchOpen}
            >
              <DialogContent className="sm:max-w-[500px] p-6 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 text-foreground [&>button]:text-foreground shadow-2xl rounded-2xl">
                <DialogTitle className="text-lg font-bold">
                  Search on{" "}
                  {CONNECTION_PROVIDERS.find((p) => p.key === activeSearchProvider)?.name || activeSearchProvider}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Search and select a media item to link connection IDs.
                </DialogDescription>
                <div className="flex gap-2 mt-4">
                  <Input
                    placeholder={`Search ${CONNECTION_PROVIDERS.find((p) => p.key === activeSearchProvider)?.name || "TV show"}...`}
                    value={connectionSearchQuery}
                    onChange={(e) => setConnectionSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        performConnectionSearch(connectionSearchQuery);
                    }}
                    className="bg-zinc-950/40 border border-zinc-800/50 text-foreground h-10 px-3 text-xs font-medium hover:bg-zinc-900/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl transition-all duration-300"
                  />
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={() =>
                        performConnectionSearch(connectionSearchQuery)
                      }
                      disabled={isSearching}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 px-5 rounded-xl cursor-pointer"
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </Button>
                  </motion.div>
                </div>
                <div className="space-y-2 mt-4 max-h-64 overflow-y-auto pr-1">
                  {searchResults.map((result, idx) => (
                    <button
                      key={`${activeSearchProvider}-${result.id}-${idx}`}
                      className="flex items-center gap-3 w-full p-2.5 rounded-xl border border-transparent hover:border-zinc-800/50 hover:bg-zinc-900/20 text-left transition-all duration-200 cursor-pointer"
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
                          className="w-10 h-14 object-cover rounded-lg border border-zinc-800/30"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {result.format}
                          {result.episodes ? ` · ${result.episodes} eps` : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                  {!isSearching && searchResults.length === 0 && connectionSearchQuery && (
                    <p className="text-center py-6 text-xs text-muted-foreground">No results found.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
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
