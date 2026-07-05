"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { encryptFileBuffer, encryptMetadataString } from "@/lib/lacertaCrypto";
import mermaid from "mermaid";

// Initialize Mermaid with safe/clean styling
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  themeVariables: {
    background: "transparent",
    primaryColor: "#6366f1",
    primaryTextColor: "#f8fafc",
    lineColor: "#475569",
  },
});

interface MermaidFileItem {
  id: string;
  name: string;
  key: string;
  decryptedKey: CryptoKey | null;
  wrappedKey?: string;
  parentId?: string | null;
}

interface MermaidEditorProps {
  isOpen: boolean;
  onClose: () => void;
  file: MermaidFileItem | null;
  initialContent: string;
  accessToken: string;
  onSaveSuccess: () => void;
}

const DEFAULT_MERMAID_TEMPLATE = `graph TD
    A[Start] --> B(Processes)
    B --> C{Decision}
    C -- Yes --> D[Result 1]
    C -- No --> E[Result 2]`;

export default function MermaidEditor({
  isOpen,
  onClose,
  file,
  initialContent,
  accessToken,
  onSaveSuccess,
}: MermaidEditorProps): React.JSX.Element | null {
  const [content, setContent] = useState<string>("");
  const [svgContent, setSvgContent] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const code = initialContent || DEFAULT_MERMAID_TEMPLATE;
      setContent(code);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, initialContent]);

  // Debounced client-side mermaid rendering
  useEffect(() => {
    if (!content.trim()) {
      setSvgContent("");
      setRenderError(null);
      return;
    }

    const renderGraph = async () => {
      const uniqueId = `mermaid-render-${Date.now()}`;
      try {
        const { svg } = await mermaid.render(uniqueId, content);
        setSvgContent(svg);
        setRenderError(null);
      } catch (err: any) {
        // Find and remove the temp element created by mermaid if render crashed
        const tempEl = document.getElementById(uniqueId);
        if (tempEl) tempEl.remove();
        
        // Grab error message
        setRenderError(err?.message || "Mermaid rendering compilation failed. Please check syntax.");
      }
    };

    const debounce = setTimeout(renderGraph, 300);
    return () => clearTimeout(debounce);
  }, [content]);

  if (!isOpen || !file) return null;

  const handleSave = async () => {
    if (!file.decryptedKey) return;
    setIsSaving(true);
    try {
      const encoder = new TextEncoder();
      const rawBuffer = encoder.encode(content).buffer;

      // Encrypt file & metadata
      const encryptedBuffer = await encryptFileBuffer(rawBuffer, file.decryptedKey);
      const encName = await encryptMetadataString(file.name, file.decryptedKey);
      const encType = await encryptMetadataString("application/mermaid", file.decryptedKey);

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

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        }
      );
      if (!res.ok) throw new Error("Failed to save changes.");

      toast.success("Mermaid Diagram saved successfully!");
      setHasUnsavedChanges(false);
      onSaveSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save file.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted/30 rounded-lg text-muted-foreground hover:text-foreground transition-all"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">
              {file.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Mermaid Diagram Editor
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-[10px] bg-warning/10 text-warning px-2.5 py-0.5 rounded-full font-semibold border border-warning/20">
              Unsaved Changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Diagram
          </button>
        </div>
      </header>

      {/* Editor & Preview Split Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor Pane (Left) */}
        <div className="w-1/2 border-r border-border flex flex-col h-full bg-slate-950/20">
          <div className="px-4 py-2 border-b border-border bg-card/10 shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Mermaid Code
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="graph TD..."
            className="flex-1 w-full bg-transparent p-4 font-mono text-xs text-slate-300 focus:outline-none resize-none leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const val = e.currentTarget.value;
                setContent(val.substring(0, start) + "    " + val.substring(end));
                setTimeout(() => {
                  if (e.currentTarget) {
                    e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
                  }
                }, 0);
              }
            }}
          />
        </div>

        {/* Live Preview Pane (Right) */}
        <div className="w-1/2 flex flex-col h-full bg-slate-950/5 relative">
          <div className="px-4 py-2 border-b border-border bg-card/10 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Live Preview
            </span>
            {renderError && (
              <span className="text-[9px] font-bold text-destructive animate-pulse">
                Compilation Error
              </span>
            )}
          </div>

          <div className="flex-1 p-6 overflow-auto flex items-center justify-center min-h-0">
            {renderError ? (
              <div className="w-full max-w-md p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-xs leading-normal font-mono whitespace-pre-wrap">
                {renderError}
              </div>
            ) : svgContent ? (
              <div
                className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:h-auto text-foreground"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <div className="text-xs text-muted-foreground">
                Enter code to preview diagram
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
