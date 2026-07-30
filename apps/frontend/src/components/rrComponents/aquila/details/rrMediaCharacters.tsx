"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CharacterDOB {
  year?: number | null;
  month?: number | null;
  day?: number | null;
}

export interface CharacterEntity {
  id: number | string;
  name: string;
  native?: string;
  role?: string;
  gender?: string;
  age?: string;
  bloodType?: string;
  dateOfBirth?: CharacterDOB | null;
  characterId?: number;
  nameAlternative?: string[];
  nameAlternativeSpoiler?: string[];
  description?: string;
  image?: string;
  voiceActor?: {
    id: number;
    name: string;
    image: string;
    role?: string;
  } | null;
}

interface RrMediaCharactersProps {
  characters?: CharacterEntity[] | null;
  showVoiceActors?: boolean;
  showAllInitial?: boolean;
  limitCount?: number;
  hideToggleButton?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export function RrMediaCharacters({
  characters,
  showVoiceActors = true,
  showAllInitial = false,
  limitCount,
  hideToggleButton = false,
}: RrMediaCharactersProps): React.JSX.Element {
  const { t } = useTranslation();
  const [showAllCharacters, setShowAllCharacters] =
    useState<boolean>(showAllInitial);

  // Sort main characters first
  const sortedCharacters = useMemo(() => {
    if (!characters) return [];
    return [...characters].sort((a, b) => {
      const aMain = a.role?.toUpperCase() === "MAIN" ? 1 : 0;
      const bMain = b.role?.toUpperCase() === "MAIN" ? 1 : 0;
      return bMain - aMain;
    });
  }, [characters]);

  if (!sortedCharacters || sortedCharacters.length === 0) {
    return <></>;
  }

  const effectiveCharacters =
    limitCount && !showAllCharacters
      ? sortedCharacters.slice(0, limitCount)
      : sortedCharacters;

  const showButton =
    !hideToggleButton && !limitCount && sortedCharacters.length > 5;
  const buttonWrapperClass =
    sortedCharacters.length > 10
      ? "flex justify-center pt-2"
      : "flex md:hidden justify-center pt-2";

  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <h3 className="text-base font-bold text-foreground">
        {showVoiceActors
          ? t("aquila.charactersAndActors", "Characters & Voice Actors")
          : t("aquila.characters", "Characters")}
      </h3>
      <div
        className={cn(
          "grid gap-3.5",
          showVoiceActors
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        )}
      >
        {effectiveCharacters.map((char, idx) => {
          const itemVisibilityClass =
            showAllCharacters || limitCount
              ? "flex"
              : idx < 5
                ? "flex"
                : idx < 10
                  ? "hidden md:flex"
                  : "hidden";

          return (
            <div
              key={`${char.id}_${idx}`}
              className={cn(
                "items-center justify-between bg-card/45 border border-border/30 backdrop-blur-md rounded-2xl overflow-hidden hover:border-border/50 hover:bg-accent/10 transition-all duration-300 shadow-xs",
                itemVisibilityClass,
              )}
            >
              {/* Character Side (Left) */}
              <Link
                href={`/aquila/characters/${char.characterId}`}
                className="flex items-center gap-3 p-3 sm:p-3.5 min-w-0 flex-1 hover:text-primary group/char cursor-pointer"
              >
                <div className="relative size-11 sm:size-12 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/20 shadow-xs">
                  {char.image ? (
                    <Image
                      src={char.image}
                      alt={char.name}
                      fill
                      sizes="48px"
                      className="object-cover group-hover/char:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                      ?
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs sm:text-sm font-bold truncate text-foreground group-hover/char:text-primary transition-colors duration-200"
                    title={char.name}
                  >
                    {char.name}
                  </p>
                  {char.role && (
                    <p className="text-[10px] text-muted-foreground capitalize font-medium mt-0.5">
                      {char.role.toLowerCase()}
                    </p>
                  )}
                </div>
              </Link>

              {/* Voice Actor / Actor Side (Right) */}
              {showVoiceActors &&
                (char.voiceActor ? (
                  <Link
                    href={`/aquila/actors/${char.voiceActor.id}`}
                    className="flex items-center gap-3 p-3 sm:p-3.5 min-w-0 flex-1 justify-end hover:text-primary group/actor text-right cursor-pointer border-l border-border/15 hover:bg-accent/5 transition-all duration-200"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs sm:text-sm font-bold truncate text-foreground group-hover/actor:text-primary transition-colors duration-200"
                        title={char.voiceActor.name}
                      >
                        {char.voiceActor.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize font-medium mt-0.5">
                        {char.voiceActor.role?.toLowerCase() ||
                          t("aquila.actor")}
                      </p>
                    </div>
                    <div className="relative size-11 sm:size-12 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/20 shadow-xs">
                      {char.voiceActor.image ? (
                        <Image
                          src={char.voiceActor.image}
                          alt={char.voiceActor.name}
                          fill
                          sizes="48px"
                          className="object-cover group-hover/actor:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                          ?
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="p-3 shrink-0 flex items-center justify-center border-l border-border/15 select-none">
                    <span className="text-[10px] text-muted-foreground italic px-2">
                      {t("aquila.noActorDetails")}
                    </span>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
