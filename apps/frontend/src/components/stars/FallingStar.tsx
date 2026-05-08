"use client";

import { useEffect, useState } from "react";

interface FallingStarProps {
  startX: number;
  startY: number;
  angle: number;
  travelDistance: number;
  onComplete: () => void;
}

export function FallingStar({
  startX,
  startY,
  angle,
  travelDistance,
  onComplete,
}: FallingStarProps) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(false);
      onComplete();
    }, 1000); // Effect duration
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
      <div className="relative w-40 h-1">
        {/* The streak - faded opacity at start */}
        <div
          className="absolute inset-0 bg-linear-to-l from-white/80 via-white/20 to-transparent opacity-0"
          style={{
            filter: "blur(1px)",
            animation: "streak 0.8s ease-out forwards",
          }}
        />
        {/* The head - now animated to move with the streak */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_2px_rgba(255,255,255,0.8)] opacity-0"
          style={{ animation: "streak 0.8s ease-out forwards" }}
        />
      </div>

      <style jsx>{`
        @keyframes streak {
          0% {
            transform: translateX(-100px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateX(var(--travel-distance));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
