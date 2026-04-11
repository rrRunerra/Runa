"use client";

import React from "react";
import Link from "next/link";
import { MediaEntry } from "./types";

interface MediaCompactRowProps {
  entry: MediaEntry;
  baseUrl: string;
}

export const MediaCompactRow: React.FC<MediaCompactRowProps> = ({
  entry,
  baseUrl,
}) => {
  return (
    <Link
      href={`${baseUrl}/${entry.id}`}
      prefetch={false}
      className="group flex cursor-pointer items-center justify-between gap-4 py-2 hover:bg-muted/50 rounded-md px-2 transition-colors block"
    >
      <div className="flex items-center gap-3">
        <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
          {entry.title}
        </span>
      </div>
      <div className="flex items-center gap-6 text-sm text-muted-foreground w-1/4 justify-end">
        <span className="w-8 text-right font-medium">{entry.score}</span>
        <span className="w-12 text-right">{entry.progress}</span>
        <span className="w-16 text-right hidden sm:block">{entry.type}</span>
      </div>
    </Link>
  );
};
