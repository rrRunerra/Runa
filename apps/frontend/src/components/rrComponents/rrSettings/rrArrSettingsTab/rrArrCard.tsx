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

export interface OptionGroup {
  label: string;
  options: { id: string; label: string }[];
  selectedValues: string[];
  onToggle: (id: string) => void;
}

export interface ArrCardProps {
  title: string;
  endpoint: string;
  description: string;
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
  const [copied, setCopied] = useState(false);

  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${process.env.NEXT_PUBLIC_API_URL || ""}${endpoint}`
      : `${process.env.NEXT_PUBLIC_API_URL || ""}${endpoint}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success(`Copied ${title} URL to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL to clipboard");
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/80 text-left">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="size-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyUrl}
          className="text-xs h-8 px-2.5 gap-1.5 cursor-pointer shrink-0 font-medium"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5 text-muted-foreground" />
              <span>Copy URL</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Monitored switch */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
          <div className="flex flex-col gap-0.5">
            <Label
              htmlFor={monitoredId}
              className="text-xs font-semibold text-foreground cursor-pointer"
            >
              Monitor New Items
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Automatically set newly imported items to monitored in {title}
            </span>
          </div>
          <Switch
            id={monitoredId}
            checked={monitored}
            onCheckedChange={onMonitoredChange}
          />
        </div>

        {/* Option Groups */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </Label>
              <div className="flex flex-col gap-2 p-3 bg-muted/20 border border-border/40 rounded-xl">
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
                      />
                      <Label
                        htmlFor={`${monitoredId}-${group.label}-${opt.id}`}
                        className="text-xs font-medium cursor-pointer select-none text-foreground"
                      >
                        {opt.label}
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
