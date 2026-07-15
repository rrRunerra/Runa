"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { UploadQueueTask } from "../types";

interface UploadHUDProps {
  uploadQueue: UploadQueueTask[];
  onClearFinished: () => void;
}

export function UploadHUD({ uploadQueue, onClearFinished }: UploadHUDProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (uploadQueue.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card/95 border border-border text-foreground rounded-xl shadow-2xl p-4 flex flex-col gap-3 max-h-72 overflow-y-auto animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md">
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
      <div className="flex flex-col gap-2">
        {uploadQueue.map((task) => (
          <div key={task.id} className="flex flex-col gap-1.5 p-2 bg-muted/20 border border-border/40 rounded-lg">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-semibold truncate max-w-[180px]" title={task.name}>
                {task.name}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                {task.status === "encrypting" && t("lacerta.encrypting")}
                {task.status === "uploading" && `${task.progress}%`}
                {task.status === "completed" && <span className="text-success font-semibold">{t("lacerta.done")}</span>}
                {task.status === "error" && <span className="text-destructive font-semibold">{t("lacerta.error")}</span>}
              </span>
            </div>
            {task.status === "uploading" && (
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            )}
            {task.errorMsg && (
              <span className="text-[9px] text-destructive/80 leading-none truncate">
                {task.errorMsg}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
