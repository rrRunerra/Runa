"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MediaEntry } from "./types";

interface MediaGridCardProps {
  entry: MediaEntry;
  baseUrl: string;
}

export const MediaGridCard: React.FC<MediaGridCardProps> = ({
  entry,
  baseUrl,
}) => {
  return (
    <Link
      href={`${baseUrl}/${entry.id}`}
      prefetch={false}
      className="group relative flex aspect-[2/3] w-full cursor-pointer flex-col overflow-hidden rounded-md bg-card transition-all hover:scale-[1.02] hover:shadow-lg block"
    >
      <div className="absolute inset-0">
        <Image
          src={entry.image}
          alt={entry.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="eager"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-3 pt-6 flex flex-col gap-1.5">
        <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
          {entry.title}
        </h4>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-purple-400">{entry.progress}</span>
          <span className="text-pink-400">{entry.score}</span>
        </div>
      </div>
    </Link>
  );
};
