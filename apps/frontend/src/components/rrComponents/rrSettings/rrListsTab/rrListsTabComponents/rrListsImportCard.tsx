"use client";

import type React from "react";
import { Upload, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface RrListsImportCardProps {
  importFile: File | null;
  isImporting: boolean;
  dragActive: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerFileSelect: () => void;
  onClearFile: () => void;
  onImport: () => void;
}

export function RrListsImportCard({
  importFile,
  isImporting,
  dragActive,
  fileInputRef,
  onDrag,
  onDrop,
  onFileSelect,
  onTriggerFileSelect,
  onClearFile,
  onImport,
}: RrListsImportCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Card className="flex-1 flex flex-col min-h-0 border border-border/80 bg-card shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 text-left">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
          <Upload className="size-4.5 text-primary" />
          {t("lists.importLists")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {t("lists.loadBackupDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 text-left p-4 sm:p-5 pt-0">
        <div
          className={cn(
            "flex-1 min-h-52 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/15",
            importFile && "border-solid border-primary/45 bg-primary/5",
          )}
          onDragEnter={onDrag}
          onDragOver={onDrag}
          onDragLeave={onDrag}
          onDrop={onDrop}
          onClick={onTriggerFileSelect}
        >
          <input
            ref={fileInputRef as any}
            type="file"
            className="hidden"
            accept=".json"
            onChange={onFileSelect}
          />
          <div
            className={cn(
              "size-12 rounded-2xl flex items-center justify-center transition-all",
              dragActive || importFile
                ? "bg-primary/15 text-primary"
                : "bg-muted/40 text-muted-foreground",
            )}
          >
            {importFile ? (
              <FileJson className="size-6 text-primary" />
            ) : (
              <Upload className="size-6 text-muted-foreground" />
            )}
          </div>
          {importFile ? (
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs font-bold text-foreground max-w-56 truncate">
                {importFile.name}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {(importFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs font-bold text-foreground">
                {t("lists.dragDropHere")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {t("lists.clickToBrowse")}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          {importFile && (
            <Button
              type="button"
              variant="outline"
              onClick={onClearFile}
              className="flex-1 text-xs font-semibold h-9 rounded-xl cursor-pointer"
              size="sm"
              disabled={isImporting}
            >
              {t("lists.clearFile")}
            </Button>
          )}
          <Button
            type="button"
            onClick={onImport}
            disabled={isImporting || !importFile}
            className={cn(
              "flex-1 text-xs font-semibold h-9 rounded-xl cursor-pointer",
              !importFile && "w-full",
            )}
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
  );
}
