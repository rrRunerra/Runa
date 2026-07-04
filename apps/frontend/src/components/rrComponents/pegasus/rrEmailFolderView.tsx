"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";
import { useRRSidebar } from "@/hooks/useRRSidebar";
import { marked } from "marked";

// Sub-components imports
import RrThreadList from "./rrThreadList";
import RrEmailReader from "./rrEmailReader";
import RrKeyboardShortcutsFooter from "./rrKeyboardShortcutsFooter";

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

interface DetailedMessage extends Message {
  bodyText: string;
  bodyHtml: string;
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

interface RrEmailFolderViewProps {
  accountId: string;
  folder: string;
}

export default function RrEmailFolderView({
  accountId,
  folder,
}: RrEmailFolderViewProps): React.JSX.Element {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryMessageId = searchParams.get("messageId");
  const { getChild, updateChildBadge, getItem, updateBadge } = useRRSidebar();

  const [syncingEmails, setSyncingEmails] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [detailedMessage, setDetailedMessage] =
    useState<DetailedMessage | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [messageNotFound, setMessageNotFound] = useState<boolean>(false);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState<boolean>(false);

  // Sender profile state
  const [senderProfile, setSenderProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  // Selection states (multi-select)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Composer integration states (compose triggered via shortcuts/header button)
  const [isComposing, setIsComposing] = useState<boolean>(false);

  // Usability features
  const [showShortcutsFooter, setShowShortcutsFooter] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const { getPrivateKey } = useRRe2ee();
  const [accounts, setAccounts] = useState<any[]>([]);

  const adjustUnreadBadge = useCallback(
    (targetAccountId: string, change: number) => {
      const accountObj = accounts.find((a) => a.id === targetAccountId);
      if (!accountObj) return;

      const accountName = accountObj.accountName;

      // 1. Update the account's Inbox child badge
      const childItem = getChild("Accounts", accountName, "Inbox");
      const currentChildBadge = childItem?.badge
        ? parseInt(childItem.badge, 10)
        : 0;
      const newChildBadge = Math.max(0, currentChildBadge + change);
      updateChildBadge(
        "Accounts",
        accountName,
        "Inbox",
        newChildBadge > 0 ? newChildBadge.toString() : "",
      );

      // 2. Update the Unified Inbox badge
      const unifiedItem = getItem("Unified", "Unified Inbox");
      const currentUnifiedBadge = unifiedItem?.badge
        ? parseInt(unifiedItem.badge, 10)
        : 0;
      const newUnifiedBadge = Math.max(0, currentUnifiedBadge + change);
      updateBadge(
        "Unified",
        "Unified Inbox",
        newUnifiedBadge > 0 ? newUnifiedBadge.toString() : "",
      );
    },
    [accounts, getChild, updateChildBadge, getItem, updateBadge],
  );

  const getSenderEmail = (from: string): string => {
    const match = from.match(/<([^>]+)>/);
    return match && match[1] ? match[1].trim() : from.trim();
  };

  // Play a soft high-frequency E2EE chime sound when new inbox mail is fetched
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn("Could not play E2EE notification audio chime:", e);
    }
  }, []);

  const decryptMessageObj = useCallback(
    async (msg: Message): Promise<Message> => {
      if (!msg.encryptedKey) return msg;
      const privKey = await getPrivateKey();
      if (!privKey) return msg;

      try {
        const { decryptEmailDataKey, decryptEmailString } =
          await import("@runa/crypto/browser");
        const dataKey = await decryptEmailDataKey(msg.encryptedKey, privKey);

        let decryptedSubject = msg.subject;
        try {
          decryptedSubject = await decryptEmailString(msg.subject, dataKey);
        } catch {}

        let decryptedFrom = msg.from;
        try {
          decryptedFrom = msg.from
            ? await decryptEmailString(msg.from, dataKey)
            : msg.from;
        } catch {}

        let decryptedTo = msg.to;
        try {
          decryptedTo = msg.to
            ? await decryptEmailString(msg.to, dataKey)
            : msg.to;
        } catch {}

        let decryptedCc = msg.cc;
        try {
          decryptedCc = msg.cc
            ? await decryptEmailString(msg.cc, dataKey)
            : msg.cc;
        } catch {}

        const decryptedAttachments = await Promise.all(
          (msg.attachments || []).map(async (att) => {
            try {
              const decFilename = await decryptEmailString(
                att.filename,
                dataKey,
              );
              return { ...att, filename: decFilename };
            } catch {
              return att;
            }
          }),
        );

        return {
          ...msg,
          subject: decryptedSubject,
          from: decryptedFrom,
          to: decryptedTo,
          cc: decryptedCc,
          attachments: decryptedAttachments,
        };
      } catch (err) {
        console.error("Failed to decrypt message in list:", err);
        return msg;
      }
    },
    [getPrivateKey],
  );

  const decryptDetailedMessageObj = useCallback(
    async (msg: DetailedMessage): Promise<DetailedMessage> => {
      if (!msg.encryptedKey) return msg;
      const privKey = await getPrivateKey();
      if (!privKey) return msg;

      try {
        const { decryptEmailDataKey, decryptEmailString } =
          await import("@runa/crypto/browser");
        const dataKey = await decryptEmailDataKey(msg.encryptedKey, privKey);

        let decryptedSubject = msg.subject;
        try {
          decryptedSubject = await decryptEmailString(msg.subject, dataKey);
        } catch {}

        let decryptedFrom = msg.from;
        try {
          decryptedFrom = msg.from
            ? await decryptEmailString(msg.from, dataKey)
            : msg.from;
        } catch {}

        let decryptedTo = msg.to;
        try {
          decryptedTo = msg.to
            ? await decryptEmailString(msg.to, dataKey)
            : msg.to;
        } catch {}

        let decryptedCc = msg.cc;
        try {
          decryptedCc = msg.cc
            ? await decryptEmailString(msg.cc, dataKey)
            : msg.cc;
        } catch {}

        const decryptedBodyText = await decryptEmailString(
          msg.bodyText,
          dataKey,
        );
        const decryptedBodyHtml = await decryptEmailString(
          msg.bodyHtml,
          dataKey,
        );

        const decryptedAttachments = await Promise.all(
          (msg.attachments || []).map(async (att) => {
            try {
              const decFilename = await decryptEmailString(
                att.filename,
                dataKey,
              );
              return { ...att, filename: decFilename };
            } catch {
              return att;
            }
          }),
        );

        return {
          ...msg,
          subject: decryptedSubject,
          from: decryptedFrom,
          to: decryptedTo,
          cc: decryptedCc,
          bodyText: decryptedBodyText,
          bodyHtml: decryptedBodyHtml,
          attachments: decryptedAttachments,
        };
      } catch (err) {
        console.error("Failed to decrypt detailed message:", err);
        return msg;
      }
    },
    [getPrivateKey],
  );

  // Fetch accounts list
  const fetchAccounts = useCallback(async (): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const list = await res.json();
        setAccounts(list);
      }
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    }
  }, [session?.accessToken]);

  // Fetch messages in the folder (paginated)
  const fetchMessages = useCallback(
    async (reset: boolean = false): Promise<void> => {
      if (!session?.accessToken) return;
      const targetPage = reset ? 1 : page;

      if (reset) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
        setSelectedIds([]); // Clear selection
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const url =
          accountId === "unified"
            ? `${process.env.NEXT_PUBLIC_API_URL}/emails/unified/folders/${folder}/messages?page=${targetPage}&limit=40`
            : `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/folders/${folder}/messages?page=${targetPage}&limit=40`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        const decrypted = await Promise.all(
          list.map((msg) => decryptMessageObj(msg)),
        );

        if (decrypted.length < 40) {
          setHasMore(false);
        }

        setMessages((prev) => (reset ? decrypted : [...prev, ...decrypted]));
        setPage((p) => (reset ? 2 : p + 1));
      } catch (err: any) {
        console.error(err);
        setError("Failed to load messages. Please verify settings.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accountId, folder, page, session?.accessToken, decryptMessageObj],
  );

  // Fetch individual message details
  const fetchMessageDetail = useCallback(
    async (messageId: string): Promise<void> => {
      if (!session?.accessToken) return;
      setLoadingDetail(true);
      setMessageNotFound(false);
      setSenderProfile(null);

      let itemAccountId = accountId;
      if (accountId === "unified") {
        const found = messages.find((m) => m.id === messageId);
        if (found && found.userEmailAccountId) {
          itemAccountId = found.userEmailAccountId;
        }
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/emails/${itemAccountId}/messages/${messageId}`,
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          },
        );
        if (res.status === 404) {
          setMessageNotFound(true);
          setDetailedMessage(null);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch message details");
        const data: DetailedMessage = await res.json();
        const decrypted = await decryptDetailedMessageObj(data);
        setDetailedMessage(decrypted);

        // Fetch sender user profile from backend
        const rawEmail = getSenderEmail(decrypted.from);
        if (rawEmail) {
          const emailLower = rawEmail.toLowerCase();
          const isNoReply = emailLower.startsWith("noreply");
          let shouldFetch = true;

          if (isNoReply) {
            const emailDomain = emailLower.split("@")[1] || "";
            let publicDomain = "";
            try {
              if (typeof window !== "undefined") {
                publicDomain = window.location.hostname.toLowerCase();
              }
            } catch {}
            if (emailDomain !== publicDomain) {
              shouldFetch = false;
            }
          }

          if (shouldFetch) {
            setLoadingProfile(true);
            fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/users/by-email/${rawEmail}`,
              {
                headers: { Authorization: `Bearer ${session.accessToken}` },
              },
            )
              .then((pRes) => (pRes.ok ? pRes.json() : null))
              .then((profileData) => {
                if (profileData) {
                  setSenderProfile(profileData);
                }
              })
              .catch((e) =>
                console.warn("Failed to find Runa profile for sender:", e),
              )
              .finally(() => setLoadingProfile(false));
          }
        }

        // If unread, mark as read on the backend
        if (!decrypted.read) {
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/emails/${itemAccountId}/messages/${messageId}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.accessToken}`,
              },
              body: JSON.stringify({ read: true }),
            },
          ).catch((e) => console.error("Failed to update read status:", e));

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, read: true } : msg,
            ),
          );
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingDetail(false);
      }
    },
    [accountId, messages, session?.accessToken, decryptDetailedMessageObj],
  );

  // Sync / Listeners
  useEffect(() => {
    fetchAccounts();
    fetchMessages(true);
    if (queryMessageId) {
      setSelectedMessageId(queryMessageId);
      fetchMessageDetail(queryMessageId);
      setShowDetailOnMobile(true);
    } else {
      setSelectedMessageId(null);
      setDetailedMessage(null);
      setShowDetailOnMobile(false);
    }
  }, [accountId, folder, fetchAccounts, queryMessageId]);

  // Notification sound on new inbox mails
  useEffect(() => {
    const handleEmailNew = async (e: Event) => {
      const data = (e as CustomEvent).detail;
      const belongsToUs =
        accountId === "unified" || data.accountId === accountId;

      if (belongsToUs && data.folder.toLowerCase() === folder.toLowerCase()) {
        fetchMessages(true);
      }

      if (data.folder.toLowerCase() === "inbox" && belongsToUs) {
        playNotificationSound();
        const decryptedMsg = await decryptMessageObj(data.message);
        toast.info(`New E2EE mail: ${decryptedMsg.subject || "(No Subject)"}`, {
          description: `From: ${decryptedMsg.from}`,
        });
      }
    };

    window.addEventListener("runa-email-new", handleEmailNew);
    return () => {
      window.removeEventListener("runa-email-new", handleEmailNew);
    };
  }, [
    accountId,
    folder,
    fetchMessages,
    playNotificationSound,
    decryptMessageObj,
  ]);

  // Keyboard Shortcuts Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Navigation
      if (key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        navigateMessageSelection("next");
      } else if (key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        navigateMessageSelection("prev");
      }

      // Actions
      else if (key === "c") {
        e.preventDefault();
        setIsComposing(true);
      } else if (key === "e" || key === "y") {
        e.preventDefault();
        if (selectedMessageId) {
          toast.promise(
            updateMessageStatus(selectedMessageId, { folder: "archive" }),
            {
              loading: "Archiving email...",
              success: "Email archived!",
              error: "Failed to archive email.",
            },
          );
        }
      } else if (e.key === "Delete" || key === "Backspace" || e.key === "#") {
        e.preventDefault();
        if (selectedMessageId) {
          deleteMessage(selectedMessageId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [messages, selectedMessageId, detailedMessage]);

  const navigateMessageSelection = (direction: "next" | "prev") => {
    if (messages.length === 0) return;
    const currentIndex = messages.findIndex((m) => m.id === selectedMessageId);
    let nextIndex = 0;

    if (direction === "next") {
      nextIndex =
        currentIndex === -1 || currentIndex === messages.length - 1
          ? 0
          : currentIndex + 1;
    } else {
      nextIndex =
        currentIndex === -1 || currentIndex === 0
          ? messages.length - 1
          : currentIndex - 1;
    }

    const nextMsg = messages[nextIndex];
    if (nextMsg) {
      handleSelectMessage(nextMsg.id);
    }
  };

  const updateMessageStatus = async (
    messageId: string,
    updates: {
      read?: boolean;
      flagged?: boolean;
      folder?: string;
      labels?: string[];
    },
    itemAccountId?: string,
  ): Promise<void> => {
    if (!session?.accessToken) return;

    let targetAccount = itemAccountId || accountId;
    if (accountId === "unified") {
      const msgObj = messages.find((m) => m.id === messageId);
      if (msgObj && msgObj.userEmailAccountId) {
        targetAccount = msgObj.userEmailAccountId;
      }
    }

    const msgObj = messages.find((m) => m.id === messageId);
    if (msgObj) {
      if (updates.read !== undefined && msgObj.read !== updates.read) {
        const change = updates.read ? -1 : 1;
        adjustUnreadBadge(targetAccount, change);
      }
      if (updates.folder) {
        const oldFolderLower = msgObj.folder.toLowerCase();
        const newFolderLower = updates.folder.toLowerCase();
        if (
          oldFolderLower === "inbox" &&
          newFolderLower !== "inbox" &&
          !msgObj.read
        ) {
          adjustUnreadBadge(targetAccount, -1);
        } else if (
          oldFolderLower !== "inbox" &&
          newFolderLower === "inbox" &&
          !msgObj.read
        ) {
          adjustUnreadBadge(targetAccount, 1);
        }
      }
    }

    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)),
    );
    if (detailedMessage && detailedMessage.id === messageId) {
      setDetailedMessage((prev) => (prev ? { ...prev, ...updates } : null));
    }

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

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/emails/${targetAccount}/messages/${messageId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(updates),
      },
    );
    if (!res.ok) throw new Error("Status update failed");
    window.dispatchEvent(new Event("runa-sidebar-changed"));
  };

  const deleteMessage = async (messageId: string): Promise<void> => {
    if (!session?.accessToken) return;
    let targetAccount = accountId;
    if (accountId === "unified") {
      const msgObj = messages.find((m) => m.id === messageId);
      if (msgObj && msgObj.userEmailAccountId) {
        targetAccount = msgObj.userEmailAccountId;
      }
    }

    try {
      const msgObj = messages.find((m) => m.id === messageId);
      const wasUnreadInbox =
        msgObj && !msgObj.read && msgObj.folder.toLowerCase() === "inbox";

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${targetAccount}/messages/${messageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      if (res.ok) {
        if (wasUnreadInbox) {
          adjustUnreadBadge(targetAccount, -1);
        }
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        if (selectedMessageId === messageId) {
          setSelectedMessageId(null);
          setDetailedMessage(null);
          setShowDetailOnMobile(false);
        }
        toast.success("Email moved to Trash");
        window.dispatchEvent(new Event("runa-sidebar-changed"));
      }
    } catch (e) {
      toast.error("Failed to delete email.");
    }
  };

  const handleSelectMessage = (messageId: string): void => {
    setSelectedMessageId(messageId);
    setShowDetailOnMobile(true);
    fetchMessageDetail(messageId);
  };

  const handleTriggerSync = async (): Promise<void> => {
    if (!session?.accessToken || accountId === "unified") return;
    setSyncingEmails(true);

    toast.promise(
      (async () => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/sync`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session.accessToken}` },
          },
        );
        if (!res.ok) throw new Error("Sync failed.");
        await fetchMessages(true);
        window.dispatchEvent(new Event("runa-sidebar-changed"));
      })(),
      {
        loading: "Syncing with mail server...",
        success: "Email sync completed!",
        error: "Sync failed. Check settings.",
      },
    );

    setSyncingEmails(false);
  };

  const handleDownloadAttachment = async (
    attachmentId: string,
    filename: string,
  ): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/attachments/${attachmentId}`,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      if (!res.ok) throw new Error("Download failed");

      let finalBuffer = await res.arrayBuffer();

      if (detailedMessage?.encryptedKey) {
        try {
          const privKey = await getPrivateKey();
          if (privKey) {
            const { decryptEmailDataKey, decryptEmailBuffer } =
              await import("@runa/crypto/browser");
            const dataKey = await decryptEmailDataKey(
              detailedMessage.encryptedKey,
              privKey,
            );
            finalBuffer = await decryptEmailBuffer(finalBuffer, dataKey);
          }
        } catch (decErr) {
          console.error(
            "Failed to decrypt attachment content on download:",
            decErr,
          );
        }
      }

      const blob = new Blob([finalBuffer]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Attachment download failed:", err);
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAll = () => {
    if (messages.length === 0) return;
    const allIds = messages.map((m) => m.id);
    const allAreChecked = allIds.every((id) => selectedIds.includes(id));
    if (allAreChecked) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const handleBulkAction = async (
    action: "read" | "unread" | "archive" | "trash" | "restore",
  ) => {
    if (selectedIds.length === 0 || !session?.accessToken) return;

    // Group selected IDs by their userEmailAccountId
    const groupMap = new Map<string, string[]>();
    for (const id of selectedIds) {
      const msg = messages.find((m) => m.id === id);
      if (msg) {
        const itemAccId = msg.userEmailAccountId || accountId;
        const list = groupMap.get(itemAccId) || [];
        list.push(id);
        groupMap.set(itemAccId, list);
      }
    }

    toast.promise(
      (async () => {
        for (const [accId, msgIds] of Array.from(groupMap.entries())) {
          if (action === "trash") {
            await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/emails/${accId}/messages/bulk-delete`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify({ messageIds: msgIds }),
              },
            );
          } else {
            let updates: any = {};
            if (action === "read") updates = { read: true };
            if (action === "unread") updates = { read: false };
            if (action === "archive") updates = { folder: "archive" };
            if (action === "restore") updates = { folder: "inbox" };

            await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/emails/${accId}/messages/bulk`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify({ messageIds: msgIds, ...updates }),
              },
            );
          }
        }
        // Force refresh list
        await fetchMessages(true);
        window.dispatchEvent(new Event("runa-sidebar-changed"));
      })(),
      {
        loading: `Executing bulk action...`,
        success: `Bulk action executed successfully!`,
        error: `Failed to complete bulk action.`,
      },
    );
  };

  // Inline Send Reply handler (converts Markdown, handles SMTP POST send)
  const handleSendReply = async (data: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
  }) => {
    if (!session?.accessToken || !detailedMessage) return;
    const targetAccountId = detailedMessage.userEmailAccountId || accountId;
    if (targetAccountId === "unified") return;

    try {
      const htmlContent = await marked.parse(data.body);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${targetAccountId}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            to: data.to,
            cc: data.cc,
            bcc: data.bcc,
            subject: data.subject,
            body: data.body,
            html: htmlContent,
          }),
        },
      );
      if (!res.ok) throw new Error("Reply SMTP send failed.");
      toast.success("Reply sent successfully!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to send inline reply.");
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full overflow-hidden bg-background">
      <div className="flex flex-1 w-full h-[calc(100vh-8px)] overflow-hidden p-2 gap-2">
        {/* Middle Pane - Threaded List View */}
        <div
          className={`${
            showDetailOnMobile ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-[380px] lg:w-[420px] border border-border bg-card shrink-0 h-full overflow-hidden rounded-2xl`}
        >
          <RrThreadList
            messages={messages}
            loading={loading}
            error={error}
            hasMore={hasMore}
            loadingMore={loadingMore}
            folder={folder}
            accountId={accountId}
            selectedMessageId={selectedMessageId}
            onSelectMessage={handleSelectMessage}
            onLoadMore={() => fetchMessages(false)}
            onTriggerSync={handleTriggerSync}
            syncingEmails={syncingEmails}
            onInitiateNewCompose={() => setIsComposing(true)}
            accounts={accounts}
            // Multi select
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onBulkAction={handleBulkAction}
          />

          {showShortcutsFooter && (
            <RrKeyboardShortcutsFooter
              onClose={() => setShowShortcutsFooter(false)}
            />
          )}
        </div>

        {/* Reader Pane */}
        <div
          className={`${
            showDetailOnMobile ? "flex" : "hidden md:flex"
          } flex-1 flex-col h-full overflow-hidden`}
        >
          <RrEmailReader
            message={detailedMessage}
            loading={loadingDetail}
            messageNotFound={messageNotFound}
            senderProfile={senderProfile}
            loadingProfile={loadingProfile}
            onGoBack={() => setShowDetailOnMobile(false)}
            onMarkReadChange={() =>
              updateMessageStatus(detailedMessage!.id, {
                read: !detailedMessage!.read,
              })
            }
            onFlaggedChange={() =>
              updateMessageStatus(detailedMessage!.id, {
                flagged: !detailedMessage!.flagged,
              })
            }
            onDeleteMessage={() => deleteMessage(detailedMessage!.id)}
            onRestoreMessage={() =>
              updateMessageStatus(detailedMessage!.id, { folder: "inbox" })
            }
            onDownloadAttachment={handleDownloadAttachment}
            onSendReply={handleSendReply}
            sendingReply={false}
          />
        </div>
      </div>
    </div>
  );
}
