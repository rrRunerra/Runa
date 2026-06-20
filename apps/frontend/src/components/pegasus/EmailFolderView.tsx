"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  Download,
  FileText,
  Flag,
  Inbox,
  Mail,
  Search,
  Send,
  ShieldAlert,
  Trash,
  Trash2,
  User,
  Star,
  Loader2,
  ChevronLeft,
  Reply,
  ReplyAll,
  Forward,
  Edit,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { ComposeEmailModal } from "@/components/pegasus/ComposeEmailModal";
import { cn } from "@/lib/utils";

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
}

interface DetailedMessage extends Message {
  bodyText: string;
  bodyHtml: string;
}

interface EmailFolderViewProps {
  accountId: string;
  folder: string;
}

export default function EmailFolderView({
  accountId,
  folder,
}: EmailFolderViewProps): React.JSX.Element {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const queryMessageId = searchParams.get("messageId");
  const [syncingEmails, setSyncingEmails] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [detailedMessage, setDetailedMessage] =
    useState<DetailedMessage | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [messageNotFound, setMessageNotFound] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDetailOnMobile, setShowDetailOnMobile] = useState<boolean>(false);
  const [iframeHeight, setIframeHeight] = useState<number>(350);
  const [loadRemoteContent, setLoadRemoteContent] = useState<boolean>(false);

  // Compose / Action states
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composeAction, setComposeAction] = useState<
    "reply" | "replyAll" | "forward" | "compose" | null
  >(null);
  const [composeTo, setComposeTo] = useState<string>("");
  const [composeCc, setComposeCc] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeBody, setComposeBody] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccount, setActiveAccount] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch messages in the folder
  const fetchMessages = useCallback(async (): Promise<void> => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/folders/${folder}/messages`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to load messages. Please verify SMTP/IMAP settings.");
    } finally {
      setMessages((prev) => (Array.isArray(prev) ? prev : []));
      setLoading(false);
    }
  }, [accountId, folder, session?.accessToken]);

  const fetchAccounts = useCallback(async (): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setAccounts(list);
        const active = list.find((a) => a.id === accountId);
        if (active) setActiveAccount(active);
      }
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    }
  }, [accountId, session?.accessToken]);

  // Fetch individual message details
  const fetchMessageDetail = useCallback(
    async (messageId: string): Promise<void> => {
      if (!session?.accessToken) return;
      setLoadingDetail(true);
      setMessageNotFound(false);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/messages/${messageId}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          },
        );
        if (res.status === 404) {
          setMessageNotFound(true);
          setDetailedMessage(null);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch message details");
        const data: DetailedMessage = await res.json();
        setDetailedMessage(data);

        // If unread, mark as read on the backend
        setMessages((prev) => {
          const messageObj = prev.find((m) => m.id === messageId);
          if (messageObj && !messageObj.read) {
            fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/messages/${messageId}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify({ read: true }),
              },
            ).catch((e) => console.error("Failed to update read status:", e));

            return prev.map((msg) =>
              msg.id === messageId ? { ...msg, read: true } : msg,
            );
          }
          return prev;
        });
      } catch (err: unknown) {
        console.error(err);
      } finally {
        setLoadingDetail(false);
      }
    },
    [accountId, session?.accessToken],
  );

  useEffect(() => {
    fetchMessages();
    fetchAccounts();
    if (queryMessageId) {
      setSelectedMessageId(queryMessageId);
      fetchMessageDetail(queryMessageId);
      setShowDetailOnMobile(true);
    } else {
      setSelectedMessageId(null);
      setDetailedMessage(null);
      setShowDetailOnMobile(false);
    }
  }, [
    accountId,
    folder,
    fetchMessages,
    fetchAccounts,
    queryMessageId,
    fetchMessageDetail,
  ]);

  // Setup WebSocket connection for live emails
  useEffect(() => {
    if (!session?.accessToken) return;

    const wsUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const socket: Socket = io(`${wsUrl}/notifications`, {
      query: { token: session.accessToken },
      transports: ["websocket"],
    });

    socket.on(
      "email:new",
      (data: { accountId: string; folder: string; message: any }) => {
        // If the email belongs to this account and folder, refresh messages list
        if (
          data.accountId === accountId &&
          data.folder.toLowerCase() === folder.toLowerCase()
        ) {
          fetchMessages();
        }

        // Show toast if a new email is in the inbox and matches this account
        if (
          data.folder.toLowerCase() === "inbox" &&
          data.accountId === accountId
        ) {
          toast.info(`New mail: ${data.message.subject || "(No Subject)"}`, {
            description: `From: ${data.message.from}`,
          });
        }
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [session?.accessToken, accountId, folder, fetchMessages]);

  useEffect(() => {
    setLoadRemoteContent(false);
    setIsComposing(false);
    setComposeAction(null);
  }, [selectedMessageId]);

  useEffect(() => {
    if (!activeAccount || !folder) return;
    document.title = `Pegasus > ${activeAccount.accountName} > ${folder}`;
  }, [activeAccount, folder]);

  const hasRemoteContent = useMemo(() => {
    if (!detailedMessage || !detailedMessage.bodyHtml) return false;
    const hasRemoteImg = /\bsrc=["'](https?:)?\/\//i.test(
      detailedMessage.bodyHtml,
    );
    const hasStyleUrl = /\burl\s*\(["']?(https?:)?\/\//i.test(
      detailedMessage.bodyHtml,
    );
    return hasRemoteImg || hasStyleUrl;
  }, [detailedMessage]);

  const getSanitizedHtmlContent = (
    html: string,
    allowRemote: boolean,
  ): string => {
    if (!html) return "";
    if (allowRemote) return html;

    // Replace remote images with transparent GIF
    let temp = html.replace(
      /\bsrc=(["'])(https?:)?\/\/([^"']+)\1/gi,
      'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-blocked-src="$2//$3"',
    );
    // Replace remote CSS backgrounds
    temp = temp.replace(
      /\burl\((["']?)(https?:)?\/\/([^"')]+)\1\)/gi,
      'url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")',
    );

    return temp;
  };

  const handleInitiateCompose = (
    action: "reply" | "replyAll" | "forward",
  ): void => {
    if (!detailedMessage) return;

    setComposeAction(action);
    setIsComposing(true);

    const senderEmail = getSenderEmail(detailedMessage.from);

    if (action === "reply") {
      setComposeTo(senderEmail);
      setComposeCc("");
      setComposeSubject(
        detailedMessage.subject.startsWith("Re:")
          ? detailedMessage.subject
          : `Re: ${detailedMessage.subject}`,
      );
      setComposeBody(
        `\n\n--- On ${new Date(detailedMessage.date).toLocaleString()}, ${detailedMessage.from} wrote:\n> ${detailedMessage.bodyText.split("\n").join("\n> ")}`,
      );
    } else if (action === "replyAll") {
      const recipients = [senderEmail];
      if (detailedMessage.to) {
        const toList = detailedMessage.to
          .split(",")
          .map((t) => getSenderEmail(t.trim()));
        toList.forEach((email) => {
          if (email && !recipients.includes(email)) {
            recipients.push(email);
          }
        });
      }
      setComposeTo(recipients.join(", "));
      setComposeCc(detailedMessage.cc || "");
      setComposeSubject(
        detailedMessage.subject.startsWith("Re:")
          ? detailedMessage.subject
          : `Re: ${detailedMessage.subject}`,
      );
      setComposeBody(
        `\n\n--- On ${new Date(detailedMessage.date).toLocaleString()}, ${detailedMessage.from} wrote:\n> ${detailedMessage.bodyText.split("\n").join("\n> ")}`,
      );
    } else if (action === "forward") {
      setComposeTo("");
      setComposeCc("");
      setComposeSubject(
        detailedMessage.subject.startsWith("Fwd:")
          ? detailedMessage.subject
          : `Fwd: ${detailedMessage.subject}`,
      );
      setComposeBody(
        `\n\n---------- Forwarded message ---------\nFrom: ${detailedMessage.from}\nDate: ${new Date(detailedMessage.date).toLocaleString()}\nSubject: ${detailedMessage.subject}\nTo: ${detailedMessage.to}\n${detailedMessage.cc ? `Cc: ${detailedMessage.cc}\n` : ""}\n${detailedMessage.bodyText}`,
      );
    }
  };

  const handleTriggerSync = async (): Promise<void> => {
    if (!session?.accessToken) return;
    setSyncingEmails(true);

    toast.promise(
      (async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/sync`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          },
        );
        if (!res.ok) {
          throw new Error("Failed to sync emails.");
        }
        await fetchMessages();
      })(),
      {
        loading: "Syncing with mail server...",
        success: "Email sync completed!",
        error: "Sync failed. Please verify setting configurations.",
      },
    );

    setSyncingEmails(false);
  };

  const handleInitiateNewCompose = (): void => {
    setComposeAction("compose");
    setIsComposing(true);
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
  };

  const handleSelectMessage = (messageId: string): void => {
    setSelectedMessageId(messageId);
    setShowDetailOnMobile(true);
    fetchMessageDetail(messageId);
  };

  const handleIframeLoad = (
    e: React.SyntheticEvent<HTMLIFrameElement>,
  ): void => {
    const iframe = e.currentTarget;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        setIframeHeight(doc.body.scrollHeight + 30);

        if (typeof window !== "undefined" && "ResizeObserver" in window) {
          const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
              const height = entry.target.scrollHeight;
              setIframeHeight(height + 30);
            }
          });
          observer.observe(doc.body);
        }
      }
    } catch (err: unknown) {
      console.error("Could not access iframe document for resizing:", err);
    }
  };

  // Update read/flagged status
  const updateMessageStatus = async (
    messageId: string,
    updates: { read?: boolean; flagged?: boolean; folder?: string },
  ): Promise<void> => {
    if (!session?.accessToken) return;

    // Optimistically update list state
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)),
    );
    if (detailedMessage && detailedMessage.id === messageId) {
      setDetailedMessage((prev) => (prev ? { ...prev, ...updates } : null));
    }

    // If folder changes to a different folder than the current one, remove it from list
    if (
      updates.folder &&
      updates.folder.toLowerCase() !== folder.toLowerCase()
    ) {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      if (selectedMessageId === messageId) {
        setSelectedMessageId(null);
        setDetailedMessage(null);
        setShowDetailOnMobile(false);
      }
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/messages/${messageId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify(updates),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (err: unknown) {
      console.error("Failed to update message status:", err);
      fetchMessages();
      throw err;
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string): Promise<boolean> => {
    if (!session?.accessToken) return false;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/messages/${messageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );
      if (res.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        if (selectedMessageId === messageId) {
          setSelectedMessageId(null);
          setDetailedMessage(null);
          setShowDetailOnMobile(false);
        }
        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error("Failed to delete message:", err);
      return false;
    }
  };

  const handleBulkUpdateStatus = async (
    ids: string[],
    updates: { read?: boolean; flagged?: boolean; folder?: string },
  ): Promise<void> => {
    if (!session?.accessToken) return;

    // Optimistically update list state
    setMessages((prev) =>
      prev.map((msg) => (ids.includes(msg.id) ? { ...msg, ...updates } : msg)),
    );
    if (detailedMessage && ids.includes(detailedMessage.id)) {
      setDetailedMessage((prev) => (prev ? { ...prev, ...updates } : null));
    }

    if (
      updates.folder &&
      updates.folder.toLowerCase() !== folder.toLowerCase()
    ) {
      setMessages((prev) => prev.filter((msg) => !ids.includes(msg.id)));
      if (selectedMessageId && ids.includes(selectedMessageId)) {
        setSelectedMessageId(null);
        setDetailedMessage(null);
        setShowDetailOnMobile(false);
      }
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/messages/bulk`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            messageIds: ids,
            ...updates,
          }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      if (!updates.folder) {
        toast.success("Status updated for selected emails");
      }
      setSelectedIds([]); // Clear selection
    } catch (err: unknown) {
      console.error("Failed bulk update:", err);
      if (!updates.folder) {
        toast.error("Failed to update status. Please try again.");
      }
      fetchMessages();
      throw err;
    }
  };

  const handleBulkDeleteMessages = async (ids: string[]): Promise<boolean> => {
    if (!session?.accessToken) return false;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/messages/bulk-delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            messageIds: ids,
          }),
        },
      );
      if (res.ok) {
        setMessages((prev) => prev.filter((msg) => !ids.includes(msg.id)));
        if (selectedMessageId && ids.includes(selectedMessageId)) {
          setSelectedMessageId(null);
          setDetailedMessage(null);
          setShowDetailOnMobile(false);
        }
        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error("Failed bulk delete message:", err);
      return false;
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteConfirmId) return;

    if (deleteConfirmId === "bulk") {
      const success = await handleBulkDeleteMessages(selectedIds);
      setDeleteConfirmId(null);
      if (success) {
        toast.success(`${selectedIds.length} emails deleted successfully`);
        setSelectedIds([]);
      } else {
        toast.error("Failed to delete selected emails. Please try again.");
      }
    } else {
      const success = await handleDeleteMessage(deleteConfirmId);
      setDeleteConfirmId(null);
      if (success) {
        toast.success("Email deleted successfully");
        setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmId));
      } else {
        toast.error("Failed to delete email. Please try again.");
      }
    }
  };

  // Download attachment
  const handleDownloadAttachment = async (
    attachmentId: string,
    filename: string,
  ): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/attachments/${attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error("Attachment download failed:", err);
    }
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(
      (msg) =>
        msg.subject.toLowerCase().includes(query) ||
        msg.from.toLowerCase().includes(query) ||
        msg.to.toLowerCase().includes(query),
    );
  }, [messages, searchQuery]);

  const getFolderIcon = (): React.JSX.Element => {
    switch (folder.toLowerCase()) {
      case "inbox":
        return <Inbox className="size-5" />;
      case "sent":
        return <Send className="size-5" />;
      case "drafts":
        return <FileText className="size-5" />;
      case "trash":
        return <Trash className="size-5" />;
      case "junk":
        return <ShieldAlert className="size-5" />;
      case "archive":
        return <Archive className="size-5" />;
      default:
        return <Mail className="size-5" />;
    }
  };

  const getFormattedDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getSenderName = (from: string): string => {
    const match = from.match(/^([^<]+)/);
    if (match && match[1]) {
      return match[1].replace(/['"]/g, "").trim();
    }
    return from;
  };

  const getSenderEmail = (from: string): string => {
    const match = from.match(/<([^>]+)>/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return from;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Safe iframe source construction
  const srcDocContent = useMemo(() => {
    if (!detailedMessage) return "";

    const cleanHtml = getSanitizedHtmlContent(
      detailedMessage.bodyHtml || "",
      loadRemoteContent,
    );

    if (detailedMessage.bodyHtml) {
      const styleInject = `
        <style>
          img { max-width: 100% !important; height: auto !important; }
          a { color: #60a5fa !important; text-decoration: underline !important; }
        </style>
      `;
      const headIndex = cleanHtml.indexOf("<head>");
      if (headIndex !== -1) {
        return (
          cleanHtml.slice(0, headIndex + 6) +
          styleInject +
          cleanHtml.slice(headIndex + 6)
        );
      }
      return styleInject + cleanHtml;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #e4e4e7;
              background-color: #09090b;
              margin: 0;
              padding: 16px;
              line-height: 1.6;
            }
            pre {
              white-space: pre-wrap;
              word-break: break-all;
              font-family: inherit;
              font-size: 14px;
              margin: 0;
            }
            a {
              color: #60a5fa;
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <pre>${detailedMessage.bodyText}</pre>
        </body>
      </html>
    `;
  }, [detailedMessage, loadRemoteContent]);

  return (
    <div className="flex flex-1 w-full h-full overflow-hidden border-t border-zinc-800/40">
      {/* List Pane */}
      <div
        className={`${
          showDetailOnMobile ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-[380px] lg:w-[420px] border-r border-zinc-800 bg-zinc-950 shrink-0 h-full overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/60 space-y-3 bg-zinc-950/40 backdrop-blur-md relative overflow-hidden min-h-[97px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {selectedIds.length > 0 ? (
              <motion.div
                key="bulk-actions"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      filteredMessages.length > 0 &&
                      filteredMessages.every((m) => selectedIds.includes(m.id))
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        setSelectedIds(filteredMessages.map((m) => m.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="size-4 rounded-md border-zinc-800 bg-zinc-900 text-emerald-600 focus:ring-emerald-500/25 accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-zinc-300">
                    {selectedIds.length} selected
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      handleBulkUpdateStatus(selectedIds, { read: true })
                    }
                    title="Mark as Read"
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 rounded-xl transition-all"
                  >
                    <Mail className="size-4" />
                  </button>
                  <button
                    onClick={() =>
                      handleBulkUpdateStatus(selectedIds, { read: false })
                    }
                    title="Mark as Unread"
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 rounded-xl transition-all"
                  >
                    <Mail className="size-4 fill-zinc-400 text-zinc-400" />
                  </button>
                  <button
                    onClick={() =>
                      handleBulkUpdateStatus(selectedIds, { flagged: true })
                    }
                    title="Star"
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 rounded-xl transition-all"
                  >
                    <Star className="size-4 fill-amber-500 text-amber-500 border-transparent" />
                  </button>
                  {folder.toLowerCase() === "trash" && (
                    <button
                      onClick={() => {
                        toast.promise(
                          handleBulkUpdateStatus(selectedIds, {
                            folder: "inbox",
                          }),
                          {
                            loading: "Restoring emails...",
                            success: `${selectedIds.length} emails restored to Inbox`,
                            error: "Failed to restore emails",
                          },
                        );
                      }}
                      title="Restore to Inbox"
                      className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all flex items-center gap-1"
                    >
                      <RotateCcw className="size-4" />
                      <span className="text-xs font-semibold px-1">
                        Restore
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirmId("bulk")}
                    title="Delete"
                    className="p-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-xl transition-all"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <div className="h-4 w-px bg-zinc-800 mx-1" />
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-zinc-500 hover:text-zinc-300 font-semibold transition-all px-2 py-1"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="normal-header"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-3 w-full"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-zinc-100 capitalize">
                    {getFolderIcon()}
                    <span>{folder}</span>
                    <span className="text-xs text-zinc-500 font-normal">
                      ({filteredMessages.length} mails)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={syncingEmails}
                      onClick={handleTriggerSync}
                      className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`size-3.5 ${syncingEmails ? "animate-spin text-emerald-400" : ""}`}
                      />
                      <span>Sync</span>
                    </button>
                    <button
                      onClick={handleInitiateNewCompose}
                      className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <Edit className="size-3.5" />
                      <span>Compose</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search sender, subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-sm bg-zinc-900 border border-zinc-800/80 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700/80 transition-colors"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Message Items Scrollable Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="size-6 text-zinc-500 animate-spin" />
              <span className="text-xs text-zinc-500">Syncing messages...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={fetchMessages}
                className="text-xs px-3 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 transition-all"
              >
                Retry Sync
              </button>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 text-sm">
              No messages found.
            </div>
          ) : (
            <motion.div 
              initial="hidden" 
              animate="visible" 
              variants={{
                visible: { transition: { staggerChildren: 0.05 } }
              }}
              className="flex flex-col gap-2"
            >
              {filteredMessages.map((msg) => {
                const isSelected = selectedMessageId === msg.id;
                const isChecked = selectedIds.includes(msg.id);
                return (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg.id)}
                    className={cn(
                      "group relative p-4 rounded-2xl cursor-pointer transition-all border flex gap-3 items-start",
                      isSelected
                        ? "bg-primary/5 border-primary/20 shadow-md"
                        : "bg-card/30 backdrop-blur-xs border-border/60 hover:border-primary/30 hover:shadow-lg"
                    )}
                  >
                    {/* Left Column: Checkbox or dot */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center size-5 shrink-0 mt-0.5"
                    >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedIds((prev) =>
                          checked
                            ? [...prev, msg.id]
                            : prev.filter((id) => id !== msg.id),
                        );
                      }}
                      className={`size-4 rounded border-zinc-805 bg-zinc-900 text-emerald-600 focus:ring-emerald-500/25 accent-emerald-500 cursor-pointer transition-all ${
                        selectedIds.length > 0 || isChecked
                          ? "block animate-fade-in"
                          : "hidden group-hover:block"
                      }`}
                    />

                    <div
                      className={`transition-all ${
                        selectedIds.length > 0 || isChecked
                          ? "hidden"
                          : "block group-hover:hidden"
                      }`}
                    >
                      {!msg.read ? (
                        <span className="size-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] block" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-zinc-700 block" />
                      )}
                    </div>
                  </div>

                  {/* Right Column: Message Contents */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-sm min-w-0 truncate ${
                            !msg.read
                              ? "font-bold text-zinc-100"
                              : "text-zinc-300"
                          }`}
                        >
                          {getSenderName(msg.from)}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0 font-light">
                        {getFormattedDate(msg.date)}
                      </span>
                    </div>

                    <h4
                      className={`text-xs truncate mb-1 ${
                        !msg.read
                          ? "font-semibold text-zinc-200"
                          : "text-zinc-400"
                      }`}
                    >
                      {msg.subject || "(No Subject)"}
                    </h4>

                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs text-zinc-500 truncate max-w-[280px]">
                        {msg.attachments?.length > 0
                          ? "📎 Has Attachments"
                          : "No attachments"}
                      </p>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateMessageStatus(msg.id, {
                              flagged: !msg.flagged,
                            });
                          }}
                          className={`hover:text-zinc-200 transition-colors ${
                            msg.flagged ? "text-amber-500" : "text-zinc-500"
                          }`}
                        >
                          <Star
                            className={`size-3.5 ${msg.flagged ? "fill-amber-500" : ""}`}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(msg.id);
                          }}
                          className="text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Reader Pane */}
      <div
        className={`${
          showDetailOnMobile ? "flex" : "hidden md:flex"
        } flex-1 flex-col h-full overflow-hidden p-2 md:p-4`}
      >
        <div className="flex-1 flex flex-col bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl rounded-2xl overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!selectedMessageId ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center flex-1 text-center p-8 space-y-4"
            >
              <div className="size-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <Mail className="size-8" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-sm font-semibold text-zinc-300">
                  No message selected
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Choose a message from the list to display its complete
                  contents and attachments.
                </p>
              </div>
            </motion.div>
          ) : loadingDetail ? (
            <div className="flex flex-col items-center justify-center flex-1 space-y-3">
              <Loader2 className="size-6 text-zinc-500 animate-spin" />
              <span className="text-xs text-zinc-500">
                Loading message details...
              </span>
            </div>
          ) : messageNotFound ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center flex-1 text-center p-8 space-y-4"
            >
              <div className="size-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <Trash2 className="size-8" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-sm font-semibold text-zinc-300">
                  Email not found
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  This email may have been deleted or moved to another folder.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedMessageId(null);
                  setMessageNotFound(false);
                  setShowDetailOnMobile(false);
                }}
                className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 transition-all"
              >
                Go back
              </button>
            </motion.div>
          ) : detailedMessage ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col flex-1 h-full overflow-hidden"
            >
              {/* Toolbar */}
              <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDetailOnMobile(false)}
                    className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    onClick={() =>
                      updateMessageStatus(detailedMessage.id, {
                        read: !detailedMessage.read,
                      })
                    }
                    className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg border border-zinc-800/80 transition-all"
                  >
                    Mark {detailedMessage.read ? "Unread" : "Read"}
                  </button>

                  <div className="h-4 w-px bg-zinc-800 mx-1" />

                  {detailedMessage.folder === "trash" && (
                    <>
                      <button
                        onClick={() => {
                          toast.promise(
                            updateMessageStatus(detailedMessage.id, {
                              folder: "inbox",
                            }),
                            {
                              loading: "Restoring email...",
                              success: "Email restored to Inbox",
                              error: "Failed to restore email",
                            },
                          );
                        }}
                        className="px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-350 hover:bg-emerald-500/10 rounded-lg border border-emerald-500/20 transition-all flex items-center gap-1.5 font-medium"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Restore to Inbox</span>
                      </button>
                      <div className="h-4 w-px bg-zinc-800 mx-1" />
                    </>
                  )}

                  <button
                    onClick={() => handleInitiateCompose("reply")}
                    className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg border border-zinc-800/80 transition-all flex items-center gap-1.5"
                  >
                    <Reply className="size-3.5" />
                    <span>Reply</span>
                  </button>

                  {detailedMessage.cc && (
                    <button
                      onClick={() => handleInitiateCompose("replyAll")}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg border border-zinc-800/80 transition-all flex items-center gap-1.5"
                    >
                      <ReplyAll className="size-3.5" />
                      <span>Reply All</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleInitiateCompose("forward")}
                    className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg border border-zinc-800/80 transition-all flex items-center gap-1.5"
                  >
                    <Forward className="size-3.5" />
                    <span>Forward</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateMessageStatus(detailedMessage.id, {
                        flagged: !detailedMessage.flagged,
                      })
                    }
                    className={`p-1.5 rounded-lg border border-zinc-800/80 hover:bg-zinc-900 transition-all ${
                      detailedMessage.flagged
                        ? "text-amber-500 border-amber-500/20 bg-amber-500/5"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Star
                      className={`size-4 ${detailedMessage.flagged ? "fill-amber-500" : ""}`}
                    />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(detailedMessage.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 border border-zinc-800/80 rounded-lg transition-all"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {/* Reader Contents */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                {/* Header */}
                <div className="space-y-4 border-b border-zinc-800/60 pb-6">
                  <h1 className="text-xl font-bold text-zinc-100 tracking-tight leading-snug">
                    {detailedMessage.subject || "(No Subject)"}
                  </h1>

                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <User className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="text-sm font-semibold text-zinc-200 truncate">
                          {getSenderName(detailedMessage.from)}
                        </span>
                        <span className="text-xs text-zinc-500 font-light">
                          {new Date(detailedMessage.date).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        From:{" "}
                        <span className="text-zinc-400">
                          {getSenderEmail(detailedMessage.from)}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        To:{" "}
                        <span className="text-zinc-400">
                          {detailedMessage.to}
                        </span>
                      </div>
                      {detailedMessage.cc && (
                        <div className="text-xs text-zinc-500 truncate">
                          Cc:{" "}
                          <span className="text-zinc-400">
                            {detailedMessage.cc}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remote Content Warning */}
                {hasRemoteContent && !loadRemoteContent && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="size-4 text-amber-400 shrink-0 animate-pulse" />
                      <span>
                        To protect your privacy, remote content and images in
                        this message have been blocked.
                      </span>
                    </div>
                    <button
                      onClick={() => setLoadRemoteContent(true)}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-100 rounded-lg transition-all shrink-0 font-medium"
                    >
                      Show Images
                    </button>
                  </div>
                )}

                {/* Email Body Iframe */}
                <div className="border border-zinc-900 rounded-2xl bg-zinc-950 p-2 overflow-hidden">
                  <iframe
                    srcDoc={srcDocContent}
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    onLoad={handleIframeLoad}
                    style={{ height: `${iframeHeight}px` }}
                    className="w-full border-0 bg-transparent text-zinc-100"
                    title="Email Contents"
                  />
                </div>

                {/* Attachments Section */}
                {detailedMessage.attachments &&
                  detailedMessage.attachments.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-zinc-800/60">
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Attachments ({detailedMessage.attachments.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {detailedMessage.attachments.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400">
                                <FileText className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-zinc-200 truncate max-w-[140px]">
                                  {file.filename}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  {formatBytes(file.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleDownloadAttachment(file.id, file.filename)
                              }
                              className="p-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors shrink-0"
                            >
                              <Download className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        </div>
      </div>

      {/* Compose/Reply Modal Dialog */}
      <ComposeEmailModal
        accountId={accountId}
        open={isComposing}
        onOpenChange={setIsComposing}
        defaultTo={composeTo}
        defaultCc={composeCc}
        defaultSubject={composeSubject}
        defaultBody={composeBody}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4"
            >
              <h3 className="text-sm font-bold text-zinc-200">
                {deleteConfirmId === "bulk"
                  ? "Confirm Bulk Delete"
                  : "Confirm Delete"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {deleteConfirmId === "bulk"
                  ? `Are you sure you want to delete the ${selectedIds.length} selected emails? If they are not in the Trash folder already, they will be moved to Trash. If they are already in the Trash, they will be permanently deleted.`
                  : "Are you sure you want to delete this email? If it is not in the Trash folder already, it will be moved to Trash. If it is already in the Trash, it will be permanently deleted."}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-xs border border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-zinc-200 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-medium shadow-[0_0_12px_rgba(239,68,68,0.2)] hover:shadow-[0_0_16px_rgba(239,68,68,0.4)]"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
