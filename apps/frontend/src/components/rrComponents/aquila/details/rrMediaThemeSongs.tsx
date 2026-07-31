"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Music, Disc3, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RrMediaThemeSongsProps {
  themeSongs?: {
    openings?: string[];
    endings?: string[];
  } | null;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export function RrMediaThemeSongs({
  themeSongs,
}: RrMediaThemeSongsProps): React.JSX.Element {
  const { t } = useTranslation();
  const [showAllOpenings, setShowAllOpenings] = useState<boolean>(false);
  const [showAllEndings, setShowAllEndings] = useState<boolean>(false);

  const openings = themeSongs?.openings || [];
  const endings = themeSongs?.endings || [];

  if (openings.length === 0 && endings.length === 0) {
    return <></>;
  }

  const displayedOpenings = showAllOpenings ? openings : openings.slice(0, 3);
  const displayedEndings = showAllEndings ? endings : endings.slice(0, 3);

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <Music className="size-4 text-primary" />
        <span>{t("aquila.themeSongs")}</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Openings Column */}
        {openings.length > 0 && (
          <div className="bg-card/45 border border-border/30 backdrop-blur-md rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/20 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Disc3 className="size-3.5 text-primary animate-spin-slow" />
                {t("aquila.openings")}
              </span>
            </div>

            <div className={`space-y-2 ${showAllOpenings ? "max-h-60 overflow-y-auto pr-1.5" : ""}`}>
              {displayedOpenings.map((song, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-foreground/90 bg-muted/20 p-2.5 rounded-xl border border-border/20"
                >
                  <span className="text-primary font-bold text-[11px] shrink-0 mt-0.5">
                    OP{idx + 1}
                  </span>
                  <span className="leading-tight break-words">{song}</span>
                </div>
              ))}
            </div>

            {openings.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center gap-1"
                onClick={() => setShowAllOpenings(!showAllOpenings)}
              >
                <span>{showAllOpenings ? t("aquila.showLess") : t("aquila.showMore")}</span>
                {showAllOpenings ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </Button>
            )}
          </div>
        )}

        {/* Endings Column */}
        {endings.length > 0 && (
          <div className="bg-card/45 border border-border/30 backdrop-blur-md rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/20 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Disc3 className="size-3.5 text-rose-400" />
                {t("aquila.endings")}
              </span>
            </div>

            <div className={`space-y-2 ${showAllEndings ? "max-h-60 overflow-y-auto pr-1.5" : ""}`}>
              {displayedEndings.map((song, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-foreground/90 bg-muted/20 p-2.5 rounded-xl border border-border/20"
                >
                  <span className="text-rose-400 font-bold text-[11px] shrink-0 mt-0.5">
                    ED{idx + 1}
                  </span>
                  <span className="leading-tight break-words">{song}</span>
                </div>
              ))}
            </div>

            {endings.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center gap-1"
                onClick={() => setShowAllEndings(!showAllEndings)}
              >
                <span>{showAllEndings ? t("aquila.showLess") : t("aquila.showMore")}</span>
                {showAllEndings ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
