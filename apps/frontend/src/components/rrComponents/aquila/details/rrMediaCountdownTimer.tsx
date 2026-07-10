"use client";

import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface RrMediaCountdownTimerProps {
  airingAt: number; // Unix timestamp in seconds
  episode: number;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export function RrMediaCountdownTimer({
  airingAt,
  episode,
}: RrMediaCountdownTimerProps): React.JSX.Element {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect((): (() => void) => {
    const targetTime = airingAt * 1000;

    const updateTimer = (): void => {
      const now = Date.now();
      const diff = targetTime - now;
      if (diff <= 0) {
        setTimeLeft("Airing now!");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days > 0 ? days + "d " : ""}${hours}h ${mins}m ${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return (): void => clearInterval(interval);
  }, [airingAt]);

  if (!timeLeft) {
    return <></>;
  }

  return (
    <motion.div
      variants={itemVariants}
      className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-3.5 rounded-2xl flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-2">
        <Calendar className="size-4" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Next Episode: {episode}
        </span>
      </div>
      <span className="text-sm font-mono font-bold">{timeLeft}</span>
    </motion.div>
  );
}
