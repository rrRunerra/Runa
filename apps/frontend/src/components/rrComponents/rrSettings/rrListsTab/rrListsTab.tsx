"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  MEDIA_TYPES,
  type ExportFormat,
  RrListsExportCard,
  RrListsImportCard,
} from "./rrListsTabComponents";

export interface RrListsTabProps {
  /** Callback to close parent settings modal */
  onOpenChange: (open: boolean) => void;
  /** Callback to switch active category tab in settings dialog */
  setActiveCategory?: (category: any) => void;
  /** Optional callback to render custom footer controls into parent settings dialog */
  setFooterContent?: (node: React.ReactNode | null) => void;
}

/**
 * Component managing import and export of user media lists across formats (JSON, MAL XML, AniList, Simkl, Trakt).
 */
export function RrListsTab({
  onOpenChange,
  setActiveCategory: _setActiveCategory,
  setFooterContent,
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
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize footer actions with parent settings modal
  useEffect(() => {
    if (!setFooterContent) return;
    setFooterContent(
      <div className="flex items-center justify-end w-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
        >
          {t("settingsModal.close", { defaultValue: "Close" })}
        </Button>
      </div>,
    );
    return () => setFooterContent(null);
  }, [setFooterContent, onOpenChange, t]);

  // Export handlers
  const handleToggleType = (typeId: string) => {
    const isXml = ["mal-xml", "anilist-xml", "simkl-xml"].includes(exportFormat);
    if (isXml && typeId !== "anime" && typeId !== "manga") {
      return;
    }
    if (exportFormat === "trakt-json" && typeId !== "tv" && typeId !== "movie") {
      return;
    }
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId],
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

  const handleFormatChange = (format: ExportFormat) => {
    setExportFormat(format);
    if (["mal-xml", "anilist-xml", "simkl-xml"].includes(format)) {
      setSelectedTypes((prev) => prev.filter((id) => id === "anime" || id === "manga"));
    } else if (format === "trakt-json") {
      setSelectedTypes((prev) => prev.filter((id) => id === "tv" || id === "movie"));
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
      toast.error(t("lists.mustBeLoggedInExport", { defaultValue: "You must be logged in to export lists." }));
      return;
    }
    if (selectedTypes.length === 0) {
      toast.error(t("lists.selectAtLeastOneExport", { defaultValue: "Please select at least one media type to export." }));
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
          `${exportFormat === "trakt-json" ? "Trakt JSON" : "JSON"} ${t("lists.exportSuccess", { defaultValue: "lists exported successfully!" })}`,
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
          `${providerName === "mal" ? "MAL XML" : providerName.charAt(0).toUpperCase() + providerName.slice(1) + " XML"} ${t("lists.exportSuccess", { defaultValue: "exported successfully!" })}`,
        );
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || t("lists.failedExport", { defaultValue: "Failed to export lists." }));
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
    <div className="flex-1 flex flex-col min-h-0 h-full text-left overflow-y-auto pr-1 scrollbar-thin">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <RrListsExportCard
          exportFormat={exportFormat}
          selectedTypes={selectedTypes}
          isExporting={isExporting}
          onFormatChange={handleFormatChange}
          onToggleType={handleToggleType}
          onSelectAll={handleSelectAll}
          onSelectNone={handleSelectNone}
          onExport={handleExport}
        />

        <RrListsImportCard
          importFile={importFile}
          isImporting={isImporting}
          dragActive={dragActive}
          fileInputRef={fileInputRef}
          onDrag={handleDrag}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
          onTriggerFileSelect={triggerFileSelect}
          onClearFile={() => setImportFile(null)}
          onImport={handleImport}
        />
      </div>
    </div>
  );
}
