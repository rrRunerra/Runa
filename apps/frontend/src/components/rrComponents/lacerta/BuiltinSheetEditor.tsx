"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, Grid3X3, Plus, Trash, Download } from "lucide-react";
import { toast } from "sonner";
import { encrypt } from "@runa/crypto/browser";
import { useTranslation } from "react-i18next";

interface SheetFileItem {
  id: string;
  name: string;
  key: string;
  decryptedKey: CryptoKey | null;
  wrappedKey?: string;
  parentId?: string | null;
}

interface BuiltinSheetEditorProps {
  isOpen: boolean;
  onClose: () => void;
  file: SheetFileItem | null;
  initialContent: string; // Plaintext json/csv/string
  accessToken: string;
  onSaveSuccess: () => void;
}

export default function BuiltinSheetEditor({
  isOpen,
  onClose,
  file,
  initialContent,
  accessToken,
  onSaveSuccess,
}: BuiltinSheetEditorProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [data, setData] = useState<Record<string, string>>({});
  const [activeCell, setActiveCell] = useState<string>("A1");
  const [formulaValue, setFormulaValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const [cols, setCols] = useState<string[]>(["A", "B", "C", "D", "E", "F", "G", "H"]);
  const [rows, setRows] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  // Load content
  useEffect(() => {
    if (isOpen) {
      try {
        if (initialContent.trim()) {
          const parsed = JSON.parse(initialContent);
          setData(parsed);
        } else {
          setData({});
        }
      } catch {
        // Fallback or import simple CSV
        setData({});
      }
      setHasChanges(false);
      setActiveCell("A1");
      setFormulaValue("");
    }
  }, [isOpen, initialContent]);

  useEffect(() => {
    setFormulaValue(data[activeCell] || "");
  }, [activeCell, data]);

  if (!isOpen || !file) return null;

  const handleCellChange = (cell: string, value: string) => {
    setData((prev) => ({ ...prev, [cell]: value }));
    setHasChanges(true);
  };

  const handleFormulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormulaValue(e.target.value);
    handleCellChange(activeCell, e.target.value);
  };

  const addRow = () => {
    setRows((prev) => [...prev, prev.length + 1]);
  };

  const addCol = () => {
    const nextChar = String.fromCharCode(65 + cols.length); // Next alphabet character
    if (cols.length < 26) {
      setCols((prev) => [...prev, nextChar]);
    }
  };

  // Evaluate simple SUM formulas like =SUM(A1:A5)
  const evaluateValue = (val: string) => {
    if (!val || !val.startsWith("=")) return val;

    try {
      const match = val.match(/^=SUM\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)$/i);
      if (match) {
        const start = match[1].toUpperCase();
        const end = match[2].toUpperCase();

        const startCol = start.match(/[A-Z]+/)?.[0] || "";
        const startRow = parseInt(start.match(/[0-9]+/)?.[0] || "0", 10);
        const endCol = end.match(/[A-Z]+/)?.[0] || "";
        const endRow = parseInt(end.match(/[0-9]+/)?.[0] || "0", 10);

        if (startCol === endCol) {
          let sum = 0;
          for (let r = startRow; r <= endRow; r++) {
            const cellVal = parseFloat(data[`${startCol}${r}`] || "0");
            if (!isNaN(cellVal)) sum += cellVal;
          }
          return sum.toString();
        }
      }
      return "#FORMULA!";
    } catch {
      return "#ERROR!";
    }
  };

  const handleSave = async () => {
    if (!file.decryptedKey) return;
    setIsSaving(true);
    try {
      const encoder = new TextEncoder();
      const stringData = JSON.stringify(data);
      const rawBuffer = encoder.encode(stringData).buffer;

      // Encrypt file
      const encryptedBuffer = await encrypt(rawBuffer, file.decryptedKey);

      // S3 post upload form
      const encName = await encrypt(file.name, file.decryptedKey);
      const encType = await encrypt("application/vnd.oasis.opendocument.spreadsheet", file.decryptedKey);

      const formData = new FormData();
      const blob = new Blob([encryptedBuffer], { type: "application/octet-stream" });
      formData.append("file", blob, file.name);
      formData.append("wrappedKey", file.wrappedKey || "");
      formData.append("name", encName);
      formData.append("size", blob.size.toString());
      formData.append("type", encType);
      if (file.parentId) {
        formData.append("parentId", file.parentId);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!res.ok) {
        let errMsg = t("lacerta.builtinSheetEditor.saveFailed", "Failed to save spreadsheet.");
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errMsg = errData.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      toast.success(t("lacerta.builtinSheetEditor.saveSuccess", "Spreadsheet saved successfully!"));
      setHasChanges(false);
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || t("lacerta.builtinSheetEditor.saveFailed", "Failed to save spreadsheet."));
    } finally {
      setIsSaving(false);
    }
  };

  const exportCSV = () => {
    let csv = "";
    rows.forEach((r) => {
      const line = cols.map((c) => evaluateValue(data[`${c}${r}`] || "")).join(",");
      csv += line + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, "")}.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top Banner */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (hasChanges && !confirm(t("lacerta.builtinSheetEditor.unsavedChangesConfirm", "You have unsaved changes. Exit anyway?"))) return;
              onClose();
            }}
            className="p-1.5 border border-border hover:bg-muted/10 rounded-lg text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{file.name}</span>
              <span className="text-[10px] text-muted-foreground">{t("lacerta.builtinSheetEditor.editorTitle", "Collabora Spreadsheet Editor")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 border border-border bg-card hover:bg-muted/10 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-foreground transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            {t("lacerta.builtinSheetEditor.exportCsv", "Export CSV")}
          </button>
          {hasChanges && (
            <span className="text-xs text-muted-foreground italic">{t("lacerta.builtinSheetEditor.unsaved", "Unsaved")}</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isSaving ? t("lacerta.builtinSheetEditor.saving", "Saving...") : t("lacerta.builtinSheetEditor.save", "Save")}
          </button>
        </div>
      </div>

      {/* Formula Input Bar */}
      <div className="h-10 border-b border-border bg-card/60 flex items-center gap-2 px-6 shrink-0 shadow-sm">
        <div className="bg-muted px-2 py-0.5 rounded font-mono text-xs font-bold text-muted-foreground min-w-[36px] text-center border">
          {activeCell}
        </div>
        <div className="text-sm font-semibold text-muted-foreground select-none">fx</div>
        <input
          type="text"
          value={formulaValue}
          onChange={handleFormulaChange}
          placeholder={t("lacerta.builtinSheetEditor.formulaPlaceholder", "Enter text or formula (e.g. =SUM(A1:A5))")}
          className="flex-1 bg-background border border-border rounded px-3 py-1 text-xs text-foreground focus:outline-none focus:border-emerald-500 transition-all font-mono"
        />
        <button
          onClick={addRow}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.builtinSheetEditor.addRow", "Add Row")}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={addCol}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.builtinSheetEditor.addCol", "Add Column")}
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
      </div>

      {/* Sheet Grid Workspace */}
      <div className="flex-1 overflow-auto bg-muted/20">
        <table className="border-collapse table-fixed text-xs select-none">
          <thead>
            <tr className="bg-muted/80">
              <th className="w-12 border border-border font-bold text-muted-foreground bg-muted/60 text-center select-none sticky top-0 left-0 z-20"></th>
              {cols.map((col) => (
                <th
                  key={col}
                  className="w-28 border border-border font-semibold text-muted-foreground text-center select-none sticky top-0 bg-muted/60 z-10 py-1"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td className="border border-border font-semibold text-muted-foreground bg-muted/60 text-center select-none sticky left-0 py-1 font-mono">
                  {row}
                </td>
                {cols.map((col) => {
                  const cellId = `${col}${row}`;
                  const val = data[cellId] || "";
                  const evalVal = evaluateValue(val);
                  const isActive = activeCell === cellId;

                  return (
                    <td
                      key={cellId}
                      onClick={() => setActiveCell(cellId)}
                      className={`border border-border p-0.5 cursor-cell min-h-[24px] truncate transition-all duration-75 ${
                        isActive
                          ? "bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-500 z-10"
                          : "bg-background hover:bg-muted/10 text-foreground"
                      }`}
                    >
                      {isActive ? (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleCellChange(cellId, e.target.value)}
                          className="w-full h-full border-none bg-transparent outline-none px-1 text-foreground"
                          autoFocus
                        />
                      ) : (
                        <div className="px-1 truncate w-full h-full font-mono text-[11px]">
                          {evalVal}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
