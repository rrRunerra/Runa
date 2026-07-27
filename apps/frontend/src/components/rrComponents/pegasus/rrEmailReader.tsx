"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  Reply,
  ReplyAll,
  Forward,
  Star,
  Trash2,
  User,
  X,
  Send,
  Loader2,
  Download,
  FileText,
  RotateCcw,
  Mail,
  Sparkles,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RrSenderProfileCard from "./rrSenderProfileCard";
import RrSanitizedEmailIframe from "./rrSanitizedEmailIframe";
import RrPackageTrackerCard from "./rrPackageTrackerCard";
import { detectPackageTrackingNumbers } from "./rrPackageTrackerDetector";

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

interface DetailedMessage {
  id: string;
  uid: number;
  messageId: string | null;
  subject: string;
  from: string;
  to: string;
  cc: string | null;
  date: string;
  read: boolean;
  flagged: boolean;
  folder: string;
  attachments: Attachment[];
  bodyText: string;
  bodyHtml: string;
  encryptedKey?: any;
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

interface RrEmailReaderProps {
  message: DetailedMessage | null;
  loading: boolean;
  messageNotFound: boolean;
  senderProfile: UserProfile | null;
  loadingProfile: boolean;
  onGoBack: () => void;
  onMarkReadChange: () => void;
  onFlaggedChange: () => void;
  onDeleteMessage: () => void;
  onRestoreMessage?: () => void;
  onDownloadAttachment: (attId: string, filename: string) => void;
  onSendReply: (data: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
  }) => Promise<void>;
  sendingReply: boolean;
}

export default function RrEmailReader({
  message,
  loading,
  messageNotFound,
  senderProfile,
  loadingProfile,
  onGoBack,
  onMarkReadChange,
  onFlaggedChange,
  onDeleteMessage,
  onRestoreMessage,
  onDownloadAttachment,
  onSendReply,
  sendingReply,
}: RrEmailReaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const [showProfilePanel, setShowProfilePanel] = useState<boolean>(false);
  const [loadRemoteContent, setLoadRemoteContent] = useState<boolean>(false);

  // Inline Composer States
  const [replyMode, setReplyMode] = useState<
    "reply" | "replyAll" | "forward" | null
  >(null);
  const [replyTo, setReplyTo] = useState<string>("");
  const [replyCc, setReplyCc] = useState<string>("");
  const [showCcInput, setShowCcInput] = useState<boolean>(false);
  const [replySubject, setReplySubject] = useState<string>("");
  const [replyBody, setReplyBody] = useState<string>("");
  const [useMarkdown, setUseMarkdown] = useState<boolean>(false);

  const getSenderEmail = (from: string): string => {
    const match = from.match(/<([^>]+)>/);
    return match && match[1] ? match[1].trim() : from.trim();
  };

  const getSenderName = (from: string): string => {
    const match = from.match(/^([^<]+)/);
    return match && match[1] ? match[1].replace(/['"]/g, "").trim() : from;
  };

  const senderEmail = message ? getSenderEmail(message.from) : "";

  // Package tracking numbers detection
  const detectedPackages = useMemo(() => {
    if (!message) return [];
    return detectPackageTrackingNumbers(
      message.subject || "",
      message.bodyText || "",
      message.bodyHtml || "",
    );
  }, [message]);

  // Reset states when email selection changes
  useEffect(() => {
    setReplyMode(null);
    if (senderEmail) {
      const allowedSenders = JSON.parse(
        localStorage.getItem("pegasus_allowed_remote_content_senders") || "[]",
      );
      setLoadRemoteContent(allowedSenders.includes(senderEmail.toLowerCase()));
    } else {
      setLoadRemoteContent(false);
    }
  }, [message?.id, senderEmail]);

  const initiateReply = (mode: "reply" | "replyAll" | "forward") => {
    if (!message) return;
    setReplyMode(mode);

    const sEmail = getSenderEmail(message.from);
    if (mode === "reply") {
      setReplyTo(sEmail);
      setReplyCc("");
      setShowCcInput(false);
      setReplySubject(
        message.subject.startsWith("Re:")
          ? message.subject
          : `Re: ${message.subject}`,
      );
      setReplyBody(
        `\n\n--- On ${new Date(message.date).toLocaleString()}, ${message.from} wrote:\n> ${message.bodyText.split("\n").join("\n> ")}`,
      );
    } else if (mode === "replyAll") {
      const recipients = [sEmail];
      if (message.to) {
        const toList = message.to
          .split(",")
          .map((t) => getSenderEmail(t.trim()));
        toList.forEach((email) => {
          if (email && !recipients.includes(email)) recipients.push(email);
        });
      }
      setReplyTo(recipients.join(", "));
      setReplyCc(message.cc || "");
      setShowCcInput(!!message.cc);
      setReplySubject(
        message.subject.startsWith("Re:")
          ? message.subject
          : `Re: ${message.subject}`,
      );
      setReplyBody(
        `\n\n--- On ${new Date(message.date).toLocaleString()}, ${message.from} wrote:\n> ${message.bodyText.split("\n").join("\n> ")}`,
      );
    } else if (mode === "forward") {
      setReplyTo("");
      setReplyCc("");
      setShowCcInput(false);
      setReplySubject(
        message.subject.startsWith("Fwd:")
          ? message.subject
          : `Fwd: ${message.subject}`,
      );
      setReplyBody(
        `\n\n---------- Forwarded message ---------\nFrom: ${message.from}\nDate: ${new Date(message.date).toLocaleString()}\nSubject: ${message.subject}\nTo: ${message.to}\n${message.cc ? `Cc: ${message.cc}\n` : ""}\n${message.bodyText}`,
      );
    }
  };

  const handleSendReply = async () => {
    if (!replyTo.trim()) return;
    await onSendReply({
      to: replyTo,
      cc: showCcInput && replyCc ? replyCc : undefined,
      subject: replySubject,
      body: replyBody,
    });
    setReplyMode(null);
  };

  const hasRemoteContent = useMemo(() => {
    if (!message || !message.bodyHtml) return false;
    const hasRemoteImg = /\bsrc=["'](https?:)?\/\//i.test(message.bodyHtml);
    const hasStyleUrl = /\burl\s*\(["']?(https?:)?\/\//i.test(message.bodyHtml);
    return hasRemoteImg || hasStyleUrl;
  }, [message]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-3 h-full bg-card/50">
        <Loader2 className="size-6 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">
          {t("pegasus.reader.loading", "Decrypting mail details...")}
        </span>
      </div>
    );
  }

  if (messageNotFound) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-8 space-y-4 h-full bg-card">
        <div className="size-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
          <Trash2 className="size-8" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="text-sm font-semibold text-foreground">
            {t("pegasus.reader.messageNotFound")}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This email may have been deleted or moved.
          </p>
        </div>
        <button
          onClick={onGoBack}
          className="px-3 py-1.5 text-xs bg-muted border border-border hover:border-muted-foreground rounded-xl text-foreground transition-all cursor-pointer font-semibold"
        >
          {t("pegasus.reader.goBack")}
        </button>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-8 space-y-4 h-full bg-card">
        <div className="size-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <Mail className="size-8" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="text-sm font-semibold text-foreground">
            {t("pegasus.reader.selectThread")}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("pegasus.reader.selectThreadDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-card text-card-foreground border border-border/80 rounded-2xl shadow-xs">
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Sleek Action Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-border/70 bg-card/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onGoBack}
              className="md:hidden p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
            >
              <ChevronLeft className="size-5" />
            </button>

            <button
              onClick={onMarkReadChange}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl border border-border transition-all font-semibold cursor-pointer shadow-2xs"
            >
              {message.read
                ? t("pegasus.reader.markUnread")
                : t("pegasus.reader.markRead")}
            </button>

            <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />

            <button
              onClick={() => initiateReply("reply")}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl border border-border transition-all flex items-center gap-1.5 font-semibold cursor-pointer shadow-2xs"
            >
              <Reply className="size-3.5 text-primary" />
              <span>{t("pegasus.reader.reply")}</span>
            </button>

            {((message.cc && message.cc.trim().length > 0) ||
              (message.to && message.to.includes(","))) && (
              <button
                onClick={() => initiateReply("replyAll")}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl border border-border transition-all flex items-center gap-1.5 font-semibold cursor-pointer shadow-2xs"
              >
                <ReplyAll className="size-3.5 text-primary" />
                <span>{t("pegasus.reader.replyAll")}</span>
              </button>
            )}

            <button
              onClick={() => initiateReply("forward")}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl border border-border transition-all flex items-center gap-1.5 font-semibold cursor-pointer shadow-2xs"
            >
              <Forward className="size-3.5 text-primary" />
              <span>{t("pegasus.reader.forward")}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {message.folder.toLowerCase() === "trash" && onRestoreMessage && (
              <button
                onClick={onRestoreMessage}
                className="p-1.5 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 border border-border hover:border-emerald-500/20 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Restore to Inbox"
              >
                <RotateCcw className="size-4" />
                <span className="hidden sm:inline">
                  {t("pegasus.reader.restore")}
                </span>
              </button>
            )}

            {senderProfile && (
              <button
                onClick={() => setShowProfilePanel((p) => !p)}
                className={cn(
                  "p-1.5 rounded-xl border border-border hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs",
                  showProfilePanel
                    ? "text-primary border-primary/30 bg-primary/10"
                    : "text-muted-foreground",
                )}
                title="Toggle Profile Panel"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">
                  {t("pegasus.reader.profile")}
                </span>
              </button>
            )}

            <button
              onClick={onFlaggedChange}
              className={cn(
                "p-2 rounded-xl border border-border hover:bg-muted transition-all cursor-pointer shadow-2xs",
                message.flagged
                  ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
                  : "text-muted-foreground",
              )}
            >
              <Star
                className={cn("size-4", message.flagged && "fill-amber-500")}
              />
            </button>

            <button
              onClick={onDeleteMessage}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 border border-border rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Reader Pane */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          {/* Header Info Block */}
          <div className="space-y-4 border-b border-border/60 pb-6">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-snug">
                {message.subject || "(No Subject)"}
              </h1>
              <span className="px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground text-[10px] font-bold border border-border shrink-0 flex items-center gap-1">
                <ShieldCheck className="size-3 text-emerald-500" />
                E2EE Protected
              </span>
            </div>

            <div className="flex items-start gap-3.5 bg-muted/20 p-3.5 rounded-2xl border border-border/40">
              {/* Profile Image / Fallback Avatar */}
              <div
                onClick={() => senderProfile && setShowProfilePanel((p) => !p)}
                className={cn(
                  "size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden relative shadow-xs",
                  senderProfile &&
                    "cursor-pointer hover:border-primary transition-colors",
                )}
                title={
                  senderProfile ? "Click to view contact profile" : undefined
                }
              >
                {senderProfile && senderProfile.avatarUrl ? (
                  <Image
                    src={senderProfile.avatarUrl}
                    alt="Sender Profile Image"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <User className="size-5" />
                )}
              </div>

              <div className="min-w-0 flex-1 text-xs space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span
                    onClick={() =>
                      senderProfile && setShowProfilePanel((p) => !p)
                    }
                    className={cn(
                      "font-bold text-foreground text-sm",
                      senderProfile && "hover:underline cursor-pointer",
                    )}
                  >
                    {getSenderName(message.from)}
                  </span>
                  <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(message.date).toLocaleString()}
                  </span>
                </div>
                <div className="text-muted-foreground truncate">
                  {t("pegasus.attachments.from")}{" "}
                  <span className="text-foreground font-semibold">
                    {getSenderEmail(message.from)}
                  </span>
                </div>
                <div className="text-muted-foreground truncate">
                  {t("pegasus.compose.to")}:{" "}
                  <span className="text-foreground font-medium">
                    {message.to}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DETECTED PACKAGE TRACKING BANNER */}
          {detectedPackages.length > 0 && (
            <RrPackageTrackerCard packages={detectedPackages} />
          )}

          {/* Remote Content Privacy Warning */}
          {hasRemoteContent && !loadRemoteContent && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <span className="font-medium">
                {t("pegasus.reader.blockedRemoteImages")}
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setLoadRemoteContent(true)}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  {t("pegasus.reader.showImages")}
                </button>
                <button
                  onClick={() => {
                    if (senderEmail) {
                      const allowedSenders = JSON.parse(
                        localStorage.getItem(
                          "pegasus_allowed_remote_content_senders",
                        ) || "[]",
                      );
                      const lowerEmail = senderEmail.toLowerCase();
                      if (!allowedSenders.includes(lowerEmail)) {
                        allowedSenders.push(lowerEmail);
                        localStorage.setItem(
                          "pegasus_allowed_remote_content_senders",
                          JSON.stringify(allowedSenders),
                        );
                      }
                    }
                    setLoadRemoteContent(true);
                  }}
                  className="px-2.5 py-1 bg-amber-500/30 hover:bg-amber-500/40 text-amber-800 dark:text-amber-200 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  {t("pegasus.reader.alwaysShow")}
                </button>
              </div>
            </div>
          )}

          {/* SANITIZED ISOLATED HTML EMAIL VIEWER */}
          {message.bodyHtml ? (
            <RrSanitizedEmailIframe
              htmlContent={message.bodyHtml}
              loadRemoteContent={loadRemoteContent}
            />
          ) : (
            <div className="p-4 bg-muted/20 border border-border/60 rounded-2xl text-xs font-mono whitespace-pre-wrap break-all text-foreground leading-relaxed">
              {message.bodyText}
            </div>
          )}

          {/* Attachments List */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                {t("pegasus.reader.attachments")} ({message.attachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {message.attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 hover:border-border rounded-2xl transition-all shadow-2xs"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <FileText className="size-4" />
                      </div>
                      <span
                        className="text-xs font-semibold text-foreground truncate max-w-37.5"
                        title={file.filename}
                      >
                        {file.filename}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        onDownloadAttachment(file.id, file.filename)
                      }
                      className="p-1.5 bg-card border border-border hover:border-muted-foreground text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
                    >
                      <Download className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline Reply Editor Panel */}
          {replyMode && (
            <div className="border border-border/80 bg-card rounded-2xl p-4 space-y-4 shadow-md animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5 shrink-0">
                <span className="text-xs font-bold text-foreground capitalize flex items-center gap-1.5">
                  <Reply className="size-4 text-primary" />
                  {t("pegasus.reader.inlineEditor", { mode: replyMode })}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 border border-border/80 rounded-xl px-2.5 py-1 bg-muted/30">
                    <input
                      id="use-markdown-reply"
                      type="checkbox"
                      checked={useMarkdown}
                      onChange={(e) => setUseMarkdown(e.target.checked)}
                      className="size-3 bg-background border-border text-primary rounded-xs cursor-pointer"
                    />
                    <label
                      htmlFor="use-markdown-reply"
                      className="text-[10px] font-bold text-muted-foreground select-none cursor-pointer"
                    >
                      {t("pegasus.reader.markdownMode")}
                    </label>
                  </div>
                  <button
                    onClick={() => setReplyMode(null)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* CC inputs */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 border-b border-border/50 pb-1">
                  <span className="text-muted-foreground w-14 font-semibold select-none">
                    {t("pegasus.compose.to")}:
                  </span>
                  <Input
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="bg-transparent border-0 border-transparent shadow-none h-6 text-xs text-foreground focus-visible:ring-0 p-0"
                  />
                  {!showCcInput && (
                    <button
                      onClick={() => setShowCcInput(true)}
                      className="text-[10px] font-bold text-muted-foreground hover:text-primary px-1"
                    >
                      {t("pegasus.reader.addCc", "Add Cc")}
                    </button>
                  )}
                </div>

                {showCcInput && (
                  <div className="flex items-center gap-2 border-b border-border/50 pb-1">
                    <span className="text-muted-foreground w-14 font-semibold select-none">
                      {t("pegasus.compose.cc")}:
                    </span>
                    <Input
                      value={replyCc}
                      onChange={(e) => setReplyCc(e.target.value)}
                      className="bg-transparent border-0 border-transparent shadow-none h-6 text-xs text-foreground focus-visible:ring-0 p-0 flex-1"
                    />
                    <button
                      onClick={() => {
                        setShowCcInput(false);
                        setReplyCc("");
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 border-b border-border/50 pb-1">
                  <span className="text-muted-foreground w-14 font-semibold select-none">
                    {t("pegasus.compose.subject")}:
                  </span>
                  <Input
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="bg-transparent border-0 border-transparent shadow-none h-6 text-xs text-foreground focus-visible:ring-0 p-0"
                  />
                </div>
              </div>

              {/* Text body */}
              <div className="flex flex-col gap-2 min-h-40">
                {useMarkdown ? (
                  <div className="flex gap-4 flex-1 min-h-40">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={t("pegasus.reader.typeMarkdownResponse")}
                      className="flex-1 min-h-40 p-3 text-xs bg-muted/20 border border-border/80 rounded-xl resize-none outline-none focus:border-primary font-mono"
                    />
                    <div className="flex-1 min-h-40 p-3 border border-border/80 rounded-xl overflow-y-auto bg-muted/10 prose dark:prose-invert max-w-none text-xs leading-relaxed text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {replyBody ||
                          t("pegasus.reader.markdownPreviewPlaceholder")}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={t("pegasus.reader.typeEmailResponse")}
                    className="w-full min-h-40 p-3 text-xs bg-muted/20 border border-border/80 rounded-xl resize-none outline-none focus:border-primary font-sans"
                  />
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReplyMode(null)}
                  disabled={sendingReply}
                  className="rounded-xl cursor-pointer"
                >
                  {t("pegasus.folderView.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyTo.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {sendingReply ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  {t("pegasus.reader.sendReply")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Collapsible User Profile Panel */}
      {showProfilePanel && (
        <div className="w-70 border-l border-border/80 h-full shrink-0 overflow-hidden bg-card">
          <RrSenderProfileCard
            profile={senderProfile}
            loading={loadingProfile}
            onClose={() => setShowProfilePanel(false)}
          />
        </div>
      )}
    </div>
  );
}
