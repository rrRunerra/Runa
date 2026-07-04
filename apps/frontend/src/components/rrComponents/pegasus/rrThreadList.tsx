"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Edit,
  Loader2,
  ChevronRight,
  ChevronDown,
  Inbox,
  Send,
  FileText,
  Trash,
  ShieldAlert,
  Archive,
  Mail,
  CheckSquare,
  Square,
  RotateCcw,
  FolderOpen,
  Star,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

interface Message {
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
  onTriggerSync: () => void;
  syncingEmails: boolean;
  onInitiateNewCompose: () => void;
  accounts: any[];
  // Selection states
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBulkAction: (
    action: "read" | "unread" | "archive" | "trash" | "restore",
  ) => void;
  onEmptyTrash?: () => void;
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
  syncingEmails,
  onInitiateNewCompose,
  accounts,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkAction,
  onEmptyTrash,
}: RrThreadListProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedThreadSubjects, setExpandedThreadSubjects] = useState<
    string[]
  >([]);

  const getCleanSubject = (subject: string): string => {
    return subject
      .replace(/^(Re|Fwd|Fw|Reply|Forward|Fwd\[\d+\]):\s*/i, "")
      .trim()
      .toLowerCase();
  };

  const getSenderName = (from: string): string => {
    const match = from.match(/^([^<]+)/);
    return match && match[1] ? match[1].replace(/['"]/g, "").trim() : from;
  };

  const getFolderIcon = (): React.JSX.Element => {
    switch (folder.toLowerCase()) {
      case "inbox":
        return <Inbox className="size-4" />;
      case "sent":
        return <Send className="size-4" />;
      case "drafts":
        return <FileText className="size-4" />;
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
    const sorted = [...messages].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

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

    finalThreads.sort(
      (a, b) =>
        new Date(b.parent.date).getTime() - new Date(a.parent.date).getTime(),
    );
    return finalThreads;
  }, [messages]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threadedGroupMessages;
    const query = searchQuery.toLowerCase();
    return threadedGroupMessages.filter(
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
  }, [threadedGroupMessages, searchQuery]);

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
    <div className="flex flex-col w-full h-full overflow-hidden bg-background">
      {/* Sticky Bulk Action Toolbar / Standard Header */}
      <div className="p-4 border-b border-border bg-background relative min-h-[97px] flex flex-col justify-center shrink-0">
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
                {selectedIds.length} Selected
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
                  Mark Read
                </Button>
              )}
              {hasReadSelected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction("unread")}
                  className="h-8 text-[10px] px-2.5 rounded-lg cursor-pointer"
                >
                  Mark Unread
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
                  Restore
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBulkAction("archive")}
                    className="h-8 text-[10px] px-2.5 rounded-lg cursor-pointer"
                  >
                    Archive
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onBulkAction("trash")}
                    className="h-8 text-[10px] px-2.5 rounded-lg cursor-pointer"
                  >
                    Delete
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
                ({threadedGroupMessages.length} threads)
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
                    <span>Sync Folder</span>
                  </DropdownMenuItem>
                  {folder.toLowerCase() === "trash" &&
                    threadedGroupMessages.length > 0 && (
                      <DropdownMenuItem
                        onClick={onEmptyTrash}
                        className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash className="size-3.5" />
                        <span>Empty Trash</span>
                      </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {selectedIds.length === 0 && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-muted/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/45 focus-visible:border-primary/30"
            />
          </div>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
            <span className="text-xs text-muted-foreground">
              Decrypting messages...
            </span>
          </div>
        ) : error ? (
          <div className="p-4 text-center space-y-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No threads found.
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

              return (
                <div
                  key={parent.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("messageId", parent.id);
                  }}
                  className={cn(
                    "group p-3 rounded-xl cursor-pointer transition-all border flex gap-3 select-none items-start",
                    isSelected
                      ? "bg-primary/5 border-primary/20 shadow-xs"
                      : "bg-background hover:bg-muted/50 border-border",
                  )}
                  style={getAccountStyle(parent)}
                  onClick={() => onSelectMessage(parent.id)}
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!parent.read && (
                          <span className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] shrink-0" />
                        )}
                        <span
                          className={cn(
                            "text-xs truncate font-semibold text-foreground",
                            !parent.read && "font-bold",
                          )}
                        >
                          {getSenderName(parent.from)}
                        </span>
                        {parent.flagged && (
                          <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        {hasReplies && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-mono shrink-0">
                            {replies.length + 1}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-light">
                        {new Date(parent.date).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between min-w-0 gap-2">
                      <h4
                        className={cn(
                          "text-xs truncate text-muted-foreground font-medium",
                          !parent.read && "font-bold text-foreground/80",
                        )}
                      >
                        {parent.subject || "(No Subject)"}
                      </h4>
                      {hasReplies && (
                        <button
                          onClick={(e) => toggleThread(parent.subject, e)}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded-md transition-colors"
                        >
                          {isThreadExpanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Replies */}
                    {hasReplies && isThreadExpanded && (
                      <div className="mt-2.5 border-t border-border pt-2.5 space-y-2">
                        {replies.map((reply) => {
                          const isReplySelected =
                            selectedMessageId === reply.id;
                          const isReplyChecked = selectedIds.includes(reply.id);
                          return (
                            <div
                              key={reply.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectMessage(reply.id);
                              }}
                              className={cn(
                                "flex items-start gap-2 p-2 rounded-xl transition-all border",
                                isReplySelected
                                  ? "bg-primary/10 border-primary/20"
                                  : "bg-background/40 border-transparent hover:bg-muted/30",
                              )}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleSelect(reply.id);
                                }}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                {isReplyChecked ? (
                                  <CheckSquare className="size-3.5 text-primary" />
                                ) : (
                                  <Square className="size-3.5 text-muted-foreground opacity-60" />
                                )}
                              </button>
                              <div className="flex-1 flex items-center justify-between min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  {!reply.read && (
                                    <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                                  )}
                                  <span className="text-[11px] truncate font-medium text-foreground">
                                    {getSenderName(reply.from)}:
                                  </span>
                                  {reply.flagged && (
                                    <Star className="size-2.5 text-amber-500 fill-amber-500 shrink-0" />
                                  )}
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                    {reply.subject}
                                  </span>
                                </div>
                                <span className="text-[9px] text-muted-foreground shrink-0">
                                  {new Date(reply.date).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center py-4 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              disabled={loadingMore}
              onClick={onLoadMore}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 rounded-xl cursor-pointer"
            >
              {loadingMore && (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              )}
              Load More Emails
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
