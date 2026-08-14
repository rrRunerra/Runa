"use client";

import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, type LucideIcon } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export interface OptionGroup {
  label: string;
  options: { id: string; labelKey: string }[];
  selectedValues: string[];
  onToggle: (id: string) => void;
}

export interface ArrCardProps {
  title: string;
  endpoint: string;
  description?: string;
  icon: LucideIcon;
  monitoredId: string;
  monitored: boolean;
  onMonitoredChange: (checked: boolean) => void;
  groups: OptionGroup[];
}

export function ArrCard({
  title,
  endpoint,
  description,
  icon: Icon,
  monitoredId,
  monitored,
  onMonitoredChange,
  groups,
}: ArrCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<boolean>(false);

  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${process.env.NEXT_PUBLIC_API_URL || ""}${endpoint}`
      : `${process.env.NEXT_PUBLIC_API_URL || ""}${endpoint}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success(
        t("arrSettings.copySuccess", {
          title,
          defaultValue: `Copied ${title} URL to clipboard!`,
        }),
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(
        t("arrSettings.copyFailed", {
          defaultValue: "Failed to copy URL to clipboard",
        }),
      );
    }
  };

  return (
    <Card className="bg-card border border-border/80 text-left rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 pb-3">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Icon className="size-4.5 text-primary" />
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyUrl}
          className="text-xs h-8.5 px-3 gap-1.5 cursor-pointer shrink-0 font-medium rounded-xl"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-semibold">
                {t("arrSettings.copied", { defaultValue: "Copied" })}
              </span>
            </>
          ) : (
            <>
              <Copy className="size-3.5 text-muted-foreground" />
              <span>{t("arrSettings.copyUrl", { defaultValue: "Copy URL" })}</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5 pt-0">
        {/* Monitored switch */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/25 border border-border/50">
          <div className="flex flex-col gap-0.5 pr-3">
            <Label
              htmlFor={monitoredId}
              className="text-xs font-semibold text-foreground cursor-pointer select-none"
            >
              {t("arrSettings.monitorNewItems", { defaultValue: "Monitor New Items" })}
            </Label>
            <span className="text-[11px] text-muted-foreground leading-relaxed">
              {t("arrSettings.monitorNewItemsDesc", {
                title,
                defaultValue: `Automatically set newly imported items to monitored in ${title}`,
              })}
            </span>
          </div>
          <Switch
            id={monitoredId}
            checked={monitored}
            onCheckedChange={onMonitoredChange}
            className="cursor-pointer"
          />
        </div>

        {/* Option Groups */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </Label>
              <div className="flex flex-col gap-2.5 p-3 bg-muted/20 border border-border/40 rounded-xl">
                {group.options.map((opt) => {
                  const isChecked = group.selectedValues.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Checkbox
                        id={`${monitoredId}-${group.label}-${opt.id}`}
                        checked={isChecked}
                        onCheckedChange={() => group.onToggle(opt.id)}
                        className="cursor-pointer"
                      />
                      <Label
                        htmlFor={`${monitoredId}-${group.label}-${opt.id}`}
                        className="text-xs font-medium cursor-pointer select-none text-foreground leading-none"
                      >
                        {t(opt.labelKey)}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
