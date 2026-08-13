"use client";

import type React from "react";
import { Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterGroupProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (id: string) => void;
}

export function FilterGroup({
  label,
  options,
  selectedValues,
  onToggle,
}: FilterGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const selected = selectedValues.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 cursor-pointer",
                selected
                  ? "bg-primary/15 border-primary text-primary font-semibold"
                  : "border-border/60 hover:border-primary/40 text-muted-foreground",
              )}
            >
              {selected && <Check className="size-3" />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface ArrCardProps {
  title: string;
  endpoint: string;
  description: string;
  icon: React.ElementType;
  monitoredId: string;
  monitored: boolean;
  onMonitoredChange: (checked: boolean) => void;
  groups: FilterGroupProps[];
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
}: ArrCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/80 text-left overflow-hidden w-full">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Icon className="size-4" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-bold tracking-tight">
                  {title}
                </CardTitle>
                <code className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50 select-all font-medium">
                  {endpoint}
                </code>
              </div>
              {description && (
                <CardDescription className="text-[11px] mt-0.5">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/50">
            <Label
              htmlFor={monitoredId}
              className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
            >
              Monitored
            </Label>
            <Switch
              id={monitoredId}
              checked={monitored}
              onCheckedChange={onMonitoredChange}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        {groups.map((group) => (
          <FilterGroup key={group.label} {...group} />
        ))}
      </CardContent>
    </Card>
  );
}
