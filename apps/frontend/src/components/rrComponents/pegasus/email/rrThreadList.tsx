"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Mail,
  Star,
  Square,
  CheckSquare,
  Search,
  Paperclip,
  ArrowDown,
  ArrowUp,
  Inbox,
  Send,
  Archive,
  Trash,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Menu,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { formatSmartEmailDate } from "../utils/rrDateUtils";
import RrThreadContextMenu from "./rrThreadContextMenu";

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface Message {
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
  encryptedKey?: any;
  userEmailAccountId?: string;
  labels?: string[];
  bodyText?: string;
  bodyHtml?: string;
}

interface RrThreadListProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  folder: string;
  accountId: string;
  selectedMessageId: string | null;
  onSelectMessage: (id: string) => void;
  onLoadMore: () => void;
  onTriggerSync?: () => void;
  syncingEmails?: boolean;
  onInitiateNewCompose?: () => void;
  accounts?: any[];

  // Multi select
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onBulkAction?: (
    action: "read" | "unread" | "archive" | "trash" | "restore",
  ) => void;
  onEmptyTrash?: () => void;

  // Context Menu Actions
  onMarkRead?: (id: string, read: boolean) => void;
  onReplyMsg?: (
    msg: Message,
    mode: "reply" | "replyAll" | "forward" | "redirect",
  ) => void;
  onMoveTo?: (id: string, targetFolder: string) => void;
  onCopyTo?: (id: string, targetFolder: string) => void;
  onEditAsNewMessage?: (msg: Message) => void;
}

export default function RrThreadList({
  messages,
  loading,
  error,
  hasMore,
  loadingMore,
  folder,
  accountId,
  selectedMessageId,
  onSelectMessage,
  onLoadMore,
  onTriggerSync,
  syncingEmails = false,
  onInitiateNewCompose,
  accounts = [],
  selectedIds = [],
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
  onBulkAction = () => {},
  onEmptyTrash = () => {},
  onMarkRead,
  onReplyMsg,
  onMoveTo,
  onCopyTo,
  onEditAsNewMessage,
}: RrThreadListProps): React.JSX.Element {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.currentTarget;
    const touch = e.touches[0];
    if (!touch) return;
    const { clientX, clientY } = touch;

    touchTimerRef.current = setTimeout(() => {
      const contextMenuEvent = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
      });
      target.dispatchEvent(contextMenuEvent);
    }, 250);
  };

  const handleTouchEndOrMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const [expandedThreadSubjects, setExpandedThreadSubjects] = useState<
    string[]
  >([]);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "unread" | "flagged" | "attachments"
  >("all");

  const getCleanSubject = (subject: string): string => {
    return subject
      .replace(/^(Re|Fwd|Fw|Reply|Forward|Fwd\[\d+\]):\s*/i, "")
      .trim()
      .toLowerCase();
  };

  const getSenderName = (fromStr: string): string => {
    if (!fromStr) return t("pegasus.folderView.unknownSender");
    const nameMatch = fromStr.match(/^"?([^"<]+)"?\s*</);
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1].trim();
    }
    const emailMatch = fromStr.match(/<([^>]+)>/);
    if (emailMatch && emailMatch[1]) {
      return emailMatch[1].trim();
    }
    return fromStr;
  };

  const getFolderIcon = () => {
    switch (folder.toLowerCase()) {
      case "inbox":
        return <Inbox className="size-4 text-primary" />;
      case "sent":
        return <Send className="size-4" />;
      case "trash":
        return <Trash className="size-4" />;
      case "junk":
        return <ShieldAlert className="size-4" />;
      case "archive":
        return <Archive className="size-4" />;
      default:
        return <Mail className="size-4" />;
    }
  };

  const threadedGroupMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    const sorted = [...messages].sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return sortOrder === "desc" ? diff : -diff;
    });

    const groups: { [key: string]: Message[] } = {};
    for (const msg of sorted) {
      const cleanSub = getCleanSubject(msg.subject || "(No Subject)");
      if (!groups[cleanSub]) {
        groups[cleanSub] = [];
      }
      groups[cleanSub].push(msg);
    }

    const finalThreads: { parent: Message; replies: Message[] }[] = [];
    for (const cleanSub in groups) {
      const groupList = groups[cleanSub];
      const parent = groupList[0];
      const replies = groupList.slice(1);
      finalThreads.push({ parent, replies });
    }

    finalThreads.sort((a, b) => {
      const diff =
        new Date(b.parent.date).getTime() - new Date(a.parent.date).getTime();
      return sortOrder === "desc" ? diff : -diff;
    });
    return finalThreads;
  }, [messages, sortOrder]);

  const filteredThreads = useMemo(() => {
    let result = threadedGroupMessages;

    if (activeFilter === "unread") {
      result = result.filter(
        (t) => !t.parent.read || t.replies.some((r) => !r.read),
      );
    } else if (activeFilter === "flagged") {
      result = result.filter(
        (t) => t.parent.flagged || t.replies.some((r) => r.flagged),
      );
    } else if (activeFilter === "attachments") {
      result = result.filter(
        (t) =>
          (t.parent.attachments && t.parent.attachments.length > 0) ||
          t.replies.some((r) => r.attachments && r.attachments.length > 0),
      );
    }

    if (!searchQuery) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(
      (item) =>
        item.parent.subject.toLowerCase().includes(query) ||
        item.parent.from.toLowerCase().includes(query) ||
        item.parent.to.toLowerCase().includes(query) ||
        item.replies.some(
          (rep) =>
            rep.subject.toLowerCase().includes(query) ||
            rep.from.toLowerCase().includes(query),
        ),
    );
  }, [threadedGroupMessages, searchQuery, activeFilter]);

  const toggleThread = (subject: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanSub = getCleanSubject(subject);
    setExpandedThreadSubjects((prev) =>
      prev.includes(cleanSub)
        ? prev.filter((s) => s !== cleanSub)
        : [...prev, cleanSub],
    );
  };

  const getAccountStyle = (msg: Message) => {
    if (accounts.length === 0) return {};
    const accId = msg.userEmailAccountId || accountId;
    const matched = accounts.find((a) => a.id === accId);
    if (!matched) return {};
    return {
      borderLeft: `4px solid ${matched.color}`,
      boxShadow: `0 0 12px ${matched.color}15`,
    };
  };

  const allSelected = useMemo(() => {
    return (
      messages.length > 0 && messages.every((m) => selectedIds.includes(m.id))
    );
  }, [messages, selectedIds]);

  const hasUnreadSelected = useMemo(() => {
    return messages.some((m) => selectedIds.includes(m.id) && !m.read);
  }, [messages, selectedIds]);

  const hasReadSelected = useMemo(() => {
    return messages.some((m) => selectedIds.includes(m.id) && m.read);
  }, [messages, selectedIds]);

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-card">
      {/* Header Toolbar */}
      <div className="p-3.5 border-b border-border/70 bg-card/50 backdrop-blur-xl relative min-h-23 flex flex-col justify-center shrink-0">
        {selectedIds.length > 0 ? (
          <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleSelectAll}
                className="p-1 text-primary hover:bg-muted rounded-md cursor-pointer transition-colors"
                title="Select All"
              >
                {allSelected ? (
                  <CheckSquare className="size-4.5" />
                ) : (
                  <Square className="size-4.5" />
                )}
              </button>
              <span className="text-xs font-bold text-foreground">
                {t("pegasus.folderView.selectedCount", {
                  count: selectedIds.length,
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasUnreadSelected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction("read")}
                  className="h-8 text-[10px] px-2.5 rounded-lg cursor-pointer"
                >
                  {t("pegasus.folderView.bulkRead")}
                </Button>
              )}
              {hasReadSelected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction("unread")}
                  className="h-8 text-[10px] px-2.5 rounded-lg cursor-pointer"
                >
                  {t("pegasus.folderView.bulkUnread")}
                </Button>
              )}
              {folder.toLowerCase() === "trash" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction("restore")}
                  className="h-8 text-[10px] px-2.5 rounded-lg text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1 font-bold"
                >
                  <RotateCcw className="size-3" />
                  {t("pegasus.folderView.bulkRestore")}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBulkAction("archive")}
                    className="h-8 text-[10px] px-2.5 rounded-lg cursor-pointer"
                  >
                    {t("pegasus.folderView.bulkArchive")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onBulkAction("trash")}
                    className="h-8 text-[10px] px-2.5 rounded-lg cursor-pointer"
                  >
                    {t("pegasus.folderView.bulkTrash")}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-foreground capitalize">
              {getFolderIcon()}
              <span>{folder}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t("pegasus.folderView.threadsCount", {
                  count: threadedGroupMessages.length,
                })}
              </span>
            </div>
            {accountId !== "unified" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-xl transition-all cursor-pointer flex items-center justify-center">
                    <Menu className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    disabled={syncingEmails}
                    onClick={onTriggerSync}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw
                      className={cn(
                        "size-3.5",
                        syncingEmails && "animate-spin text-primary",
                      )}
                    />
                    <span>{t("pegasus.folderView.syncFolder")}</span>
                  </DropdownMenuItem>
                  {folder.toLowerCase() === "trash" &&
                    threadedGroupMessages.length > 0 && (
                      <DropdownMenuItem
                        onClick={onEmptyTrash}
                        className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash className="size-3.5" />
                        <span>{t("pegasus.folderView.emptyTrash")}</span>
                      </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {selectedIds.length === 0 && (
          <div className="space-y-2 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("pegasus.folderView.searchConversations")}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-muted/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/45 focus-visible:border-primary/30"
              />
            </div>

            {/* Filter & Sort Bar */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer border whitespace-nowrap",
                    activeFilter === "all"
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t("pegasus.folderView.filterAll", "All")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("unread")}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer border whitespace-nowrap",
                    activeFilter === "unread"
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t("pegasus.folderView.filterUnread", "Unread")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("flagged")}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer border whitespace-nowrap",
                    activeFilter === "flagged"
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t("pegasus.folderView.filterFlagged", "Starred")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("attachments")}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer border whitespace-nowrap flex items-center gap-1",
                    activeFilter === "attachments"
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Paperclip className="size-2.5" />
                  <span>{t("pegasus.folderView.filterFiles", "Files")}</span>
                </button>
              </div>

              {/* Sort Toggle */}
              <button
                type="button"
                onClick={() =>
                  setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
                }
                className="p-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold shrink-0"
                title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
              >
                {sortOrder === "desc" ? (
                  <ArrowDown className="size-3 text-primary" />
                ) : (
                  <ArrowUp className="size-3 text-primary" />
                )}
                <span className="hidden xs:inline">
                  {sortOrder === "desc"
                    ? t("pegasus.folderView.newest", "Newest")
                    : t("pegasus.folderView.oldest", "Oldest")}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
            <span className="text-xs text-muted-foreground">
              {t("pegasus.folderView.loading")}
            </span>
          </div>
        ) : error ? (
          <div className="p-4 text-center space-y-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            {t("pegasus.folderView.noMessages")}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredThreads.map(({ parent, replies }) => {
              const isSelected = selectedMessageId === parent.id;
              const cleanSub = getCleanSubject(
                parent.subject || "(No Subject)",
              );
              const isThreadExpanded =
                expandedThreadSubjects.includes(cleanSub);
              const hasReplies = replies.length > 0;
              const isChecked = selectedIds.includes(parent.id);
              const accId = parent.userEmailAccountId || accountId;
              const matchedAccount = accounts.find((a) => a.id === accId);

              return (
                <ContextMenu key={parent.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("messageId", parent.id);
                      }}
                      className={cn(
                        "group p-3 rounded-xl cursor-pointer transition-all border flex gap-3 select-none items-start",
                        isSelected
                          ? "bg-primary/15 border-primary ring-1 ring-primary/40 shadow-xs"
                          : !parent.read
                            ? "bg-card hover:bg-muted/50 border-border/90 shadow-2xs"
                            : "bg-muted/25 hover:bg-muted/50 border-border/40 opacity-85",
                      )}
                      style={getAccountStyle(parent)}
                      onClick={() => onSelectMessage(parent.id)}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchEndOrMove}
                      onTouchEnd={handleTouchEndOrMove}
                      onTouchCancel={handleTouchEndOrMove}
                    >
                      {/* Checkbox Trigger Area */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelect(parent.id);
                        }}
                        className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4 text-muted-foreground opacity-60 group-hover:opacity-100" />
                        )}
                      </button>

                      {/* Body Wrapper */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            {!parent.read && (
                              <span className="size-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] shrink-0" />
                            )}
                            <span
                              className={cn(
                                "text-xs truncate text-foreground",
                                !parent.read
                                  ? "font-bold text-foreground"
                                  : "font-medium text-muted-foreground",
                              )}
                            >
                              {getSenderName(parent.from)}
                            </span>
                            {matchedAccount && (
                              <span
                                className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border shrink-0 max-w-24 truncate"
                                style={{
                                  backgroundColor: `${matchedAccount.color}22`,
                                  color: matchedAccount.color,
                                  borderColor: `${matchedAccount.color}55`,
                                }}
                              >
                                {matchedAccount.accountName ||
                                  matchedAccount.emailAddress.split("@")[0]}
                              </span>
                            )}
                            {parent.flagged && (
                              <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            {hasReplies && (
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-mono shrink-0">
                                {replies.length + 1}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-semibold">
                            {formatSmartEmailDate(parent.date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between min-w-0 gap-2">
                          <h4
                            className={cn(
                              "text-xs truncate",
                              !parent.read
                                ? "font-bold text-foreground"
                                : "font-medium text-muted-foreground",
                            )}
                          >
                            {parent.subject || "(No Subject)"}
                          </h4>
                          {hasReplies && (
                            <button
                              onClick={(e) => toggleThread(parent.subject, e)}
                              className="text-[10px] text-primary font-bold hover:underline shrink-0"
                            >
                              {isThreadExpanded ? "Collapse" : "Expand"}
                            </button>
                          )}
                        </div>

                        {/* Threaded Child Messages */}
                        {hasReplies && isThreadExpanded && (
                          <div className="mt-2 pl-3 border-l-2 border-primary/30 space-y-1.5 pt-1">
                            {replies.map((replyMsg) => (
                              <div
                                key={replyMsg.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectMessage(replyMsg.id);
                                }}
                                className={cn(
                                  "p-2 rounded-lg text-xs cursor-pointer transition-colors flex items-center justify-between gap-2 border",
                                  selectedMessageId === replyMsg.id
                                    ? "bg-primary/10 border-primary/30 font-bold"
                                    : "bg-muted/40 hover:bg-muted border-border/50",
                                )}
                              >
                                <div className="min-w-0 flex-1 truncate">
                                  <span className="text-[11px] font-semibold text-foreground mr-1.5">
                                    {getSenderName(replyMsg.from)}
                                  </span>
                                </div>
                                <span className="text-[9px] text-muted-foreground shrink-0">
                                  {formatSmartEmailDate(replyMsg.date)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </ContextMenuTrigger>

                  <RrThreadContextMenu
                    msg={parent}
                    onMarkRead={onMarkRead}
                    onReplyMsg={onReplyMsg}
                    onMoveTo={onMoveTo}
                    onCopyTo={onCopyTo}
                    onEditAsNewMessage={onEditAsNewMessage}
                  />
                </ContextMenu>
              );
            })}

            {hasMore && (
              <div className="pt-2 pb-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full text-xs font-semibold rounded-xl"
                >
                  {loadingMore ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : null}
                  {t("pegasus.folderView.loadMore")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
