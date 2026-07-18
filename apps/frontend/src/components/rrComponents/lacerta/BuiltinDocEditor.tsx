"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileText,
  Share2,
  Users,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { encrypt } from "@runa/crypto/browser";
import { useTranslation } from "react-i18next";

interface DocFileItem {
  id: string;
  name: string;
  key: string;
  decryptedKey: CryptoKey | null;
  wrappedKey?: string;
  parentId?: string | null;
}

interface BuiltinDocEditorProps {
  isOpen: boolean;
  onClose: () => void;
  file: DocFileItem | null;
  initialContent: string; // Plaintext html/string
  accessToken: string;
  onSaveSuccess: () => void;
}

export default function BuiltinDocEditor({
  isOpen,
  onClose,
  file,
  initialContent,
  accessToken,
  onSaveSuccess,
}: BuiltinDocEditorProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<string>("16");
  const [fontFamily, setFontFamily] = useState<string>("serif");

  const pageRef = useRef<HTMLDivElement | null>(null);

  // Load content
  useEffect(() => {
    if (isOpen) {
      // If content is empty or doesn't look like HTML, wrap it in paragraphs
      if (!initialContent.trim()) {
        setHtmlContent(`<p>${t("lacerta.builtinDocEditor.startTyping", "Start typing your document here...")}</p>`);
      } else if (!initialContent.startsWith("<")) {
        setHtmlContent(
          initialContent
             .split("\n\n")
             .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
             .join(""),
        );
      } else {
        setHtmlContent(initialContent);
      }
      setHasChanges(false);
    }
  }, [isOpen, initialContent, t]);

  if (!isOpen || !file) return null;

  const handleInput = () => {
    if (pageRef.current) {
      setHtmlContent(pageRef.current.innerHTML);
      setHasChanges(true);
    }
  };

  const execCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleSave = async () => {
    if (!file.decryptedKey) return;
    setIsSaving(true);
    try {
      const encoder = new TextEncoder();
      const contentToSave = pageRef.current
        ? pageRef.current.innerHTML
        : htmlContent;
      const rawBuffer = encoder.encode(contentToSave).buffer;

      // Encrypt file
      const encryptedBuffer = await encrypt(
        rawBuffer,
        file.decryptedKey,
      );

      // S3 post upload form
      const encName = await encrypt(file.name, file.decryptedKey);
      const encType = await encrypt("application/vnd.oasis.opendocument.text", file.decryptedKey);

      const formData = new FormData();
      const blob = new Blob([encryptedBuffer], {
        type: "application/octet-stream",
      });
      formData.append("file", blob, file.name);
      formData.append("wrappedKey", file.wrappedKey || "");
      formData.append("name", encName);
      formData.append("size", blob.size.toString());
      formData.append("type", encType);
      if (file.parentId) {
        formData.append("parentId", file.parentId);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        },
      );
      if (!res.ok) {
        let errMsg = t("lacerta.builtinDocEditor.saveFailed", "Failed to save document.");
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errMsg = errData.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      toast.success(t("lacerta.builtinDocEditor.saveSuccess", "Document saved successfully!"));
      setHasChanges(false);
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || t("lacerta.builtinDocEditor.saveFailed", "Failed to save document."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-muted/30">
      {/* Top Banner (Word Processor Style) */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (
                hasChanges &&
                !confirm(t("lacerta.builtinDocEditor.unsavedChangesConfirm", "You have unsaved changes. Exit anyway?"))
              )
                return;
              onClose();
            }}
            className="p-1.5 border border-border hover:bg-muted/10 rounded-lg text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {file.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t("lacerta.builtinDocEditor.editorTitle", "Collabora Document Editor")}
              </span>
            </div>
          </div>
        </div>

        {/* Live editing simulation avatars */}
        <div className="flex items-center gap-4">
          <div className="flex items-center -space-x-2">
            <div
              className="h-6 w-6 rounded-full border border-card bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center cursor-pointer hover:scale-105 transition-all"
              title={t("lacerta.builtinDocEditor.userEditing", "You (Editing)")}
            >
              Y
            </div>
            <div
              className="h-6 w-6 rounded-full border border-card bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center cursor-pointer hover:scale-105 transition-all"
              title={t("lacerta.builtinDocEditor.aliceActive", "Alice (Active)")}
            >
              A
            </div>
            <div
              className="h-6 w-6 rounded-full border border-card bg-indigo-500 text-[10px] font-bold text-white flex items-center justify-center cursor-pointer hover:scale-105 transition-all"
              title={t("lacerta.builtinDocEditor.bobViewing", "Bob (Viewing)")}
            >
              B
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-muted-foreground italic">
                {t("lacerta.builtinDocEditor.unsaved", "Unsaved")}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaving ? t("lacerta.builtinDocEditor.saving", "Saving...") : t("lacerta.builtinDocEditor.save", "Save")}
            </button>
          </div>
        </div>
      </div>

      {/* Editing Formatting Toolbar */}
      <div className="h-10 border-b border-border bg-card flex items-center gap-1 px-6 shrink-0 shadow-sm overflow-x-auto no-scrollbar">
        {/* Font Families */}
        <select
          value={fontFamily}
          onChange={(e) => {
            setFontFamily(e.target.value);
            execCommand("fontName", e.target.value);
          }}
          className="h-7 border border-border rounded bg-background px-2 text-xs text-foreground outline-none"
        >
          <option value="sans-serif">{t("lacerta.builtinDocEditor.sansSerif", "Sans-Serif")}</option>
          <option value="serif">{t("lacerta.builtinDocEditor.serif", "Serif (A4 Standard)")}</option>
          <option value="monospace">{t("lacerta.builtinDocEditor.monospace", "Monospace")}</option>
        </select>

        {/* Font Sizes */}
        <select
          value={fontSize}
          onChange={(e) => {
            setFontSize(e.target.value);
            execCommand("fontSize", e.target.value);
          }}
          className="h-7 border border-border rounded bg-background px-2 text-xs text-foreground outline-none w-14"
        >
          <option value="12">12</option>
          <option value="14">14</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="24">24</option>
          <option value="32">32</option>
        </select>

        <div className="w-px h-4 bg-border mx-2" />

        <button
          onClick={() => execCommand("bold")}
          className="p-1.5 hover:bg-muted/15 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.builtinDocEditor.bold", "Bold")}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => execCommand("italic")}
          className="p-1.5 hover:bg-muted/15 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.builtinDocEditor.italic", "Italic")}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => execCommand("underline")}
          className="p-1.5 hover:bg-muted/15 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.builtinDocEditor.underline", "Underline")}
        >
          <Underline className="h-4 w-4" />
        </button>

        <div className="w-px h-4 bg-border mx-2" />

        <button
          onClick={() => execCommand("justifyLeft")}
          className="p-1.5 hover:bg-muted/15 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.builtinDocEditor.alignLeft", "Align Left")}
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => execCommand("justifyCenter")}
          className="p-1.5 hover:bg-muted/15 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.builtinDocEditor.alignCenter", "Align Center")}
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          onClick={() => execCommand("justifyRight")}
          className="p-1.5 hover:bg-muted/15 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.builtinDocEditor.alignRight", "Align Right")}
        >
          <AlignRight className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Page Layout Container */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center no-scrollbar">
        {/* Simulated A4 Paper */}
        <div className="relative w-full max-w-[800px] min-h-[1100px] border border-border bg-white text-black p-12 shadow-2xl rounded-sm flex flex-col focus-visible:outline-none">
          <div
            ref={pageRef}
            contentEditable
            onInput={handleInput}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            className="flex-1 outline-none prose max-w-none text-base font-serif leading-relaxed text-slate-800"
            style={{
              fontFamily:
                fontFamily === "serif"
                  ? "Georgia, serif"
                  : fontFamily === "monospace"
                    ? "Courier, monospace"
                    : "Inter, sans-serif",
              fontSize: `${fontSize}px`,
            }}
          />

          {/* Floating mock cursors of other users */}
          <div className="absolute top-[200px] left-[350px] flex items-center pointer-events-none animate-pulse">
            <div className="h-4 w-[2px] bg-amber-500" />
            <span className="bg-amber-500 text-white font-bold text-[8px] px-1 py-0.5 rounded ml-0.5 whitespace-nowrap">
              {t("lacerta.builtinDocEditor.aliceTyping", "Alice typing")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
