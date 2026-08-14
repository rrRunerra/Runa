"use client";

import type React from "react";
import { Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { RrPrivacySegmentedControl } from "./rrPrivacySegmentedControl";
import type { PrivacySubTabProps, PrivacySettingItem } from "./types";

/**
 * Lynx (Integrations & Connections) privacy setting definitions.
 */
const LYNX_PRIVACY_ITEMS: PrivacySettingItem[] = [
  {
    id: "connections",
    app: "lynx",
    titleKey: "privacy.connectionsTitle",
    icon: Link2,
    accentColor: "bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/20",
  },
];

/**
 * Sub-tab component managing privacy settings for Lynx (Connections & Integrations).
 */
export function RrLynxPrivacySubTab({
  privacyState,
  onLevelChange,
  disabled,
}: PrivacySubTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {LYNX_PRIVACY_ITEMS.map((item) => {
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
