"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { raDecToScreen, distance } from "@/lib/coordinates";
import type { Constellation } from "@/types/constellation";
import type { Star } from "@/types/star";
import { StarMapControls } from "./StarMapControls";
import { StarIcon } from "@/components/icons/StarIcon";

import React from "react";
import { rrApps } from "@/config/rrApps";
import { StarConstellationModal } from "./StarConstellationModal";

// Box-Muller transform for generating standard normally distributed values (mean 0, variance 1)
function randomNormal(mean = 0, stdDev = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const randStdNormal =
    Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  return mean + stdDev * randStdNormal;
}

export interface StarMapHandle {
  navigateToConstellation: (constellationName: string) => void;
}

export interface ActiveTransferFile {
  name: string;
  size: number;
  progress: number;
  status: string;
}

export interface ActiveTransfer {
  batchId: string;
  constellationId: string;
  direction?: "send" | "receive";
  files: ActiveTransferFile[];
}

export interface MeteorPosition {
  x: number;
  y: number;
  color: string;
  batchId: string;
  fileIndex: number;
}

interface StarMapProps {
  width?: number;
  height?: number;
  numOfStars?: number;
  className?: string;
  constellations?: Constellation[];
  children?: React.ReactNode;
  effects?: React.ReactNode;
  onMapClick?: (ra: number, dec: number) => void;
  onSelectConstellation?: (constellation: Constellation | null) => void;
  onConstellationClick?: (
    constellation: Constellation,
    event: React.MouseEvent,
  ) => void;
  customControls?: React.ReactNode;
  defaultZoom?: number;
  activeTransfers?: ActiveTransfer[];
  onMeteorPositions?: (positions: MeteorPosition[]) => void;
}

export const StarMap = forwardRef<StarMapHandle, StarMapProps>(
  (
    {
      width = 1200,
      height = 600,
      numOfStars = 25000,
      className = "",
      constellations = [],
      children,
      effects,
      onMapClick,
      onSelectConstellation,
      onConstellationClick,
      customControls,
      defaultZoom = 0.8,
      activeTransfers = [],
      onMeteorPositions,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Stores screen cursor position for reactive star repulsion physics
    const mousePosRef = useRef<{ x: number; y: number } | null>(null);
    // Stores the screen-space head position of each active meteor, keyed by batchId-fileIndex.
    // Written in the draw loop and read by the parent via the onMeteorPositions callback.
    const meteorPositionsRef = useRef<MeteorPosition[]>([]);

    // State declarations moved to top to fix scope issues
    const [offset, setOffset] = useState({ x: width / 2, y: height / 2 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredConstellation, setHoveredConstellation] =
      useState<Constellation | null>(null);
    const [selectedConstellation, setSelectedConstellation] =
      useState<Constellation | null>(null);
    const [showCompass, setShowCompass] = useState(false);
    const [zoom, setZoom] = useState(defaultZoom); // Zoom level, default custom or 0.8
    const BASE_SCALE = 30;
    const animationRef = useRef<number | null>(null);

    const navigateToConstellation = useCallback(
      (constellationName: string) => {
        const constellation = constellations.find(
          (c) => c.name === constellationName,
        );
        if (!constellation) return;

        const currentScale = BASE_SCALE * zoom;
        let avgX = 0;
        let avgY = 0;
        constellation.stars.forEach((star: Star) => {
          const pos = raDecToScreen(
            star.ra,
            star.dec,
            width / 2,
            height / 2,
            currentScale,
          );
          avgX += pos.x;
          avgY += pos.y;
        });
        avgX /= constellation.stars.length;
        avgY /= constellation.stars.length;

        const targetX = width / 2 - avgX + width / 2;
        const targetY = height / 2 - avgY + height / 2;

        const startX = offset.x;
        const startY = offset.y;
        const duration = 1500;
        const startTime = performance.now();

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }

        const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased =
            progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          const newX = startX + (targetX - startX) * eased;
          const newY = startY + (targetY - startY) * eased;

          setOffset({ x: newX, y: newY });

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      },
      [constellations, width, height, zoom, offset.x, offset.y],
    );

    useEffect(() => {
      const handleNavigateEvent = (e: Event) => {
        const customEvent = e as CustomEvent<{
          constellationName?: string;
          constellationId?: string;
        }>;
        const name = customEvent.detail?.constellationName;
        const id = customEvent.detail?.constellationId;

        const matched = constellations.find(
          (c) =>
            (name && c.name.toLowerCase() === name.toLowerCase()) ||
            (id && c.id.toLowerCase() === id.toLowerCase()),
        );
        if (matched) {
          navigateToConstellation(matched.name);
        }
      };
      window.addEventListener("runa-star-map-navigate", handleNavigateEvent);
      return () => {
        window.removeEventListener(
          "runa-star-map-navigate",
          handleNavigateEvent,
        );
      };
    }, [navigateToConstellation, constellations]);

    useImperativeHandle(ref, () => ({ navigateToConstellation }), [
      navigateToConstellation,
    ]);

    const [nearestConstellation, setNearestConstellation] = useState<{
      name: string;
      angle: number;
      distance: number;
      screenPos: { x: number; y: number };
      isOnScreen: boolean;
    } | null>(null);

    // Generate random background stars with organic clustering & celestial galaxy distribution
    interface BackgroundStar {
      ra: number;
      dec: number;
      size: number;
      opacity: number;
      type: "circle" | "glow" | "cross";
      color: string;
      twinkleSpeed: number;
      twinklePhase: number;
      dispX: number;
      dispY: number;
    }

    const backgroundStars = useRef<BackgroundStar[]>([]);
    const targetStarCount = Math.max(numOfStars, 45000);

    if (backgroundStars.current.length === 0) {
      const STAR_COLORS = [
        "#ffffff",
        "#ffffff",
        "#ffffff",
        "#ffffff",
        ...rrApps.map((app) => app.color),
      ];

      const numClusters = 50;
      const clusters = Array.from({ length: numClusters }, () => ({
        ra: Math.random() * 64 - 20,
        dec: Math.random() * 370 - 185,
        radiusRa: Math.random() * 8 + 3,
        radiusDec: Math.random() * 45 + 15,
      }));

      backgroundStars.current = Array.from({ length: targetStarCount }, () => {
        let ra: number, dec: number;
        const randMode = Math.random();

        if (randMode < 0.4) {
          // 40% uniform distribution across celestial sphere
          ra = Math.random() * 68 - 22;
          dec = Math.random() * 390 - 195;
        } else if (randMode < 0.8) {
          // 40% along Galactic Plane curve
          ra = Math.random() * 68 - 22;
          const bandCenterDec =
            35 * Math.sin(ra * 0.12) + (Math.random() * 20 - 10);
          dec = randomNormal(bandCenterDec, 28);
        } else {
          // 20% clustered around star formation nebulae
          const cluster = clusters[Math.floor(Math.random() * clusters.length)];
          ra = randomNormal(cluster.ra, cluster.radiusRa * 0.5);
          dec = randomNormal(cluster.dec, cluster.radiusDec * 0.5);
        }

        // Clamp RA & Dec to outer limits
        if (dec < -195) dec = -195;
        if (dec > 195) dec = 195;
        if (ra < -22) ra = -22;
        if (ra > 46) ra = 46;

        // Determine Star Visual Type & Scale
        const typeRoll = Math.random();
        let type: "circle" | "glow" | "cross" = "circle";
        let size = 1.0;

        if (typeRoll > 0.94) {
          // 6% Major cross/flare landmark stars
          type = "cross";
          size = Math.random() * 2.8 + 2.6;
        } else if (typeRoll > 0.82) {
          // 12% Glowing halo stars
          type = "glow";
          size = Math.random() * 1.6 + 1.8;
        } else {
          // 82% Crisp standard stars
          type = "circle";
          size = Math.random() * 1.3 + 0.95;
        }

        const opacity = Math.random() * 0.55 + 0.35;
        const color =
          STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        const twinkleSpeed = Math.random() * 0.003 + 0.001;
        const twinklePhase = Math.random() * Math.PI * 2;

        return {
          ra,
          dec,
          size,
          opacity,
          type,
          color,
          twinkleSpeed,
          twinklePhase,
          dispX: 0,
          dispY: 0,
        };
      });
    }

    // Helper to draw a star shape
    const drawStar = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      star: BackgroundStar,
      zoom: number,
      time: number,
    ) => {
      // Dynamic twinkle pulse based on star position and time
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
      const alpha = Math.min(
        1,
        Math.max(0.18, star.opacity * (0.8 + 0.28 * twinkle)),
      );
      const size = Math.max(0.9, star.size * zoom);

      if (star.type === "cross") {
        ctx.save();
        ctx.globalAlpha = alpha;

        // 1. Soft outer radial glow
        const glowRadius = size * 2.6;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        grad.addColorStop(0, star.color);
        grad.addColorStop(0.35, star.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. 4-point cross diffraction spikes
        ctx.strokeStyle = star.color;
        ctx.lineWidth = Math.max(0.75, 1.2 * zoom);
        ctx.beginPath();
        ctx.moveTo(x - size * 2.2, y);
        ctx.lineTo(x + size * 2.2, y);
        ctx.moveTo(x, y - size * 2.2);
        ctx.lineTo(x, y + size * 2.2);
        ctx.stroke();

        // 3. Bright core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else if (star.type === "glow") {
        ctx.save();
        ctx.globalAlpha = alpha;

        // Soft halo
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.7, 0, Math.PI * 2);
        ctx.fill();

        // Core star
        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else {
        // Standard circle star
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    // Animation state for constellations
    const [tick, setTick] = useState(0);
    const intensitiesRef = useRef<Record<string, number>>({});
    const lastUpdateRef = useRef<number>(0);
    const hoverPointRef = useRef<{ x: number; y: number } | null>(null);
    const animatedProgressesRef = useRef<Record<string, number>>({});
    // Refs that mirror hover/selection state so the animation loop can read
    // them without the loop needing to restart on every hover change.
    const hoveredConstellationRef = useRef<Constellation | null>(null);
    const selectedConstellationRef = useRef<Constellation | null>(null);

    // Keep the hover/selection refs in sync with state
    useEffect(() => {
      hoveredConstellationRef.current = hoveredConstellation;
    }, [hoveredConstellation]);
    useEffect(() => {
      selectedConstellationRef.current = selectedConstellation;
    }, [selectedConstellation]);

    // Animation Loop
    useEffect(() => {
      let animationFrame: number;

      const animate = (time: number) => {
        const delta = lastUpdateRef.current ? time - lastUpdateRef.current : 0;
        lastUpdateRef.current = time;

        // Smoothly interpolate progress for each concurrent transfer file to prevent choppy jumping animations
        if (activeTransfers && activeTransfers.length > 0) {
          activeTransfers.forEach((t) => {
            t.files.forEach((f, idx) => {
              const key = `${t.batchId}-${idx}`;
              const targetProgress = f.progress;
              const currentProgress = animatedProgressesRef.current[key] ?? 0;

              if (currentProgress < targetProgress) {
                const diff = targetProgress - currentProgress;
                // Move faster when far, but slow down when near, using frame-delta timing
                const step = Math.max(0.1, diff * 0.15) * (delta / 16.6);
                animatedProgressesRef.current[key] = Math.min(
                  targetProgress,
                  currentProgress + step,
                );
              } else if (currentProgress > targetProgress) {
                // Snap if progress resets or decreases
                animatedProgressesRef.current[key] = targetProgress;
              }
            });
          });
        }

        let hasChanged = false;

        // We want the total animation to feel "slow" (e.g. 500ms total for a small constellation)
        // So the master intensity will move slower.
        const masterStep = delta / 1200; // Slowed down from 400

        constellations.forEach((c) => {
          const current = intensitiesRef.current[c.name] || 0;
          const isHovered = hoveredConstellationRef.current?.name === c.name;
          const isSelected = selectedConstellationRef.current?.name === c.name;

          // Check if this node is involved in any active transfers
          const transferringForThisNode = activeTransfers?.filter(
            (t) =>
              (t.direction === "send" && t.constellationId === c.id) ||
              (t.direction === "receive" && c.id === "self"),
          );
          const isTransferringThis =
            transferringForThisNode && transferringForThisNode.length > 0;

          // Get average progress for the target intensity
          let avgProgress = 0;
          if (transferringForThisNode && transferringForThisNode.length > 0) {
            const total = transferringForThisNode.reduce((sum, t) => {
              const fileSum = t.files.reduce((fs, f) => fs + f.progress, 0);
              return sum + fileSum / t.files.length;
            }, 0);
            avgProgress = total / transferringForThisNode.length;
          }
          const target =
            isHovered || isSelected
              ? 1
              : isTransferringThis
                ? avgProgress / 100
                : 0;

          if (current !== target) {
            if (target > current) {
              intensitiesRef.current[c.name] = Math.min(
                target,
                current + masterStep,
              );
            } else {
              intensitiesRef.current[c.name] = Math.max(
                target,
                current - masterStep,
              );
            }
            hasChanged = true;
          }
        });

        const isMouseActive = !!mousePosRef.current;
        const hasDisplacedStars = backgroundStars.current.some(
          (s) => Math.abs(s.dispX) > 0.02 || Math.abs(s.dispY) > 0.02,
        );

        if (
          hasChanged ||
          isMouseActive ||
          hasDisplacedStars ||
          (activeTransfers && activeTransfers.length > 0)
        ) {
          setTick((t) => t + 1);
        }
        animationFrame = requestAnimationFrame(animate);
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }, [constellations, activeTransfers]);

    // Draw the star map
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Reset ALL canvas state to baseline before every frame
      // This prevents shadowBlur / shadowColor / globalAlpha / lineDash
      // from leaking between frames when panning during a transfer.
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";

      // Clear canvas with deep space black background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      const currentScale = BASE_SCALE * zoom;
      const timeNow = performance.now();

      // Cosmic background nebula glow along the galactic plane for atmospheric depth
      const galacticClouds = [
        { ra: 5, dec: 10, radius: 240, color: "rgba(30, 27, 75, 0.22)" },
        { ra: 25, dec: 5, radius: 280, color: "rgba(14, 165, 233, 0.10)" },
        { ra: -4, dec: 80, radius: 260, color: "rgba(88, 28, 135, 0.16)" },
        { ra: 8, dec: -15, radius: 250, color: "rgba(6, 182, 212, 0.12)" },
        { ra: -14, dec: 150, radius: 270, color: "rgba(79, 70, 229, 0.14)" },
      ];

      galacticClouds.forEach((cloud) => {
        const pos = raDecToScreen(
          cloud.ra,
          cloud.dec,
          offset.x,
          offset.y,
          currentScale,
        );
        const rPx = cloud.radius * zoom;
        if (
          pos.x < -rPx ||
          pos.x > width + rPx ||
          pos.y < -rPx ||
          pos.y > height + rPx
        )
          return;

        const grad = ctx.createRadialGradient(
          pos.x,
          pos.y,
          0,
          pos.x,
          pos.y,
          rPx,
        );
        grad.addColorStop(0, cloud.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, rPx, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw background stars with reactive cursor repulsion physics
      const mouse = mousePosRef.current;
      const repelRadius = 140 * zoom;
      const maxForce = 32 * zoom;

      backgroundStars.current.forEach((star) => {
        const basePos = raDecToScreen(
          star.ra,
          star.dec,
          offset.x,
          offset.y,
          currentScale,
        );

        // Simple optimization: don't draw if far off screen
        if (
          basePos.x < -60 ||
          basePos.x > width + 60 ||
          basePos.y < -60 ||
          basePos.y > height + 60
        ) {
          star.dispX = 0;
          star.dispY = 0;
          return;
        }

        // Compute repulsion force from cursor position
        let targetDispX = 0;
        let targetDispY = 0;

        if (mouse) {
          const dx = basePos.x - mouse.x;
          const dy = basePos.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < repelRadius * repelRadius && distSq > 0.1) {
            const dist = Math.sqrt(distSq);
            // Smooth non-linear falloff (stronger near center, soft edge)
            const factor = Math.pow(1 - dist / repelRadius, 1.8);
            targetDispX = (dx / dist) * factor * maxForce;
            targetDispY = (dy / dist) * factor * maxForce;
          }
        }

        // Smooth elastic spring physics towards target displacement
        star.dispX += (targetDispX - star.dispX) * 0.18;
        star.dispY += (targetDispY - star.dispY) * 0.18;

        const finalX = basePos.x + star.dispX;
        const finalY = basePos.y + star.dispY;

        drawStar(ctx, finalX, finalY, star, zoom, timeNow);
      });

      // Draw celestial coordinate grid (if showCompass is true)
      if (showCompass) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1 * zoom;
        ctx.setLineDash([4, 6]);
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.font = `${Math.max(9, 10 * zoom)}px monospace`;

        const currentScale = BASE_SCALE * zoom;

        // Draw Declination (horizontal) lines
        const decSteps = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
        decSteps.forEach((dec) => {
          const y = -dec * currentScale + offset.y;
          // Only draw if within canvas vertical bounds
          if (y >= 0 && y <= height) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Label
            ctx.fillText(`Dec ${dec >= 0 ? "+" : ""}${dec}°`, 12, y - 4);
          }
        });

        // Draw Right Ascension (vertical) lines
        const raSteps = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
        raSteps.forEach((ra) => {
          const x = ra * 15 * currentScale + offset.x;
          // Only draw if within canvas horizontal bounds
          if (x >= 0 && x <= width) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Label
            ctx.fillText(`RA ${ra}h`, x + 4, height - 12);
          }
        });

        ctx.restore();
      }

      // Draw constellations
      constellations.forEach((constellation: Constellation) => {
        const currentScale = BASE_SCALE * zoom;
        const masterIntensity = intensitiesRef.current[constellation.name] || 0;
        const isHovered = hoveredConstellation?.name === constellation.name;

        // Convert star positions to screen coordinates
        const screenStars = constellation.stars.map((star: Star) =>
          raDecToScreen(star.ra, star.dec, offset.x, offset.y, currentScale),
        );

        // Pre-calculate distances from hover point to each connection midpoint for staggered animation
        const connectionDistances = constellation.connections.map(
          ([start, end]) => {
            const p1 = screenStars[start];
            const p2 = screenStars[end];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            return hoverPointRef.current
              ? distance({ x: midX, y: midY }, hoverPointRef.current)
              : 0;
          },
        );

        const maxDist = Math.max(...connectionDistances, 1);
        const minDist = Math.min(...connectionDistances);

        // 2. Draw constellation lines with sequential animation starting from cursor
        constellation.connections.forEach(([start, end], index) => {
          const dist = connectionDistances[index];

          // Normalize distance to 0..1 range within the constellation
          const distRatio = (dist - minDist) / (maxDist - minDist || 1);

          // Line starts appearing based on its relative distance from the hover point
          const startThreshold = distRatio * 0.7; // Earlier start
          const lineIntensity = Math.max(
            0,
            Math.min(1, (masterIntensity - startThreshold) * 4), // Set to 4 to ensure all lines fill in fully when masterIntensity reaches 1
          );

          // Always draw this line — skipping it entirely causes connectors to disappear
          // at startup (masterIntensity=0 means lineIntensity=0, and the old guard
          // `lineIntensity > 0 || !isHovered` would skip non-hovered constellations at idle).
          {
            const p1 = screenStars[start];
            const p2 = screenStars[end];

            // Determine fill direction from hover point
            let startPoint = p1;
            let targetPoint = p2;
            if (hoverPointRef.current) {
              const d1 = distance(p1, hoverPointRef.current);
              const d2 = distance(p2, hoverPointRef.current);
              if (d2 < d1) {
                startPoint = p2;
                targetPoint = p1;
              }
            }

            // Animated fill endpoint
            const currentLineIntensity = isHovered ? lineIntensity : 1;
            const endPoint = {
              x:
                startPoint.x +
                (targetPoint.x - startPoint.x) * currentLineIntensity,
              y:
                startPoint.y +
                (targetPoint.y - startPoint.y) * currentLineIntensity,
            };

            // A. Base/faint line — always visible at 0.45; dims to 0.2 when being hovered
            //    (the glow fill animates on top, so dimming makes room for it)
            const prevGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = isHovered ? 0.2 : 0.45;
            ctx.strokeStyle = constellation.connectionColor || "#ffffff";
            ctx.lineWidth = 1.2 * zoom;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = prevGlobalAlpha;

            // B. Glow & animated fill — only when there is intensity to show
            if (lineIntensity > 0) {
              ctx.save();

              ctx.shadowBlur = 15 * lineIntensity * zoom;
              ctx.shadowColor =
                constellation.connectionColor || "rgba(255, 255, 255, 0.4)";
              ctx.globalAlpha = lineIntensity * 0.25;
              ctx.strokeStyle = constellation.connectionColor || "#ffffff";
              ctx.lineWidth = (2 + 4 * lineIntensity) * zoom;
              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();

              ctx.shadowBlur = 0;
              ctx.shadowColor = "transparent";
              ctx.globalAlpha = lineIntensity * 0.9;
              ctx.strokeStyle = constellation.connectionColor || "#ffffff";
              ctx.lineWidth = (1 + 1.2 * lineIntensity) * zoom;
              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();

              ctx.restore();
            }
          }
        });

        // Draw progress ring if there is an active transfer for this constellation
        const nodeTransfers =
          activeTransfers?.filter(
            (t) =>
              (t.direction === "send" &&
                t.constellationId === constellation.id) ||
              (t.direction === "receive" && constellation.id === "self"),
          ) || [];

        if (nodeTransfers.length > 0) {
          let sumRa = 0;
          let sumDec = 0;
          constellation.stars.forEach((s) => {
            sumRa += s.ra;
            sumDec += s.dec;
          });
          const avgRa = sumRa / constellation.stars.length;
          const avgDec = sumDec / constellation.stars.length;

          const centerPos = raDecToScreen(
            avgRa,
            avgDec,
            offset.x,
            offset.y,
            currentScale,
          );

          // 1. Dashed track
          const prevGlobalAlpha = ctx.globalAlpha;
          ctx.globalAlpha = 0.15;
          ctx.beginPath();
          ctx.arc(centerPos.x, centerPos.y, 50 * zoom, 0, 2 * Math.PI);
          ctx.strokeStyle = constellation.starColor || "#10b981";
          ctx.lineWidth = 2 * zoom;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // 2. Active arc (average of all active transfers on this node)
          const totalProgress = nodeTransfers.reduce(
            (acc, t) =>
              acc +
              t.files.reduce((sum, f) => sum + f.progress, 0) / t.files.length,
            0,
          );
          const progressPct = totalProgress / nodeTransfers.length / 100;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(
            centerPos.x,
            centerPos.y,
            50 * zoom,
            -Math.PI / 2,
            -Math.PI / 2 + 2 * Math.PI * progressPct,
          );
          ctx.strokeStyle = constellation.starColor || "#10b981";
          ctx.lineWidth = 3.5 * zoom;
          ctx.lineCap = "round";
          ctx.stroke();
          ctx.lineCap = "butt";
          ctx.globalAlpha = prevGlobalAlpha;
        }
      });

      // Reset state after constellation loop before drawing transfer paths
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
      ctx.lineCap = "butt";

      // Draw flying stars for active transfers (Falling meteors!)
      if (activeTransfers && activeTransfers.length > 0) {
        activeTransfers.forEach((tTransfer) => {
          const isSending = tTransfer.direction === "send";
          const peerId = tTransfer.constellationId;

          const senderConst = constellations.find(
            (c) => c.id === (isSending ? "self" : peerId),
          );
          const receiverConst = constellations.find(
            (c) => c.id === (isSending ? peerId : "self"),
          );

          if (senderConst && receiverConst) {
            const currentScale = BASE_SCALE * zoom;

            // Helper to get average constellation center
            const getCenter = (c: Constellation) => {
              let sumRa = 0;
              let sumDec = 0;
              c.stars.forEach((s) => {
                sumRa += s.ra;
                sumDec += s.dec;
              });
              return raDecToScreen(
                sumRa / c.stars.length,
                sumDec / c.stars.length,
                offset.x,
                offset.y,
                currentScale,
              );
            };

            const P_sender = getCenter(senderConst);
            const P_receiver = getCenter(receiverConst);

            // Draw a Bezier curve and meteor comet for EACH file in this transfer!
            tTransfer.files.forEach((file, fileIndex) => {
              const channelKey = `${tTransfer.batchId}-${fileIndex}`;

              // 1. Compute a UNIQUE Bezier curve for each file index!
              // We can offset the control point based on fileIndex so they form unique curved paths
              const midX = (P_sender.x + P_receiver.x) / 2;
              const midY = (P_sender.y + P_receiver.y) / 2;
              const dx = P_receiver.x - P_sender.x;
              const dy = P_receiver.y - P_sender.y;

              // We fan out the curves: fileIndex 0, 1, 2, ...
              // offsetFactor goes: 0.15, -0.15, 0.3, -0.3, 0.45, -0.45...
              const offsetFactor =
                (fileIndex % 2 === 0 ? 1 : -1) *
                (0.12 + Math.floor(fileIndex / 2) * 0.08);
              const nx = -dy * offsetFactor;
              const ny = dx * offsetFactor;
              const P_control = { x: midX + nx, y: midY + ny };

              // 2. Draw the faint dotted path for this curve
              const prevGlobalAlpha = ctx.globalAlpha;
              ctx.globalAlpha = 0.08;
              ctx.lineWidth = 1.0 * zoom;
              ctx.strokeStyle =
                receiverConst.connectionColor || "rgba(255, 255, 255, 0.4)";
              ctx.setLineDash([3, 6]);
              ctx.beginPath();
              ctx.moveTo(P_sender.x, P_sender.y);
              ctx.quadraticCurveTo(
                P_control.x,
                P_control.y,
                P_receiver.x,
                P_receiver.y,
              );
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.globalAlpha = prevGlobalAlpha;

              // 3. Draw falling meteor comet!
              const progress = animatedProgressesRef.current[channelKey] ?? 0;
              const tVal = progress / 100;

              if (tVal > 0 && tVal < 1) {
                // Compute head position (step 0 = head)
                const headX =
                  (1 - tVal) * (1 - tVal) * P_sender.x +
                  2 * (1 - tVal) * tVal * P_control.x +
                  tVal * tVal * P_receiver.x;
                const headY =
                  (1 - tVal) * (1 - tVal) * P_sender.y +
                  2 * (1 - tVal) * tVal * P_control.y +
                  tVal * tVal * P_receiver.y;

                // Record position so parent can render a following card
                meteorPositionsRef.current.push({
                  x: headX,
                  y: headY,
                  color: receiverConst.starColor || "#00f0ff",
                  batchId: tTransfer.batchId,
                  fileIndex,
                });

                // Main comet drawing with meteor effect
                // Draw a beautiful tapered tail along the Bezier curve
                const trailLength = 22; // Longer tail
                for (let step = 0; step < trailLength; step++) {
                  const factor = step / trailLength; // 0 at head, 1 at tail end
                  // Sample points behind the current tVal
                  const trailT = Math.max(0, tVal - step * 0.007);

                  const ttx =
                    (1 - trailT) * (1 - trailT) * P_sender.x +
                    2 * (1 - trailT) * trailT * P_control.x +
                    trailT * trailT * P_receiver.x;
                  const tty =
                    (1 - trailT) * (1 - trailT) * P_sender.y +
                    2 * (1 - trailT) * trailT * P_control.y +
                    trailT * trailT * P_receiver.y;

                  const trailSize = Math.max(0.5, 10 * (1 - factor) * zoom);
                  const trailOpacity = 0.85 * Math.pow(1 - factor, 1.6);

                  // Meteor color: white core at head, fading to cyan/blue or matching constellation hue
                  if (step === 0) {
                    ctx.fillStyle = "#ffffff";
                    // Draw outer glow for head
                    ctx.globalAlpha = 0.4;
                    ctx.beginPath();
                    ctx.arc(ttx, tty, trailSize * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                  } else {
                    ctx.fillStyle = receiverConst.starColor || "#00f0ff";
                  }

                  ctx.globalAlpha = trailOpacity;
                  ctx.beginPath();
                  ctx.arc(ttx, tty, trailSize * 0.5, 0, Math.PI * 2);
                  ctx.fill();
                }
              } else if (tVal === 1) {
                // Completed star orbiting the receiver
                const angle =
                  (fileIndex * 2 * Math.PI) / tTransfer.files.length +
                  tick / 70;
                const radius = 35 * zoom;
                const rx = P_receiver.x + radius * Math.cos(angle);
                const ry = P_receiver.y + radius * Math.sin(angle);

                ctx.fillStyle = receiverConst.starColor || "#ffffff";
                ctx.globalAlpha = 0.85;
                ctx.beginPath();
                ctx.arc(rx, ry, 2.5 * zoom, 0, Math.PI * 2);
                ctx.fill();
              } else {
                // Pending star orbiting the sender
                const angle =
                  (fileIndex * 2 * Math.PI) / tTransfer.files.length +
                  tick / 150;
                const radius = 35 * zoom;
                const sx = P_sender.x + radius * Math.cos(angle);
                const sy = P_sender.y + radius * Math.sin(angle);

                ctx.fillStyle = senderConst.starColor || "#ffffff";
                ctx.globalAlpha = 0.35;
                ctx.beginPath();
                ctx.arc(sx, sy, 2 * zoom, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          }
        });
        // Reset state after all transfer drawing
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        ctx.setLineDash([]);

        // Notify parent with all collected meteor positions this frame
        if (onMeteorPositions) {
          onMeteorPositions(meteorPositionsRef.current);
        }
        // Reset for next frame
        meteorPositionsRef.current = [];
      }
    }, [
      offset,
      tick,
      width,
      height,
      zoom,
      constellations,
      hoveredConstellation,
      activeTransfers,
    ]);

    // Calculate nearest constellation for compass
    useEffect(() => {
      if (!showCompass) return;

      const centerX = width / 2;
      const centerY = height / 2;
      const currentScale = BASE_SCALE * zoom;

      let minDist = Infinity;
      let nearest: Constellation | null = null;
      let nearestPos = { x: 0, y: 0 };

      constellations.forEach((constellation: Constellation) => {
        // Calculate average position of constellation stars
        let avgX = 0;
        let avgY = 0;
        constellation.stars.forEach((star: Star) => {
          const pos = raDecToScreen(
            star.ra,
            star.dec,
            offset.x,
            offset.y,
            currentScale,
          );
          avgX += pos.x;
          avgY += pos.y;
        });
        avgX /= constellation.stars.length;
        avgY /= constellation.stars.length;

        const dist = distance({ x: centerX, y: centerY }, { x: avgX, y: avgY });
        if (dist < minDist) {
          minDist = dist;
          nearest = constellation;
          nearestPos = { x: avgX, y: avgY };
        }
      });

      if (nearest) {
        const angle = Math.atan2(
          nearestPos.y - centerY,
          nearestPos.x - centerX,
        );

        // Check if on screen (with some margin)
        const margin = 100;
        const isOnScreen =
          nearestPos.x >= margin &&
          nearestPos.x <= width - margin &&
          nearestPos.y >= margin &&
          nearestPos.y <= height - margin;

        setNearestConstellation({
          name: (nearest as Constellation).name,
          angle: angle,
          distance: minDist,
          screenPos: nearestPos,
          isOnScreen: isOnScreen,
        });
      }
    }, [offset, width, height, showCompass, zoom, constellations]);

    // Mouse/touch event handlers
    const dragStartRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const hasMovedRef = useRef(false);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      dragStartRef.current = {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      };
      setIsDragging(true); // For cursor style

      // Add global listeners
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        mousePosRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }

      if (!isDraggingRef.current) return;

      // Calculate new offset
      let newX = e.clientX - dragStartRef.current.x;
      let newY = e.clientY - dragStartRef.current.y;

      // Check if moved significantly
      if (!hasMovedRef.current) {
        const dx = e.clientX - (dragStartRef.current.x + offset.x);
        const dy = e.clientY - (dragStartRef.current.y + offset.y);
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          // Threshold for "moved"
          hasMovedRef.current = true;
        }
      }

      // Strict Boundaries
      const currentScale = BASE_SCALE * zoom;
      const minRA = -18;
      const maxRA = 42;
      const minDec = -180;
      const maxDec = 180;

      const minRaPx = minRA * 15 * currentScale;
      const maxRaPx = maxRA * 15 * currentScale;
      const minDecPx = -maxDec * currentScale; // Y is inverted
      const maxDecPx = -minDec * currentScale;

      const maxOffsetX = -minRaPx;
      const minOffsetX = width - maxRaPx;
      const maxOffsetY = -minDecPx;
      const minOffsetY = height - maxDecPx;

      newX = Math.max(minOffsetX, Math.min(maxOffsetX, newX));
      newY = Math.max(minOffsetY, Math.min(maxOffsetY, newY));

      setOffset({ x: newX, y: newY });
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      isDraggingRef.current = false;
      setIsDragging(false);
      mousePosRef.current = null;
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };

    const pinchStartDistRef = useRef(0);
    const pinchStartZoomRef = useRef(0);
    const isPinchingRef = useRef(false);

    const getTouchDistance = (
      t1: { clientX: number; clientY: number },
      t2: { clientX: number; clientY: number },
    ): number => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2) {
        // Pinch-to-zoom start
        isPinchingRef.current = true;
        isDraggingRef.current = false;
        pinchStartDistRef.current = getTouchDistance(
          e.touches[0],
          e.touches[1],
        );
        pinchStartZoomRef.current = zoom;

        window.addEventListener("touchmove", handleWindowTouchMove, {
          passive: false,
        });
        window.addEventListener("touchend", handleWindowTouchEnd);
        return;
      }

      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      isPinchingRef.current = false;
      dragStartRef.current = {
        x: touch.clientX - offset.x,
        y: touch.clientY - offset.y,
      };
      setIsDragging(true);

      window.addEventListener("touchmove", handleWindowTouchMove, {
        passive: false,
      });
      window.addEventListener("touchend", handleWindowTouchEnd);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      // Prevent browser gestures like scrolling the whole page when panning starmap
      e.preventDefault();

      // Pinch-to-zoom
      if (isPinchingRef.current && e.touches.length === 2) {
        const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
        const scaleFactor = currentDist / pinchStartDistRef.current;
        const newZoom = Math.max(
          0.5,
          Math.min(2, pinchStartZoomRef.current * scaleFactor),
        );

        if (newZoom !== zoom) {
          // Zoom towards center of the two fingers
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const centerX =
              (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const centerY =
              (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

            const currentScale = BASE_SCALE * zoom;
            const worldX = (centerX - offset.x) / currentScale;
            const worldY = (centerY - offset.y) / currentScale;

            const newScale = BASE_SCALE * newZoom;
            let newOffsetX = centerX - worldX * newScale;
            let newOffsetY = centerY - worldY * newScale;

            // Apply boundaries
            const minRA = -18;
            const maxRA = 42;
            const minDec = -180;
            const maxDec = 180;

            const minRaPx = minRA * 15 * newScale;
            const maxRaPx = maxRA * 15 * newScale;
            const minDecPx = -maxDec * newScale;
            const maxDecPx = -minDec * newScale;

            newOffsetX = Math.max(
              width - maxRaPx,
              Math.min(-minRaPx, newOffsetX),
            );
            newOffsetY = Math.max(
              height - maxDecPx,
              Math.min(-minDecPx, newOffsetY),
            );

            setZoom(newZoom);
            setOffset({ x: newOffsetX, y: newOffsetY });
          }
        }
        return;
      }

      // Single-finger pan
      if (!isDraggingRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      let newX = touch.clientX - dragStartRef.current.x;
      let newY = touch.clientY - dragStartRef.current.y;

      if (!hasMovedRef.current) {
        const dx = touch.clientX - (dragStartRef.current.x + offset.x);
        const dy = touch.clientY - (dragStartRef.current.y + offset.y);
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          hasMovedRef.current = true;
        }
      }

      const currentScale = BASE_SCALE * zoom;
      const minRA = -18;
      const maxRA = 42;
      const minDec = -180;
      const maxDec = 180;

      const minRaPx = minRA * 15 * currentScale;
      const maxRaPx = maxRA * 15 * currentScale;
      const minDecPx = -maxDec * currentScale;
      const maxDecPx = -minDec * currentScale;

      const maxOffsetX = -minRaPx;
      const minOffsetX = width - maxRaPx;
      const maxOffsetY = -minDecPx;
      const minOffsetY = height - maxDecPx;

      newX = Math.max(minOffsetX, Math.min(maxOffsetX, newX));
      newY = Math.max(minOffsetY, Math.min(maxOffsetY, newY));

      setOffset({ x: newX, y: newY });
    };

    const handleWindowTouchEnd = () => {
      isDraggingRef.current = false;
      isPinchingRef.current = false;
      setIsDragging(false);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowTouchEnd);
    };

    // Handle Zoom
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newZoom = Math.max(0.5, Math.min(2, zoom + delta)); // Limit zoom 0.1x to 2x

      if (newZoom !== zoom) {
        // Zoom towards mouse pointer
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate world position of mouse before zoom
        // Screen = World * Scale + Offset
        // World = (Screen - Offset) / Scale
        const currentScale = BASE_SCALE * zoom;
        const worldX = (mouseX - offset.x) / currentScale;
        const worldY = (mouseY - offset.y) / currentScale;

        // Calculate new offset to keep world position under mouse
        // NewOffset = Screen - World * NewScale
        const newScale = BASE_SCALE * newZoom;
        let newOffsetX = mouseX - worldX * newScale;
        let newOffsetY = mouseY - worldY * newScale;

        // Apply boundaries to new offset
        const minRA = -18;
        const maxRA = 42;
        const minDec = -180;
        const maxDec = 180;

        const minRaPx = minRA * 15 * newScale;
        const maxRaPx = maxRA * 15 * newScale;
        const minDecPx = -maxDec * newScale;
        const maxDecPx = -minDec * newScale;

        const maxOffsetXBound = -minRaPx;
        const minOffsetXBound = width - maxRaPx;
        const maxOffsetYBound = -minDecPx;
        const minOffsetYBound = height - maxDecPx;

        newOffsetX = Math.max(
          minOffsetXBound,
          Math.min(maxOffsetXBound, newOffsetX),
        );
        newOffsetY = Math.max(
          minOffsetYBound,
          Math.min(maxOffsetYBound, newOffsetY),
        );

        setZoom(newZoom);
        setOffset({ x: newOffsetX, y: newOffsetY });
      }
    };

    // We need to handle hover separately since we moved drag to window
    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      mousePosRef.current = { x: mouseX, y: mouseY };

      if (isDraggingRef.current) return;

      const currentScale = BASE_SCALE * zoom;

      // Helper for point to line segment distance
      const distanceToSegment = (
        p: { x: number; y: number },
        v: { x: number; y: number },
        w: { x: number; y: number },
      ) => {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return distance(p, v);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return distance(p, {
          x: v.x + t * (w.x - v.x),
          y: v.y + t * (w.y - v.y),
        });
      };

      let found = false;
      for (const constellation of constellations) {
        const screenStars = constellation.stars.map((star: Star) =>
          raDecToScreen(star.ra, star.dec, offset.x, offset.y, currentScale),
        );

        // Check stars
        for (const pos of screenStars) {
          if (distance({ x: mouseX, y: mouseY }, pos) < 30) {
            if (
              !hoveredConstellation ||
              hoveredConstellation.name !== constellation.name
            ) {
              hoverPointRef.current = { x: mouseX, y: mouseY };
            }
            setHoveredConstellation(constellation);
            found = true;
            break;
          }
        }
        if (found) break;

        // Check connections
        for (const [start, end] of constellation.connections) {
          const p1 = screenStars[start];
          const p2 = screenStars[end];
          if (distanceToSegment({ x: mouseX, y: mouseY }, p1, p2) < 15) {
            // 15px threshold for lines
            if (
              !hoveredConstellation ||
              hoveredConstellation.name !== constellation.name
            ) {
              hoverPointRef.current = { x: mouseX, y: mouseY };
            }
            setHoveredConstellation(constellation);
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        setHoveredConstellation(null);
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Only trigger if we haven't moved (clicked)
      if (!hasMovedRef.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const currentScale = BASE_SCALE * zoom;

        const ra = (mouseX - offset.x) / (15 * currentScale);
        const dec = -(mouseY - offset.y) / currentScale;

        if (onMapClick) {
          onMapClick(ra, dec);
        } else {
          if (hoveredConstellation) {
            if (onConstellationClick) {
              onConstellationClick(hoveredConstellation, e);
            } else if (e.ctrlKey || e.metaKey) {
              window.location.href = hoveredConstellation.redirect;
            } else {
              setSelectedConstellation(hoveredConstellation);
              if (onSelectConstellation) {
                onSelectConstellation(hoveredConstellation);
              }
            }
          } else {
            setSelectedConstellation(null);
            if (onSelectConstellation) {
              onSelectConstellation(null);
            }
          }
        }
      }
    };

    return (
      <div className={`relative overflow-hidden select-none ${className}`}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`touch-none ${
            hoveredConstellation
              ? "cursor-pointer"
              : isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => {
            mousePosRef.current = null;
          }}
          onClick={handleClick}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
        />

        {/* Constellation Star Layer (React Icons for extra flair) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {constellations.map((constellation) => {
            const currentScale = BASE_SCALE * zoom;
            const masterIntensity =
              intensitiesRef.current[constellation.name] || 0;
            const blinkIntensity = (Math.sin(tick / 10) + 1) / 2; // Approximate sync with canvas animation

            return constellation.stars.map((star, index) => {
              const pos = raDecToScreen(
                star.ra,
                star.dec,
                offset.x,
                offset.y,
                currentScale,
              );

              // Optimization: Don't render if off screen
              if (
                pos.x < -50 ||
                pos.x > width + 50 ||
                pos.y < -50 ||
                pos.y > height + 50
              ) {
                return null;
              }

              const starSize = Math.max(8, (32 - star.magnitude * 2) * zoom);
              const intensity =
                masterIntensity > 0 ? 0.8 + blinkIntensity * 0.2 : 1;

              // Generate stable random rotation based on star coordinates
              const rotation = (star.ra * 1000 + star.dec * 1000) % 360;

              return (
                <div
                  key={`${constellation.name}-${index}`}
                  className="absolute transition-transform duration-75"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  }}
                >
                  <StarIcon
                    size={starSize}
                    intensity={masterIntensity * intensity}
                    showFlare={starSize > 12 * zoom}
                    showGlow={masterIntensity > 0}
                    color={constellation.starColor}
                    className={constellation.starColor ? "" : "text-white"}
                  />
                </div>
              );
            });
          })}
          {/* World Space Children (move and scale with stars) */}
          <div
            className="absolute"
            style={{
              left: offset.x,
              top: offset.y,
              transformOrigin: "0 0",
            }}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
              }}
            >
              {children}
            </div>
          </div>
        </div>

        {/* Screen Space Overlay */}
        {effects}

        {/* Controls */}
        {customControls !== undefined ? (
          customControls
        ) : (
          <StarMapControls
            onReset={() => {
              setOffset({ x: width / 2, y: height / 2 });
              setZoom(defaultZoom);
            }}
            showCompass={showCompass}
            onToggleCompass={() => setShowCompass(!showCompass)}
          />
        )}

        {/* Waypoint Indicator (Multi-Constellation HUD) */}
        {showCompass &&
          constellations.map((constellation) => {
            const currentScale = BASE_SCALE * zoom;
            let avgX = 0;
            let avgY = 0;
            constellation.stars.forEach((star: Star) => {
              const pos = raDecToScreen(
                star.ra,
                star.dec,
                offset.x,
                offset.y,
                currentScale,
              );
              avgX += pos.x;
              avgY += pos.y;
            });
            avgX /= constellation.stars.length;
            avgY /= constellation.stars.length;

            const padding = 80;
            const isOnScreen =
              avgX >= padding &&
              avgX <= width - padding &&
              avgY >= padding &&
              avgY <= height - padding;

            if (isOnScreen) {
              return (
                <div
                  key={`onscreen-beacon-${constellation.id}`}
                  className="absolute pointer-events-none transition-all duration-300 font-mono"
                  style={{
                    left: avgX,
                    top: avgY - 45,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="relative flex flex-col items-center">
                    <div className="bg-card/65 backdrop-blur-xl border border-border/40 rounded-xl px-2.5 py-1 shadow-lg flex items-center gap-1.5">
                      <div
                        className="size-1.5 rounded-full animate-ping"
                        style={{
                          backgroundColor:
                            constellation.starColor || "var(--primary)",
                        }}
                      />
                      <span className="text-[11px] font-bold text-foreground tracking-wide whitespace-nowrap">
                        {constellation.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // Off-screen indicator
            const cx = width / 2;
            const cy = height / 2;
            const dx = avgX - cx;
            const dy = avgY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist === 0) return null;

            const ux = dx / dist;
            const uy = dy / dist;
            const margin = 50;
            const edgeX = width / 2 - margin;
            const edgeY = height / 2 - margin;

            let t = Infinity;
            if (ux !== 0) {
              const tx = (ux > 0 ? edgeX : -edgeX) / ux;
              if (tx > 0) t = Math.min(t, tx);
            }
            if (uy !== 0) {
              const ty = (uy > 0 ? edgeY : -edgeY) / uy;
              if (ty > 0) t = Math.min(t, ty);
            }

            const borderX = cx + t * ux;
            const borderY = cy + t * uy;
            const angle = Math.atan2(dy, dx);
            const accentColor =
              constellation.starColor ||
              constellation.connectionColor ||
              "#8b5cf6";

            return (
              <div
                key={`offscreen-beacon-${constellation.id}`}
                className="absolute z-30 group select-none pointer-events-auto"
                style={{
                  left: borderX,
                  top: borderY,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Clickable Badge Trigger */}
                <button
                  onClick={() => navigateToConstellation(constellation.name)}
                  className="relative flex items-center justify-center size-9 rounded-full bg-card/85 border border-border shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-md cursor-pointer hover:border-foreground/30"
                  style={{
                    boxShadow: `0 0 12px ${accentColor}22`,
                  }}
                  title={`Navigate to ${constellation.name}`}
                >
                  {/* Arrow pointing to constellation */}
                  <div
                    className="absolute"
                    style={{
                      transform: `rotate(${angle * (180 / Math.PI) + 90}deg) translateY(-14px)`,
                    }}
                  >
                    <div
                      className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-[6px]"
                      style={{ borderBottomColor: accentColor }}
                    />
                  </div>

                  {/* Character representation */}
                  <span
                    className="text-[11px] font-extrabold uppercase"
                    style={{ color: accentColor }}
                  >
                    {constellation.name.slice(0, 1)}
                  </span>
                </button>

                {/* Hover Details Card */}
                <div
                  className="absolute hidden group-hover:flex flex-col items-center pointer-events-none z-40 transition-all duration-300"
                  style={{
                    left: borderX < width / 2 ? "120%" : "auto",
                    right: borderX >= width / 2 ? "120%" : "auto",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  <div className="bg-card/90 backdrop-blur-xl border border-border/80 rounded-xl p-3 shadow-2xl min-w-37.5 max-w-50 flex flex-col gap-1 select-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-1">
                      <span className="text-foreground font-extrabold text-xs truncate">
                        {constellation.name}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                        {Math.round(dist / 10)} units
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[10px] line-clamp-2 leading-relaxed">
                      {constellation.description || "Reference constellation"}
                    </p>
                    <span className="text-primary text-[8px] font-bold uppercase tracking-wider mt-1 text-right">
                      Click to pan
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Project Popup */}
        <StarConstellationModal
          constellation={selectedConstellation}
          onClose={() => setSelectedConstellation(null)}
        />
      </div>
    );
  },
);
