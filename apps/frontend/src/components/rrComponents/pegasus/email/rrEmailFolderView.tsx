"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { RrEncryptionLocked } from "@/components/rrComponents/rrEncryptionLocked";
import RrThreadList, { Message } from "./rrThreadList";
import RrEmailReader, { DetailedMessage } from "./rrEmailReader";
import { RrComposeEmailModal } from "./rrComposeEmailModal";
import { useTranslation } from "react-i18next";

interface EmailAccount {
  id: string;
  accountName: string;
  emailAddress: string;
  color: string;
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
  initialMessageId?: string | null;
}

export default function RrEmailFolderView({
  accountId,
  folder,
  initialMessageId = null,
}: RrEmailFolderViewProps): React.JSX.Element {
  const { data: session } = useSession();
  const {
    getPrivateKey,
    unwrapKey,
    decrypt,
    isEncryptionUnlocked,
  } = useRRCrypto();
  const { t } = useTranslation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    initialMessageId,
  );
  const [detailedMessage, setDetailedMessage] =
    useState<DetailedMessage | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [messageNotFound, setMessageNotFound] = useState<boolean>(false);

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [syncingEmails, setSyncingEmails] = useState<boolean>(false);

  // Multi select
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Mobile layout view toggle
  const [showDetailOnMobile, setShowDetailOnMobile] = useState<boolean>(
    !!initialMessageId,
  );

  // Sender User Profile (for Runa user lookup)
  const [senderProfile, setSenderProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  // Compose Email Modal
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composeData, setComposeData] = useState<{
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    body?: string;
  }>({});

  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  const hasUnlockedDecryptionRef = useRef<boolean>(false);

  const getSenderEmail = (fromStr: string): string => {
    if (!fromStr) return "";
    const match = fromStr.match(/<([^>]+)>/);
    return match ? match[1].trim() : fromStr.trim();
  };

  const decryptMessageObj = useCallback(
    async (msg: any): Promise<Message> => {
      let subject = msg.subject || "(No Subject)";
      let fromSender = msg.from || "";
      let toRecipient = msg.to || "";
      let cc = msg.cc || "";
      let bcc = msg.bcc || "";

      if (msg.encryptedKey && isEncryptionUnlocked) {
        try {
          const privateKey = await getPrivateKey();
          if (privateKey) {
            const dataKey = await unwrapKey(msg.encryptedKey);

            if (msg.subject) {
              try {
                subject = await decrypt(msg.subject, dataKey);
              } catch {}
            }
            if (msg.from) {
              try {
                fromSender = await decrypt(msg.from, dataKey);
              } catch {}
            }
            if (msg.to) {
              try {
                toRecipient = await decrypt(msg.to, dataKey);
              } catch {}
            }
            if (msg.cc) {
              try {
                cc = await decrypt(msg.cc, dataKey);
              } catch {}
            }
            if (msg.bcc) {
              try {
                bcc = await decrypt(msg.bcc, dataKey);
              } catch {}
            }
          }
        } catch (e) {
          console.error(`Failed to decrypt list message ${msg.id}:`, e);
        }
      }

      return {
        ...msg,
        subject,
        from: fromSender,
        to: toRecipient,
        cc,
        bcc,
        attachments: msg.attachments || [],
      };
    },
    [isEncryptionUnlocked, getPrivateKey, unwrapKey, decrypt],
  );

  const decryptDetailedMessageObj = useCallback(
    async (msg: any): Promise<DetailedMessage> => {
      let subject = msg.subject || "(No Subject)";
      let fromSender = msg.from || "";
      let toRecipient = msg.to || "";
      let cc = msg.cc || "";
      let bcc = msg.bcc || "";
      let bodyText = msg.bodyText || "";
      let bodyHtml = msg.bodyHtml || "";

      if (msg.encryptedKey && isEncryptionUnlocked) {
        try {
          const privateKey = await getPrivateKey();
          if (privateKey) {
            const dataKey = await unwrapKey(msg.encryptedKey);

            if (msg.subject) {
              try {
                subject = await decrypt(msg.subject, dataKey);
              } catch {}
            }
            if (msg.from) {
              try {
                fromSender = await decrypt(msg.from, dataKey);
              } catch {}
            }
            if (msg.to) {
              try {
                toRecipient = await decrypt(msg.to, dataKey);
              } catch {}
            }
            if (msg.cc) {
              try {
                cc = await decrypt(msg.cc, dataKey);
              } catch {}
            }
            if (msg.bcc) {
              try {
                bcc = await decrypt(msg.bcc, dataKey);
              } catch {}
            }
            if (msg.bodyText) {
              try {
                bodyText = await decrypt(msg.bodyText, dataKey);
              } catch {}
            }
            if (msg.bodyHtml) {
              try {
                bodyHtml = await decrypt(msg.bodyHtml, dataKey);
              } catch {}
            }
          }
        } catch (e) {
          console.error(`Failed to decrypt detailed message ${msg.id}:`, e);
        }
      }

      return {
        ...msg,
        subject,
        from: fromSender,
        to: toRecipient,
        cc,
        bcc,
        bodyText,
        bodyHtml,
        attachments: msg.attachments || [],
      };
    },
    [isEncryptionUnlocked, getPrivateKey, unwrapKey, decrypt],
  );

  // Fetch email accounts
  useEffect(() => {
    if (!session?.accessToken) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch((e) => console.error(e));
  }, [session?.accessToken]);

  // Fetch messages for account/folder
  const fetchMessages = useCallback(
    async (isInitial = true): Promise<void> => {
      if (!session?.accessToken) return;
      if (isInitial) {
        setLoading(true);
        setError(null);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = isInitial ? 1 : page + 1;
      const url =
        accountId === "unified"
          ? `${process.env.NEXT_PUBLIC_API_URL}/emails/unified/folders/${folder}/messages?page=${currentPage}&limit=25`
          : `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/folders/${folder}/messages?page=${currentPage}&limit=25`;

      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        if (!res.ok) throw new Error("Failed to fetch folder messages");
        const rawData = await res.json();
        const rawList: any[] = Array.isArray(rawData) ? rawData : [];

        const decryptedList = await Promise.all(
          rawList.map((m) => decryptMessageObj(m)),
        );

        if (isInitial) {
          setMessages(decryptedList);
          if (decryptedList.length > 0 && !selectedMessageId) {
            const firstId = decryptedList[0].id;
            setSelectedMessageId(firstId);
          }
        } else {
          setMessages((prev) => [...prev, ...decryptedList]);
          setPage(currentPage);
        }

        setHasMore(rawList.length === 25);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred loading emails.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      accountId,
      folder,
      session?.accessToken,
      page,
      decryptMessageObj,
      selectedMessageId,
    ],
  );

  useEffect(() => {
    if (!session?.accessToken) return;
    fetchMessages(true);
    setSelectedIds([]);
    hasUnlockedDecryptionRef.current = false;
  }, [accountId, folder, session?.accessToken]);

  // Fetch individual message details
  const fetchMessageDetail = useCallback(
    async (messageId: string): Promise<void> => {
      if (!session?.accessToken) return;
      setLoadingDetail(true);
      setMessageNotFound(false);
      setSenderProfile(null);

      let itemAccountId = accountId;
      if (accountId === "unified") {
        const found = messagesRef.current.find((m) => m.id === messageId);
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
    [accountId, session?.accessToken, decryptDetailedMessageObj],
  );

  // Re-decrypt messages ONCE when post-quantum crypto keys finish restoring
  useEffect(() => {
    if (
      isEncryptionUnlocked &&
      !hasUnlockedDecryptionRef.current &&
      messages.length > 0
    ) {
      hasUnlockedDecryptionRef.current = true;
      let isMounted = true;

      Promise.all(messages.map((msg) => decryptMessageObj(msg))).then(
        (decrypted) => {
          if (isMounted) {
            setMessages(decrypted);
          }
        },
      );

      if (selectedMessageId) {
        fetchMessageDetail(selectedMessageId);
      }

      return () => {
        isMounted = false;
      };
    }
  }, [
    isEncryptionUnlocked,
    messages,
    decryptMessageObj,
    selectedMessageId,
    fetchMessageDetail,
  ]);

  // Sync / Listeners
  useEffect(() => {
    if (selectedMessageId && session?.accessToken) {
      fetchMessageDetail(selectedMessageId);
    }
  }, [selectedMessageId, session?.accessToken]);

  const updateMessageStatus = async (
    messageId: string,
    updates: { read?: boolean; flagged?: boolean; folder?: string },
  ): Promise<void> => {
    if (!session?.accessToken) return;
    let targetAccount = accountId;

    if (accountId === "unified") {
      const msgObj = messages.find((m) => m.id === messageId);
      if (msgObj && msgObj.userEmailAccountId) {
        targetAccount = msgObj.userEmailAccountId;
      }
    }

    const prevMessage = messages.find((m) => m.id === messageId);

    // Optimistic UI Update
    setMessages((prev) =>
      prev
        .map((m) => (m.id === messageId ? { ...m, ...updates } : m))
        .filter((m) => {
          if (updates.folder && updates.folder !== folder) {
            return false;
          }
          return true;
        }),
    );

    if (detailedMessage && detailedMessage.id === messageId) {
      setDetailedMessage((prev) => (prev ? { ...prev, ...updates } : null));
    }

    try {
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
    } catch (e) {
      toast.error("Failed to update email status.");
      if (prevMessage) {
        setMessages((prev) => [...prev, prevMessage]);
      }
    }
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

  const handleBulkAction = async (
    action: "read" | "unread" | "archive" | "trash" | "restore",
  ) => {
    if (!session?.accessToken || selectedIds.length === 0) return;
    try {
      let updates: any = {};
      if (action === "read") updates = { read: true };
      if (action === "unread") updates = { read: false };
      if (action === "archive") updates = { folder: "archive" };
      if (action === "trash") updates = { folder: "trash" };
      if (action === "restore") updates = { folder: "inbox" };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId === "unified" ? "unified" : accountId}/messages/bulk`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ messageIds: selectedIds, ...updates }),
        },
      );

      if (res.ok) {
        setMessages((prev) =>
          prev
            .map((m) => (selectedIds.includes(m.id) ? { ...m, ...updates } : m))
            .filter((m) => {
              if (updates.folder && updates.folder !== folder) return false;
              return true;
            }),
        );
        setSelectedIds([]);
        toast.success(`Updated ${selectedIds.length} emails`);
        window.dispatchEvent(new Event("runa-sidebar-changed"));
      }
    } catch (e) {
      toast.error("Bulk action failed");
    }
  };

  const handleEmptyTrash = async () => {
    if (!session?.accessToken || accountId === "unified") return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${accountId}/messages/trash/empty`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      if (res.ok) {
        setMessages([]);
        setSelectedMessageId(null);
        setDetailedMessage(null);
        toast.success("Trash emptied successfully");
        window.dispatchEvent(new Event("runa-sidebar-changed"));
      }
    } catch (e) {
      toast.error("Failed to empty trash");
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
      toast.info(t("pegasus.attachments.startingDownload", { filename }));
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
          const dataKey = await unwrapKey(detailedMessage.encryptedKey);
          finalBuffer = await decrypt(finalBuffer, dataKey);
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
      toast.success(t("pegasus.attachments.downloadSuccess", { filename }));
    } catch (err: any) {
      console.error("Attachment download failed:", err);
      toast.error(
        t("pegasus.attachments.downloadFailed", {
          message: err.message || String(err),
        }),
      );
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((m) => m.id));
    }
  };

  const handleSendReply = async (
    to: string,
    subjectText: string,
    bodyText: string,
    htmlContent: string,
  ): Promise<void> => {
    if (!session?.accessToken || !selectedMessageId) return;

    let targetAccId = accountId;
    if (accountId === "unified") {
      const msgObj = messages.find((m) => m.id === selectedMessageId);
      if (msgObj && msgObj.userEmailAccountId) {
        targetAccId = msgObj.userEmailAccountId;
      }
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${targetAccId}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            to,
            subject: subjectText,
            body: bodyText,
            html: htmlContent,
          }),
        },
      );
      if (!res.ok) throw new Error("Reply SMTP send failed.");
      toast.success(t("pegasus.folderView.replySent"));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || t("pegasus.folderView.replyFailed"));
    }
  };

  if (!isEncryptionUnlocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-6">
        <RrEncryptionLocked />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full h-full overflow-hidden bg-background">
      <div className="flex flex-1 w-full h-full overflow-hidden p-3 gap-3">
        {/* Middle Pane - Threaded List View */}
        <div
          className={`${
            showDetailOnMobile ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-95 lg:w-105 border border-border bg-card shrink-0 h-full overflow-hidden rounded-2xl shadow-xs`}
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
            onEmptyTrash={handleEmptyTrash}
            // Context Menu Actions
            onMarkRead={(id, read) => updateMessageStatus(id, { read })}
            onReplyMsg={async (msg, mode) => {
              setSelectedMessageId(msg.id);

              let bodyText = msg.bodyText || "";
              let ccText = msg.cc || "";
              let fromText = msg.from;
              let subjectText = msg.subject || "";
              let dateText = msg.date;

              if (detailedMessage && detailedMessage.id === msg.id) {
                bodyText = detailedMessage.bodyText || bodyText;
                ccText = detailedMessage.cc || ccText;
                fromText = detailedMessage.from || fromText;
                subjectText = detailedMessage.subject || subjectText;
                dateText = detailedMessage.date || dateText;
              } else {
                try {
                  let itemAccountId = accountId;
                  if (accountId === "unified" && msg.userEmailAccountId) {
                    itemAccountId = msg.userEmailAccountId;
                  }
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/emails/${itemAccountId}/messages/${msg.id}`,
                    {
                      headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                      },
                    },
                  );
                  if (res.ok) {
                    const data: DetailedMessage = await res.json();
                    const decrypted = await decryptDetailedMessageObj(data);
                    setDetailedMessage(decrypted);
                    bodyText = decrypted.bodyText || "";
                    ccText = decrypted.cc || ccText;
                    fromText = decrypted.from || fromText;
                    subjectText = decrypted.subject || subjectText;
                    dateText = decrypted.date || dateText;
                  }
                } catch (e) {
                  console.warn("Failed to fetch message body for reply:", e);
                }
              }

              const getCleanEmail = (fromStr: string) => {
                const match = fromStr.match(/<([^>]+)>/);
                return match ? match[1] : fromStr.trim();
              };
              const sEmail = getCleanEmail(fromText);

              if (mode === "reply") {
                const defaultSub = subjectText.startsWith("Re:")
                  ? subjectText
                  : `Re: ${subjectText}`;
                const defaultBody = `\n\n--- On ${new Date(dateText).toLocaleString()}, ${fromText} wrote:\n> ${(bodyText || "").split("\n").join("\n> ")}`;
                setComposeData({
                  to: sEmail,
                  subject: defaultSub,
                  body: defaultBody,
                });
                setIsComposing(true);
              } else if (mode === "replyAll") {
                const defaultSub = subjectText.startsWith("Re:")
                  ? subjectText
                  : `Re: ${subjectText}`;
                const defaultBody = `\n\n--- On ${new Date(dateText).toLocaleString()}, ${fromText} wrote:\n> ${(bodyText || "").split("\n").join("\n> ")}`;
                setComposeData({
                  to: sEmail,
                  cc: ccText,
                  subject: defaultSub,
                  body: defaultBody,
                });
                setIsComposing(true);
              } else if (mode === "forward" || mode === "redirect") {
                const defaultSub = subjectText.startsWith("Fwd:")
                  ? subjectText
                  : `Fwd: ${subjectText}`;
                const defaultBody = `\n\n---------- Forwarded message ---------\nFrom: ${fromText}\nDate: ${new Date(dateText).toLocaleString()}\nSubject: ${subjectText}\nTo: ${msg.to}\n\n${bodyText}`;
                setComposeData({ subject: defaultSub, body: defaultBody });
                setIsComposing(true);
              }
            }}
            onMoveTo={(id, targetFolder) =>
              updateMessageStatus(id, { folder: targetFolder })
            }
            onCopyTo={async (id, targetFolder) => {
              let itemAccountId = accountId;
              if (accountId === "unified") {
                const found = messages.find((m) => m.id === id);
                if (found && found.userEmailAccountId) {
                  itemAccountId = found.userEmailAccountId;
                }
              }
              try {
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL}/emails/${itemAccountId}/messages/${id}/copy`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${session?.accessToken}`,
                    },
                    body: JSON.stringify({ targetFolder }),
                  },
                );
                if (res.ok) {
                  toast.success(
                    t("pegasus.folderView.copiedMessage", `Copied message to ${targetFolder}`),
                  );
                  if (targetFolder.toLowerCase() === folder.toLowerCase()) {
                    fetchMessages(false);
                  }
                } else {
                  toast.error("Failed to copy message");
                }
              } catch (e) {
                console.error("Failed to copy message:", e);
                toast.error("Failed to copy message");
              }
            }}
            onEditAsNewMessage={async (msg) => {
              let bodyText = msg.bodyText || "";
              if (detailedMessage && detailedMessage.id === msg.id) {
                bodyText = detailedMessage.bodyText || bodyText;
              } else {
                try {
                  let itemAccountId = accountId;
                  if (accountId === "unified" && msg.userEmailAccountId) {
                    itemAccountId = msg.userEmailAccountId;
                  }
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/emails/${itemAccountId}/messages/${msg.id}`,
                    {
                      headers: {
                        Authorization: `Bearer ${session?.accessToken}`,
                      },
                    },
                  );
                  if (res.ok) {
                    const data = await res.json();
                    const decrypted = await decryptDetailedMessageObj(data);
                    bodyText = decrypted.bodyText || "";
                  }
                } catch (e) {
                  console.warn("Failed to fetch message body:", e);
                }
              }
              setComposeData({
                to: msg.to || "",
                cc: msg.cc || "",
                subject: msg.subject || "",
                body: bodyText,
              });
              setIsComposing(true);
            }}
          />
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
            onOpenCompose={(data) => {
              setComposeData(data);
              setIsComposing(true);
            }}
          />
        </div>
      </div>

      {/* Global Compose Email Dialog Modal */}
      <RrComposeEmailModal
        open={isComposing}
        onOpenChange={setIsComposing}
        accountId={accountId === "unified" ? undefined : accountId}
        defaultTo={composeData.to}
        defaultCc={composeData.cc}
        defaultBcc={composeData.bcc}
        defaultSubject={composeData.subject}
        defaultBody={composeData.body}
      />
    </div>
  );
}
