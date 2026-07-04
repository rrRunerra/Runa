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
  Eye,
  Download,
  FileText,
  EyeOff,
  RotateCcw,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RrSenderProfileCard from "./rrSenderProfileCard";

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

  // Reset states when email selection changes
  useEffect(() => {
    setReplyMode(null);
    if (senderEmail) {
      const allowedSenders = JSON.parse(
        localStorage.getItem("pegasus_allowed_remote_content_senders") || "[]"
      );
      setLoadRemoteContent(allowedSenders.includes(senderEmail.toLowerCase()));
    } else {
      setLoadRemoteContent(false);
    }
  }, [message?.id, senderEmail]);

  const initiateReply = (mode: "reply" | "replyAll" | "forward") => {
    if (!message) return;
    setReplyMode(mode);

    const senderEmail = getSenderEmail(message.from);
    if (mode === "reply") {
      setReplyTo(senderEmail);
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
      const recipients = [senderEmail];
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

  const parsedEmailContent = useMemo(() => {
    if (!message) return "";

    const getSanitizedHtmlContent = (
      html: string,
      allowRemote: boolean,
    ): string => {
      if (!html) return "";
      if (allowRemote) return html;
      let temp = html.replace(
        /\bsrc=(["'])(https?:)?\/\/([^"']+)\1/gi,
        'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-blocked-src="$2//$3"',
      );
      temp = temp.replace(
        /\burl\((["']?)(https?:)?\/\/([^"')]+)\1\)/gi,
        'url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")',
      );
      return temp;
    };

    if (message.bodyHtml) {
      if (typeof window === "undefined") return message.bodyHtml;
      try {
        const cleanHtml = getSanitizedHtmlContent(
          message.bodyHtml,
          loadRemoteContent,
        );
        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanHtml, "text/html");

        // Strip styles, scripts, links, meta to prevent leaks
        const styleElements = doc.querySelectorAll("style, script, link, meta");
        styleElements.forEach((el) => el.remove());

        // Remove bgcolor and clean inline background overrides
        const allElements = doc.querySelectorAll("*");
        allElements.forEach((el) => {
          if (el.hasAttribute("bgcolor")) {
            el.removeAttribute("bgcolor");
          }
          const style = el.getAttribute("style");
          if (style) {
            const cleanStyle = style
              .replace(/background-color\s*:\s*[^;]+;?/gi, "")
              .replace(/background\s*:\s*[^;]+;?/gi, "");
            el.setAttribute("style", cleanStyle);
          }
        });

        return doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
      } catch (err) {
        console.error("Failed to parse bodyHtml", err);
        return message.bodyHtml;
      }
    }

    const escapedText = (message.bodyText || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="whitespace-pre-wrap break-all text-xs font-mono">${escapedText}</pre>`;
  }, [message, loadRemoteContent]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-3 h-full">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
        <span className="text-xs text-muted-foreground">
          Decrypting mail details...
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
            Email not found
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This email may have been deleted or moved.
          </p>
        </div>
        <button
          onClick={onGoBack}
          className="px-3 py-1.5 text-xs bg-muted border border-border hover:border-muted-foreground rounded-xl text-foreground transition-all cursor-pointer"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-8 space-y-4 h-full bg-card">
        <div className="size-16 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
          <Mail className="size-8" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="text-sm font-semibold text-foreground">
            No message selected
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select a thread from the list to display decrypted content,
            attachments, and profiles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-card text-card-foreground border border-border rounded-2xl">
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onGoBack}
              className="md:hidden p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={onMarkReadChange}
              className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl border border-border transition-all font-semibold cursor-pointer"
            >
              Mark {message.read ? "Unread" : "Read"}
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            <button
              onClick={() => initiateReply("reply")}
              className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl border border-border transition-all flex items-center gap-1.5 font-semibold cursor-pointer"
            >
              <Reply className="size-3.5" />
              <span>Reply</span>
            </button>
            {((message.cc && message.cc.trim().length > 0) ||
              (message.to && message.to.includes(","))) && (
              <button
                onClick={() => initiateReply("replyAll")}
                className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl border border-border transition-all flex items-center gap-1.5 font-semibold cursor-pointer"
              >
                <ReplyAll className="size-3.5" />
                <span>Reply All</span>
              </button>
            )}
            <button
              onClick={() => initiateReply("forward")}
              className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl border border-border transition-all flex items-center gap-1.5 font-semibold cursor-pointer"
            >
              <Forward className="size-3.5" />
              <span>Forward</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {message.folder.toLowerCase() === "trash" && onRestoreMessage && (
              <button
                onClick={onRestoreMessage}
                className="p-1.5 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 border border-border hover:border-emerald-500/20 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Restore to Inbox"
              >
                <RotateCcw className="size-4" />
                <span>Restore</span>
              </button>
            )}
            {senderProfile && (
              <button
                onClick={() => setShowProfilePanel((p) => !p)}
                className={cn(
                  "p-1.5 rounded-xl border border-border hover:bg-muted transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer",
                  showProfilePanel
                    ? "text-primary border-primary/20 bg-primary/5"
                    : "text-muted-foreground",
                )}
                title="Toggle Profile Panel"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">Profile</span>
              </button>
            )}
            <button
              onClick={onFlaggedChange}
              className={cn(
                "p-1.5 rounded-xl border border-border hover:bg-muted transition-all cursor-pointer",
                message.flagged
                  ? "text-amber-500 border-amber-500/20 bg-amber-500/5"
                  : "text-muted-foreground",
              )}
            >
              <Star
                className={cn("size-4", message.flagged && "fill-amber-500")}
              />
            </button>
            <button
              onClick={onDeleteMessage}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 hover:border-destructive/20 border border-border rounded-xl transition-all cursor-pointer"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Reader Pane */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          {/* Header Info */}
          <div className="space-y-4 border-b border-border pb-6">
            <h1 className="text-xl font-bold text-foreground tracking-tight leading-snug">
              {message.subject || "(No Subject)"}
            </h1>
            <div className="flex items-start gap-3">
              {/* Profile Image / Fallback Avatar */}
              <div
                onClick={() => senderProfile && setShowProfilePanel((p) => !p)}
                className={cn(
                  "size-9 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden relative",
                  senderProfile &&
                    "cursor-pointer hover:border-muted-foreground transition-colors",
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
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <User className="size-4.5" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-xs space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span
                    onClick={() =>
                      senderProfile && setShowProfilePanel((p) => !p)
                    }
                    className={cn(
                      "font-semibold text-foreground",
                      senderProfile && "hover:underline cursor-pointer",
                    )}
                    title={
                      senderProfile
                        ? "Click to view contact profile"
                        : undefined
                    }
                  >
                    {getSenderName(message.from)}
                  </span>
                  <span className="text-muted-foreground font-light">
                    {new Date(message.date).toLocaleString()}
                  </span>
                </div>
                <div className="text-muted-foreground truncate">
                  From:{" "}
                  <span className="text-foreground">
                    {getSenderEmail(message.from)}
                  </span>
                </div>
                <div className="text-muted-foreground truncate">
                  To: <span className="text-foreground">{message.to}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Remote content warning */}
          {hasRemoteContent && !loadRemoteContent && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] rounded-xl flex items-center justify-between gap-4">
              <span>Remote content in this message has been blocked.</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setLoadRemoteContent(true)}
                  className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 rounded-lg font-semibold cursor-pointer"
                >
                  Show once
                </button>
                <button
                  onClick={() => {
                    if (senderEmail) {
                      const allowedSenders = JSON.parse(
                        localStorage.getItem("pegasus_allowed_remote_content_senders") || "[]"
                      );
                      const lowerEmail = senderEmail.toLowerCase();
                      if (!allowedSenders.includes(lowerEmail)) {
                        allowedSenders.push(lowerEmail);
                        localStorage.setItem(
                          "pegasus_allowed_remote_content_senders",
                          JSON.stringify(allowedSenders)
                        );
                      }
                    }
                    setLoadRemoteContent(true);
                  }}
                  className="px-2 py-0.5 bg-amber-500/30 hover:bg-amber-500/40 text-amber-600 rounded-lg font-semibold cursor-pointer"
                >
                  Always allow
                </button>
              </div>
            </div>
          )}

          {/* Scoped Native email viewer */}
          <div className="overflow-hidden text-sm leading-relaxed wrap-break-word">
            <style
              dangerouslySetInnerHTML={{
                __html: `
              .rr-email-body {
                background-color: #ffffff;
                color: #1f2937;
                border-radius: 0.75rem;
                padding: 1.5rem;
                transition: filter 0.2s ease;
              }
              .dark .rr-email-body {
                filter: invert(0.92) hue-rotate(180deg) !important;
                background-color: #ffffff !important;
              }
              .dark .rr-email-body img,
              .dark .rr-email-body video {
                filter: invert(1.08) hue-rotate(180deg) !important;
              }
              .rr-email-body a {
                color: #2563eb !important;
                text-decoration: underline !important;
              }
              .dark .rr-email-body a {
                color: #3b82f6 !important;
              }
              /* Basic markup spacing inside content */
              .rr-email-body h1 { font-size: 1.875rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 1rem; border-b: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
              .rr-email-body h2 { font-size: 1.5rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 1rem; border-b: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
              .rr-email-body p { margin-top: 0; margin-bottom: 1rem; }
              .rr-email-body ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
              .rr-email-body ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
              .rr-email-body blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; color: #4b5563; margin-bottom: 1rem; font-style: italic; }
              .rr-email-body pre { background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; font-family: ui-monospace, monospace; margin-bottom: 1rem; }
              .rr-email-body code { background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 0.25rem; padding: 0.125rem 0.25rem; font-family: ui-monospace, monospace; }
              .rr-email-body pre code { background-color: transparent; border: 0; padding: 0; }
              .rr-email-body table { border-collapse: collapse; margin-bottom: 1rem; }
              .rr-email-body table:not([cellpadding]):not([cellspacing]) th,
              .rr-email-body table:not([cellpadding]):not([cellspacing]) td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
              .rr-email-body th { background-color: #f9fafb; }
            `,
              }}
            />
            <div className="rr-email-body">
              <div dangerouslySetInnerHTML={{ __html: parsedEmailContent }} />
            </div>
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Attachments ({message.attachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {message.attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span
                        className="text-xs font-semibold text-foreground truncate max-w-[150px]"
                        title={file.filename}
                      >
                        {file.filename}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        onDownloadAttachment(file.id, file.filename)
                      }
                      className="p-1 bg-card border border-border hover:border-muted-foreground text-muted-foreground rounded-lg cursor-pointer"
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline Reply Editor Panel */}
          {replyMode && (
            <div className="border border-border bg-card rounded-2xl p-4 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
                <span className="text-xs font-bold text-foreground capitalize flex items-center gap-1.5">
                  <Reply className="size-3.5" />
                  Inline {replyMode} Editor
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-0.5 bg-muted/40">
                    <input
                      id="use-markdown-reply"
                      type="checkbox"
                      checked={useMarkdown}
                      onChange={(e) => setUseMarkdown(e.target.checked)}
                      className="size-3 bg-background border-border text-primary rounded-xs cursor-pointer"
                    />
                    <label
                      htmlFor="use-markdown-reply"
                      className="text-[9px] font-bold text-muted-foreground select-none cursor-pointer"
                    >
                      Markdown Mode
                    </label>
                  </div>
                  <button
                    onClick={() => setReplyMode(null)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* CC inputs */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 border-b border-border pb-1">
                  <span className="text-muted-foreground w-12 font-semibold select-none">
                    To:
                  </span>
                  <Input
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="bg-transparent border-0 border-transparent shadow-none h-6 text-xs text-foreground focus-visible:ring-0 p-0"
                  />
                  {!showCcInput && (
                    <button
                      onClick={() => setShowCcInput(true)}
                      className="text-[9px] font-bold text-muted-foreground hover:text-primary px-1"
                    >
                      Add Cc
                    </button>
                  )}
                </div>
                {showCcInput && (
                  <div className="flex items-center gap-2 border-b border-border pb-1">
                    <span className="text-muted-foreground w-12 font-semibold select-none">
                      Cc:
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
                <div className="flex items-center gap-2 border-b border-border pb-1">
                  <span className="text-muted-foreground w-12 font-semibold select-none">
                    Subject:
                  </span>
                  <Input
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="bg-transparent border-0 border-transparent shadow-none h-6 text-xs text-foreground focus-visible:ring-0 p-0"
                  />
                </div>
              </div>

              {/* Text body */}
              <div className="flex flex-col gap-2 min-h-[160px]">
                {useMarkdown ? (
                  <div className="flex gap-4 flex-1 min-h-[160px]">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Type markdown response..."
                      className="flex-1 min-h-[160px] p-3 text-xs bg-muted/20 border border-border rounded-xl resize-none outline-none focus:border-muted-foreground font-mono"
                    />
                    <div className="flex-1 min-h-[160px] p-3 border border-border rounded-xl overflow-y-auto bg-muted/10 prose prose-invert max-w-none text-xs leading-relaxed text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {replyBody || "*Markdown preview will render here...*"}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type email response..."
                    className="w-full min-h-[160px] p-3 text-xs bg-muted/20 border border-border rounded-xl resize-none outline-none focus:border-muted-foreground font-sans"
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
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendReply}
                  disabled={sendingReply || !replyTo.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
                >
                  {sendingReply ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Send Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right collapsible user profile panel */}
      {showProfilePanel && (
        <div className="w-[280px] border-l border-border h-full shrink-0 overflow-hidden bg-card">
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
