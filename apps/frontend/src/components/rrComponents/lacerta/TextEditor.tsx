"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Bold,
  Italic,
  Code,
  Link,
  Heading1,
  Heading2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { encrypt } from "@runa/crypto/browser";
import { useTranslation } from "react-i18next";

interface TextFileItem {
  id: string;
  name: string;
  key: string;
  decryptedKey: CryptoKey | null;
  wrappedKey?: string;
  parentId?: string | null;
}

interface TextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  file: TextFileItem | null;
  initialContent: string;
  accessToken: string;
  onSaveSuccess: () => void;
}

export default function TextEditor({
  isOpen,
  onClose,
  file,
  initialContent,
  accessToken,
  onSaveSuccess,
}: TextEditorProps): React.JSX.Element | null {
  const [content, setContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, initialContent]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  if (!isOpen || !file) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!file.decryptedKey) return;
    setIsSaving(true);
    try {
      // 1. Encode text to buffer
      const encoder = new TextEncoder();
      const rawBuffer = encoder.encode(content).buffer;

      // 2. Encrypt buffer
      const encryptedBuffer = await encrypt(rawBuffer, file.decryptedKey);

      // 3. Encrypt metadata name & type
      const encName = await encrypt(file.name, file.decryptedKey);
      const encType = await encrypt("text/plain", file.decryptedKey);

      // 4. Upload to server
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
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
      );
      if (!res.ok)
        throw new Error(
          t("lacerta.textEditor.saveFailed", "Failed to save changes."),
        );

      toast.success(
        t("lacerta.textEditor.saveSuccess", "File saved successfully!"),
      );
      setHasUnsavedChanges(false);
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err.message ||
          t("lacerta.textEditor.saveFailedGeneric", "Failed to save file."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const insertMarkdown = (syntax: string) => {
    const textarea = document.getElementById(
      "editor-textarea",
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = "";
    if (syntax === "bold") replacement = `**${selected || "bold text"}**`;
    else if (syntax === "italic")
      replacement = `*${selected || "italic text"}*`;
    else if (syntax === "code") replacement = `\`${selected || "code"}\``;
    else if (syntax === "link")
      replacement = `[${selected || "link text"}](https://)`;
    else if (syntax === "h1") replacement = `# ${selected || "Heading 1"}\n`;
    else if (syntax === "h2") replacement = `## ${selected || "Heading 2"}\n`;

    setContent(text.substring(0, start) + replacement + text.substring(end));
    setHasUnsavedChanges(true);
    textarea.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top Navigation */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                setShowExitConfirm(true);
                return;
              }
              onClose();
            }}
            className="p-1.5 border border-border hover:bg-muted/10 rounded-lg text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {file.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t("lacerta.textEditor.wordCount", {
                count: content.split(/\s+/).filter(Boolean).length,
                defaultValue: "{{count}} words",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="px-3.5 py-1.5 border border-destructive/20 hover:bg-destructive/10 text-destructive font-semibold rounded-lg text-xs transition-all mr-1"
            >
              {t("lacerta.textEditor.exitWithoutSaving", "Exit without saving")}
            </button>
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
            {isSaving
              ? t("lacerta.textEditor.saving", "Saving...")
              : t("lacerta.textEditor.save", "Save")}
          </button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="h-10 border-b border-border flex items-center gap-1 px-6 bg-muted/5 shrink-0">
        <button
          onClick={() => insertMarkdown("h1")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.textEditor.heading1", "Heading 1")}
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertMarkdown("h2")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.textEditor.heading2", "Heading 2")}
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-border mx-2" />
        <button
          onClick={() => insertMarkdown("bold")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.textEditor.bold", "Bold")}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertMarkdown("italic")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.textEditor.italic", "Italic")}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertMarkdown("code")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.textEditor.codeBlock", "Code Block")}
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertMarkdown("link")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title={t("lacerta.textEditor.insertLink", "Insert Link")}
        >
          <Link className="h-4 w-4" />
        </button>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Editor Area */}
        <textarea
          id="editor-textarea"
          value={content}
          onChange={handleTextChange}
          placeholder={t("lacerta.textEditor.startTyping", "Start typing...")}
          className="w-full h-full bg-transparent resize-none p-6 text-sm font-mono leading-relaxed text-foreground placeholder-muted-foreground/60 outline-none focus:outline-none"
        />
      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-sm font-bold text-foreground mb-1">
              {t("lacerta.textEditor.discardChangesTitle", "Discard Changes?")}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {t(
                "lacerta.textEditor.discardChangesDesc",
                "You have unsaved changes. Are you sure you want to exit without saving?",
              )}
            </p>
            <div className="flex justify-end items-center gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-3.5 py-1.5 border border-border hover:bg-muted/10 rounded-lg text-xs font-semibold text-foreground transition-all"
              >
                {t("lacerta.textEditor.cancel", "Cancel")}
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="px-3.5 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold rounded-lg transition-all shadow-md"
              >
                {t("lacerta.textEditor.discardExit", "Discard & Exit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
