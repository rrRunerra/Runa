"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface RrMfaMethodCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isEnabled: boolean;
  badgeText: string;
  badgeVariant?: "default" | "secondary" | "success" | "warning" | "outline";
  onEnable: () => void;
  onDisable: () => void;
  isSubmitting?: boolean;
  children?: React.ReactNode;
}

/**
 * Card component representing a single MFA authentication method option.
 * Preserves exact original visual layout: icon on left, title & badge inline, action button right aligned.
 */
export function RrMfaMethodCard({
  title,
  description,
  icon: Icon,
  isEnabled,
  badgeText,
  badgeVariant = "default",
  onEnable,
  onDisable,
  isSubmitting = false,
  children,
}: RrMfaMethodCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card className="p-4 flex flex-col gap-4 border border-border/60 bg-card shadow-2xs text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-xl border shrink-0 flex items-center justify-center transition-colors mt-0.5 sm:mt-0",
              isEnabled
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted/40 text-muted-foreground border-border/40"
            )}
          >
            <Icon className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="text-sm font-bold text-foreground tracking-tight">
                {title}
              </h5>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border",
                  isEnabled || badgeVariant === "success"
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-muted/30 text-muted-foreground border-border/50"
                )}
              >
                {badgeText}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex justify-end">
          {isEnabled ? (
            <Button
              onClick={onDisable}
              disabled={isSubmitting}
              variant="outline"
              size="sm"
              className="h-8 px-3.5 rounded-xl cursor-pointer text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
            >
              {t("securitySettings.disableBtn", "Disable")}
            </Button>
          ) : (
            <Button
              onClick={onEnable}
              disabled={isSubmitting}
              size="sm"
              className="h-8 px-3.5 rounded-xl cursor-pointer text-xs font-semibold shrink-0"
            >
              {t("securitySettings.enableBtn", "Setup")}
            </Button>
          )}
        </div>
      </div>

      {children && (
        <div className="pt-2 border-t border-border/30">{children}</div>
      )}
    </Card>
  );
}
