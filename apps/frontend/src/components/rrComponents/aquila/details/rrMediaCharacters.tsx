"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
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
}: RrMediaCharactersProps): React.JSX.Element {
  const { t } = useTranslation();
  const [showAllCharacters, setShowAllCharacters] = useState<boolean>(false);

  if (!characters || characters.length === 0) {
    return <></>;
  }

  const displayedCharacters = showAllCharacters
    ? characters
    : characters.slice(0, 10);

  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <h3 className="text-base font-bold text-foreground">
        {showVoiceActors ? t("aquila.charactersAndActors") : t("aquila.characters", "Characters")}
      </h3>
      <div className={cn("grid gap-4", showVoiceActors ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5")}>
        {displayedCharacters.map((char, qid) => (
          <div
            key={char.id || qid}
            className="flex items-stretch justify-between bg-card/45 border border-border/30 backdrop-blur-md rounded-xl overflow-hidden hover:border-border/50 hover:bg-accent/10 transition-all duration-300"
          >
            {/* Character Side (Left) */}
            <Link
              href={`/aquila/characters/${char.id}`}
              className="flex items-center gap-3 p-3 min-w-0 flex-1 hover:text-primary group/char cursor-pointer"
            >
              <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/20">
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
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-foreground group-hover/char:text-primary transition-colors duration-200">
                  {char.name}
                </p>
                {char.role && (
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {char.role.toLowerCase()}
                  </p>
                )}
              </div>
            </Link>

            {/* Voice Actor / Actor Side (Right) */}
            {showVoiceActors && (
              char.voiceActor ? (
                <Link
                  href={`/aquila/actors/${char.voiceActor.id}`}
                  className="flex items-center gap-3 p-3 min-w-0 flex-1 justify-end hover:text-primary group/actor text-right cursor-pointer border-l border-border/10 hover:bg-accent/5 transition-all duration-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground group-hover/actor:text-primary transition-colors duration-200">
                      {char.voiceActor.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {char.voiceActor.role?.toLowerCase() || t("aquila.actor")}
                    </p>
                  </div>
                  <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/20">
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
                <div className="p-3 shrink-0 flex items-center justify-center border-l border-border/10 select-none">
                  <span className="text-[10px] text-muted-foreground italic px-2">{t("aquila.noActorDetails")}</span>
                </div>
              )
            )}
          </div>
        ))}
      </div>
      {characters.length > 10 && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllCharacters(!showAllCharacters)}
            className="rounded-xl cursor-pointer"
          >
            {showAllCharacters
              ? t("aquila.showLess")
              : t("aquila.showAll", { count: characters.length })}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
