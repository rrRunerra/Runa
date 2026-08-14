"use client";

import type React from "react";
import { motion } from "framer-motion";
import { Globe, Users, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { PrivacyLevel } from "./types";

/**
 * Props for PrivacySegmentedControl.
 */
export interface PrivacySegmentedControlProps {
  /** Unique ID for framer motion layout pill animation */
  itemId: string;
  /** Currently selected privacy tier */
  value: PrivacyLevel;
  /** Callback fired when user selects a tier */
  onChange: (val: PrivacyLevel) => void;
  /** Whether the control is disabled */
  disabled?: boolean;
}

/**
 * Modern 3-way segmented pill control for switching between Public, Friends, and Only me.
 */
export function RrPrivacySegmentedControl({
  itemId,
  value,
  onChange,
  disabled,
}: PrivacySegmentedControlProps): React.JSX.Element {
  const { t } = useTranslation();

  const options: {
    level: PrivacyLevel;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { level: "public", label: t("privacy.levelPublic"), icon: Globe },
    { level: "friends", label: t("privacy.levelFriends"), icon: Users },
    { level: "private", label: t("privacy.levelPrivate"), icon: Lock },
  ];

  return (
    <div className="inline-flex items-center p-1 rounded-xl bg-muted/50 border border-border/50 shrink-0 select-none">
      {options.map((opt) => {
        const isSelected = value === opt.level;
        const Icon = opt.icon;

        return (
          <button
            key={opt.level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.level)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer z-10",
              isSelected
                ? "text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground/80",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {isSelected && (
              <motion.div
                layoutId={`privacy-pill-${itemId}`}
                className="absolute inset-0 rounded-lg bg-card border border-border/80 shadow-xs z-[-1]"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <Icon
              className={cn(
                "size-3.5",
                isSelected ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
