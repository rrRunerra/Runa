"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface StarBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {}

export function StarBackground({ className, ...props }: StarBackgroundProps) {
  const [stars, setStars] = React.useState<
    Array<{
      top: string;
      left: string;
      width: string;
      height: string;
      animationDelay: string;
      animationDuration: string;
    }>
  >([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const updateStars = () => {
      const { width, height } = containerRef.current!.getBoundingClientRect();
      const area = width * height;
      // Density: approx 1 star per 2500px^2 (50x50 area)
      // For a 300x200 card (60000px), this gives 24 stars.
      const starCount = Math.floor(area / 2500);

      const newStars = [...Array(Math.max(5, starCount))].map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        width: `${Math.random() * 2 + 1}px`,
        height: `${Math.random() * 2 + 1}px`,
        animationDelay: `${Math.random() * 2}s`,
        animationDuration: `${Math.random() * 3 + 2}s`,
      }));
      setStars(newStars);
    };

    const observer = new ResizeObserver(updateStars);
    observer.observe(containerRef.current);
    updateStars(); // Initial calculation

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 z-0 pointer-events-none", className)}
      {...props}
    >
      <div className="absolute inset-0 opacity-20 group-hover:opacity-100 transition-opacity duration-1000">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-(--star-color,white) animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: star.width,
              height: star.height,
              animationDelay: star.animationDelay,
              animationDuration: star.animationDuration,
            }}
          />
        ))}
      </div>
    </div>
  );
}
