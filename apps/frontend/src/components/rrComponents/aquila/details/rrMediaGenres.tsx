"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

interface RrMediaGenresProps {
  genres?: string[] | null;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export function RrMediaGenres({
  genres,
}: RrMediaGenresProps): React.JSX.Element {
  const { t } = useTranslation();
  const hasGenres = genres && genres.length > 0;

  if (!hasGenres) {
    return <></>;
  }

  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <h3 className="text-base font-bold text-foreground">
        {t("aquila.genres")}
      </h3>
      <div className="flex flex-wrap gap-2">
        {genres?.map((genre, qid) => (
          <Badge
            key={`genre-${qid}`}
            variant="secondary"
            className="rounded-xl px-3 py-1 text-xs"
          >
            {genre}
          </Badge>
        ))}
      </div>
    </motion.div>
  );
}
