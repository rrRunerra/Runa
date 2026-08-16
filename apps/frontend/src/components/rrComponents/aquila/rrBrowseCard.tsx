"use client";

import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import RrLapplandImageNotFound from "../rrImages/rrLapplandImageNotFound";

export interface RrBrowseCardProps {
  item: {
    id: string | number;
    title: string | {
      romaji: string;
      english?: string;
    };
    secondaryTitle?: string | null;
    coverImage?: string | {
      large: string;
    } | null;
    isAdult?: boolean;
  };
  type: string;
  onDelete?: () => void;
  onClick?: () => void;
}

const RrBrowseCardComponent = ({
  item,
  type,
  onDelete,
  onClick,
}: RrBrowseCardProps): React.JSX.Element => {
  const { t } = useTranslation();
  const primaryTitle = typeof item.title === "string" ? item.title : (item.title?.english || item.title?.romaji || "");
  const secondaryTitle = typeof item.title === "string" ? (item.secondaryTitle || null) : (item.title?.english ? item.title.romaji : null);
  const safeType = ["anime", "manga", "movies", "tv", "games", "books", "characters", "actors", "studios"].includes(type) ? type : "anime";
  const safeId = encodeURIComponent(item.id.toString());

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.97 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            type: "spring",
            stiffness: 110,
            damping: 15,
          },
        },
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col gap-2 rounded-xl w-full"
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
            e.stopPropagation();
            e.preventDefault();
            onDelete();
          }}
          className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-md text-white hover:text-destructive hover:bg-black/85 rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100 shadow-md flex items-center justify-center cursor-pointer size-7"
          title={t("aquila.removeFromHistory")}
        >
          <X className="size-3.5" />
        </button>
      )}

      <Link
        href={`/aquila/${safeType}/${safeId}`}
        prefetch={false}
        onClick={onClick}
        className="flex flex-col gap-2 h-full"
      >
        <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-muted shadow-xs group-hover:shadow-md border border-border/50 transition-all">
          {typeof item.coverImage === "string" ? (
            <Image
              src={item.coverImage}
              alt={primaryTitle}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            />
          ) : item.coverImage?.large ? (
            <Image
              src={item.coverImage.large}
              alt={primaryTitle}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            />
          ) : (
            <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
              <RrLapplandImageNotFound className="size-full object-cover scale-150" />
            </div>
          )}

          {item.isAdult && (
            <div className="absolute top-2 left-2 z-10">
              <Badge
                variant="outline"
                className="bg-destructive/90 text-destructive-foreground border-destructive-foreground/20 backdrop-blur-xs font-bold shadow-sm text-[10px] px-1.5 py-0"
              >
                18+
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-col px-1">
          <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors tracking-wide wrap-break-word">
            {primaryTitle}
          </h3>
          {secondaryTitle && (
            <p
              className="text-xs text-muted-foreground line-clamp-1 mt-0.5"
              title={secondaryTitle}
            >
              {secondaryTitle}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export const RrBrowseCard = memo(RrBrowseCardComponent);
