"use client";

import type React from "react";
import { Download, FileJson, FileCode, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MEDIA_TYPES, type ExportFormat } from "./types";

export interface RrListsExportCardProps {
  exportFormat: ExportFormat;
  selectedTypes: string[];
  isExporting: boolean;
  onFormatChange: (format: ExportFormat) => void;
  onToggleType: (typeId: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onExport: () => void;
}

export function RrListsExportCard({
  exportFormat,
  selectedTypes,
  isExporting,
  onFormatChange,
  onToggleType,
  onSelectAll,
  onSelectNone,
  onExport,
}: RrListsExportCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card className="flex-1 flex flex-col min-h-0 border border-border/80 bg-card shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 text-left">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
          <Download className="size-4.5 text-primary" />
          {t("lists.exportLists")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {t("lists.saveMediaListsDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 text-left p-4 sm:p-5 pt-0">
        {/* Format Selector */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t("lists.exportFormat")}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={exportFormat === "json" ? "default" : "outline"}
              onClick={() => onFormatChange("json")}
              className="text-xs font-medium h-9 rounded-xl cursor-pointer"
              size="sm"
            >
              <FileJson className="size-3.5 mr-1.5 shrink-0" />
              rrList (JSON)
            </Button>
            <Button
              type="button"
              variant={exportFormat === "mal-xml" ? "default" : "outline"}
              onClick={() => onFormatChange("mal-xml")}
              className="text-xs font-medium h-9 rounded-xl cursor-pointer"
              size="sm"
            >
              <FileCode className="size-3.5 mr-1.5 shrink-0" />
              MyAnimeList (XML)
            </Button>
            <Button
              type="button"
              variant={exportFormat === "anilist-xml" ? "default" : "outline"}
              onClick={() => onFormatChange("anilist-xml")}
              className="text-xs font-medium h-9 rounded-xl cursor-pointer"
              size="sm"
            >
              <FileCode className="size-3.5 mr-1.5 shrink-0" />
              AniList (XML)
            </Button>
            <Button
              type="button"
              variant={exportFormat === "simkl-xml" ? "default" : "outline"}
              onClick={() => onFormatChange("simkl-xml")}
              className="text-xs font-medium h-9 rounded-xl cursor-pointer"
              size="sm"
            >
              <FileCode className="size-3.5 mr-1.5 shrink-0" />
              Simkl (XML)
            </Button>
            <Button
              type="button"
              variant={exportFormat === "trakt-json" ? "default" : "outline"}
              onClick={() => onFormatChange("trakt-json")}
              className="text-xs font-medium h-9 rounded-xl col-span-2 cursor-pointer"
              size="sm"
            >
              <FileJson className="size-3.5 mr-1.5 shrink-0" />
              Trakt (JSON)
            </Button>
          </div>
        </div>

        {/* Media Types Selection */}
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("lists.selectLists")}
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
              >
                {t("lists.selectAll")}
              </button>
              <span className="text-[11px] text-muted-foreground">|</span>
              <button
                type="button"
                onClick={onSelectNone}
                className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
              >
                {t("lists.selectNone")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 p-3 bg-muted/25 border border-border/50 rounded-xl">
            {MEDIA_TYPES.map((type) => {
              const isDisabled = [
                "mal-xml",
                "anilist-xml",
                "simkl-xml",
              ].includes(exportFormat)
                ? type.id !== "anime" && type.id !== "manga"
                : exportFormat === "trakt-json"
                  ? type.id !== "tv" && type.id !== "movie"
                  : false;

              return (
                <div
                  key={type.id}
                  className={cn(
                    "flex items-center gap-2",
                    isDisabled && "opacity-40 cursor-not-allowed",
                  )}
                >
                  <Checkbox
                    id={`export-chk-${type.id}`}
                    checked={selectedTypes.includes(type.id)}
                    onCheckedChange={() => onToggleType(type.id)}
                    disabled={isDisabled}
                  />
                  <Label
                    htmlFor={`export-chk-${type.id}`}
                    className={cn(
                      "text-xs font-medium cursor-pointer select-none",
                      isDisabled && "cursor-not-allowed",
                    )}
                  >
                    {t(`mediaTypes.${type.key}`)}
                  </Label>
                </div>
              );
            })}
          </div>

          {exportFormat !== "json" && (
            <div className="flex flex-col gap-1.5 items-start text-[11px] text-amber-500 font-medium leading-normal bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <div className="flex gap-1.5 items-start">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>
                  {exportFormat === "trakt-json"
                    ? t("lists.traktOnlyDesc")
                    : t("lists.xmlOnlyDesc", {
                        platform:
                          exportFormat === "mal-xml"
                            ? "MyAnimeList"
                            : exportFormat === "anilist-xml"
                              ? "AniList"
                              : "Simkl",
                      })}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground leading-relaxed">
                {t("lists.importAfterDownload")}{" "}
                {exportFormat === "mal-xml" && (
                  <a
                    href="https://myanimelist.net/import.php"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    {t("lists.importPage", { platform: "MyAnimeList" })}{" "}
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {exportFormat === "anilist-xml" && (
                  <a
                    href="https://anilist.co/settings/import"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    {t("lists.importPage", { platform: "AniList" })}{" "}
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {exportFormat === "simkl-xml" && (
                  <a
                    href="https://simkl.com/apps/import/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    {t("lists.importPage", { platform: "Simkl" })}{" "}
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {exportFormat === "trakt-json" && (
                  <a
                    href="https://trakt.tv/import"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    {t("lists.importPage", { platform: "Trakt" })}{" "}
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </span>
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={onExport}
          disabled={isExporting || selectedTypes.length === 0}
          className="w-full mt-auto text-xs font-semibold h-9 rounded-xl cursor-pointer"
          size="sm"
        >
          {isExporting ? (
            <>
              <Spinner className="mr-1.5 size-4" />
              {t("lists.exporting")}
            </>
          ) : (
            <>
              <Download className="mr-1.5 size-4" />
              {t("lists.exportSelected")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
