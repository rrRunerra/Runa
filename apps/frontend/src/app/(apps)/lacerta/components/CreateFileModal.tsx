"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  createType: "doc" | "sheet" | "note" | "slide" | "canvas" | "mermaid" | "uml" | null;
  createName: string;
  setCreateName: (name: string) => void;
  createFormat: string;
  setCreateFormat: (format: string) => void;
  onSubmit: () => void;
}

export function CreateFileModal({
  isOpen,
  onClose,
  createType,
  createName,
  setCreateName,
  createFormat,
  setCreateFormat,
  onSubmit,
}: CreateFileModalProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getTypeLabel = () => {
    switch (createType) {
      case "doc":
        return t("lacerta.fileTypeDocument");
      case "sheet":
        return t("lacerta.fileTypeSpreadsheet");
      case "slide":
        return t("lacerta.fileTypePresentation");
      case "note":
        return t("lacerta.fileTypeNote");
      case "canvas":
        return t("lacerta.fileTypeCanvas");
      case "mermaid":
        return t("lacerta.fileTypeMermaid");
      case "uml":
        return t("lacerta.fileTypeUml");
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in duration-150">
        <h3 className="text-sm font-bold text-foreground mb-4">
          {t("lacerta.createNewFile", { type: getTypeLabel() })}
        </h3>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">{t("lacerta.fileName")}</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={t("lacerta.fileName")}
              className="bg-muted/10 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground/60 w-full"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
            />
          </div>

          {(createType === "doc" || createType === "sheet" || createType === "slide") && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">{t("lacerta.fileFormat")}</label>
              <select
                value={createFormat}
                onChange={(e) => setCreateFormat(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none w-full"
              >
                {createType === "doc" && (
                  <>
                    <option value=".docx">Microsoft Word (.docx)</option>
                    <option value=".doc">Legacy Word (.doc)</option>
                    <option value=".odt">OpenDocument Text (.odt)</option>
                    <option value=".rtf">Rich Text Format (.rtf)</option>
                    <option value=".txt">Plain Text (.txt)</option>
                    <option value=".html">HTML Document (.html)</option>
                    <option value=".epub">E-book (.epub)</option>
                    <option value=".pages">Apple Pages (.pages)</option>
                    <option value=".hwp">Hancom Word (.hwp)</option>
                  </>
                )}
                {createType === "sheet" && (
                  <>
                    <option value=".xlsx">Microsoft Excel (.xlsx)</option>
                    <option value=".xls">Legacy Excel (.xls)</option>
                    <option value=".xlsm">Excel Macro-Enabled (.xlsm)</option>
                    <option value=".xlsb">Excel Binary (.xlsb)</option>
                    <option value=".ods">OpenDocument Spreadsheet (.ods)</option>
                    <option value=".csv">Comma Separated Values (.csv)</option>
                    <option value=".numbers">Apple Numbers (.numbers)</option>
                  </>
                )}
                {createType === "slide" && (
                  <>
                    <option value=".pptx">Microsoft PowerPoint (.pptx)</option>
                    <option value=".ppt">Legacy PowerPoint (.ppt)</option>
                    <option value=".odp">OpenDocument Presentation (.odp)</option>
                    <option value=".ppsx">PowerPoint Slideshow (.ppsx)</option>
                    <option value=".potx">PowerPoint Template (.potx)</option>
                    <option value=".key">Apple Keynote (.key)</option>
                  </>
                )}
              </select>
            </div>
          )}

        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="flex items-center gap-1.5 text-success">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">{t("lacerta.encrypting")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 border border-border hover:bg-muted/10 rounded-lg text-xs font-semibold text-foreground transition-all"
            >
              {t("lacerta.cancel")}
            </button>
            <button
              onClick={onSubmit}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg transition-all shadow-md active:scale-98"
            >
              {t("lacerta.create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
