"use client";

import React from "react";
import { Shield, Check, X, File as FileIcon, Loader2 } from "lucide-react";
import { TransferState } from "../use-lacerta-sharing";

interface LacertaDropTransferPanelProps {
  transfer: TransferState | null;
  onCancel: () => void;
  onDismiss: () => void;
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
  transfer,
  onCancel,
  onDismiss,
}: LacertaDropTransferPanelProps): React.JSX.Element {
  if (!transfer) {
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
    <div className="bg-card/40 border border-border rounded-2xl p-6 flex flex-col justify-between h-full min-h-[350px] relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-primary" /> Active Transfer
          </h2>
          {transfer.status !== "completed" && transfer.status !== "cancelled" && transfer.status !== "rejected" && (
            <button
              onClick={onCancel}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Dynamic File List */}
        <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
          {transfer.files.map((file, idx) => {
            const isActive = idx === transfer.currentFileIndex;
            const isCompleted = idx < transfer.currentFileIndex || transfer.status === "completed";

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                  isActive
                    ? "bg-primary/5 border-primary/20"
                    : isCompleted
                      ? "bg-muted/30 border-border/40 opacity-60"
                      : "bg-muted/10 border-border/20 opacity-40"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <FileIcon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`truncate font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`} title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <span>{formatSize(file.size)}</span>
                    {isCompleted && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    {isActive && transfer.status === "transferring" && (
                      <span className="text-primary font-bold">{transfer.progress}%</span>
                    )}
                  </div>
                </div>

                {/* Progress bar for active file */}
                {isActive && (transfer.status === "transferring" || transfer.status === "encrypting" || transfer.status === "decrypting") && (
                  <div className="w-full space-y-1">
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-border/10">
                      <div
                        style={{ width: `${transfer.progress}%` }}
                        className="h-full bg-primary transition-all duration-150 ease-out"
                      />
                    </div>
                    
                    {transfer.status === "transferring" && (
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                        <span>Speed: {formatSpeed(transfer.speed)}</span>
                        <span>ETA: {transfer.eta > 0 ? `${transfer.eta}s` : "--"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-semibold">
        <span className="flex items-center gap-1.5 capitalize">
          {["transferring", "encrypting", "decrypting", "connecting"].includes(transfer.status) && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          )}
          {transfer.status === "completed" && <Check className="h-4 w-4 text-emerald-500" />}
          {transfer.status === "cancelled" && <X className="h-4 w-4 text-destructive" />}
          {transfer.status}
        </span>

        {transfer.status === "completed" && (
          <button
            onClick={onDismiss}
            className="text-xs text-primary font-bold hover:text-primary/85 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
