"use client";

import React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { parseSafeDescription } from "./rrMediaDescription";

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
}

interface RrMediaCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: CharacterEntity | null;
}

const formatDOB = (dob: CharacterDOB | null | undefined) => {
  if (!dob || (!dob.month && !dob.day)) return null;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthStr = dob.month ? months[dob.month - 1] : "";
  const dayStr = dob.day ? String(dob.day) : "";
  const yearStr = dob.year ? `, ${dob.year}` : "";
  return [monthStr, dayStr].filter(Boolean).join(" ") + yearStr;
};

export function RrMediaCharacterDialog({
  open,
  onOpenChange,
  character,
}: RrMediaCharacterDialogProps): React.JSX.Element {
  if (!character) {
    return <></>;
  }

  const dobStr = formatDOB(character.dateOfBirth);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-y-auto scrollbar-thin p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image Section */}
          <div className="shrink-0 flex justify-center items-start">
            <div className="relative w-36 aspect-2/3 rounded-xl overflow-hidden shadow-lg border border-border/30">
              {character.image ? (
                <Image
                  src={character.image}
                  alt={character.name}
                  fill
                  sizes="144px"
                  className="object-cover"
                />
              ) : (
                <div className="size-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Information Section */}
          <div className="flex-1 min-w-0">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold flex flex-wrap items-baseline gap-2 text-foreground">
                <span>{character.name}</span>
                {character.native && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({character.native})
                  </span>
                )}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 mt-1">
                {character.role && (
                  <Badge
                    variant="secondary"
                    className="capitalize text-[10px] rounded-lg"
                  >
                    {character.role.toLowerCase()}
                  </Badge>
                )}
                {character.gender && (
                  <Badge
                    variant="outline"
                    className="text-[10px] rounded-lg"
                  >
                    {character.gender}
                  </Badge>
                )}
                {character.age && (
                  <Badge
                    variant="outline"
                    className="text-[10px] rounded-lg"
                  >
                    {character.age} y/o
                  </Badge>
                )}
                {character.bloodType && (
                  <Badge
                    variant="outline"
                    className="text-[10px] rounded-lg"
                  >
                    Blood Type: {character.bloodType}
                  </Badge>
                )}
                {dobStr && (
                  <Badge
                    variant="outline"
                    className="text-[10px] rounded-lg"
                  >
                    DOB: {dobStr}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {/* Alternative Names */}
            {character.nameAlternative && character.nameAlternative.length > 0 && (
              <div className="mb-4">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">
                  Alternative Names:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {character.nameAlternative.map((alt: string, idx: number) => (
                    <Badge
                      key={`alt-${idx}`}
                      variant="outline"
                      className="text-[10px] rounded-lg"
                    >
                      {alt}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Spoiler Names */}
            {character.nameAlternativeSpoiler && character.nameAlternativeSpoiler.length > 0 && (
              <div className="mb-4">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">
                  Spoiler Names (Hover/Click to reveal):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {character.nameAlternativeSpoiler.map((spoilerName: string, idx: number) => (
                    <span
                      key={`spoiler-${idx}`}
                      className="bg-foreground/85 hover:bg-transparent text-transparent hover:text-foreground px-2 py-0.5 rounded-lg cursor-pointer transition-colors duration-200 select-none border border-border/20 text-[10px] leading-relaxed inline-block"
                      title="Spoiler: Hover/Click to reveal"
                    >
                      {spoilerName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {character.description && (
              <div className="mt-4 border-t border-border/40 pt-4">
                <span className="text-xs font-semibold text-muted-foreground block mb-2">
                  Description:
                </span>
                <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-xs/relaxed prose-p:my-1.5 prose-strong:font-bold prose-a:text-primary hover:prose-a:underline select-text">
                  {parseSafeDescription(character.description)}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
