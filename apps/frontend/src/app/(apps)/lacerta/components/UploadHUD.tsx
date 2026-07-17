"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { X, RotateCcw } from "lucide-react";
import { UploadQueueTask } from "../types";

interface UploadHUDProps {
  uploadQueue: UploadQueueTask[];
  onClearFinished: () => void;
  onAbort?: (fileId: string) => void;
  onResume?: (fileId: string) => void;
}

export function UploadHUD({
  uploadQueue,
  onClearFinished,
  onAbort,
  onResume,
}: UploadHUDProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (uploadQueue.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card/95 border border-border text-foreground rounded-xl shadow-2xl p-4 flex flex-col gap-3 max-h-80 overflow-y-auto animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-bold tracking-wide uppercase text-muted-foreground">
          {t("lacerta.uploads")} ({uploadQueue.length})
        </span>
        <button
          onClick={onClearFinished}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {t("lacerta.clearFinished")}
        </button>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-2">
        {uploadQueue.map((task) => {
          const showChunkLabel =
            task.totalChunks !== undefined && task.completedChunks !== undefined;

          return (
            <div
              key={task.id}
              className="flex flex-col gap-1.5 p-2 bg-muted/20 border border-border/40 rounded-lg"
            >
              {/* File name row */}
              <div className="flex items-center justify-between text-xs gap-2">
                <span
                  className="font-semibold truncate max-w-[160px]"
                  title={task.name}
                >
                  {task.name}
                </span>

                {/* Status label + action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {task.status === "encrypting" && t("lacerta.encrypting")}
                    {task.status === "paused" && (
                      <span className="text-warning">{t("lacerta.paused", { defaultValue: "Paused" })}</span>
                    )}
                    {task.status === "uploading" &&
                      (showChunkLabel
                        ? `${task.completedChunks}/${task.totalChunks}`
                        : `${task.progress}%`)}
                    {task.status === "completed" && (
                      <span className="text-success font-semibold">
                        {t("lacerta.done")}
                      </span>
                    )}
                    {task.status === "error" && (
                      <span className="text-destructive font-semibold">
                        {t("lacerta.error")}
                      </span>
                    )}
                    {task.status === "resumable" && (
                      <span className="text-primary font-semibold">
                        {t("lacerta.resumable", { defaultValue: "Interrupted" })}
                      </span>
                    )}
                  </span>

                  {/* Resume button */}
                  {task.status === "resumable" && onResume && (
                    <button
                      onClick={() => onResume(task.id)}
                      title={t("lacerta.resume", { defaultValue: "Resume upload" })}
                      className="p-0.5 rounded hover:bg-primary/10 text-primary transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}

                  {/* Cancel / abort button */}
                  {(task.status === "uploading" || task.status === "encrypting" || task.status === "paused") &&
                    onAbort && (
                      <button
                        onClick={() => onAbort(task.id)}
                        title={t("lacerta.cancelUpload", { defaultValue: "Cancel upload" })}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                </div>
              </div>

              {/* Progress bar (uploading + paused) */}
              {(task.status === "uploading" || task.status === "paused") && (
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}

              {/* Error message */}
              {task.errorMsg && (
                <span className="text-[9px] text-destructive/80 leading-none truncate">
                  {task.errorMsg}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
