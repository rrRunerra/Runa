"use client";

import React from "react";
import { Star, Heart } from "lucide-react";
import { motion } from "framer-motion";

interface RrMediaStatsDashboardProps {
  averageScore?: number | null;
  favourites?: number | null;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export function RrMediaStatsDashboard({
  averageScore,
  favourites,
}: RrMediaStatsDashboardProps): React.JSX.Element {
  return (
    <motion.div
      variants={itemVariants}
      className="grid grid-cols-2 gap-4"
    >
      <div className="bg-card/45 border border-border/30 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
          <Star className="size-3.5 text-primary fill-primary/20" />
          <span>Average Score</span>
        </div>
        <span className="text-xl font-extrabold text-primary">
          {averageScore ? `${averageScore}%` : "N/A"}
        </span>
      </div>
      <div className="bg-card/45 border border-border/30 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
          <Heart className="size-3.5 text-primary fill-primary/20" />
          <span>Favorites</span>
        </div>
        <span className="text-xl font-extrabold text-primary">
          {favourites ? favourites.toLocaleString() : "N/A"}
        </span>
      </div>
    </motion.div>
  );
}
