"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ArrowUpRight, Sparkles, Layers } from "lucide-react";
import type { Constellation } from "@/types/constellation";
import { rrApps } from "@/config/rrApps";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarIcon } from "@/components/icons/StarIcon";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface StarConstellationModalProps {
  constellation: Constellation | null;
  onClose: () => void;
}

export function StarConstellationModal({
  constellation,
  onClose,
}: StarConstellationModalProps): React.JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Match corresponding rrApp metadata
  const app = constellation
    ? rrApps.find(
        (a) =>
          a.name.toLowerCase() === constellation.id.toLowerCase() ||
          a.href === constellation.redirect,
      )
    : null;

  const accentColor =
    app?.color ||
    constellation?.starColor ||
    constellation?.connectionColor ||
    "#8B5CF6";

  const iconUrl =
    app?.iconLeftRing ||
    app?.iconLeftNoRing ||
    (constellation ? getSafeImageUrl(constellation.icon) : "");

  // Full card canvas drawing loop for constellation background watermark
  useEffect(() => {
    if (!constellation || !constellation.stars || !constellation.stars.length)
      return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;

    // Calculate bounding box of constellation stars
    let minRa = Infinity,
      maxRa = -Infinity;
    let minDec = Infinity,
      maxDec = -Infinity;

    constellation.stars.forEach((s) => {
      if (s.ra < minRa) minRa = s.ra;
      if (s.ra > maxRa) maxRa = s.ra;
      if (s.dec < minDec) minDec = s.dec;
      if (s.dec > maxDec) maxDec = s.dec;
    });

    const raDegreeSpan = Math.max((maxRa - minRa) * 15, 1);
    const decDegreeSpan = Math.max(maxDec - minDec, 1);

    const centerRaDeg = ((minRa + maxRa) / 2) * 15;
    const centerDec = (minDec + maxDec) / 2;

    const drawPreview = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Deep space gradient card background
      const bgGrad = ctx.createRadialGradient(
        w / 2,
        h / 2,
        0,
        w / 2,
        h / 2,
        Math.max(w, h),
      );
      bgGrad.addColorStop(0, "rgba(15, 17, 35, 0.95)");
      bgGrad.addColorStop(1, "rgba(7, 8, 18, 0.98)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Scale factor to fit constellation nicely as background watermark across full card
      const availW = w * 0.82;
      const availH = h * 0.80;

      const scaleX = availW / raDegreeSpan;
      const scaleY = availH / decDegreeSpan;
      const scale = Math.min(scaleX, scaleY);

      // Convert star RA/Dec to full card background coords
      const points = constellation.stars.map((s) => ({
        x: w / 2 + (s.ra * 15 - centerRaDeg) * scale,
        y: h / 2 - (s.dec - centerDec) * scale,
      }));

      // 1. Draw connecting lines as dynamic watermark
      const pulse = (Math.sin(time * 0.003) + 1) / 2;
      const constellationColor = constellation.connectionColor || accentColor;

      ctx.save();
      ctx.strokeStyle = constellationColor;
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.25 + 0.1 * pulse;

      constellation.connections.forEach(([sIdx, eIdx]) => {
        const p1 = points[sIdx];
        const p2 = points[eIdx];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
      ctx.restore();

      // 2. Draw star nodes as glowing background points
      points.forEach((p, idx) => {
        const twinkle = Math.sin(time * 0.003 + idx) * 0.3 + 0.7;

        // Outer node halo
        ctx.fillStyle = constellationColor;
        ctx.globalAlpha = 0.3 * twinkle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * twinkle, 0, Math.PI * 2);
        ctx.fill();

        // Star core
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.85 * twinkle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });

      animFrame = requestAnimationFrame(drawPreview);
    };

    animFrame = requestAnimationFrame(drawPreview);
    return () => cancelAnimationFrame(animFrame);
  }, [constellation, accentColor]);

  if (!constellation) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2.5rem)] max-w-md select-none transition-all duration-300 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <Card
          className="relative overflow-hidden backdrop-blur-2xl shadow-2xl transition-all duration-300 p-0 border-white/10 bg-slate-950/90"
          style={{
            boxShadow: `0 10px 40px rgba(0,0,0,0.85)`,
            borderColor: `${accentColor}44`,
          }}
        >
          {/* Full Card Constellation Watermark Canvas Background */}
          <canvas
            ref={canvasRef}
            width={500}
            height={320}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Close Button */}
          <div className="absolute top-4 right-4 z-20">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-8 rounded-full bg-black/40 hover:bg-black/80 border border-white/15 text-muted-foreground hover:text-foreground flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Card Header with App Info */}
          <CardHeader className="pt-6 px-6 pb-3 relative z-10">
            <div className="flex items-center gap-4">
              {/* App Icon */}
              <div
                className="relative size-14 rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 bg-background/80 backdrop-blur-md"
                style={{
                  borderColor: `${accentColor}55`,
                }}
              >
                {iconUrl ? (
                  <Image
                    src={iconUrl}
                    alt={`${constellation.name} icon`}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover p-1.5"
                    unoptimized
                  />
                ) : (
                  <Sparkles className="size-7" style={{ color: accentColor }} />
                )}
              </div>

              {/* Title & Category / Stars Metadata */}
              <div className="flex flex-col min-w-0 flex-1 pr-6">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-xl font-extrabold text-foreground tracking-wide truncate">
                    {constellation.name}
                  </CardTitle>
                  <StarIcon
                    size={14}
                    color={accentColor}
                    showFlare={true}
                    showGlow={false}
                    className="shrink-0"
                  />
                </div>

                <div className="flex items-center flex-wrap gap-1.5">
                  {/* Category Badge */}
                  {app?.descriptionShort && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg border-0"
                      style={{
                        backgroundColor: `${accentColor}22`,
                        color: accentColor,
                        border: `1px solid ${accentColor}44`,
                      }}
                    >
                      {app.descriptionShort}
                    </Badge>
                  )}

                  {/* Star Nodes Count Badge */}
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded-lg border-white/10 bg-white/5 flex items-center gap-1 backdrop-blur-xs"
                  >
                    <Layers className="size-3 text-primary/70" />
                    <span>{constellation.stars.length} Stars</span>
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Card Description / Content */}
          <CardContent className="px-6 py-2 relative z-10">
            <CardDescription className="text-muted-foreground text-sm leading-relaxed font-normal">
              {app?.description ||
                constellation.description ||
                "Reference constellation in the Runa Realm universe."}
            </CardDescription>
          </CardContent>

          {/* Card Footer with Action Launch Button */}
          <CardFooter className="px-6 pb-6 pt-4 relative z-10">
            <Link href={constellation.redirect} className="w-full">
              <Button
                className="w-full h-12 text-white font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden border border-white/15 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
                }}
              >
                <span className="tracking-wide">
                  Launch {constellation.name}
                </span>
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
