"use client";

import React from "react";
import { Copy, Check, Code2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RrConstellationExportTabProps {
  exportFormat: "json" | "javascript";
  setExportFormat: (format: "json" | "javascript") => void;
  exportDataStr: string;
  copied: boolean;
  onCopy: () => void;
}

export function RrConstellationExportTab({
  exportFormat,
  setExportFormat,
  exportDataStr,
  copied,
  onCopy,
}: RrConstellationExportTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col gap-3 h-120 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="size-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {t("constellationBuilder.exportConfig")}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Format pills */}
          <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setExportFormat("json")}
              className={cn(
                "px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer",
                exportFormat === "json"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Format export as JSON"
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => setExportFormat("javascript")}
              className={cn(
                "px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer",
                exportFormat === "javascript"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Format export as JavaScript Object"
            >
              {t("constellationBuilder.jsObject")}
            </button>
          </div>

          {/* Copy Button */}
          <Button
            type="button"
            onClick={onCopy}
            size="xs"
            variant="outline"
            className="h-7 px-2.5 rounded-lg border-border/80 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
            aria-label={t("constellationBuilder.copy")}
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">
                  {t("constellationBuilder.copied")}
                </span>
              </>
            ) : (
              <>
                <Copy className="size-3 text-muted-foreground" />
                <span>{t("constellationBuilder.copy")}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-xl border border-border/80 bg-muted/30 p-3 h-full">
        <textarea
          readOnly
          value={exportDataStr}
          className="w-full h-full bg-transparent font-mono text-[11px] text-primary/90 leading-relaxed resize-none outline-hidden overflow-y-auto pr-2 select-all"
          aria-label={t("constellationBuilder.exportConfig")}
        />
      </div>
    </div>
  );
}
