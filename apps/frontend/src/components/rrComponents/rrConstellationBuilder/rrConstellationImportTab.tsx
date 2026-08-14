"use client";

import React, { ChangeEvent } from "react";
import { Download, FileJson } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface RrConstellationImportTabProps {
  importText: string;
  setImportText: (text: string) => void;
  onImport: () => void;
}

export function RrConstellationImportTab({
  importText,
  setImportText,
  onImport,
}: RrConstellationImportTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <FileJson className="size-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {t("constellationBuilder.importConfig")}
          </h3>
        </div>
        <Button
          onClick={onImport}
          size="xs"
          disabled={!importText.trim()}
          className="h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          aria-label={t("constellationBuilder.import")}
        >
          <Download className="size-3" />
          {t("constellationBuilder.import")}
        </Button>
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/30 p-3 h-80">
        <textarea
          placeholder={t("constellationBuilder.importPlaceholder")}
          value={importText}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setImportText(e.target.value)}
          className="w-full h-full bg-transparent font-mono text-[11px] text-foreground placeholder-muted-foreground/50 resize-none outline-hidden overflow-y-auto leading-relaxed"
          aria-label="Input field for pasting constellation configurations to import"
        />
      </div>
    </div>
  );
}
