"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RrMediaCharacterDialog, CharacterEntity } from "./rrMediaCharacterDialog";

interface RrMediaCharactersProps {
  characters?: CharacterEntity[] | null;
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
}: RrMediaCharactersProps): React.JSX.Element {
  const [showAllCharacters, setShowAllCharacters] = useState<boolean>(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterEntity | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  if (!characters || characters.length === 0) {
    return <></>;
  }

  const displayedCharacters = showAllCharacters
    ? characters
    : characters.slice(0, 10);

  return (
    <>
      <motion.div variants={itemVariants} className="space-y-3">
        <h3 className="text-base font-bold text-foreground">
          Characters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedCharacters.map((char, qid) => (
            <div
              key={char.id || qid}
              onClick={() => {
                setSelectedCharacter(char);
                setIsDialogOpen(true);
              }}
              className="flex items-center justify-between bg-card/45 border border-border/30 backdrop-blur-md p-3 rounded-xl overflow-hidden hover:border-border/50 hover:bg-accent/30 transition-all group cursor-pointer"
            >
              {/* Character Side */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {char.image ? (
                    <Image
                      src={char.image}
                      alt={char.name}
                      fill
                      sizes="48px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="size-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      ?
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                    {char.name}
                  </p>
                  {char.role && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {char.role.toLowerCase()}
                    </p>
                  )}
                </div>
              </div>
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
                ? "Show Less"
                : `Show All (${characters.length})`}
            </Button>
          </div>
        )}
      </motion.div>

      <RrMediaCharacterDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        character={selectedCharacter}
      />
    </>
  );
}
