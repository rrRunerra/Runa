"use client";

import type React from "react";
import { Tv, BookOpen, Film, Gamepad2, Book } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { RrPrivacySegmentedControl } from "./rrPrivacySegmentedControl";
import type { PrivacySubTabProps, PrivacySettingItem } from "./types";

/**
 * Aquila (Media Tracking Lists) privacy setting definitions.
 */
const AQUILA_PRIVACY_ITEMS: PrivacySettingItem[] = [
  {
    id: "animeList",
    app: "aquila",
    titleKey: "privacy.animeListTitle",
    icon: Tv,
    accentColor: "bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/20",
  },
  {
    id: "mangaList",
    app: "aquila",
    titleKey: "privacy.mangaListTitle",
    icon: BookOpen,
    accentColor: "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20",
  },
  {
    id: "movieList",
    app: "aquila",
    titleKey: "privacy.movieListTitle",
    icon: Film,
    accentColor: "bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20",
  },
  {
    id: "tvList",
    app: "aquila",
    titleKey: "privacy.tvListTitle",
    icon: Tv,
    accentColor: "bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/20",
  },
  {
    id: "gameList",
    app: "aquila",
    titleKey: "privacy.gameListTitle",
    icon: Gamepad2,
    accentColor: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
  },
  {
    id: "bookList",
    app: "aquila",
    titleKey: "privacy.bookListTitle",
    icon: Book,
    accentColor: "bg-[#eab308]/10 text-[#eab308] border-[#eab308]/20",
  },
];

/**
 * Sub-tab component managing privacy settings for Aquila media lists.
 */
export function RrAquilaPrivacySubTab({
  privacyState,
  onLevelChange,
  disabled,
}: PrivacySubTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {AQUILA_PRIVACY_ITEMS.map((item) => {
        const Icon = item.icon;
        const currentValue = privacyState[item.id] || "public";

        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors shadow-2xs"
          >
            {/* Left: Icon & Title */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={cn(
                  "size-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                  item.accentColor,
                )}
              >
                <Icon className="size-5" />
              </div>

              <span className="text-xs font-bold text-foreground truncate">
                {t(item.titleKey)}
              </span>
            </div>

            {/* Right: 3-Way Segmented Control */}
            <RrPrivacySegmentedControl
              itemId={item.id}
              value={currentValue}
              onChange={(val) => onLevelChange(item.id, val)}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}
