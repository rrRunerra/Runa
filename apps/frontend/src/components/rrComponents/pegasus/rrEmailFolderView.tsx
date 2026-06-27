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
import {
  Archive,
  Download,
  FileText,
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
  Keyboard,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";
import { RrComposeEmailModal } from "./rrComposeEmailModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  bcc?: string | null;
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDetailOnMobile, setShowDetailOnMobile] = useState<boolean>(false);
  const [iframeHeight, setIframeHeight] = useState<number>(350);
  const [loadRemoteContent, setLoadRemoteContent] = useState<boolean>(false);

  // Sender profile state
  const [senderProfile, setSenderProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [showProfilePanel, setShowProfilePanel] = useState<boolean>(false);

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

  // Usability features
  const [showShortcutsFooter, setShowShortcutsFooter] = useState<boolean>(true);
  const [expandedThreadSubjects, setExpandedThreadSubjects] = useState<
    string[]
  >([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const { getPrivateKey } = useRRe2ee();

  const getSenderEmail = (from: string): string => {
    const match = from.match(/<([^>]+)>/);
    return match && match[1] ? match[1].trim() : from.trim();
  };

  const getSenderName = (from: string): string => {
    const match = from.match(/^([^<]+)/);
    return match && match[1] ? match[1].replace(/['"]/g, "").trim() : from;
  };

  // Play a soft notification sound when new email is fetched
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
      // Double ding sound (high frequency E2EE chime)
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

        let decryptedBcc = msg.bcc;
        try {
          decryptedBcc = msg.bcc
            ? await decryptEmailString(msg.bcc, dataKey)
            : msg.bcc;
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
          bcc: decryptedBcc,
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

        let decryptedBcc = msg.bcc;
        try {
          decryptedBcc = msg.bcc
            ? await decryptEmailString(msg.bcc, dataKey)
            : msg.bcc;
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
          bcc: decryptedBcc,
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
        const active = list.find((a: any) => a.id === accountId);
        if (active) setActiveAccount(active);
      }
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    }
  }, [accountId, session?.accessToken]);

  // Fetch messages in the folder (paginated)
  const fetchMessages = useCallback(
    async (reset: boolean = false): Promise<void> => {
      if (!session?.accessToken) return;
      const targetPage = reset ? 1 : page;

      if (reset) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
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
      setSenderProfile(null); // Clear previous profile

      // Find the message accountId. If accountId === 'unified', find from the message object
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
          setLoadingProfile(true);
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/user/by-email/${rawEmail}`,
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

  // Drag-and-drop links event hookup
  useEffect(() => {
    // Setup drop listeners globally on the sidebar navigation links
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      const messageId = e.dataTransfer?.getData("messageId");
      if (!messageId) return;

      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      // Match /pegasus/account/[id]/[folder]
      const match = href.match(/\/pegasus\/account\/([^\/]+)\/([^\/]+)/);
      if (match) {
        const destAccountId = match[1];
        const destFolder = match[2];

        try {
          await updateMessageStatus(
            messageId,
            { folder: destFolder },
            destAccountId,
          );
          toast.success(`Email moved to ${destFolder}`);
        } catch (err) {
          toast.error("Failed to move email via drag-and-drop.");
        }
      }
    };

    // Attach listeners
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, [messages, accountId]);

  // Keyboard Shortcuts Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip shortcuts if writing in an input, textarea, or editable element
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
      } else if (key === "enter") {
        e.preventDefault();
        if (selectedMessageId) {
          setShowDetailOnMobile(true);
        }
      }

      // Actions
      else if (key === "c") {
        e.preventDefault();
        handleInitiateNewCompose();
      } else if (key === "r" && detailedMessage) {
        e.preventDefault();
        handleInitiateCompose("reply");
      } else if (key === "a" && detailedMessage && detailedMessage.cc) {
        e.preventDefault();
        handleInitiateCompose("replyAll");
      } else if (key === "f" && detailedMessage) {
        e.preventDefault();
        handleInitiateCompose("forward");
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
          setDeleteConfirmId(selectedMessageId);
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

  // Strip "Re:", "Fwd:", etc. prefixes from email subject line to enable grouping base subjects
  const getCleanSubject = (subject: string): string => {
    return subject
      .replace(/^(Re|Fwd|Fw|Reply|Forward|Fwd\[\d+\]):\s*/i, "")
      .trim()
      .toLowerCase();
  };

  // Thunderbird-style Thread Grouping
  const threadedGroupMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    // Sort emails by date descending
    const sorted = [...messages].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const groups: { [key: string]: Message[] } = {};
    const processedIds = new Set<string>();

    // 1. Group emails sharing the same base subject line
    for (const msg of sorted) {
      const cleanSub = getCleanSubject(msg.subject || "(No Subject)");
      if (!groups[cleanSub]) {
        groups[cleanSub] = [];
      }
      groups[cleanSub].push(msg);
    }

    const finalThreads: { parent: Message; replies: Message[] }[] = [];

    // 2. Separate into parents (most recent) and child replies
    for (const cleanSub in groups) {
      const groupList = groups[cleanSub];
      // The parent is the newest message
      const parent = groupList[0];
      const replies = groupList.slice(1);
      finalThreads.push({ parent, replies });
    }

    // 3. Sort final threads by parent date descending
    finalThreads.sort(
      (a, b) =>
        new Date(b.parent.date).getTime() - new Date(a.parent.date).getTime(),
    );
    return finalThreads;
  }, [messages]);

  const toggleThread = (subject: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanSub = getCleanSubject(subject);
    setExpandedThreadSubjects((prev) =>
      prev.includes(cleanSub)
        ? prev.filter((s) => s !== cleanSub)
        : [...prev, cleanSub],
    );
  };

  // Safe html content builder for reader pane
  const srcDocContent = useMemo(() => {
    if (!detailedMessage) return "";

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

    const cleanHtml = getSanitizedHtmlContent(
      detailedMessage.bodyHtml || "",
      loadRemoteContent,
    );

    if (detailedMessage.bodyHtml) {
      const styleInject = `
        <style>
          img { max-width: 100% !important; height: auto !important; }
          a { color: #60a5fa !important; text-decoration: underline !important; }
          body { color: #e4e4e7; background-color: #09090b; }
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
            a { color: #60a5fa; text-decoration: underline; }
          </style>
        </head>
        <body>
          <pre>${detailedMessage.bodyText}</pre>
        </body>
      </html>
    `;
  }, [detailedMessage, loadRemoteContent]);

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

    // Optimistically update
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
  };

  const handleSelectMessage = (messageId: string): void => {
    setSelectedMessageId(messageId);
    setShowDetailOnMobile(true);
    fetchMessageDetail(messageId);
  };

  const handleInitiateNewCompose = (): void => {
    setComposeAction("compose");
    setIsComposing(true);
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
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
          if (email && !recipients.includes(email)) recipients.push(email);
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
      })(),
      {
        loading: "Syncing with mail server...",
        success: "Email sync completed!",
        error: "Sync failed. Check settings.",
      },
    );

    setSyncingEmails(false);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteConfirmId || !session?.accessToken) return;

    let targetAccount = accountId;
    if (accountId === "unified") {
      const msgObj = messages.find((m) => m.id === deleteConfirmId);
      if (msgObj && msgObj.userEmailAccountId) {
        targetAccount = msgObj.userEmailAccountId;
      }
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${targetAccount}/messages/${deleteConfirmId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== deleteConfirmId));
        if (selectedMessageId === deleteConfirmId) {
          setSelectedMessageId(null);
          setDetailedMessage(null);
          setShowDetailOnMobile(false);
        }
        toast.success("Email moved to Trash");
      }
    } catch (e) {
      toast.error("Failed to delete email.");
    } finally {
      setDeleteConfirmId(null);
    }
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

  const getAccountStyle = (msg: Message) => {
    if (accounts.length === 0) return {};
    const accId = msg.userEmailAccountId || accountId;
    const matched = accounts.find((a) => a.id === accId);
    if (!matched) return {};
    return {
      borderLeft: `4px solid ${matched.color}`,
      boxShadow: `0 0 10px ${matched.color}15`,
    };
  };

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

  return (
    <div className="flex flex-1 w-full h-[calc(100vh-8px)] overflow-hidden p-2 gap-2">
      {/* Middle Pane - Threaded List View */}
      <div
        className={`${
          showDetailOnMobile ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-[380px] lg:w-[420px] border border-zinc-800/70 bg-zinc-950 shrink-0 h-full overflow-hidden rounded-2xl`}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/60 space-y-3 bg-zinc-950/40 backdrop-blur-md relative min-h-[97px] flex flex-col justify-center shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-zinc-100 capitalize">
              {getFolderIcon()}
              <span>{folder}</span>
              <span className="text-xs text-zinc-500 font-normal">
                ({threadedGroupMessages.length} threads)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {accountId !== "unified" && (
                <button
                  disabled={syncingEmails}
                  onClick={handleTriggerSync}
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    className={`size-3.5 ${syncingEmails ? "animate-spin text-primary" : ""}`}
                  />
                  <span>Sync</span>
                </button>
              )}
              <button
                onClick={handleInitiateNewCompose}
                className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer animate-fade-in"
              >
                <Edit className="size-3.5" />
                <span>Compose</span>
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-600 focus-visible:ring-1 focus-visible:ring-primary/45 focus-visible:border-primary/30"
            />
          </div>
        </div>

        {/* Scrollable threads list */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="size-6 text-zinc-600 animate-spin" />
              <span className="text-xs text-zinc-500">
                Decrypting messages...
              </span>
            </div>
          ) : error ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => fetchMessages(true)}
                className="text-xs px-3 py-1 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-xl text-zinc-300"
              >
                Retry Sync
              </button>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">
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

                return (
                  <div
                    key={parent.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("messageId", parent.id);
                    }}
                    className={cn(
                      "group p-3.5 rounded-2xl cursor-pointer transition-all border flex flex-col gap-1 select-none",
                      isSelected
                        ? "bg-primary/5 border-primary/20 shadow-md"
                        : "bg-zinc-900/10 hover:bg-zinc-900/30 border-zinc-900 hover:border-zinc-800/80",
                    )}
                    style={getAccountStyle(parent)}
                    onClick={() => handleSelectMessage(parent.id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!parent.read && (
                          <span className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] shrink-0" />
                        )}
                        <span
                          className={cn(
                            "text-xs truncate font-semibold text-zinc-200",
                            !parent.read && "font-bold text-zinc-100",
                          )}
                        >
                          {getSenderName(parent.from)}
                        </span>
                        {hasReplies && (
                          <span className="text-[10px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                            {replies.length + 1}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-600 shrink-0 font-light">
                        {new Date(parent.date).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Subject */}
                    <div className="flex items-center justify-between min-w-0 gap-2">
                      <h4
                        className={cn(
                          "text-xs truncate text-zinc-400 font-medium",
                          !parent.read && "font-bold text-zinc-300",
                        )}
                      >
                        {parent.subject || "(No Subject)"}
                      </h4>
                      {hasReplies && (
                        <button
                          onClick={(e) => toggleThread(parent.subject, e)}
                          className="text-zinc-600 hover:text-zinc-400 p-0.5 rounded-md transition-colors"
                        >
                          {isThreadExpanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Collapsible replies list */}
                    {hasReplies && isThreadExpanded && (
                      <div className="mt-2.5 border-t border-zinc-900/60 pt-2.5 space-y-2">
                        {replies.map((reply) => {
                          const isReplySelected =
                            selectedMessageId === reply.id;
                          return (
                            <div
                              key={reply.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectMessage(reply.id);
                              }}
                              className={cn(
                                "flex items-start justify-between p-2 rounded-xl transition-all border",
                                isReplySelected
                                  ? "bg-primary/10 border-primary/20"
                                  : "bg-zinc-950/40 border-transparent hover:bg-zinc-900/50",
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {!reply.read && (
                                  <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                                )}
                                <span className="text-[11px] truncate font-medium text-zinc-300">
                                  {getSenderName(reply.from)}:
                                </span>
                                <span className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                                  {reply.subject}
                                </span>
                              </div>
                              <span className="text-[9px] text-zinc-600 shrink-0">
                                {new Date(reply.date).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Infinite Scroll Load Trigger */}
          {hasMore && messages.length > 0 && (
            <div className="flex justify-center py-4 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                disabled={loadingMore}
                onClick={() => fetchMessages(false)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 border border-zinc-900 hover:bg-zinc-900/50 rounded-xl"
              >
                {loadingMore ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : null}
                Load More Emails
              </Button>
            </div>
          )}
        </div>

        {/* Shortcuts Cheat Sheet Footer */}
        {showShortcutsFooter && (
          <div className="p-3 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between text-[9px] text-zinc-500 font-sans tracking-wide shrink-0">
            <span className="flex items-center gap-1.5">
              <Keyboard className="size-3 text-zinc-600" />
              <span>
                J/K Navigate • C Compose • R Reply • E Archive • Delete Trash
              </span>
            </span>
            <button
              onClick={() => setShowShortcutsFooter(false)}
              className="text-zinc-600 hover:text-zinc-400 font-semibold"
            >
              Hide
            </button>
          </div>
        )}
      </div>

      {/* Reader Pane */}
      <div
        className={`${
          showDetailOnMobile ? "flex" : "hidden md:flex"
        } flex-1 flex-col h-full overflow-hidden`}
      >
        <div className="flex-1 flex bg-zinc-950 border border-zinc-900/80 shadow-2xl rounded-3xl overflow-hidden relative">
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
                    Select a conversation thread from the list to display its
                    decrypted contents, attachments, and profile details.
                  </p>
                </div>
              </motion.div>
            ) : loadingDetail ? (
              <div className="flex flex-col items-center justify-center flex-1 space-y-3">
                <Loader2 className="size-6 text-zinc-600 animate-spin" />
                <span className="text-xs text-zinc-500">
                  Decrypting mail details...
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
                  className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-xl text-zinc-300 transition-all"
                >
                  Go back
                </button>
              </motion.div>
            ) : detailedMessage ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 h-full overflow-hidden"
              >
                {/* Email Viewer Layout */}
                <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between p-3 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDetailOnMobile(false)}
                        className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg"
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        onClick={() =>
                          updateMessageStatus(detailedMessage.id, {
                            read: !detailedMessage.read,
                          })
                        }
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl border border-zinc-900 transition-all font-semibold cursor-pointer"
                      >
                        Mark {detailedMessage.read ? "Unread" : "Read"}
                      </button>

                      <div className="h-4 w-px bg-zinc-900 mx-1" />

                      <button
                        onClick={() => handleInitiateCompose("reply")}
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl border border-zinc-900 transition-all flex items-center gap-1.5 font-semibold cursor-pointer"
                      >
                        <Reply className="size-3.5" />
                        <span>Reply</span>
                      </button>
                      <button
                        onClick={() => handleInitiateCompose("forward")}
                        className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl border border-zinc-900 transition-all flex items-center gap-1.5 font-semibold cursor-pointer"
                      >
                        <Forward className="size-3.5" />
                        <span>Forward</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowProfilePanel((p) => !p)}
                        className={cn(
                          "p-1.5 rounded-xl border border-zinc-900 hover:bg-zinc-900 transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer",
                          showProfilePanel
                            ? "text-primary border-primary/20 bg-primary/5"
                            : "text-zinc-400",
                        )}
                        title="Toggle Profile Panel"
                      >
                        <User className="size-4" />
                        <span className="hidden sm:inline">Profile</span>
                      </button>
                      <button
                        onClick={() =>
                          updateMessageStatus(detailedMessage.id, {
                            flagged: !detailedMessage.flagged,
                          })
                        }
                        className={cn(
                          "p-1.5 rounded-xl border border-zinc-900 hover:bg-zinc-900 transition-all cursor-pointer",
                          detailedMessage.flagged
                            ? "text-amber-500 border-amber-500/20 bg-amber-500/5"
                            : "text-zinc-400",
                        )}
                      >
                        <Star
                          className={`size-4 ${detailedMessage.flagged ? "fill-amber-500" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(detailedMessage.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 border border-zinc-900 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reader Contents */}
                  <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {/* Header info */}
                    <div className="space-y-4 border-b border-zinc-900 pb-6">
                      <h1 className="text-xl font-bold text-zinc-100 tracking-tight leading-snug">
                        {detailedMessage.subject || "(No Subject)"}
                      </h1>
                      <div className="flex items-start gap-3">
                        <div className="size-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <User className="size-4.5" />
                        </div>
                        <div className="min-w-0 flex-1 text-xs space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="font-semibold text-zinc-200">
                              {getSenderName(detailedMessage.from)}
                            </span>
                            <span className="text-zinc-500 font-light">
                              {new Date(detailedMessage.date).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-zinc-500 truncate">
                            From:{" "}
                            <span className="text-zinc-400">
                              {getSenderEmail(detailedMessage.from)}
                            </span>
                          </div>
                          <div className="text-zinc-500 truncate">
                            To:{" "}
                            <span className="text-zinc-400">
                              {detailedMessage.to}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Remote content warning */}
                    {hasRemoteContent && !loadRemoteContent && (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] rounded-xl flex items-center justify-between gap-4">
                        <span>
                          Remote content in this message has been blocked.
                        </span>
                        <button
                          onClick={() => setLoadRemoteContent(true)}
                          className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold"
                        >
                          Show content
                        </button>
                      </div>
                    )}

                    {/* IFrame body viewer */}
                    <div className="border border-zinc-900 rounded-2xl bg-zinc-950 p-2 overflow-hidden shrink-0">
                      <iframe
                        srcDoc={srcDocContent}
                        sandbox="allow-same-origin allow-popups"
                        onLoad={(e) => {
                          const doc =
                            e.currentTarget.contentDocument ||
                            e.currentTarget.contentWindow?.document;
                          if (doc && doc.body) {
                            setIframeHeight(doc.body.scrollHeight + 30);
                          }
                        }}
                        style={{ height: `${iframeHeight}px` }}
                        className="w-full border-0 bg-transparent text-zinc-200"
                        title="Decrypted Contents"
                      />
                    </div>

                    {/* Attachments list */}
                    {detailedMessage.attachments &&
                      detailedMessage.attachments.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-zinc-900">
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            Attachments ({detailedMessage.attachments.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {detailedMessage.attachments.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl"
                              >
                                <div className="min-w-0 flex items-center gap-2">
                                  <FileText className="size-4 text-zinc-500 shrink-0" />
                                  <span
                                    className="text-xs font-semibold text-zinc-300 truncate max-w-[150px]"
                                    title={file.filename}
                                  >
                                    {file.filename}
                                  </span>
                                </div>
                                <button
                                  onClick={() =>
                                    handleDownloadAttachment(
                                      file.id,
                                      file.filename,
                                    )
                                  }
                                  className="p-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 rounded-lg"
                                >
                                  <Download className="size-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Sender Profile details Collapsible Right Panel */}
                <AnimatePresence>
                  {showProfilePanel && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 280, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="border-l border-zinc-900 bg-zinc-950 h-full flex flex-col overflow-hidden shrink-0"
                    >
                      {loadingProfile ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-2">
                          <Loader2 className="size-5 text-primary animate-spin" />
                          <span className="text-[10px] text-zinc-500">
                            Searching profiles...
                          </span>
                        </div>
                      ) : senderProfile ? (
                        <div className="flex flex-col h-full overflow-y-auto no-scrollbar relative">
                          {/* Banner */}
                          <div className="h-20 bg-zinc-900 w-full shrink-0 relative overflow-hidden">
                            {senderProfile.bannerUrl && (
                              <img
                                src={
                                  senderProfile.bannerUrl
                                    ? `${process.env.NEXT_PUBLIC_API_URL}${senderProfile.bannerUrl}`
                                    : undefined
                                }
                                alt="User Banner"
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-linear-to-t from-zinc-950/90 to-transparent" />
                          </div>

                          {/* Close button */}
                          <button
                            onClick={() => setShowProfilePanel(false)}
                            className="absolute top-2 right-2 p-1 rounded-md bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-900 text-zinc-400"
                          >
                            <X className="size-3.5" />
                          </button>

                          {/* Profile Details */}
                          <div className="p-4 flex flex-col items-center -mt-10 relative z-20 space-y-4">
                            <div className="size-16 rounded-full border-2 border-zinc-950 bg-zinc-900 overflow-hidden relative shadow-lg">
                              {senderProfile.avatarUrl ? (
                                <img
                                  src={
                                    senderProfile.avatarUrl
                                      ? `${process.env.NEXT_PUBLIC_API_URL}${senderProfile.avatarUrl}`
                                      : undefined
                                  }
                                  alt="Avatar"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="size-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-600" />
                              )}
                            </div>

                            <div className="text-center space-y-1">
                              <h3 className="text-sm font-bold text-zinc-100">
                                {senderProfile.displayName ||
                                  senderProfile.username}
                              </h3>
                              <p className="text-[10px] text-zinc-500">
                                @{senderProfile.username}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-semibold tracking-wider uppercase">
                              <UserCheck className="size-3" />
                              <span>Verified contact</span>
                            </div>

                            <div className="pt-4 border-t border-zinc-900/60 w-full space-y-3">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                Quick actions
                              </h4>
                              <button
                                onClick={() =>
                                  router.push(
                                    `/polaris/user/${senderProfile.username}`,
                                  )
                                }
                                className="w-full text-left px-3 py-2 bg-zinc-900/30 hover:bg-zinc-900/80 border border-zinc-900 hover:border-zinc-800 text-[11px] rounded-xl text-zinc-300 font-semibold transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Sparkles className="size-3.5 text-primary" />
                                View Profile Dashboard
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 flex flex-col items-center justify-center h-full text-center space-y-3">
                          <User className="size-8 text-zinc-700" />
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-zinc-300">
                              No profile found
                            </h4>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                              This email is not linked to any active user
                              account on the Runa server.
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Composer modal */}
      <RrComposeEmailModal
        accountId={accountId === "unified" ? undefined : accountId}
        open={isComposing}
        onOpenChange={setIsComposing}
        defaultCc={composeCc}
        defaultTo={composeTo}
        defaultSubject={composeSubject}
        defaultBody={composeBody}
      />

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-zinc-200">
                Confirm Delete
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to delete this email? If it is already in
                the Trash, it will be permanently deleted.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-xs border border-zinc-800 hover:bg-zinc-850 rounded-xl text-zinc-400 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-colors"
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
