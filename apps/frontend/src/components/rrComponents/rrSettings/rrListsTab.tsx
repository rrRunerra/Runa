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

interface RrListsTabProps {
  onOpenChange: (open: boolean) => void;
  setActiveCategory?: (category: any) => void;
}

const MEDIA_TYPES = [
  { id: "anime", label: "Anime List" },
  { id: "manga", label: "Manga List" },
  { id: "tv", label: "TV Shows List" },
  { id: "movie", label: "Movies List" },
  { id: "game", label: "Games List" },
  { id: "book", label: "Books List" },
];

export function RrListsTab({
  onOpenChange,
  setActiveCategory,
}: RrListsTabProps): React.JSX.Element {
  const { data: session } = useSession();

  // Export States
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "anime",
    "manga",
    "tv",
    "movie",
    "game",
    "book",
  ]);
  const [exportFormat, setExportFormat] = useState<"json" | "mal-xml">("json");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export handlers
  const handleToggleType = (typeId: string) => {
    if (
      exportFormat === "mal-xml" &&
      typeId !== "anime" &&
      typeId !== "manga"
    ) {
      return; // MAL XML only supports Anime and Manga
    }
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((id) => id !== typeId)
        : [...prev, typeId],
    );
  };

  const handleSelectAll = () => {
    if (exportFormat === "mal-xml") {
      setSelectedTypes(["anime", "manga"]);
    } else {
      setSelectedTypes(MEDIA_TYPES.map((t) => t.id));
    }
  };

  const handleSelectNone = () => {
    setSelectedTypes([]);
  };

  const handleFormatChange = (format: "json" | "mal-xml") => {
    setExportFormat(format);
    if (format === "mal-xml") {
      // Filter out non-anime/manga media
      setSelectedTypes((prev) =>
        prev.filter((id) => id === "anime" || id === "manga"),
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
      if (exportFormat === "json") {
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
        triggerDownload(
          JSON.stringify(data, null, 2),
          `runa-media-list-export-${username}-${timestamp}.json`,
          "application/json",
        );
        toast.success("JSON lists exported successfully!");
      } else {
        // MAL XML export (anime and/or manga)
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
            `runa-mal-export-anime-${username}-${timestamp}.xml`,
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
            `runa-mal-export-manga-${username}-${timestamp}.xml`,
            "application/xml",
          );
        }
        toast.success("MAL XML exported successfully!");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to export lists.");
    } finally {
      setIsExporting(false);
    }
  };

  // Drag & drop handlers
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
        toast.error("Please upload a valid JSON file.");
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
      toast.error("You must be logged in to import lists.");
      return;
    }
    if (!importFile) {
      toast.error("Please select a file to import.");
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const payload = JSON.parse(text);

        // Simple validation checks
        if (typeof payload !== "object" || payload === null) {
          throw new Error("Invalid list backup structure.");
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
          throw new Error(errData?.message || "Failed to trigger lists import");
        }

        toast.success(
          "Import started! This process runs in the background. You'll receive a notification once it's complete.",
          { duration: 6000 },
        );
        setImportFile(null);
      } catch (err: any) {
        toast.error(err.message || "Failed to import lists file.");
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read the selected file.");
      setIsImporting(false);
    };

    reader.readAsText(importFile);
  };

  return (
    <div className="flex flex-col gap-6 p-2 h-full">
      {/* Alert Info Banner */}
      <div className="flex gap-3 bg-muted/40 border border-border/60 p-4 rounded-xl items-start">
        <Info className="size-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 flex flex-col gap-1 text-left">
          <span className="text-sm font-semibold text-foreground">
            Synchronizing with External Accounts
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If you want to import or sync lists from AniList, MyAnimeList (MAL),
            or Simkl, please configure them in the{" "}
            <button
              onClick={() => setActiveCategory?.("connections")}
              className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
            >
              Connections Tab <ExternalLink className="size-3" />
            </button>{" "}
            instead of importing a backup file.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Export Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="size-5 text-primary" />
              Export Lists
            </CardTitle>
            <CardDescription className="text-xs">
              Save your media lists to a local file.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 text-left">
            {/* Format Selection */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Export Format
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === "json" ? "default" : "outline"}
                  onClick={() => handleFormatChange("json")}
                  className="flex-1 text-xs"
                  size="sm"
                >
                  <FileJson className="size-4 mr-1.5" />
                  rrList (JSON)
                </Button>
                <Button
                  variant={exportFormat === "mal-xml" ? "default" : "outline"}
                  onClick={() => handleFormatChange("mal-xml")}
                  className="flex-1 text-xs"
                  size="sm"
                >
                  <FileCode className="size-4 mr-1.5" />
                  MyAnimeList (XML)
                </Button>
              </div>
            </div>

            {/* List Selection */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">
                  Select Lists
                </Label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-[10px] text-primary hover:underline"
                  >
                    All
                  </button>
                  <span className="text-[10px] text-muted-foreground">|</span>
                  <button
                    onClick={handleSelectNone}
                    className="text-[10px] text-primary hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 border border-border/40 rounded-xl">
                {MEDIA_TYPES.map((type) => {
                  const isDisabled =
                    exportFormat === "mal-xml" &&
                    type.id !== "anime" &&
                    type.id !== "manga";

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
                        {type.label}
                      </Label>
                    </div>
                  );
                })}
              </div>

              {exportFormat === "mal-xml" && (
                <div className="flex gap-1.5 items-start text-[11px] text-amber-500 font-medium leading-normal bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                  <span>
                    MyAnimeList XML format only supports Anime and Manga. TV,
                    Movies, Games, and Books will not be exported.
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
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-1.5 size-4" />
                  Export Selected Lists
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
              Import Lists
            </CardTitle>
            <CardDescription className="text-xs">
              Load your media lists from an rrList JSON backup file.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-left">
            {/* Drag & Drop Upload Zone */}
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
                  <span className="text-xs font-semibold text-foreground max-w-[200px] truncate">
                    {importFile.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(importFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="text-xs font-semibold text-foreground">
                    Drag and drop your file here
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    or click to browse from files
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
                  Clear File
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
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 size-4" />
                    Start Import
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
