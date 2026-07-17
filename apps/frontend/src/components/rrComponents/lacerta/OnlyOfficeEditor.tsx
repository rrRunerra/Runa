"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, FileText, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OnlyOfficeFileItem {
  id: string;
  name: string;
  type: string | null;
  updatedAt: string | Date;
}

interface OnlyOfficeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  file: OnlyOfficeFileItem | null;
  fileKey: string; // Base64Url symmetric key
  accessToken?: string; // Optional for guest users
  onSaveSuccess?: () => void;
  guestUserDisplayName?: string; // Optional custom name
}

// Dynamically load ONLYOFFICE API script
const loadOnlyOfficeScript = (url: string, errorMsg: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If script is already loaded
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`${errorMsg} ${url}`));
    document.head.appendChild(script);
  });
};

const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
};

const getDocumentType = (
  ext: string,
): "word" | "cell" | "slide" | "pdf" | "diagram" => {
  switch (ext) {
    // Spreadsheets
    case "xls":
    case "xlsx":
    case "ods":
    case "csv":
    case "xlsm":
    case "xlsb":
    case "numbers":
      return "cell";
    // Presentations
    case "ppt":
    case "pptx":
    case "odp":
    case "ppsx":
    case "potx":
    case "keynote":
    case "key":
      return "slide";
    // PDF and related
    case "pdf":
    case "xps":
    case "oxps":
    case "djvu":
      return "pdf";
    // Diagrams / Visio
    case "vsdx":
    case "vsdm":
    case "vssm":
    case "vssx":
    case "vstm":
    case "vstx":
    case "vsd":
      return "diagram";
    // Documents
    case "doc":
    case "docx":
    case "odt":
    case "rtf":
    case "txt":
    case "html":
    case "epub":
    case "pages":
    case "hwp":
    case "hwpx":
    default:
      return "word";
  }
};

export default function OnlyOfficeEditor({
  isOpen,
  onClose,
  file,
  fileKey,
  accessToken,
  onSaveSuccess,
  guestUserDisplayName,
}: OnlyOfficeEditorProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  const containerId = `onlyoffice-editor-${file?.id}`;

  useEffect(() => {
    if (!isOpen || !file) return;

    let isMounted = true;
    const onlyOfficeUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_URL;
    const scriptUrl = `${onlyOfficeUrl}/web-apps/apps/api/documents/api.js`;

    const initEditor = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Load ONLYOFFICE Script
        await loadOnlyOfficeScript(scriptUrl, t("lacerta.onlyOffice.scriptLoadError", "Failed to load ONLYOFFICE script from"));

        if (!isMounted) return;

        // @ts-ignore
        if (!window.DocsAPI) {
          throw new Error(
            t("lacerta.onlyOffice.docsApiUnavailable", "ONLYOFFICE DocsAPI is not available on window object"),
          );
        }

        // 2. Destroy any existing editor instance
        if (editorRef.current) {
          editorRef.current.destroyEditor();
          editorRef.current = null;
        }

        const ext = getFileExtension(file.name);
        const docType = getDocumentType(ext);

        // Resolve user identity for ONLYOFFICE
        // Try to extract user info from the JWT access token
        let userId = `guest-${Math.random().toString(36).substr(2, 9)}`;
        let userName =
          guestUserDisplayName ||
          `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
        if (accessToken) {
          try {
            const payload = JSON.parse(atob(accessToken.split(".")[1]));
            userId = payload.sub || payload.id || "user";
            userName =
              payload.name || payload.username || payload.email || "User";
          } catch {
            userId = "user";
            userName = "User";
          }
        }

        // Generate a document key for ONLYOFFICE sessions.
        // MUST change after each save so ONLYOFFICE creates a fresh session.
        // Using a static key (e.g. file.id) causes the session to be marked
        // "finalized" after the first save, making the doc uneditable afterwards.
        // All users see the same updatedAtMs from the DB → same key → same session.
        const updatedAtMs = file.updatedAt
          ? new Date(file.updatedAt).getTime()
          : 0;
        const fileVersionKey = `${file.id}_${updatedAtMs}`;

        const tokenQuery = accessToken
          ? `&token=${encodeURIComponent(accessToken)}`
          : "";
        const keyQuery = `&fileKey=${encodeURIComponent(fileKey)}`;
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_ONLYOFFICE_API_URL ||
          process.env.NEXT_PUBLIC_API_URL;
        const downloadUrl = `${apiBaseUrl}/files/lacerta/onlyoffice/download/${file.id}?dummy=1${tokenQuery}${keyQuery}`;
        const callbackUrl = `${apiBaseUrl}/files/lacerta/onlyoffice/callback/${file.id}?dummy=1${tokenQuery}${keyQuery}`;

        const config = {
          document: {
            fileType: ext || "docx",
            key: fileVersionKey,
            title: file.name,
            url: downloadUrl,
            permissions: {
              comment: true,
              download: true,
              edit: true,
              print: true,
              review: true,
            },
          },
          documentType: docType,
          editorConfig: {
            actionLink: null,
            callbackUrl: callbackUrl,
            coEditing: {
              mode: "fast",
              change: true,
            },
            mode: "edit",
            user: {
              id: userId,
              name: userName,
            },
            customization: {
              autosave: true,
              chat: true,
              comments: true,
              compactToolbar: false,
              feedback: false,
              forcesave: true,
              help: true,
              hideRightMenu: false,
              plugins: true,
              compatibleFeatures: false,
            },
          },
          height: "100%",
          width: "100%",
          events: {
            onAppReady: () => {
              setIsLoading(false);
            },
            onDocumentStateChange: (event: any) => {
              // event.data === false means the document is in a clean saved state
              // (no unsaved changes). Only fire onSaveSuccess when this transitions
              // to clean, not on every autosave intermediate tick.
              if (event.data === false && onSaveSuccess) {
                onSaveSuccess();
              }
            },
            onRequestClose: () => {
              // ONLYOFFICE fires this when the session is fully finalized
              // (e.g. all co-editors have left and the doc was saved).
              // Close our editor overlay and refresh so the parent picks up
              // the new updatedAt, which gives a fresh document key on next open.
              if (onSaveSuccess) onSaveSuccess();
              onClose();
            },
            onError: (event: any) => {
              console.error("ONLYOFFICE Editor Error:", event);
              setError(
                t("lacerta.onlyOffice.interfaceError", "An error occurred within the ONLYOFFICE editor interface"),
              );
            },
          },
        };

        // @ts-ignore
        editorRef.current = new window.DocsAPI.DocEditor(containerId, config);
      } catch (err: any) {
        console.error("ONLYOFFICE initialization failed:", err);
        if (isMounted) {
          setError(err.message || t("lacerta.onlyOffice.loadFailed", "Failed to load ONLYOFFICE editor"));
          setIsLoading(false);
        }
      }
    };

    // Small delay to ensure the container DOM element is rendered
    const timeout = setTimeout(initEditor, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (editorRef.current) {
        try {
          editorRef.current.destroyEditor();
        } catch (e) {
          console.warn("Error destroying OnlyOffice editor:", e);
        }
        editorRef.current = null;
      }
    };
  }, [isOpen, file, fileKey, accessToken, guestUserDisplayName, t]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header top bar */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // Destroy editor before closing
              if (editorRef.current) {
                try {
                  editorRef.current.destroyEditor();
                } catch (e) {}
                editorRef.current = null;
              }
              onClose();
            }}
            className="p-1.5 border border-border hover:bg-muted/10 rounded-lg text-muted-foreground hover:text-foreground transition-all"
            title={t("lacerta.onlyOffice.exitEditor", "Exit Editor")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {file.name}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                {t("lacerta.onlyOffice.editorTitle", "ONLYOFFICE Document Editor")} •{" "}
                <span className="text-emerald-500 font-semibold">
                  {t("lacerta.onlyOffice.e2eeActive", "E2EE Session Active")}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>{t("lacerta.onlyOffice.connecting", "Connecting to ONLYOFFICE...")}</span>
            </div>
          )}
          {!isLoading && !error && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {t("lacerta.onlyOffice.connected", "Connected")}
            </div>
          )}
        </div>
      </div>

      {/* Editor Main Workspace */}
      <div className="flex-1 relative bg-muted/10">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-3" />
            <h3 className="text-base font-bold text-foreground">
              {t("lacerta.onlyOffice.loadFailedTitle", "Failed to load editor")}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4 leading-normal">
              {t("lacerta.onlyOffice.loadFailedDesc", { error: error, defaultValue: "{{error}}. Please check if the ONLYOFFICE server is running and configured correctly." })}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg transition-all"
            >
              {t("lacerta.onlyOffice.retryConnection", "Retry Connection")}
            </button>
          </div>
        ) : (
          <div id={containerId} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
