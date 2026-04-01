"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MediaEntry } from "./types";

interface MediaListRowProps {
  entry: MediaEntry;
  baseUrl: string;
}

export const MediaListRow: React.FC<MediaListRowProps> = ({ entry, baseUrl }) => {
  return (
    <Link href={`${baseUrl}/${entry.id}`} prefetch={false} className="group flex cursor-pointer items-center justify-between gap-4 py-1.5 hover:bg-muted/50 rounded-md px-2 transition-colors block">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
          <Image
            src={entry.image}
            alt={entry.title}
            fill
            className="object-cover"
          />
        </div>
        <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
          {entry.title}
        </span>
      </div>
      <div className="flex items-center gap-6 text-sm text-muted-foreground w-1/4 justify-end">
        <span className="w-8 text-right font-medium">{entry.score}</span>
        <span className="w-12 text-right">{entry.progress}</span>
      </div>
    </Link>
  );
};

