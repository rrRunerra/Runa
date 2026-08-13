"use client";

import type React from "react";
import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Download,
  Upload,
  Info,
  FileJson,
  FileCode,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface RrListsTabProps {
  /** Callback to close parent settings modal */
  onOpenChange: (open: boolean) => void;
  /** Callback to switch active category tab in settings dialog */
  setActiveCategory?: (category: any) => void;
}

const MEDIA_TYPES = [
  { id: "anime", key: "anime" },
  { id: "manga", key: "manga" },
  { id: "tv", key: "tv" },
  { id: "movie", key: "movie" },
  { id: "game", key: "game" },
  { id: "book", key: "book" },
];

/**
 * Component managing import and export of user media lists across formats (JSON, MAL XML, AniList, Simkl, Trakt).
 */
export function RrListsTab({
  onOpenChange: _onOpenChange,
  setActiveCategory,
}: RrListsTabProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

  // Export States
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "anime",
    "manga",
    "tv",
    "movie",
    "game",
    "book",
  ]);
  const [exportFormat, setExportFormat] = useState<
    "json" | "mal-xml" | "anilist-xml" | "simkl-xml" | "trakt-json"
  >("json");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export handlers
  const handleToggleType = (typeId: string) => {
    const isXml = ["mal-xml", "anilist-xml", "simkl-xml"].includes(
      exportFormat,
    );
    if (isXml && typeId !== "anime" && typeId !== "manga") {
      return;
    }
    if (
      exportFormat === "trakt-json" &&
      typeId !== "tv" &&
      typeId !== "movie"
    ) {
      return;
    }
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId],
    );
  };

  const handleSelectAll = () => {
    if (["mal-xml", "anilist-xml", "simkl-xml"].includes(exportFormat)) {
      setSelectedTypes(["anime", "manga"]);
    } else if (exportFormat === "trakt-json") {
      setSelectedTypes(["tv", "movie"]);
    } else {
      setSelectedTypes(MEDIA_TYPES.map((t) => t.id));
    }
  };

  const handleSelectNone = () => {
    setSelectedTypes([]);
  };

  const handleFormatChange = (
    format: "json" | "mal-xml" | "anilist-xml" | "simkl-xml" | "trakt-json",
  ) => {
    setExportFormat(format);
    if (["mal-xml", "anilist-xml", "simkl-xml"].includes(format)) {
      setSelectedTypes((prev) =>
        prev.filter((id) => id === "anime" || id === "manga"),
      );
    } else if (format === "trakt-json") {
      setSelectedTypes((prev) =>
        prev.filter((id) => id === "tv" || id === "movie"),
      );
    }
  };

  const triggerDownload = (
    content: string,
    filename: string,
    contentType: string,
  ) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to export lists.");
      return;
    }
    if (selectedTypes.length === 0) {
      toast.error("Please select at least one media type to export.");
      return;
    }

    setIsExporting(true);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const username = session.user?.username || "user";

    try {
      if (exportFormat === "json" || exportFormat === "trakt-json") {
        const queryParams = new URLSearchParams({
          types: selectedTypes.join(","),
        });
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/list/export/rrlist?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error("Failed to export lists JSON");
        }

        const data = await res.json();
        const prefix = exportFormat === "trakt-json" ? "trakt" : "media-list";
        triggerDownload(
          JSON.stringify(data, null, 2),
          `runa-${prefix}-export-${username}-${timestamp}.json`,
          "application/json",
        );
        toast.success(
          `${exportFormat === "trakt-json" ? "Trakt JSON" : "JSON"} lists exported successfully!`,
        );
      } else {
        const providerName =
          exportFormat === "anilist-xml"
            ? "anilist"
            : exportFormat === "simkl-xml"
              ? "simkl"
              : "mal";

        if (selectedTypes.includes("anime")) {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/list/export/mal?type=anime`,
            {
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            },
          );
          if (!res.ok) throw new Error("Failed to export MAL Anime XML");
          const xml = await res.text();
          triggerDownload(
            xml,
            `runa-${providerName}-export-anime-${username}-${timestamp}.xml`,
            "application/xml",
          );
        }

        if (selectedTypes.includes("manga")) {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/list/export/mal?type=manga`,
            {
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            },
          );
          if (!res.ok) throw new Error("Failed to export MAL Manga XML");
          const xml = await res.text();
          triggerDownload(
            xml,
            `runa-${providerName}-export-manga-${username}-${timestamp}.xml`,
            "application/xml",
          );
        }
        toast.success(
          `${providerName === "mal" ? "MAL XML" : providerName.charAt(0).toUpperCase() + providerName.slice(1) + " XML"} exported successfully!`,
        );
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to export lists.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        setImportFile(file);
      } else {
        toast.error(t("lists.uploadValidJson"));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImport = () => {
    if (!session?.accessToken) {
      toast.error(t("lists.mustBeLoggedIn"));
      return;
    }
    if (!importFile) {
      toast.error(t("lists.selectFileToImport"));
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const payload = JSON.parse(text);

        if (typeof payload !== "object" || payload === null) {
          throw new Error(t("lists.invalidBackupStructure"));
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/list/import/rrlist`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify(payload),
          },
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || t("lists.failedTriggerImport"));
        }

        toast.success(t("lists.importStarted"), { duration: 6000 });
        setImportFile(null);
      } catch (err: any) {
        toast.error(err.message || t("lists.failedImport"));
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      toast.error(t("lists.failedReadFile"));
      setIsImporting(false);
    };

    reader.readAsText(importFile);
  };

  return (
    <div className="flex flex-col gap-6 p-2 h-full">
      <div className="flex gap-3 bg-muted/40 border border-border/60 p-4 rounded-xl items-start">
        <Info className="size-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 flex flex-col gap-1 text-left">
          <span className="text-sm font-semibold text-foreground">
            {t("lists.syncExternalAccounts")}
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("lists.syncExternalDesc1")}{" "}
            <button
              onClick={() => setActiveCategory?.("connections")}
              className="text-primary hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
            >
              {t("lists.connectionsTab")} <ExternalLink className="size-3" />
            </button>{" "}
            {t("lists.syncExternalDesc2")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Export Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="size-5 text-primary" />
              {t("lists.exportLists")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("lists.saveMediaListsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 text-left">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("lists.exportFormat")}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={exportFormat === "json" ? "default" : "outline"}
                  onClick={() => handleFormatChange("json")}
                  className="text-xs font-medium h-8.5"
                  size="sm"
                >
                  <FileJson className="size-3.5 mr-1.5 shrink-0" />
                  rrList (JSON)
                </Button>
                <Button
                  variant={exportFormat === "mal-xml" ? "default" : "outline"}
                  onClick={() => handleFormatChange("mal-xml")}
                  className="text-xs font-medium h-8.5"
                  size="sm"
                >
                  <FileCode className="size-3.5 mr-1.5 shrink-0" />
                  MyAnimeList (XML)
                </Button>
                <Button
                  variant={
                    exportFormat === "anilist-xml" ? "default" : "outline"
                  }
                  onClick={() => handleFormatChange("anilist-xml")}
                  className="text-xs font-medium h-8.5"
                  size="sm"
                >
                  <FileCode className="size-3.5 mr-1.5 shrink-0" />
                  AniList (XML)
                </Button>
                <Button
                  variant={exportFormat === "simkl-xml" ? "default" : "outline"}
                  onClick={() => handleFormatChange("simkl-xml")}
                  className="text-xs font-medium h-8.5"
                  size="sm"
                >
                  <FileCode className="size-3.5 mr-1.5 shrink-0" />
                  Simkl (XML)
                </Button>
                <Button
                  variant={
                    exportFormat === "trakt-json" ? "default" : "outline"
                  }
                  onClick={() => handleFormatChange("trakt-json")}
                  className="text-xs font-medium h-8.5 col-span-2"
                  size="sm"
                >
                  <FileJson className="size-3.5 mr-1.5 shrink-0" />
                  Trakt (JSON)
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("lists.selectLists")}
                </Label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    {t("lists.selectAll")}
                  </button>
                  <span className="text-[10px] text-muted-foreground">|</span>
                  <button
                    onClick={handleSelectNone}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    {t("lists.selectNone")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 border border-border/40 rounded-xl">
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
                        onCheckedChange={() => handleToggleType(type.id)}
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
                <div className="flex flex-col gap-1.5 items-start text-[11px] text-amber-500 font-medium leading-normal bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
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
                  <span className="text-[10px] text-muted-foreground">
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
              onClick={handleExport}
              disabled={isExporting || selectedTypes.length === 0}
              className="w-full mt-2 text-xs"
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

        {/* Import Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              {t("lists.importLists")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("lists.loadBackupDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-left">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
                dragActive
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/15",
                importFile && "border-solid border-primary/45 bg-muted/10",
              )}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".json"
                onChange={handleFileSelect}
              />
              <Upload
                className={cn(
                  "size-8 text-muted-foreground transition-colors",
                  (dragActive || importFile) && "text-primary",
                )}
              />
              {importFile ? (
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="text-xs font-semibold text-foreground max-w-50 truncate">
                    {importFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(importFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="text-xs font-semibold text-foreground">
                    {t("lists.dragDropHere")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t("lists.clickToBrowse")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {importFile && (
                <Button
                  variant="outline"
                  onClick={() => setImportFile(null)}
                  className="flex-1 text-xs"
                  size="sm"
                  disabled={isImporting}
                >
                  {t("lists.clearFile")}
                </Button>
              )}
              <Button
                onClick={handleImport}
                disabled={isImporting || !importFile}
                className={cn("flex-1 text-xs", !importFile && "w-full")}
                size="sm"
              >
                {isImporting ? (
                  <>
                    <Spinner className="mr-1.5 size-4" />
                    {t("lists.importing")}
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 size-4" />
                    {t("lists.startImport")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
