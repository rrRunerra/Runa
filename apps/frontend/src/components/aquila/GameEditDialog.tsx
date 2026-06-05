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
import { Heart, CalendarIcon, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GameEditDialogMedia {
  id: string;
  title: { romaji: string; english?: string };
  coverImage: { large: string };
  bannerImage?: string;
}

interface GameEditDialogProps {
  media: GameEditDialogMedia;
  hasListEntry: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function GameEditDialog({
  media: initialMedia,
  hasListEntry: initialHasListEntry,
  onSaved,
  onDeleted,
  open,
  onOpenChange,
  trigger,
}: GameEditDialogProps) {
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
  const [hours, setHours] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [finishDate, setFinishDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSubmittingFavorite, setIsSubmittingFavorite] = useState(false);

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
          `${process.env.NEXT_PUBLIC_API_URL}/game/details/${initialMedia.id}`
        );
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          setCurrentMedia(mediaData);
        }
      } catch (e) {
        console.error("Failed to fetch full game details", e);
      }

      if (session.status === "authenticated" && session.data) {
        try {
          const favRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/favorites/status/GAME/${initialMedia.id}`,
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
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/list/game/entry/${initialMedia.id}`,
            {
              headers: { Authorization: `Bearer ${session.data?.accessToken}` },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data) {
              setListStatus(data.status || "PLANNING");
              setScore(data.score ? data.score.toString() : "");
              setHours(data.progress ? data.progress.toString() : "");
              setNotes(data.notes || "");
              setStartDate(
                data.startDate ? new Date(data.startDate * 1000) : undefined
              );
              setFinishDate(
                data.endDate ? new Date(data.endDate * 1000) : undefined
              );
              setHasListEntry(true);
            }
          }
        } catch (e) {
          console.error("Failed to fetch game entry", e);
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
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/GAME/${media.id}`,
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
              type: "GAME",
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

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/game/entry/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            gameId: Number(media.id),
            status: listStatus,
            startDate: startDate
              ? Math.floor(startDate.getTime() / 1000)
              : undefined,
            endDate: finishDate
              ? Math.floor(finishDate.getTime() / 1000)
              : undefined,
            score: score ? Number(score) : undefined,
            progress: hours ? Number(hours) : undefined,
            notes: notes || undefined,
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
        `${process.env.NEXT_PUBLIC_API_URL}/list/game/entry/${media.id}`,
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
        setHours("");
        setNotes("");
        setStartDate(undefined);
        setFinishDate(undefined);
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
    <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/60 text-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground shadow-2xl rounded-2xl">
      <DialogTitle className="sr-only">
        {hasListEntry ? "Edit Game Entry" : "Add Game to List"}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Update your status, hours played, score, and notes for this game.
      </DialogDescription>

      {/* Banner header */}
      <div className="relative h-40 w-full bg-zinc-900/40">
        {media.bannerImage && (
          <img
            src={media.bannerImage}
            alt="banner"
            className="w-full h-full object-cover opacity-55"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        
        {/* Cover image overlayed */}
        <div className="absolute bottom-4 left-6 flex items-end gap-4">
          <div className="w-16 h-24 rounded-lg overflow-hidden border border-zinc-850 shadow-md bg-zinc-900">
            <img
              src={media.coverImage?.large}
              alt={media.title?.romaji}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="mb-2 max-w-sm sm:max-w-md">
            <h2 className="font-bold text-lg text-white line-clamp-1 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {media.title?.english || media.title?.romaji}
            </h2>
            <p className="text-xs text-zinc-400 font-semibold tracking-wider uppercase mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Game
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh] no-scrollbar">
        {/* Row 1: Status & Favorite */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Status
            </Label>
            <Select value={listStatus} onValueChange={setListStatus}>
              <SelectTrigger className="w-full bg-background border-border text-foreground hover:bg-accent/50 rounded-xl h-10 px-3 text-sm focus:ring-1 focus:ring-primary/30">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl text-foreground">
                <SelectItem value="PLAYING">Playing</SelectItem>
                <SelectItem value="PLANNING">Plan to Play</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="DROPPED">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmittingFavorite}
              onClick={handleToggleFavorite}
              className={cn(
                "flex-1 h-10 gap-2 font-semibold text-sm rounded-xl border transition-all cursor-pointer",
                isFavorited
                  ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                  : "bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Heart className={cn("w-4 h-4", isFavorited && "fill-red-400 text-red-400")} />
              {isFavorited ? "Favorited" : "Favorite"}
            </Button>
          </div>
        </div>

        {/* Row 2: Score & Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Score (0 - 100)
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="1-100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="bg-background border-border hover:border-border/80 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl h-10 px-3"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Hours Played
            </Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="bg-background border-border hover:border-border/80 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl h-10 px-3"
            />
          </div>
        </div>

        {/* Row 3: Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Start Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background border-border text-foreground h-10 rounded-xl hover:bg-accent/40 text-sm",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                  {startDate ? format(startDate, "yyyy-MM-dd") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 bg-popover border-border z-60">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="bg-zinc-950 border border-zinc-800 rounded-xl text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Finish Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background border-border text-foreground h-10 rounded-xl hover:bg-accent/40 text-sm",
                    !finishDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                  {finishDate ? format(finishDate, "yyyy-MM-dd") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 bg-popover border-border z-60">
                <Calendar
                  mode="single"
                  selected={finishDate}
                  onSelect={setFinishDate}
                  initialFocus
                  className="bg-zinc-950 border border-zinc-800 rounded-xl text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Row 4: Notes */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Notes
          </Label>
          <Textarea
            rows={3}
            placeholder="Write thoughts, reviews, or private notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background border-border hover:border-border/80 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl p-3 resize-none"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-zinc-800/60 bg-zinc-950/40 px-6 py-4 flex justify-between items-center rounded-b-2xl">
        <div>
          {hasListEntry && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl h-10 px-4 font-semibold text-sm cursor-pointer"
                >
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-950 border border-zinc-800 text-foreground rounded-2xl shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will remove the entry from your list and delete all hours tracked, score, and notes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-zinc-800 text-foreground hover:bg-accent rounded-xl cursor-pointer">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl cursor-pointer"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl h-10 px-4 font-semibold text-sm cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl h-10 px-5 font-bold text-sm cursor-pointer"
          >
            Save
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {dialogContent}
    </Dialog>
  );
}
