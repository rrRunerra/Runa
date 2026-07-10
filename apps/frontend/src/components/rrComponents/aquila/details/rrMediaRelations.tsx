"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";

export interface RelationEntity {
  id: number | string;
  relationType: string;
  title: {
    english?: string | null;
    romaji?: string | null;
    native?: string | null;
  };
  format?: string | null;
  type: string; // e.g. "ANIME" | "MANGA"
  coverImage?: string | null;
}

interface RrMediaRelationsProps {
  relations?: RelationEntity[] | null;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

function RelationItem({ relation }: { relation: RelationEntity }): React.JSX.Element {
  let href: string;
  switch (relation.type) {
    case "ANIME":
      href = `/aquila/anime/${relation.id}`;
      break;
    case "MANGA":
      href = `/aquila/manga/${relation.id}`;
      break;
    default:
      href = `/aquila/${relation.type.toLowerCase()}/${relation.id}`;
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className="flex items-center gap-3 bg-card/35 border border-border/30 p-3 rounded-xl hover:bg-accent/50 hover:border-border/50 transition-all group"
    >
      <div className="relative w-12 aspect-2/3 rounded-lg overflow-hidden shrink-0 bg-muted">
        {relation.coverImage ? (
          <Image
            src={relation.coverImage}
            alt={
              relation.title.english ||
              relation.title.romaji ||
              "Relation"
            }
            fill
            sizes="48px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
            <RrLapplandImageNotFound className="size-full object-cover scale-150" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {relation.title.english || relation.title.romaji}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {relation.format} • {relation.type}
        </p>
      </div>
      <Badge
        variant="outline"
        className="text-[10px] capitalize shrink-0 ml-auto"
      >
        {relation.relationType.replace(/_/g, " ").toLowerCase()}
      </Badge>
    </Link>
  );
}

export function RrMediaRelations({
  relations,
}: RrMediaRelationsProps): React.JSX.Element {
  const { animeRelations, mangaRelations, otherRelations } = useMemo(() => {
    const anime: RelationEntity[] = [];
    const manga: RelationEntity[] = [];
    const others: RelationEntity[] = [];

    relations?.forEach((rel) => {
      if (rel.type === "ANIME") {
        anime.push(rel);
      } else if (rel.type === "MANGA") {
        manga.push(rel);
      } else {
        others.push(rel);
      }
    });

    return { animeRelations: anime, mangaRelations: manga, otherRelations: others };
  }, [relations]);

  if (!relations || relations.length === 0) {
    return <></>;
  }

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      {animeRelations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground">
            Related Anime
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {animeRelations.map((relation, qid) => (
              <RelationItem key={`anime-${relation.id}-${qid}`} relation={relation} />
            ))}
          </div>
        </div>
      )}

      {mangaRelations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground">
            Related Manga
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mangaRelations.map((relation, qid) => (
              <RelationItem key={`manga-${relation.id}-${qid}`} relation={relation} />
            ))}
          </div>
        </div>
      )}

      {otherRelations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground">
            Other Relations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {otherRelations.map((relation, qid) => (
              <RelationItem key={`other-${relation.id}-${qid}`} relation={relation} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
