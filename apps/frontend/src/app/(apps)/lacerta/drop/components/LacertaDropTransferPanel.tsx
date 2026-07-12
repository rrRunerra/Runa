"use client";

import React from "react";
import { Shield, Check, X, File as FileIcon, Loader2 } from "lucide-react";
import { TransferState } from "../use-lacerta-sharing";

interface LacertaDropTransferPanelProps {
  transfers: Record<string, TransferState>;
  onCancel: (batchId: string) => void;
  onDismiss: (batchId: string) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatSpeed = (bytesPerSec: number): string => {
  if (!bytesPerSec || bytesPerSec === 0) return "0 Bytes/s";
  return `${formatSize(bytesPerSec)}/s`;
};

export function LacertaDropTransferPanel({
  transfers,
  onCancel,
  onDismiss,
}: LacertaDropTransferPanelProps): React.JSX.Element {
  const activeTransfersList = Object.values(transfers);

  if (activeTransfersList.length === 0) {
    return (
      <div className="bg-card/40 border border-border rounded-2xl p-6 flex flex-col justify-center items-center text-center h-full min-h-[350px]">
        <Shield className="h-10 w-10 text-primary/30 mb-3" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
          Direct Encrypted Tunnel
        </h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[220px]">
          Uses direct browser WebRTC data channels with zero server storage. Payloads are double-encrypted using DTLS and AES-GCM.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card/40 border border-border rounded-2xl p-5 flex flex-col h-full min-h-[350px] relative overflow-hidden max-h-[80vh]">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-primary" /> Active Transfers ({activeTransfersList.length})
        </h2>
      </div>

      {/* Scrollable list of active transfer batches */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
        {activeTransfersList.map((transfer) => {
          const isFinished = ["completed", "cancelled", "rejected"].includes(transfer.status);
          const totalProgress = Math.round(
            transfer.files.reduce((sum, f) => sum + f.progress, 0) / transfer.files.length
          );

          return (
            <div key={transfer.batchId} className="border border-border/60 rounded-xl p-3 bg-card/20 space-y-3">
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    {transfer.direction === "send" ? "To" : "From"}: @{transfer.peerName}
                  </h3>
                  <span className="text-[9px] text-muted-foreground font-mono">
                    Batch: {transfer.batchId}
                  </span>
                </div>
                {!isFinished ? (
                  <button
                    onClick={() => onCancel(transfer.batchId)}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => onDismiss(transfer.batchId)}
                    className="text-[10px] text-primary font-bold hover:text-primary/85 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
              </div>

              {/* Files in this batch */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {transfer.files.map((file, idx) => {
                  const isCompleted = file.status === "completed";
                  const isActive = ["transferring", "encrypting", "decrypting"].includes(file.status);

                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border flex flex-col gap-1.5 transition-all ${
                        isActive
                          ? "bg-primary/5 border-primary/20"
                          : isCompleted
                            ? "bg-muted/30 border-border/40 opacity-60"
                            : "bg-muted/10 border-border/20 opacity-40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                          <FileIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="truncate font-medium text-foreground/90" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        
                        <div className="shrink-0 flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
                          <span>{formatSize(file.size)}</span>
                          {isCompleted && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                          {isActive && file.status === "transferring" && (
                            <span className="text-primary font-bold">{file.progress}%</span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar for active file */}
                      {isActive && (
                        <div className="w-full space-y-1">
                          <div className="h-1 w-full bg-secondary rounded-full overflow-hidden border border-border/10">
                            <div
                              style={{ width: `${file.progress}%` }}
                              className="h-full bg-primary transition-all duration-150 ease-out"
                            />
                          </div>
                          
                          {file.status === "transferring" && (
                            <div className="flex items-center justify-between text-[8px] text-muted-foreground font-mono">
                              <span>Speed: {formatSpeed(file.speed)}</span>
                              <span>ETA: {file.eta > 0 ? `${file.eta}s` : "--"}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Batch level status footer */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold pt-1">
                <span className="flex items-center gap-1 capitalize">
                  {!isFinished && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  {transfer.status === "completed" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                  {transfer.status === "cancelled" && <X className="h-3.5 w-3.5 text-destructive" />}
                  {transfer.status}
                </span>
                <span className="font-mono">{totalProgress}% overall</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
