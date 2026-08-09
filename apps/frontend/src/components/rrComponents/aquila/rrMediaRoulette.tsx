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
import { useTranslation } from "react-i18next";
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
  mediaType: "anime" | "manga" | "tv" | "movie" | "game" | "book" | "music";
  baseUrl: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: boolean;
  autoSpin?: boolean;
}

type RouletteStage = "idle" | "spinning" | "finished";

const CARD_WIDTH = 104; // Slightly wider for dramatic cover visibility
const GAP = 16;
const STEP = CARD_WIDTH + GAP; // 120px per item
const REEL_SIZE = 85; // Large reel for high-speed travel
const WIN_INDEX = 65; // The 66th card in the reel is the winner
const SPIN_DURATION = 8.8; // Extended dramatic duration in seconds

/**
 * Procedural Web Audio synthesizer for zero-dependency sound effects.
 * 100% offline & LAN compatible.
 */
class RouletteSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastTickTime: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.isMuted =
        localStorage.getItem("runa_roulette_sound_muted") === "true";
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("runa_roulette_sound_muted", String(muted));
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private initCtx(): AudioContext | null {
    if (this.isMuted || typeof window === "undefined") return null;
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public playTick(velocityRatio: number = 1): void {
    if (this.isMuted) return;
    const nowMs = Date.now();
    // Throttle clicks to avoid distortion at ultra-high spin velocities
    if (nowMs - this.lastTickTime < 28) return;
    this.lastTickTime = nowMs;

    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch shifts dynamically: higher and crisper when moving fast, deeper and weightier when slow
      const baseFreq = 500 + Math.min(velocityRatio * 700, 900);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.032);

      const vol = 0.2 + Math.min(velocityRatio * 0.15, 0.15);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // Audio fallback safe
    }
  }

  public playWin(): void {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Heavy Bass Drop / Sub-impact on lock-in
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(140, now);
      bassOsc.frequency.exponentialRampToValueAtTime(32, now + 0.55);

      bassGain.gain.setValueAtTime(0.45, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      bassOsc.connect(bassGain);
      bassGain.connect(ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.6);

      // 2. Victorious Fanfare Arpeggio Sparkle (C5 -> E5 -> G5 -> C6)
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteTime = now + 0.05 + idx * 0.075;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.22, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.75);
      });
    } catch {
      // Audio fallback safe
    }
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
}

export function RrMediaRoulette({
  username,
  mediaType,
  baseUrl,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  triggerButton = true,
  autoSpin = false,
}: RrMediaRouletteProps): React.JSX.Element {
  const { t } = useTranslation();
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

  // Sound Engine
  const soundEngineRef = useRef<RouletteSoundEngine | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!soundEngineRef.current) {
      soundEngineRef.current = new RouletteSoundEngine();
      setIsMuted(soundEngineRef.current.getMuted());
    }
  }, []);

  const toggleSound = () => {
    if (soundEngineRef.current) {
      const nextMuted = soundEngineRef.current.toggleMuted();
      setIsMuted(nextMuted);
    }
  };

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
    return `/aquila/${typePath}`;
  }, [activeMediaType, mediaType]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RrMediaEntry[]>([]);
  const [stage, setStage] = useState<RouletteStage>("idle");

  // Reel states
  const [reelItems, setReelItems] = useState<RrMediaEntry[]>([]);
  const [winningItem, setWinningItem] = useState<RrMediaEntry | null>(null);

  // Dynamic centering measurement
  const [containerWidth, setContainerWidth] = useState(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (node !== null) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width =
            entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
          setContainerWidth(width || node.offsetWidth);
        }
      });
      observer.observe(node);
      resizeObserverRef.current = observer;
      setContainerWidth(node.offsetWidth);
    }
  }, []);

  // Needle deflection state & audio sync tracking
  const [needleFlick, setNeedleFlick] = useState(false);
  const flickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastIndexCrossedRef = useRef<number>(-1);
  const prevXRef = useRef<number>(0);

  // Canvas Particle System for Winner Celebration
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  const spawnWinnerCelebration = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width || 400;
    const height = canvas.height || 160;
    const centerX = width / 2;
    const centerY = height / 2;

    const colors = [
      "rgba(255, 215, 0, ",
      "rgba(255, 255, 255, ",
      "rgba(147, 51, 234, ",
      "rgba(59, 130, 246, ",
      "rgba(236, 72, 153, ",
    ];

    const newParticles: Particle[] = [];
    for (let i = 0; i < 55; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6.5;
      newParticles.push({
        x: centerX + (Math.random() - 0.5) * 30,
        y: centerY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 2.5 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.012 + Math.random() * 0.018,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
      });
    }

    particlesRef.current = newParticles;

    const renderLoop = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const p of particlesRef.current) {
        if (p.alpha > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.12; // Gravity
          p.vx *= 0.98; // Friction
          p.rotation += p.vRot;
          p.alpha -= p.decay;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = `${p.color}${Math.max(0, p.alpha)})`;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
          ctx.restore();
        }
      }

      if (alive) {
        animFrameIdRef.current = requestAnimationFrame(renderLoop);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(renderLoop);
  }, []);

  // Motion Coordinate Control
  const x = useMotionValue(0);
  const [targetX, setTargetX] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [seenIds, setSeenIds] = useState<string[]>([]);

  // Synchronize motion value with physical ticker deflection and sound
  useEffect(() => {
    const unsubscribe = x.on("change", (latestX) => {
      if (stage !== "spinning") return;

      // Track card index passing under the center line
      const centerPosition = -latestX + containerWidth / 2 - 16;
      const currentIndex = Math.floor(centerPosition / STEP);

      if (
        currentIndex !== lastIndexCrossedRef.current &&
        currentIndex >= 0 &&
        currentIndex < REEL_SIZE
      ) {
        lastIndexCrossedRef.current = currentIndex;

        // Calculate momentary velocity
        const deltaX = Math.abs(latestX - prevXRef.current);
        const velocityRatio = Math.min(deltaX / 18, 1);

        // Sound tick
        soundEngineRef.current?.playTick(velocityRatio);

        // Physical needle flick
        setNeedleFlick(true);
        if (flickTimeoutRef.current) clearTimeout(flickTimeoutRef.current);
        flickTimeoutRef.current = setTimeout(() => {
          setNeedleFlick(false);
        }, 45);
      }

      prevXRef.current = latestX;
    });

    return () => {
      unsubscribe();
      if (flickTimeoutRef.current) clearTimeout(flickTimeoutRef.current);
    };
  }, [x, stage, containerWidth]);

  // Fetch planning items when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setStage("idle");
      setWinningItem(null);
      setReelItems([]);
      setSpinCount(0);
      setSeenIds([]);
      x.set(0);
      lastIndexCrossedRef.current = -1;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      return;
    }

    setLoading(true);
    const headers: HeadersInit = {};
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    const queryParams = new URLSearchParams({
      limit: "100",
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

    // Create an expanded reel of concatenated shuffles for long spinning
    const newReel: RrMediaEntry[] = Array.from(
      { length: REEL_SIZE },
      (_, idx) => {
        if (idx === WIN_INDEX) return winner;
        return items[Math.floor(Math.random() * items.length)];
      },
    );

    setReelItems(newReel);
    setStage("spinning");
    setSpinCount((prev) => prev + 1);
    lastIndexCrossedRef.current = -1;
    prevXRef.current = 0;
    x.set(0);

    // Target position aligns winner in the exact center of container
    const baseTarget = -(
      WIN_INDEX * STEP +
      CARD_WIDTH / 2 -
      containerWidth / 2 +
      16
    );
    // Slight random offset (within +-25% of card size) so pointer lands at organic points on winner card
    const randomOffset = (Math.random() - 0.5) * (CARD_WIDTH * 0.5);
    const finalX = baseTarget + randomOffset;
    setTargetX(finalX);
  }, [items, stage, seenIds, containerWidth, x]);

  // Handle automatic spin when enabled
  useEffect(() => {
    if (
      autoSpin &&
      isOpen &&
      items.length > 0 &&
      stage === "idle" &&
      containerWidth > 0 &&
      !hasAutoSpun.current
    ) {
      hasAutoSpun.current = true;
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
            title={t("aquila.spinRoulette")}
          >
            <Lucide.Shuffle size={16} />
          </motion.button>
        </DialogTrigger>
      )}

      <DialogContent className="w-full max-w-md sm:max-w-xl bg-card/95 border border-border/50 backdrop-blur-2xl shadow-2xl p-6 rounded-2xl select-none overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border/20">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Lucide.Dices
                className={`size-4.5 ${stage === "spinning" ? "animate-spin" : ""}`}
              />
            </div>
            <span>
              {t("aquila.plannedRouletteTitle", {
                type:
                  activeMediaType.charAt(0).toUpperCase() +
                  activeMediaType.slice(1),
              })}
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("aquila.rouletteDescription")}
          </DialogDescription>

          <button
            type="button"
            onClick={toggleSound}
            className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all cursor-pointer mr-6"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
            aria-label="Toggle Sound"
          >
            {isMuted ? (
              <Lucide.VolumeX className="size-4 opacity-60" />
            ) : (
              <Lucide.Volume2 className="size-4 text-primary" />
            )}
          </button>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
            <Lucide.Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-xs">{t("aquila.loadingPlanned")}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Lucide.Sparkles className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {t("aquila.plannedListEmpty")}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {t("aquila.plannedListEmptyDesc")}
              </p>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              {t("aquila.close")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 mt-2 w-full min-w-0">
            {/* Roulette Spinning Chamber */}
            <div
              ref={containerRef}
              className="relative h-44 w-full min-w-0 bg-muted/15 border border-border/40 rounded-2xl overflow-hidden flex items-center shadow-inner"
            >
              {/* Dynamic Particle Canvas for Winner Lock-In */}
              <canvas
                ref={canvasRef}
                width={containerWidth || 500}
                height={176}
                className="absolute inset-0 z-35 pointer-events-none w-full h-full"
              />

              {/* Ambient Center Glow Beam */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-28 bg-primary/10 blur-xl z-15 pointer-events-none transition-opacity duration-500 ${
                  stage === "spinning"
                    ? "opacity-100"
                    : stage === "finished"
                      ? "opacity-90"
                      : "opacity-30"
                }`}
              />

              {/* Vertical Selection Laser Line */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-linear-to-b from-primary/80 via-primary to-primary/80 shadow-[0_0_12px_var(--color-primary)] z-25 pointer-events-none" />

              {/* Physical Ticker Needle (Top) with flick animation */}
              <motion.div
                animate={
                  needleFlick
                    ? { rotate: -15, y: -2, scale: 1.15 }
                    : { rotate: 0, y: 0, scale: 1 }
                }
                transition={{ type: "spring", stiffness: 600, damping: 18 }}
                className="absolute left-1/2 -translate-x-1/2 top-0 z-30 pointer-events-none text-primary drop-shadow-[0_0_8px_var(--color-primary)]"
              >
                <Lucide.ChevronDown className="size-5 fill-primary stroke-primary -mt-1" />
              </motion.div>

              {/* Bottom Arrow Indicator */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 z-30 pointer-events-none text-primary drop-shadow-[0_0_8px_var(--color-primary)]">
                <Lucide.ChevronUp className="size-5 fill-primary stroke-primary -mb-1" />
              </div>

              {/* Vignette Edge Fades */}
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-card via-card/85 to-transparent z-20 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-card via-card/85 to-transparent z-20 pointer-events-none" />

              {/* Animated Scrolling Reel */}
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
                  duration: SPIN_DURATION,
                  ease: [0.08, 0.9, 0.04, 1.0],
                }}
                onAnimationComplete={(): void => {
                  if (stage === "spinning") {
                    setStage("finished");
                    soundEngineRef.current?.playWin();
                    spawnWinnerCelebration();
                  }
                }}
                className="flex items-center gap-4 pl-4 shrink-0"
              >
                {stage === "idle"
                  ? // Pre-spin preview items
                    items.slice(0, 10).map((item) => (
                      <div
                        key={`preview-${item.id}`}
                        className="shrink-0 w-26 h-34 rounded-xl overflow-hidden border border-border/30 bg-muted/20 relative shadow-sm opacity-60"
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
                    reelItems.map((item, idx) => {
                      const isWinner = idx === WIN_INDEX;
                      const isFinished = stage === "finished";

                      return (
                        <div
                          key={`reel-${idx}`}
                          className={`shrink-0 w-26 h-34 rounded-xl overflow-hidden border relative shadow-md transition-all duration-500 ${
                            isFinished && isWinner
                              ? "border-primary scale-110 shadow-[0_0_24px_var(--color-primary)] ring-3 ring-primary/60 z-20"
                              : isFinished
                                ? "border-border/20 opacity-30 blur-[0.5px] scale-95"
                                : "border-border/30 opacity-75"
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

                          {isFinished && isWinner && (
                            <div className="absolute inset-0 bg-primary/10 pointer-events-none ring-1 ring-inset ring-primary/40 rounded-xl" />
                          )}
                        </div>
                      );
                    })}
              </motion.div>
            </div>

            {/* Results & Interactive Action Panel */}
            <div className="flex flex-col items-center text-center min-h-26.25 justify-center gap-4">
              {stage === "idle" && (
                <div className="flex flex-col items-center gap-2.5">
                  <p className="text-xs text-muted-foreground">
                    {t("aquila.plannedEntriesCount", { count: items.length })}
                  </p>
                  <Button
                    onClick={handleSpin}
                    className="w-full min-w-52.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/25 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                    size="default"
                  >
                    <Lucide.Sparkles className="size-4 mr-2" />
                    {t("aquila.spinTheWheel")}
                  </Button>
                </div>
              )}

              {stage === "spinning" && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Lucide.Sparkles className="size-3.5 animate-spin" />
                    <span>{t("aquila.spinningPlanned")}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground animate-pulse">
                    {t("aquila.whatWillItBe")}
                  </p>
                </div>
              )}

              {stage === "finished" && winningItem && (
                <motion.div
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 24 }}
                  className="flex flex-col items-center gap-4 w-full"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold tracking-wider uppercase text-primary mb-0.5 shadow-xs">
                      <Lucide.Sparkles className="size-3" />
                      <span>{t("aquila.roulettePick")}</span>
                    </div>

                    <h4 className="font-bold text-base text-foreground line-clamp-1 max-w-sm px-2">
                      {winningItem.title}
                    </h4>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {winningItem.format && (
                        <span className="text-[10px] bg-muted/60 border border-border/30 text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                          {winningItem.format}
                        </span>
                      )}
                      {winningItem.score !== undefined &&
                        winningItem.score > 0 && (
                          <span className="text-[10px] bg-primary/15 border border-primary/30 text-primary px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                            <Lucide.Star className="size-2.5 fill-primary" />
                            {winningItem.score}
                          </span>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full max-w-xs">
                    <Button
                      onClick={() => {
                        setIsOpen(false);
                        router.push(`${dynamicBaseUrl}/${winningItem.id}`);
                      }}
                      className="flex-1 font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 cursor-pointer"
                      size="sm"
                    >
                      <Lucide.ExternalLink className="size-4 mr-1.5" />
                      {t("aquila.openMedia")}
                    </Button>
                    <Button
                      onClick={handleSpin}
                      variant="outline"
                      className="flex-1 font-semibold rounded-xl border-border/50 hover:bg-muted/40 cursor-pointer"
                      size="sm"
                    >
                      <Lucide.RefreshCw className="size-4 mr-1.5" />
                      {t("aquila.spinAgain")}
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
