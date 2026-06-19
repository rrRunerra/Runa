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
import { ChevronRight, ArrowUpRight, Bookmark } from "lucide-react";
import { cn, getSafeImageUrl } from "@/lib/utils";
import React from "react";

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
  onMapClick?: (ra: number, dec: number) => void;
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
            Math.min(1, (masterIntensity - startThreshold) * 4), // Set to 4 to ensure all lines fill in fully when masterIntensity reaches 1
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
            const prevGlobalAlpha = ctx.globalAlpha;
            ctx.globalAlpha = isHovered ? 0.05 : 0.1;
            ctx.strokeStyle = constellation.connectionColor || "#ffffff";
            ctx.lineWidth = 1 * zoom;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = prevGlobalAlpha;

            // B. Draw Glow & Highlighted "Filling" line
            if (lineIntensity > 0) {
              // Outer soft glow
              ctx.shadowBlur = 15 * lineIntensity * zoom;
              ctx.shadowColor = constellation.connectionColor || "rgba(255, 255, 255, 0.4)";

              ctx.globalAlpha = lineIntensity * 0.25;
              ctx.strokeStyle = constellation.connectionColor || "#ffffff";
              ctx.lineWidth = (2 + 4 * lineIntensity) * zoom;
              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();

              // Core bright line
              ctx.shadowBlur = 0; // Reset for core
              ctx.globalAlpha = lineIntensity * 0.9;
              ctx.strokeStyle = constellation.connectionColor || "#ffffff";
              ctx.lineWidth = (1 + 1.2 * lineIntensity) * zoom;
              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();
              
              ctx.globalAlpha = prevGlobalAlpha;
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

    const pinchStartDistRef = useRef(0);
    const pinchStartZoomRef = useRef(0);
    const isPinchingRef = useRef(false);

    const getTouchDistance = (t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }): number => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length === 2) {
        // Pinch-to-zoom start
        isPinchingRef.current = true;
        isDraggingRef.current = false;
        pinchStartDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
        pinchStartZoomRef.current = zoom;

        window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
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

      window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
      window.addEventListener("touchend", handleWindowTouchEnd);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      // Prevent browser gestures like scrolling the whole page when panning starmap
      e.preventDefault();

      // Pinch-to-zoom
      if (isPinchingRef.current && e.touches.length === 2) {
        const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
        const scaleFactor = currentDist / pinchStartDistRef.current;
        const newZoom = Math.max(0.5, Math.min(2, pinchStartZoomRef.current * scaleFactor));

        if (newZoom !== zoom) {
          // Zoom towards center of the two fingers
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

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

            newOffsetX = Math.max(width - maxRaPx, Math.min(-minRaPx, newOffsetX));
            newOffsetY = Math.max(height - maxDecPx, Math.min(-minDecPx, newOffsetY));

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
            if (e.ctrlKey || e.metaKey) {
              window.location.href = hoveredConstellation.redirect;
            } else {
              setSelectedConstellation(hoveredConstellation);
            }
          } else {
            setSelectedConstellation(null);
          }
        }
      }
    };

    const pathParts = selectedConstellation ? selectedConstellation.name.split(/\s*>\s*/) : [];
    const hasPath = pathParts.length > 1;
    const displayName = hasPath ? pathParts[pathParts.length - 1] : (selectedConstellation?.name || "");
    const breadcrumbPath = hasPath ? pathParts.slice(0, -1) : [];
    const accentColor = selectedConstellation ? (selectedConstellation.starColor || selectedConstellation.connectionColor || '#8B5CF6') : '#8B5CF6';
    const iconUrl = selectedConstellation ? getSafeImageUrl(selectedConstellation.icon) : "";

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
              <StarCard className="w-full border-zinc-800 bg-black/70 shadow-[0_0_50px_rgba(0,0,0,0.85),0_0_30px_rgba(139,92,246,0.15)] hover:border-zinc-700/80 transition-all duration-500 relative overflow-hidden group">
               

                <CardHeader className="flex flex-row justify-between items-start pb-3 pt-5 z-10 relative">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Glowing Accent Icon Card */}
                    <div 
                      className="w-12 h-12 rounded-xl border flex items-center justify-center relative shrink-0 overflow-hidden bg-zinc-950/80 transition-transform duration-500 group-hover:scale-105"
                      style={{ 
                        borderColor: `${accentColor}33`, 
                        boxShadow: `0 0 20px ${accentColor}1a` 
                      }}
                    >
                      {iconUrl ? (
                        <Image
                          src={iconUrl}
                          alt={`${displayName} icon`}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <Bookmark 
                          className="w-5 h-5" 
                          style={{ 
                            color: accentColor,
                            filter: `drop-shadow(0 0 4px ${accentColor}66)`
                          }} 
                        />
                      )}
                      
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      {breadcrumbPath.length > 0 && (
                        <div className="flex items-center flex-wrap gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1.5">
                          {breadcrumbPath.map((part, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <ChevronRight className="w-2.5 h-2.5 text-zinc-700 shrink-0" />}
                              <span className="truncate max-w-[80px]">{part}</span>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                      <CardTitle className="text-lg font-extrabold text-white tracking-wide flex items-center gap-1.5 leading-snug">
                        <span className="truncate">{displayName}</span>
                        <StarIcon
                          size={14}
                          color={accentColor}
                          showFlare={true}
                          showGlow={false}
                          className="shrink-0"
                        />
                      </CardTitle>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedConstellation(null)}
                    className="text-white/40 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all duration-300 hover:scale-105 shrink-0 cursor-pointer -mt-1 -mr-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
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

                <CardContent className="pb-4 pt-1 z-10 relative">
                  <CardDescription className="text-zinc-300 text-sm leading-relaxed font-normal">
                    {selectedConstellation.description || "No description provided for this constellation."}
                  </CardDescription>
                </CardContent>

                <CardFooter className="pt-2 pb-5 z-10 relative">
                  <Link href={selectedConstellation.redirect} className="w-full">
                    <Button 
                      className="w-full h-11 bg-linear-to-r hover:opacity-95 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn relative overflow-hidden shadow-lg border border-white/10 cursor-pointer"
                      style={{ 
                        backgroundImage: `linear-gradient(135deg, ${accentColor}dd, ${accentColor}88)`,
                        
                      }}
                    >
                      <span>Visit</span>
                      <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
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
