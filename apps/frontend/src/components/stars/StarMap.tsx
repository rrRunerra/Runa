"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import Image from "next/image";
import { raDecToScreen, distance } from "@/lib/coordinates";
import type { Constellation } from "@/types/constellation";
import type { Star } from "@/types/star";
import { StarMapControls } from "./StarMapControls";
import {
  StarCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/stars/StarCard";
import { StarIcon } from "@/components/icons/StarIcon";
import Link from "next/link";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

export interface StarMapHandle {
  navigateToConstellation: (constellationName: string) => void;
}

interface StarMapProps {
  width?: number;
  height?: number;
  numOfStars?: number;
  className?: string;
  constellations?: Constellation[];
  children?: React.ReactNode;
  effects?: React.ReactNode;
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
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State declarations moved to top to fix scope issues
    const [offset, setOffset] = useState({ x: width / 2, y: height / 2 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredConstellation, setHoveredConstellation] =
      useState<Constellation | null>(null);
    const [selectedConstellation, setSelectedConstellation] =
      useState<Constellation | null>(null);
    const [showCompass, setShowCompass] = useState(false);
    const [zoom, setZoom] = useState(0.8); // Zoom level, default 1
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
      [constellations, width, height, zoom],
    );

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

    // Generate random background stars - adjusted for aesthetic balance
    const backgroundStars = useRef(
      Array.from({ length: numOfStars }, () => ({
        ra: Math.random() * 60 - 18,
        dec: Math.random() * 360 - 180,
        size:
          Math.random() > 0.98
            ? Math.random() * 2 + 2
            : Math.random() * 1.5 + 0.5, // Mostly small stars, few large ones
        opacity: Math.random() * 0.7 + 0.1, // More subtle opacity
        type: Math.random() > 0.9 ? "cross" : "circle", // Mostly circles, some crosses
      })),
    );

    // Helper to draw a star shape
    const drawStar = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      opacity: number,
      type: string = "circle",
    ) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

      if (type === "cross") {
        // Draw diamond/star shape
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.quadraticCurveTo(x + size * 0.1, y - size * 0.1, x + size, y);
        ctx.quadraticCurveTo(x + size * 0.1, y + size * 0.1, x, y + size);
        ctx.quadraticCurveTo(x - size * 0.1, y + size * 0.1, x - size, y);
        ctx.quadraticCurveTo(x - size * 0.1, y - size * 0.1, x, y - size);
        ctx.fill();
        // Add extra glow for cross stars
        if (size > 2) {
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.4})`;
          ctx.beginPath();
          ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Simple circle for most stars
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Animation state for constellations
    const [tick, setTick] = useState(0);
    const intensitiesRef = useRef<Record<string, number>>({});
    const lastUpdateRef = useRef<number>(0);
    const hoverPointRef = useRef<{ x: number; y: number } | null>(null);

    // Animation Loop
    useEffect(() => {
      let animationFrame: number;

      const animate = (time: number) => {
        const delta = lastUpdateRef.current ? time - lastUpdateRef.current : 0;
        lastUpdateRef.current = time;

        let hasChanged = false;
        const step = delta / 200; // Complete light-up/fade in ~200ms increments (per line logic)

        // We want the total animation to feel "slow" (e.g. 500ms total for a small constellation)
        // So the master intensity will move slower.
        const masterStep = delta / 1200; // Slowed down from 400

        constellations.forEach((c) => {
          const current = intensitiesRef.current[c.name] || 0;
          const isHovered = hoveredConstellation?.name === c.name;
          const isSelected = selectedConstellation?.name === c.name;
          const target = isHovered || isSelected ? 1 : 0;

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

        if (hasChanged) {
          setTick((t) => t + 1);
        }
        animationFrame = requestAnimationFrame(animate);
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }, [constellations, hoveredConstellation, selectedConstellation]);

    // Draw the star map
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas with dark blue background
      ctx.fillStyle = "#020205"; // Deep dark blue/black
      ctx.fillRect(0, 0, width, height);

      // Draw background stars
      backgroundStars.current.forEach((star) => {
        const currentScale = BASE_SCALE * zoom;
        const pos = raDecToScreen(
          star.ra,
          star.dec,
          offset.x,
          offset.y,
          currentScale,
        );

        // Simple optimization: don't draw if far off screen
        if (
          pos.x < -50 ||
          pos.x > width + 50 ||
          pos.y < -50 ||
          pos.y > height + 50
        )
          return;

        drawStar(ctx, pos.x, pos.y, star.size * zoom, star.opacity, star.type);
      });

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
            Math.min(1, (masterIntensity - startThreshold) * 3), // More gradual (3 instead of 5)
          );

          if (lineIntensity > 0 || !isHovered) {
            // Calculate start and end points for the fluid fill
            const p1 = screenStars[start];
            const p2 = screenStars[end];

            // Determine which point is closer to the hover point to decide "fill" direction
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

            // Interpolated point for fluid fill animation
            const currentLineIntensity = isHovered ? lineIntensity : 1;
            const endPoint = {
              x:
                startPoint.x +
                (targetPoint.x - startPoint.x) * currentLineIntensity,
              y:
                startPoint.y +
                (targetPoint.y - startPoint.y) * currentLineIntensity,
            };

            // A. Draw base/faint line (full length)
            ctx.strokeStyle = `rgba(255, 255, 255, ${isHovered ? 0.05 : 0.1})`;
            ctx.lineWidth = 1 * zoom;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // B. Draw Glow & Highlighted "Filling" line
            if (lineIntensity > 0) {
              // Draw multiple glow layers for a richer effect
              const coreColor = `rgba(255, 255, 255, ${lineIntensity * 0.9})`;

              // Outer soft glow
              ctx.shadowBlur = 15 * lineIntensity * zoom;
              ctx.shadowColor = "rgba(255, 255, 255, 0.4)";

              ctx.strokeStyle = `rgba(255, 255, 255, ${lineIntensity * 0.25})`;
              ctx.lineWidth = (2 + 4 * lineIntensity) * zoom;
              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();

              // Core bright line
              ctx.shadowBlur = 0; // Reset for core
              ctx.strokeStyle = coreColor;
              ctx.lineWidth = (1 + 1.2 * lineIntensity) * zoom;
              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();
            }
          }
        });

        // 3. Stars are rendered via React layer using StarIcon
      });
    }, [
      offset,
      tick,
      width,
      height,
      zoom,
      constellations,
      hoveredConstellation,
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
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
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
      if (isDraggingRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
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

    const handleClick = (e: React.MouseEvent) => {
      // Only trigger if we haven't moved (clicked)
      if (!hasMovedRef.current) {
        if (hoveredConstellation) {
          setSelectedConstellation(hoveredConstellation);
        } else {
          setSelectedConstellation(null);
        }
      }
    };

    return (
      <div className={`relative overflow-hidden select-none ${className}`}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`${
            hoveredConstellation
              ? "cursor-pointer"
              : isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onClick={handleClick}
          onWheel={handleWheel}
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
                    className="text-white"
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
        <StarMapControls
          onReset={() => {
            setOffset({ x: width / 2, y: height / 2 });
            setZoom(0.8);
          }}
          showCompass={showCompass}
          onToggleCompass={() => setShowCompass(!showCompass)}
        />

        {/* Waypoint Indicator */}
        {showCompass &&
          nearestConstellation &&
          (nearestConstellation.isOnScreen ? (
            // On-Screen Beacon Mode
            <div
              className="absolute pointer-events-none transition-all duration-300 font-mono"
              style={{
                left: nearestConstellation.screenPos.x,
                top: nearestConstellation.screenPos.y - 60,
                transform: "translate(-50%, -100%)",
              }}
            >
              {/* Holographic Label */}
              <div className="relative flex flex-col items-center">
                {/* Label container: StarCard Mini Style */}
                <div className="relative bg-(--star-card-bg,rgba(0,0,0,0.4)) backdrop-blur-xl border border-(--star-card-border,var(--color-zinc-800)) rounded-xl px-4 py-2 shadow-xl">
                  {/* Text */}
                  <div className="relative">
                    <div className="text-white font-bold text-base tracking-wide text-center whitespace-nowrap">
                      {nearestConstellation.name}
                    </div>
                  </div>
                </div>

                {/* Connecting line */}
                <div className="w-px h-6 bg-linear-to-b from-white/20 to-transparent" />
              </div>
            </div>
          ) : (
            // Off-screen Direction Indicator
            <div
              className="absolute pointer-events-none"
              style={{
                left: width / 2,
                top: height / 2,
                transform: (() => {
                  const dx = Math.cos(nearestConstellation.angle);
                  const dy = Math.sin(nearestConstellation.angle);
                  const padding = 80;
                  const edgeX = width / 2 - padding;
                  const edgeY = height / 2 - padding;

                  let t = Infinity;
                  if (dx !== 0) {
                    const tx = (dx > 0 ? edgeX : -edgeX) / dx;
                    if (tx > 0) t = Math.min(t, tx);
                  }
                  if (dy !== 0) {
                    const ty = (dy > 0 ? edgeY : -edgeY) / dy;
                    if (ty > 0) t = Math.min(t, ty);
                  }

                  return `translate(${t * dx}px, ${
                    t * dy
                  }px) translate(-50%, -50%)`;
                })(),
              }}
            >
              <div className="relative flex flex-col items-center">
                {/* Directional Arrow with glow */}
                <div
                  className="relative"
                  style={{
                    transform: `rotate(${
                      nearestConstellation.angle * (180 / Math.PI) + 90
                    }deg)`,
                  }}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 blur-md">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-10 h-10 text-white/20"
                    >
                      <path
                        d="M12 2L22 22L12 16L2 22L12 2Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  {/* Main arrow */}
                  <svg
                    viewBox="0 0 24 24"
                    className="relative w-10 h-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                  >
                    <path
                      d="M12 2L22 22L12 16L2 22L12 2Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                {/* Info Panel */}
                <div className="absolute top-full mt-3 flex flex-col items-center">
                  <div className="bg-(--star-card-bg,rgba(0,0,0,0.4)) backdrop-blur-xl border border-(--star-card-border,var(--color-zinc-800)) rounded-xl px-3 py-1.5 shadow-xl">
                    <div className="text-white font-bold text-sm whitespace-nowrap tracking-wide">
                      {nearestConstellation.name}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <StarIcon
                        size={20}
                        className="text-white animate-pulse"
                        showFlare={false}
                        showGlow={false}
                      />
                      <span className="text-white/60 text-xs font-mono">
                        {Math.round(nearestConstellation.distance / 10)} units
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* Project Popup */}
        {selectedConstellation && (
          <>
            {/* Backdrop overlay */}
            <div
              className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] cursor-default transition-all duration-300 animate-in fade-in"
              onClick={() => setSelectedConstellation(null)}
            />
            {/* Popup Card */}
            <div
              className="absolute z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2.5rem)] max-w-sm sm:max-w-md cursor-default transition-all duration-300 animate-in fade-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <StarCard className="w-full border-zinc-800 bg-black/60 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(139,92,246,0.15)] hover:border-zinc-700 transition-all duration-500">
                <CardHeader className="flex flex-row justify-between items-center pb-2">
                  <div className="flex items-center gap-3">
                    {selectedConstellation.icon && (
                      <div className="w-10 h-10 relative rounded-full overflow-hidden border border-white/10 bg-black/50">
                        <Image
                          src={selectedConstellation.icon}
                          alt={`${selectedConstellation.name} icon`}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                        {selectedConstellation.name}
                        <StarIcon
                          size={16}
                          className="text-blue-400"
                          showFlare={false}
                        />
                      </CardTitle>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedConstellation(null)}
                    className="text-white/40 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer animate-none"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </CardHeader>

                <CardContent>
                  <CardDescription className="text-zinc-300 mb-4 text-sm leading-relaxed">
                    {selectedConstellation.description}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Link href={selectedConstellation.redirect} className="w-full">
                    <Button className="w-full h-auto py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground font-semibold rounded-lg shadow-[0_4px_12px_rgba(139,92,246,0.3)] transition-all duration-300">
                      Visit
                    </Button>
                  </Link>
                </CardFooter>
              </StarCard>
            </div>
          </>
        )}
      </div>
    );
  },
);
