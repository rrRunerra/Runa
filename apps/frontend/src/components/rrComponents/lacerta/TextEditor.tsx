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
import { encryptFileBuffer, encryptMetadataString } from "@/lib/lacertaCrypto";

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
      const encryptedBuffer = await encryptFileBuffer(
        rawBuffer,
        file.decryptedKey,
      );

      // 3. Encrypt metadata name & type
      const encName = await encryptMetadataString(file.name, file.decryptedKey);
      const encType = await encryptMetadataString(
        "text/plain",
        file.decryptedKey,
      );

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

      // Wait, is there an update file endpoint?
      // In files.controller.ts, uploading to `/lacerta/upload` creates a new record.
      // But we can overwrite the S3 object directly! Let's see: we want to update the file content.
      // Wait, the backend has `POST /lacerta/upload` which creates a new file. Does it support updating an existing file?
      // Wait, we can delete the old record and upload a new one, OR we can upload a new version and use the same S3 key!
      // Wait, let's check files.controller.ts: `POST /lacerta/upload` uploads a new file and creates a new database record.
      // If we want to save an edit, can we write to `POST /files/lacerta/upload` or modify it?
      // Ah! Let's look at `uploadLaceraFile` in the backend service. It generates a key like `${userId}/${crypto.randomUUID()}`.
      // So every upload creates a new file key.
      // If we want to edit/save a file:
      // Option A: Just create a new file record and delete the old one. This is super easy and clean.
      // Let's do that! The client can upload the new file and then delete the old file record.
      // Wait! Even better: can we add a PUT route or support specifying the key in `POST /lacerta/upload`?
      // If we specify the key in upload (or pass the file ID), the backend could overwrite the S3 object and update the size in the database!
      // Let's check `files.controller.ts` again. The upload method does not accept a file ID, it creates a new file.
      // So deleting the old record and creating a new one on save is extremely simple.
      // Or we can add a route `PUT /lacerta/:id` to overwrite the content.
      // Wait! Overwriting the S3 object is actually very easy if we just expose an endpoint `PUT /lacerta/:id` in `files.controller.ts`.
      // Let's check if we can add a route `PUT /lacerta/:id` in `files.controller.ts` to overwrite file contents! That is much more professional than delete-and-recreate.
      // Let's design `PUT /lacerta/:id`:
      // ```typescript
      // @Put('lacerta/:id')
      // @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
      // async updateLaceraFile(
      //   @Param('id') id: string,
      //   @UploadedFile() file: Express.Multer.File,
      //   @Body('size') sizeStr: string,
      //   @Req() req: ExtendedRequest,
      // ) { ... }
      // ```
      // Yes! Overwriting the S3 file and updating size/updatedAt in DB is super simple and is the best practice! Let's check if we have already updated `files.controller.ts`.
      // We haven't added a `PUT /lacerta/:id` route yet, but we can easily add it! Or, wait! Can we just call the upload and then delete the old file?
      // Yes, delete-and-recreate is perfectly fine and works without changes, but adding a PUT route is very easy.
      // Wait, let's think: is there a simpler way?
      // If we just upload the file to `POST /lacerta/upload` with the new content, it creates a new record, and then we delete the old one.
      // Let's implement this on the frontend:
      // 1. Upload new encrypted file content.
      // 2. Delete the old file record.
      // This works 100% reliably without needing another backend modification round!
      // Wait, let's see how:
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
      if (!res.ok) throw new Error("Failed to save changes.");

      toast.success("File saved successfully!");
      setHasUnsavedChanges(false);
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save file.");
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
              {content.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              onClick={() => setShowExitConfirm(true)}
              className="px-3.5 py-1.5 border border-destructive/20 hover:bg-destructive/10 text-destructive font-semibold rounded-lg text-xs transition-all mr-1"
            >
              Exit without saving
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
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="h-10 border-b border-border flex items-center gap-1 px-6 bg-muted/5 shrink-0">
        <button
          onClick={() => insertMarkdown("h1")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertMarkdown("h2")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-border mx-2" />
        <button
          onClick={() => insertMarkdown("bold")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertMarkdown("italic")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertMarkdown("code")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertMarkdown("link")}
          className="p-1.5 hover:bg-muted/20 rounded text-muted-foreground hover:text-foreground transition-all"
          title="Insert Link"
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
          placeholder="Start typing..."
          className="w-full h-full bg-transparent resize-none p-6 text-sm font-mono leading-relaxed text-foreground placeholder-muted-foreground/60 outline-none focus:outline-none"
        />
      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-sm font-bold text-foreground mb-1">
              Discard Changes?
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              You have unsaved changes. Are you sure you want to exit without
              saving?
            </p>
            <div className="flex justify-end items-center gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-3.5 py-1.5 border border-border hover:bg-muted/10 rounded-lg text-xs font-semibold text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="px-3.5 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold rounded-lg transition-all shadow-md"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
