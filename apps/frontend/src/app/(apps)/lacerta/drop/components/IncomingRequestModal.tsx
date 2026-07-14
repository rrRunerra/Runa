"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  File as FileIcon,
  Copy,
  ExternalLink,
  Lock,
  Check,
  ShieldAlert,
} from "lucide-react";
import { IncomingRequest } from "../use-lacerta-sharing";
import { toast } from "sonner";

interface IncomingRequestModalProps {
  request: IncomingRequest | null;
  onAccept: (acceptedIndices: number[]) => void;
  onDecline: () => void;
  pendingPinRequests: { peerId: string; peerName: string; batchId: string }[];
  pinError: string | null;
  onSubmitPin: (batchId: string, pin: string) => void;
  onDeclinePin: (batchId: string) => void;
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
  pendingPinRequests,
  pinError,
  onSubmitPin,
  onDeclinePin,
}: IncomingRequestModalProps): React.JSX.Element | null {
  const [pinValue, setPinValue] = useState("");
  const [checkedIndices, setCheckedIndices] = useState<Record<number, boolean>>(
    {},
  );

  // Reset checkedIndices when request changes
  useEffect(() => {
    if (request) {
      const initial: Record<number, boolean> = {};
      request.files.forEach((_, idx) => {
        initial[idx] = true;
      });
      setCheckedIndices(initial);
    }
  }, [request]);

  const activePinReq = pendingPinRequests[0] || null;

  // 1. Render PIN Entry Screen if a PIN is required first
  if (activePinReq && !request) {
    const handleSubmitPin = (e: React.FormEvent) => {
      e.preventDefault();
      if (pinValue.trim().length === 4) {
        onSubmitPin(activePinReq.batchId, pinValue.trim());
      }
    };

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col text-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
              <Lock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                PIN Verification Required
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                From: @{activePinReq.peerName}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitPin} className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] text-slate-300 leading-normal font-medium">
                Enter the 4-digit PIN displayed on the sender&apos;s screen to
                unlock this transfer.
              </p>
              <input
                type="text"
                maxLength={4}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                placeholder="0 0 0 0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-slate-100 placeholder-slate-800 focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
              {pinError && (
                <div className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 shrink-0" />
                  {pinError}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onDeclinePin(activePinReq.batchId);
                  setPinValue("");
                }}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-100 transition-all text-xs font-bold rounded-lg cursor-pointer"
              >
                Decline
              </button>
              <button
                type="submit"
                disabled={pinValue.length !== 4}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 transition-all text-xs font-bold rounded-lg cursor-pointer"
              >
                Verify PIN
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!request) return null;

  const totalSize = request.files.reduce((acc, f) => acc + f.size, 0);
  const isTextShare = request.files.length === 1 && request.files[0].isText;
  const isUrl =
    isTextShare &&
    /^(https?:\/\/|www\.)[^\s/$.?#].[^\s]*$/i.test(
      request.files[0].textContent || "",
    );

  const handleCheckboxChange = (idx: number) => {
    setCheckedIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleAccept = () => {
    const accepted = Object.entries(checkedIndices)
      .filter(([_, checked]) => checked)
      .map(([idx]) => parseInt(idx, 10));

    if (accepted.length === 0) {
      toast.error("Please select at least one file to accept.");
      return;
    }
    onAccept(accepted);
  };

  const handleCopyText = () => {
    const text = request.files[0].textContent || "";
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // 2. Render Text / Clipboard Share Layout
  if (isTextShare) {
    const textContent = request.files[0].textContent || "";
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col text-slate-100 max-h-[85vh]">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0 text-primary">
              <Copy className="h-6 w-6" />
            </div>
            <div className="overflow-hidden flex-1">
              <h3 className="text-sm font-bold text-slate-200">
                Incoming Text Note
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                From:{" "}
                <span className="font-semibold text-slate-300">
                  @{request.peerName}
                </span>
              </p>
            </div>
          </div>

          {/* Text Preview Box */}
          <div className="mt-4 flex-1 overflow-y-auto max-h-[40vh] p-3 border border-slate-800 rounded-xl bg-slate-950/80 font-medium text-xs leading-relaxed wrap-break-word whitespace-pre-wrap select-text custom-scrollbar">
            {textContent}
          </div>

          <div className="flex flex-col gap-2 mt-6">
            <div className="flex gap-2">
              <button
                onClick={handleCopyText}
                className="flex-1 py-2 bg-primary text-primary-foreground hover:bg-primary/95 transition-all text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-primary/10"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
              {isUrl && (
                <a
                  href={
                    textContent.startsWith("http")
                      ? textContent
                      : `https://${textContent}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer text-slate-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Link
                </a>
              )}
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={onDecline}
                className="flex-1 py-1.5 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all text-[11px] font-bold rounded-lg cursor-pointer"
              >
                Decline
              </button>
              <button
                onClick={() => onAccept([0])}
                className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all text-[11px] font-bold rounded-lg cursor-pointer text-slate-300"
              >
                Save as File
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Normal Files Checklist Layout
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] text-slate-100">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0 text-primary">
            <Download className="h-6 w-6 animate-bounce" />
          </div>
          <div className="overflow-hidden flex-1">
            <h3 className="text-sm font-bold text-slate-200">Incoming Files</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              From:{" "}
              <span className="font-semibold text-slate-300">
                @{request.peerName}
              </span>
            </p>

            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              wants to send you{" "}
              <span className="font-semibold text-slate-200">
                {request.files.length} items
              </span>{" "}
              (Total: {formatSize(totalSize)})
            </p>
          </div>
        </div>

        {/* Checklist of files */}
        <div className="mt-4 flex-1 overflow-y-auto max-h-[40vh] space-y-2 p-1.5 border border-slate-850 rounded-xl bg-slate-950/50 custom-scrollbar pr-2">
          {request.files.map((file, idx) => {
            const isChecked = !!checkedIndices[idx];
            return (
              <div
                key={idx}
                onClick={() => handleCheckboxChange(idx)}
                className={`p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-colors ${
                  isChecked
                    ? "bg-slate-950 border-primary/40 text-slate-100"
                    : "bg-slate-950/20 border-slate-800 text-slate-500 opacity-60 hover:opacity-80"
                }`}
              >
                {/* Custom Checkbox */}
                <div
                  className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${
                    isChecked
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-slate-700 bg-slate-950"
                  }`}
                >
                  {isChecked && <Check className="h-3 w-3 stroke-3" />}
                </div>

                <FileIcon
                  className={`h-4 w-4 shrink-0 ${isChecked ? "text-primary" : "text-slate-700"}`}
                />

                <div className="flex-1 overflow-hidden">
                  <span
                    className="text-xs font-semibold truncate block"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  {file.relativePath && (
                    <span className="text-[9px] text-slate-500 block truncate font-mono">
                      {file.relativePath}
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 font-mono font-medium shrink-0">
                  {formatSize(file.size)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onDecline}
            className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors text-xs font-bold rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors text-xs font-bold rounded-lg shadow-lg shadow-primary/20 cursor-pointer"
          >
            Accept Selected
          </button>
        </div>
      </div>
    </div>
  );
}
