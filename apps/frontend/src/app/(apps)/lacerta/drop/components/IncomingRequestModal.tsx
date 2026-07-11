"use client";

import React from "react";
import { Download, File as FileIcon } from "lucide-react";
import { IncomingRequest } from "../use-lacerta-sharing";

interface IncomingRequestModalProps {
  request: IncomingRequest | null;
  onAccept: () => void;
  onDecline: () => void;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export function IncomingRequestModal({
  request,
  onAccept,
  onDecline,
}: IncomingRequestModalProps): React.JSX.Element | null {
  if (!request) return null;

  const totalSize = request.files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-6">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
            <Download className="h-6 w-6 text-primary animate-bounce" />
          </div>
          <div className="overflow-hidden flex-1">
            <h3 className="text-sm font-bold text-foreground">Incoming Files</h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              From: <span className="font-semibold text-foreground/80">@{request.peerName}</span>
            </p>
            
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">
              wants to send you <span className="font-semibold text-foreground/80">{request.files.length} files</span> (Total: {formatSize(totalSize)})
            </p>
          </div>
        </div>

        {/* Scrollable File List */}
        <div className="mt-4 flex-1 overflow-y-auto max-h-[40vh] space-y-2 p-1 border border-border rounded-xl bg-background/40 custom-scrollbar pr-2">
          {request.files.map((file, idx) => (
            <div key={idx} className="p-2.5 bg-muted/40 rounded-lg border border-border/80 flex items-center gap-2.5">
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground/80 truncate flex-1 font-semibold" title={file.name}>
                {file.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-medium shrink-0">
                {formatSize(file.size)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onDecline}
            className="flex-1 py-2 bg-secondary hover:bg-secondary/80 border border-border transition-colors text-xs font-bold rounded-lg text-foreground cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors text-xs font-bold rounded-lg shadow-lg shadow-primary/20 cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
