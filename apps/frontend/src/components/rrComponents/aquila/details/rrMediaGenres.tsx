"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

interface MediaTag {
  name: string;
  rank?: number | null;
}

interface RrMediaGenresProps {
  genres?: string[] | null;
  tags?: MediaTag[] | null;
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
  tags,
}: RrMediaGenresProps): React.JSX.Element {
  const { t } = useTranslation();
  const hasGenres = genres && genres.length > 0;
  const hasTags = tags && tags.length > 0;

  if (!hasGenres && !hasTags) {
    return <></>;
  }

  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <h3 className="text-base font-bold text-foreground">
        {t("aquila.genresAndTags")}
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
        {tags?.slice(0, 8).map((tag, qid) => (
          <Badge
            key={`tag-${qid}`}
            variant="outline"
            className="rounded-xl px-3 py-1 text-xs text-muted-foreground"
          >
            {tag.name}
            {tag.rank && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                {tag.rank}%
              </span>
            )}
          </Badge>
        ))}
      </div>
    </motion.div>
  );
}
