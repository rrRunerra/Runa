"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import { motion, useMotionValue } from "framer-motion";
import * as Lucide from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";

interface RrMediaEntry {
  id: string;
  title: string;
  image: string;
  status: string;
  format?: string;
  score?: number;
  mediaStatus?: string;
}

interface RrMediaRouletteProps {
  username: string;
  mediaType: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  baseUrl: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: boolean;
  autoSpin?: boolean;
}

type RouletteStage = "idle" | "spinning" | "finished";

const CARD_WIDTH = 96; // w-24 is 96px
const GAP = 16; // gap-4 is 16px
const STEP = CARD_WIDTH + GAP;
const WIN_INDEX = 40; // The 41st card in the reel is the winner

export function RrMediaRoulette({
  username,
  mediaType,
  baseUrl,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  triggerButton = true,
  autoSpin = false,
}: RrMediaRouletteProps): React.JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (openVal: boolean) => {
    if (controlledOnOpenChange) {
      controlledOnOpenChange(openVal);
    } else {
      setInternalOpen(openVal);
    }
  };

  const [activeMediaType, setActiveMediaType] = useState(mediaType);
  const hasAutoSpun = useRef(false);

  // Sync activeMediaType with mediaType prop when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveMediaType(mediaType);
      hasAutoSpun.current = false;
    }
  }, [isOpen, mediaType]);

  const dynamicBaseUrl = useMemo(() => {
    let typePath: string;

    switch (activeMediaType) {
      case "anime":
        typePath = "anime";
        break;
      case "manga":
        typePath = "manga";
        break;
      case "tv":
        typePath = "tv";
        break;
      case "movie":
        typePath = "movies";
        break;
      case "game":
        typePath = "games";
        break;
      case "book":
        typePath = "books";
        break;
      default:
        typePath = mediaType;
        break;
    }
    return `/aquila/user/${username}/${typePath}`;
  }, [username, activeMediaType]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RrMediaEntry[]>([]);
  const [stage, setStage] = useState<RouletteStage>("idle");

  // Reel states
  const [reelItems, setReelItems] = useState<RrMediaEntry[]>([]);
  const [winningItem, setWinningItem] = useState<RrMediaEntry | null>(null);

  // Dynamic centering measurement
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Easing coordinate control
  const x = useMotionValue(0);
  const [targetX, setTargetX] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [seenIds, setSeenIds] = useState<string[]>([]);

  // Fetch planning items when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setStage("idle");
      setWinningItem(null);
      setReelItems([]);
      setSpinCount(0);
      setSeenIds([]);
      x.set(0);
      return;
    }

    setLoading(true);
    const headers: HeadersInit = {};
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    // Query status = Planning. Limit set to 150 items.
    const queryParams = new URLSearchParams({
      limit: "150",
      status: "Planning",
    });

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/list/${activeMediaType}/user/${username}?${queryParams}`,
      { headers },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch planned items");
        return res.json();
      })
      .then((data) => {
        const entries = (data?.entries || []).filter((item: RrMediaEntry) => {
          if (!item.mediaStatus) return true;
          const normalized = item.mediaStatus
            .toUpperCase()
            .replace(/[\s_]+/g, "");
          return normalized !== "NOTYETRELEASED";
        });
        setItems(entries);
      })
      .catch((err) => console.error("Roulette fetch error:", err))
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, username, activeMediaType, session?.accessToken, x]);

  // Adjust container width measurement when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = (): void => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // Delay slightly to ensure dialog is rendered and dimensions are stable
    const timer = setTimeout(handleResize, 150);

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const handleSpin = useCallback((): void => {
    if (items.length === 0 || stage === "spinning") return;

    // Filter candidates to avoid repeat selections
    const candidates = items.filter((item) => !seenIds.includes(item.id));
    const finalCandidates = candidates.length > 0 ? candidates : items;

    // Pick a random winner
    const winner =
      finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
    setWinningItem(winner);

    // Track chosen winner ID in seenIds
    setSeenIds((prev) => {
      const nextSeen = [...prev, winner.id];
      if (nextSeen.length >= items.length) {
        return [winner.id]; // Reset if all items have been shown
      }
      return nextSeen;
    });

    // Create a reel of concatenated shuffles to make a long spinning strip
    const newReel: RrMediaEntry[] = Array.from({ length: 60 }, (_, idx) => {
      if (idx === WIN_INDEX) return winner;
      // Populate others with random items from planned list
      return items[Math.floor(Math.random() * items.length)];
    });

    setReelItems(newReel);
    setStage("spinning");
    setSpinCount((prev) => prev + 1);
    x.set(0);

    // Calculate centering offset
    // Target position aligns winner in the exact center of container
    const baseTarget = -(
      WIN_INDEX * STEP +
      CARD_WIDTH / 2 -
      containerWidth / 2
    );
    // Slight random offset (within 60% of card size) so pointer lands at slightly different spots
    const randomOffset = (Math.random() - 0.5) * (CARD_WIDTH * 0.6);
    const finalX = baseTarget + randomOffset;
    setTargetX(finalX);
  }, [items, stage, seenIds, containerWidth, x]);

  // Handle automatic spin when enabled (e.g. from Spotlight Search)
  useEffect(() => {
    if (
      autoSpin &&
      isOpen &&
      items.length > 0 &&
      stage === "idle" &&
      containerWidth > 0
    ) {
      handleSpin();
    }
  }, [autoSpin, isOpen, items, stage, containerWidth, handleSpin]);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton && (
        <DialogTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center size-8 rounded-lg transition-all cursor-pointer text-muted-foreground hover:bg-muted/30 hover:text-foreground border border-border/20 bg-muted/10 shadow-sm"
            title="Spin Roulette"
          >
            <Lucide.Shuffle size={16} />
          </motion.button>
        </DialogTrigger>
      )}

      <DialogContent className="w-full max-w-md sm:max-w-lg bg-card/95 border border-border/50 backdrop-blur-xl shadow-2xl p-6 rounded-2xl select-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Lucide.Dices className="size-5 text-primary animate-pulse" />
            <span>
              Planned{" "}
              {activeMediaType.charAt(0).toUpperCase() +
                activeMediaType.slice(1)}{" "}
              Roulette
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Spin the roulette to randomly choose a planned media entry from your
            list.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Lucide.Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-xs">Loading planned entries...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Lucide.Sparkles className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                Your planned list is empty
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Add some items to your "Planning" list first, then return here
                to spin!
              </p>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 mt-2 w-full min-w-0">
            {/* Roulette Spinning Box */}
            <div
              ref={containerRef}
              className="relative h-36 w-full min-w-0 bg-muted/15 border border-border/30 rounded-2xl overflow-hidden flex items-center shadow-inner"
            >
              {/* Proper vertical selection line */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-primary/85 shadow-[0_0_10px_var(--color-primary)] z-25 pointer-events-none" />

              {/* Side fades to mask overflow bounds */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-linear-to-r from-card to-transparent z-20 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-linear-to-l from-card to-transparent z-20 pointer-events-none" />

              {/* Scrolling row */}
              <motion.div
                key={spinCount}
                style={{ x }}
                initial={{ x: 0 }}
                animate={
                  stage === "spinning" || stage === "finished"
                    ? { x: targetX }
                    : { x: 0 }
                }
                transition={{
                  duration: 5,
                  ease: [0.05, 0.85, 0.1, 1],
                }}
                onAnimationComplete={(): void => {
                  if (stage === "spinning") {
                    setStage("finished");
                  }
                }}
                className="flex items-center gap-4 pl-4 shrink-0"
              >
                {stage === "idle"
                  ? // Pre-spin layout showing first few planning covers
                    items.slice(0, 10).map((item) => (
                      <div
                        key={`preview-${item.id}`}
                        className="shrink-0 w-24 h-28 rounded-lg overflow-hidden border border-border/30 bg-muted/20 relative shadow-sm opacity-60"
                      >
                        {item.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                        )}
                      </div>
                    ))
                  : // Interactive spinning reel items
                    reelItems.map((item, idx) => (
                      <div
                        key={`reel-${idx}`}
                        className={`shrink-0 w-24 h-28 rounded-lg overflow-hidden border relative shadow-md transition-all duration-300 ${
                          stage === "finished" && idx === WIN_INDEX
                            ? "border-primary scale-105 shadow-[0_0_12px_var(--color-primary)] ring-2 ring-primary/40"
                            : "border-border/30 opacity-70"
                        }`}
                      >
                        {item.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                        )}
                      </div>
                    ))}
              </motion.div>
            </div>

            {/* Results / Action Panel */}
            <div className="flex flex-col items-center text-center min-h-[96px] justify-center gap-4">
              {stage === "idle" && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    You have{" "}
                    <span className="font-semibold text-foreground">
                      {items.length}
                    </span>{" "}
                    planned entries ready to choose from.
                  </p>
                  <Button
                    onClick={handleSpin}
                    className="w-full max-w-[200px] font-semibold bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl shadow-lg shadow-primary/20"
                    size="default"
                  >
                    Spin the Wheel!
                  </Button>
                </div>
              )}

              {stage === "spinning" && (
                <div className="flex flex-col items-center gap-1.5 animate-pulse">
                  <p className="text-xs font-medium text-primary">
                    Spinning planned items...
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    What will it be?
                  </p>
                </div>
              )}

              {stage === "finished" && winningItem && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 w-full"
                >
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-primary mb-1 block">
                      Roulette Pick!
                    </span>
                    <h4 className="font-bold text-sm text-foreground line-clamp-1 max-w-sm px-2">
                      {winningItem.title}
                    </h4>
                    {winningItem.format && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium">
                        {winningItem.format}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full max-w-xs">
                    <Button
                      onClick={() => {
                        setIsOpen(false);
                        router.push(`${dynamicBaseUrl}/${winningItem.id}`);
                      }}
                      className="flex-1 font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="sm"
                    >
                      <Lucide.ExternalLink className="size-4 mr-1.5" />
                      Open Media
                    </Button>
                    <Button
                      onClick={handleSpin}
                      variant="outline"
                      className="flex-1 font-semibold rounded-xl"
                      size="sm"
                    >
                      <Lucide.RefreshCw className="size-4 mr-1.5" />
                      Spin Again
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
