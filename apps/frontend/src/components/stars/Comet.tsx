"use client";

import { useEffect, useState } from "react";

interface CometProps {
  startX: number;
  startY: number;
  angle: number;
  travelDistance: number;
  onComplete: () => void;
}

export function Comet({
  startX,
  startY,
  angle,
  travelDistance,
  onComplete,
}: CometProps) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(false);
      onComplete();
    }, 3500); // Increased duration for the larger asteroid
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!active) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={
        {
          left: startX,
          top: startY,
          transform: `rotate(${angle}deg)`,
          "--travel-distance": `${travelDistance}px`,
        } as React.CSSProperties
      }
    >
      <div className="relative w-80 h-12 flex items-center">
        {/* Secondary Glow - Unified with asteroidMove animation */}
        <div
          className="absolute inset-x-0 h-full bg-linear-to-l from-blue-500/20 via-indigo-500/5 to-transparent blur-2xl opacity-0"
          style={{ animation: "asteroidMove 3s ease-out forwards" }}
        />

        {/* Primary Tail - Plasma stream */}
        <div
          className="absolute inset-y-2 right-4 left-0 bg-linear-to-l from-cyan-400/40 via-blue-600/10 to-transparent"
          style={{
            filter: "blur(12px)",
            borderRadius: "100% 0 0 100%",
            animation: "asteroidMove 3s ease-out forwards",
          }}
        />

        {/* Core Streak - Sharp inner line */}
        <div
          className="absolute right-4 left-10 h-0.5 bg-linear-to-l from-white via-cyan-200/20 to-transparent opacity-60"
          style={{
            animation: "asteroidMove 3s ease-out forwards",
          }}
        />

        {/* Rocky Head - Irregular, layered shape */}
        <div
          className="absolute right-0 w-10 h-10 flex items-center justify-center opacity-0"
          style={{ animation: "asteroidMove 3s ease-out forwards" }}
        >
          {/* Inner Light */}
          <div className="absolute w-4 h-4 bg-white rounded-full blur-sm" />

          {/* Main Rock Shape */}
          <div className="relative w-8 h-8 bg-zinc-400 rounded-lg transform rotate-45 shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.6),0_0_20px_rgba(34,211,238,0.4)] overflow-hidden">
            {/* Surface detail / craters */}
            <div className="absolute top-1 left-2 w-2 h-2 bg-zinc-500 rounded-full opacity-40" />
            <div className="absolute bottom-2 right-1 w-3 h-3 bg-zinc-600 rounded-full opacity-30" />
          </div>

          {/* Shockwave/Atmospheric entry glow */}
          <div className="absolute -inset-2 border-r-2 border-cyan-300/30 rounded-full blur-xs" />
        </div>

        {/* Debris/Embers - Small floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-200 rounded-full opacity-0"
            style={{
              right: `${10 + i * 15}px`,
              top: `${50 + (Math.random() - 0.5) * 40}%`,
              animation: `emberMove ${2 + Math.random()}s ease-out ${
                0.2 + i * 0.1
              }s forwards`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes asteroidMove {
          0% {
            transform: translateX(-100px) scale(0.8);
            opacity: 0;
          }
          5% {
            opacity: 1;
            transform: translateX(-80px) scale(1.1);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(var(--travel-distance)) scale(0.9);
            opacity: 0;
          }
        }

        @keyframes emberMove {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translate(
                calc(var(--travel-distance) * 0.8),
                ${(Math.random() - 0.5) * 100}px
              )
              scale(0);
            opacity: 0;
          }
        }

        @keyframes asteroid-glow {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
