"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  File as FileIcon,
  Folder,
  FileText,
  Lock,
  Send,
  Plus,
  Trash2,
} from "lucide-react";
import { Peer } from "../use-lacerta-sharing";

interface LacertaShareDialogProps {
  peer: Peer | null;
  onClose: () => void;
  preselectedFiles: File[];
  onSendFiles: (files: File[], requirePin: boolean) => void;
  onSendText: (text: string, title: string, requirePin: boolean) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export function LacertaShareDialog({
  peer,
  onClose,
  preselectedFiles,
  onSendFiles,
  onSendText,
}: LacertaShareDialogProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<"files" | "folder" | "text">(
    "files",
  );
  const [filesList, setFilesList] = useState<File[]>([]);
  const [textContent, setTextContent] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [requirePin, setRequirePin] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselectedFiles.length > 0) {
      const hasRelativePath = preselectedFiles.some(
        (f) => f.webkitRelativePath || (f as any).relativePath,
      );
      if (hasRelativePath) {
        setActiveTab("folder");
      } else {
        setActiveTab("files");
      }
      setFilesList(preselectedFiles);
    } else {
      setFilesList([]);
    }
  }, [preselectedFiles, peer]);

  if (!peer) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFilesList((prev) => [...prev, ...selected]);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFilesList(selected);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFilesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (activeTab === "text") {
      if (!textContent.trim()) return;
      onSendText(textContent, textTitle.trim() || "Text Note", requirePin);
    } else {
      if (filesList.length === 0) return;
      onSendFiles(filesList, requirePin);
    }
    onClose();
  };

  const totalFilesSize = filesList.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Send to{" "}
              <span className="text-primary font-mono font-semibold">
                @{peer.username}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Device: {peer.deviceName} ({peer.deviceType})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950/60 p-1 rounded-lg border border-slate-800/80 mt-4">
          <button
            onClick={() => {
              setActiveTab("files");
              setFilesList([]);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "files"
                ? "bg-primary text-primary-foreground shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileIcon className="h-3.5 w-3.5" />
            Files
          </button>
          <button
            onClick={() => {
              setActiveTab("folder");
              setFilesList([]);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "folder"
                ? "bg-primary text-primary-foreground shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            Folder
          </button>
          <button
            onClick={() => {
              setActiveTab("text");
              setFilesList([]);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "text"
                ? "bg-primary text-primary-foreground shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Text / URL
          </button>
        </div>

        {/* Content Pane */}
        <div className="flex-1 mt-4 min-h-[220px] flex flex-col justify-between overflow-hidden">
          {/* Files/Folder list or Text Input */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {activeTab === "files" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Selected Files ({filesList.length})
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Files
                  </button>
                </div>
                {filesList.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-800 rounded-xl p-8 text-center hover:bg-slate-950/20 cursor-pointer transition-colors flex flex-col items-center justify-center group"
                  >
                    <FileIcon className="h-8 w-8 text-slate-500 mb-2 group-hover:text-primary transition-colors" />
                    <span className="text-xs text-slate-400 font-semibold group-hover:text-slate-300 transition-colors">
                      Click to choose files
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {filesList.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-950/40 rounded-lg border border-slate-800/60 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          <FileIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span
                            className="text-xs text-slate-300 font-semibold truncate"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatSize(file.size)}
                          </span>
                          <button
                            onClick={() => handleRemoveFile(idx)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-destructive transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "folder" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Selected Folder
                  </span>
                  {filesList.length > 0 && (
                    <button
                      onClick={() => folderInputRef.current?.click()}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Change Folder
                    </button>
                  )}
                </div>
                {filesList.length === 0 ? (
                  <div
                    onClick={() => folderInputRef.current?.click()}
                    className="border border-dashed border-slate-800 rounded-xl p-8 text-center hover:bg-slate-950/20 cursor-pointer transition-colors flex flex-col items-center justify-center group"
                  >
                    <Folder className="h-8 w-8 text-slate-500 mb-2 group-hover:text-primary transition-colors" />
                    <span className="text-xs text-slate-400 font-semibold group-hover:text-slate-300 transition-colors">
                      Click to select a folder
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <Folder className="h-5 w-5" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-slate-200 block truncate">
                          {filesList[0].webkitRelativePath?.split("/")[0] ||
                            "Selected Folder"}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {filesList.length} files ({formatSize(totalFilesSize)}
                          )
                        </span>
                      </div>
                    </div>
                    <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1 border-t border-slate-800/80 pt-2">
                      {filesList.slice(0, 10).map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[10px] text-slate-400 font-medium"
                        >
                          <span
                            className="truncate flex-1 max-w-[80%]"
                            title={file.webkitRelativePath || file.name}
                          >
                            {file.webkitRelativePath || file.name}
                          </span>
                          <span className="font-mono text-slate-500 shrink-0">
                            {formatSize(file.size)}
                          </span>
                        </div>
                      ))}
                      {filesList.length > 10 && (
                        <div className="text-[10px] text-slate-500 font-semibold text-center pt-1">
                          ... and {filesList.length - 10} more files
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "text" && (
              <div className="space-y-3 flex flex-col h-full">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder="E.g., Clipboard Snippet, Link, Note"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary transition-colors font-semibold"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Text / Note Content
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Type or paste URLs, clipboard text, notes..."
                    rows={6}
                    className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary transition-colors resize-none font-semibold leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Hidden inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFolderChange}
            className="hidden"
            multiple
            {...({
              webkitdirectory: "",
              directory: "",
            } as any)}
          />

          {/* Security & Action Footer */}
          <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
            {/* PIN Switch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRequirePin(!requirePin)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  requirePin
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="If enabled, recipient must enter a PIN generated on your screen to accept"
              >
                <Lock className="h-3.5 w-3.5" />
                {requirePin ? "PIN Enabled" : "Add PIN"}
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={
                  activeTab === "text"
                    ? !textContent.trim()
                    : filesList.length === 0
                }
                className="px-4 py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 transition-all shadow-md shadow-primary/10 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Send Request
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
