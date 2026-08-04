"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Mail,
  Trash2,
  Reply,
  Forward,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Paperclip,
  Download,
  Sparkles,
  User,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import RrSanitizedEmailIframe from "./rrSanitizedEmailIframe";
import RrSenderProfileCard from "./rrSenderProfileCard";
import RrPackageTrackerCard from "../tracking/rrPackageTrackerCard";
import { detectPackageTrackingNumbers } from "../tracking/rrPackageTrackerDetector";
import { formatSmartEmailDate } from "../utils/rrDateUtils";
import { useTranslation } from "react-i18next";

export interface DetailedMessage {
  id: string;
  uid: number;
  messageId: string | null;
  subject: string;
  from: string;
  to: string;
  cc: string | null;
  bcc: string | null;
  date: string;
  read: boolean;
  flagged: boolean;
  folder: string;
  bodyText: string;
  bodyHtml: string;
  attachments: {
    id: string;
    filename: string;
    contentType: string;
    size: number;
  }[];
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
  messageNotFound?: boolean;
  senderProfile?: UserProfile | null;
  loadingProfile?: boolean;
  onGoBack: () => void;
  onMarkReadChange: () => void;
  onFlaggedChange: () => void;
  onDeleteMessage: () => void;
  onRestoreMessage?: () => void;
  onDownloadAttachment: (attachmentId: string, filename: string) => void;
  onSendReply: (
    to: string,
    subject: string,
    body: string,
    html: string,
  ) => Promise<void>;
  sendingReply: boolean;
  onOpenCompose?: (data: {
    to?: string;
    cc?: string;
    subject?: string;
    body?: string;
  }) => void;
}

export default function RrEmailReader({
  message,
  loading,
  messageNotFound = false,
  senderProfile,
  loadingProfile = false,
  onGoBack,
  onMarkReadChange,
  onFlaggedChange,
  onDeleteMessage,
  onRestoreMessage,
  onDownloadAttachment,
  onSendReply,
  sendingReply,
  onOpenCompose,
}: RrEmailReaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const [loadRemoteImages, setLoadRemoteImages] = useState<boolean>(false);
  const [showSenderProfile, setShowSenderProfile] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const readerContainerRef = useRef<HTMLDivElement>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.round((prev + 0.15) * 100) / 100);
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) =>
      Math.max(0.1, Math.round((prev - 0.15) * 100) / 100),
    );
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Desktop Ctrl/Cmd + Mouse Wheel Zoom
  useEffect(() => {
    const container = readerContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.003;
        setZoomLevel((prev) => {
          const next = prev + zoomDelta;
          return Math.max(0.1, Math.round(next * 1000) / 1000);
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Touch Screen Multi-Touch Pinch Zoom
  useEffect(() => {
    const container = readerContainerRef.current;
    if (!container) return;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialPinchDistanceRef.current = getDistance(e.touches);
        initialZoomRef.current = zoomLevel;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistanceRef.current) {
        e.preventDefault();
        const currentDist = getDistance(e.touches);
        if (initialPinchDistanceRef.current > 0) {
          const scaleRatio = currentDist / initialPinchDistanceRef.current;
          const newZoom = initialZoomRef.current * scaleRatio;
          setZoomLevel(Math.max(0.1, Math.round(newZoom * 1000) / 1000));
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDistanceRef.current = null;
      }
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, {
      passive: true,
    });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [zoomLevel]);

  // Auto detect package tracking numbers from subject + bodyText + bodyHtml
  const detectedPackages = useMemo(() => {
    if (!message) return [];
    return detectPackageTrackingNumbers(
      message.subject,
      message.bodyText,
      message.bodyHtml,
    );
  }, [message]);

  const hasRemoteMedia = useMemo(() => {
    if (!message || !message.bodyHtml) return false;
    const hasRemoteImg = /\bsrc=["'](https?:)?\/\//i.test(message.bodyHtml);
    const hasStyleUrl = /\burl\s*\(["']?(https?:)?\/\//i.test(message.bodyHtml);
    return hasRemoteImg || hasStyleUrl;
  }, [message]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-3 h-full bg-card rounded-2xl border border-border shadow-xs p-6">
        <Loader2 className="size-6 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-semibold">
          {t("pegasus.reader.loading", "Decrypting mail details...")}
        </span>
      </div>
    );
  }

  if (messageNotFound) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-8 space-y-4 h-full bg-card rounded-2xl border border-border shadow-xs">
        <div className="size-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-xs">
          <Trash2 className="size-7" />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <h3 className="text-sm font-bold text-foreground">
            {t("pegasus.reader.messageNotFound")}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This email may have been deleted or moved.
          </p>
        </div>
        <button
          onClick={onGoBack}
          className="px-3.5 py-1.5 text-xs bg-muted/60 hover:bg-muted border border-border/80 hover:border-border rounded-xl text-foreground transition-all cursor-pointer font-semibold shadow-2xs"
        >
          {t("pegasus.reader.goBack")}
        </button>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-8 space-y-4 h-full bg-card rounded-2xl border border-border shadow-xs">
        <div className="size-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
          <Mail className="size-8 text-primary" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-base font-bold text-foreground tracking-tight">
            {t("pegasus.reader.selectThread")}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("pegasus.reader.selectThreadDesc")}
          </p>
        </div>
      </div>
    );
  }

  const getCleanEmail = (fromStr: string) => {
    const match = fromStr.match(/<([^>]+)>/);
    return match ? match[1] : fromStr.trim();
  };

  const getSenderName = (fromStr: string) => {
    const match = fromStr.match(/^"?([^"<]+)"?\s*</);
    return match ? match[1].trim() : fromStr;
  };

  const senderCleanEmail = getCleanEmail(message.from);

  const triggerReply = (mode: "reply" | "replyAll" | "forward") => {
    const sEmail = getCleanEmail(message.from);
    let defaultSub = message.subject || "";
    let defaultBody = message.bodyText || "";

    if (mode === "reply") {
      defaultSub = defaultSub.startsWith("Re:")
        ? defaultSub
        : `Re: ${defaultSub}`;
      defaultBody = `\n\n--- On ${new Date(message.date).toLocaleString()}, ${message.from} wrote:\n> ${(defaultBody || "").split("\n").join("\n> ")}`;
    } else if (mode === "replyAll") {
      defaultSub = defaultSub.startsWith("Re:")
        ? defaultSub
        : `Re: ${defaultSub}`;
      defaultBody = `\n\n--- On ${new Date(message.date).toLocaleString()}, ${message.from} wrote:\n> ${(defaultBody || "").split("\n").join("\n> ")}`;
    } else if (mode === "forward") {
      defaultSub = defaultSub.startsWith("Fwd:")
        ? defaultSub
        : `Fwd: ${defaultSub}`;
      defaultBody = `\n\n---------- Forwarded message ---------\nFrom: ${message.from}\nDate: ${new Date(message.date).toLocaleString()}\nSubject: ${message.subject}\nTo: ${message.to}\n\n${defaultBody}`;
    }

    if (onOpenCompose) {
      onOpenCompose({
        to: mode === "forward" ? "" : sEmail,
        cc: mode === "replyAll" ? message.cc || undefined : undefined,
        subject: defaultSub,
        body: defaultBody,
      });
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-card text-card-foreground border border-border rounded-2xl shadow-xs">
      <div
        ref={readerContainerRef}
        className="flex-1 flex flex-col h-full overflow-hidden min-w-0"
      >
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
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer"
              title={
                message.read
                  ? t("pegasus.reader.markUnread")
                  : t("pegasus.reader.markRead")
              }
            >
              {message.read ? (
                <Mail className="size-4" />
              ) : (
                <Mail className="size-4 text-primary fill-primary" />
              )}
            </button>

            <button
              onClick={onFlaggedChange}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer"
              title={
                message.flagged
                  ? t("pegasus.reader.unstar")
                  : t("pegasus.reader.star")
              }
            >
              <Star
                className={cn(
                  "size-4",
                  message.flagged && "text-amber-500 fill-amber-500",
                )}
              />
            </button>

            {message.folder.toLowerCase() === "trash" && onRestoreMessage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onRestoreMessage}
                className="h-8 text-xs px-2.5 rounded-xl text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1.5 font-bold"
              >
                <RotateCcw className="size-3.5" />
                <span>{t("pegasus.reader.restore")}</span>
              </Button>
            ) : (
              <button
                onClick={onDeleteMessage}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all cursor-pointer"
                title={t("pegasus.reader.delete")}
              >
                <Trash2 className="size-4" />
              </button>
            )}

            {/* Dynamic Zoom Control */}
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/60 ml-1">
              <button
                onClick={handleZoomOut}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                title={t("pegasus.reader.zoomOut")}
              >
                <ZoomOut className="size-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-1.5 py-0.5 text-[11px] font-mono font-bold text-foreground/80 hover:text-primary transition-colors cursor-pointer min-w-12 text-center"
                title={t("pegasus.reader.resetZoom")}
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                title={t("pegasus.reader.zoomIn")}
              >
                <ZoomIn className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerReply("reply")}
              className="px-2.5 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Reply className="size-3.5" />
              <span>{t("pegasus.reader.reply")}</span>
            </button>
            <button
              onClick={() => triggerReply("forward")}
              className="px-2.5 py-1 text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/80 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Forward className="size-3.5" />
              <span>{t("pegasus.reader.forward")}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Email Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
          {/* Header Metadata Block */}
          <div className="space-y-4">
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-snug">
              {message.subject || t("pegasus.reader.noSubject")}
            </h1>

            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowSenderProfile(true)}
                  className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0 hover:scale-105 transition-transform cursor-pointer relative"
                  title={t("pegasus.reader.viewSenderProfile")}
                >
                  {getSenderName(message.from).charAt(0).toUpperCase()}
                  {senderProfile && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-background rounded-full" />
                  )}
                </button>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">
                      {getSenderName(message.from)}
                    </span>
                    <button
                      onClick={() => setShowSenderProfile(true)}
                      className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <span>&lt;{senderCleanEmail}&gt;</span>
                      <ExternalLink className="size-3" />
                    </button>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("pegasus.reader.to")}:{" "}
                    <span className="font-semibold text-foreground/80">
                      {message.to}
                    </span>
                    {message.cc && (
                      <span className="ml-2">
                        {t("pegasus.reader.cc")}: {message.cc}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-muted-foreground">
                  {formatSmartEmailDate(message.date, { includeTime: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Smart Package Tracker Card */}
          {detectedPackages.length > 0 && (
            <RrPackageTrackerCard packages={detectedPackages} />
          )}

          {/* Remote Media Security Notice */}
          {hasRemoteMedia && !loadRemoteImages && (
            <div className="flex items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="size-4 shrink-0 text-amber-500" />
                <span className="truncate">
                  {t("pegasus.reader.remoteMediaNotice")}
                </span>
              </div>
              <button
                onClick={() => setLoadRemoteImages(true)}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 font-bold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {t("pegasus.reader.loadImages")}
              </button>
            </div>
          )}

          {/* Render HTML or Plain Text Email Body with Dynamic Zoom */}
          {message.bodyHtml ? (
            <RrSanitizedEmailIframe
              htmlContent={message.bodyHtml}
              loadRemoteContent={loadRemoteImages}
              zoom={zoomLevel}
            />
          ) : (
            <div className="w-full overflow-x-auto border border-border/70 rounded-2xl bg-card">
              <div
                className="p-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground font-mono transition-all duration-75 min-w-full inline-block"
                style={{
                  zoom: zoomLevel,
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                }}
              >
                {message.bodyText || t("pegasus.reader.emptyBody")}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Paperclip className="size-4 text-primary" />
                <span>
                  {t("pegasus.reader.attachments", {
                    count: message.attachments.length,
                  })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 bg-muted/30 border border-border/70 hover:border-border rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <Paperclip className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {att.filename}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(att.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDownloadAttachment(att.id, att.filename)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                      title={t("pegasus.reader.downloadAttachment")}
                    >
                      <Download className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 pt-6 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerReply("reply")}
              className="rounded-xl cursor-pointer text-xs font-semibold"
            >
              <Reply className="size-3.5 mr-1.5" />
              {t("pegasus.reader.reply")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerReply("replyAll")}
              className="rounded-xl cursor-pointer text-xs font-semibold"
            >
              <Reply className="size-3.5 mr-1.5" />
              {t("pegasus.reader.replyAll")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerReply("forward")}
              className="rounded-xl cursor-pointer text-xs font-semibold"
            >
              <Forward className="size-3.5 mr-1.5" />
              {t("pegasus.reader.forward")}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Drawer: Sender Profile Card */}
      <Sheet open={showSenderProfile} onOpenChange={setShowSenderProfile}>
        <SheetContent className="w-80 sm:w-96 p-0 border-l border-border bg-card">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("pegasus.reader.senderProfile")}</SheetTitle>
          </SheetHeader>
          <RrSenderProfileCard
            profile={senderProfile || null}
            loading={loadingProfile}
            onClose={() => setShowSenderProfile(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
