"use client";

import type React from "react";
import { User, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { RrPrivacySegmentedControl } from "./rrPrivacySegmentedControl";
import type { PrivacySubTabProps, PrivacySettingItem } from "./types";

/**
 * Polaris (Social & Profile) privacy setting definitions.
 */
const POLARIS_PRIVACY_ITEMS: PrivacySettingItem[] = [
  {
    id: "profile",
    app: "polaris",
    titleKey: "privacy.profileTitle",
    icon: User,
    accentColor: "bg-[#c9a3ff]/10 text-[#c9a3ff] border-[#c9a3ff]/20",
  },
  {
    id: "friends",
    app: "polaris",
    titleKey: "privacy.friendsTitle",
    icon: Users,
    accentColor: "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20",
  },
];

/**
 * Sub-tab component managing privacy settings for Polaris (Profile & Friends).
 */
export function RrPolarisPrivacySubTab({
  privacyState,
  onLevelChange,
  disabled,
}: PrivacySubTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {POLARIS_PRIVACY_ITEMS.map((item) => {
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
