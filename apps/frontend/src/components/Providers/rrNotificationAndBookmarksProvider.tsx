"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import { Notification } from "@runa/notifications";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { useTranslation } from "react-i18next";

export interface Bookmark {
  id: string;
  name: string;
  description?: string;
  redirect: string;
  stars?: { ra: number; dec: number; magnitude: number }[];
  connections?: [number, number][];
  icon?: string;
  connectionColor?: string;
  starColor?: string;
}

interface NotificationAndBookmarksContextType {
  notifications: (Notification & { _decryptionFailed?: boolean })[];
  unreadCount: number;
  loadingNotifications: boolean;
  refetchNotifications: () => Promise<void>;
  bookmarks: Bookmark[];
  loadingBookmarks: boolean;
  refetchBookmarks: () => Promise<void>;
  deleteBookmark: (id: string) => Promise<boolean>;
  setNotifications: React.Dispatch<
    React.SetStateAction<(Notification & { _decryptionFailed?: boolean })[]>
  >;
}

const RrNotificationAndBookmarksContext = createContext<
  NotificationAndBookmarksContextType | undefined
>(undefined);

export function useNotificationAndBookmarks() {
  const context = useContext(RrNotificationAndBookmarksContext);
  if (context === undefined) {
    throw new Error(
      "useNotificationAndBookmarks must be used within a RrNotificationAndBookmarksProvider"
    );
  }
  return context;
}

export function RrNotificationAndBookmarksProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { t } = useTranslation();
  const crypto = useRRCrypto();

  const cryptoRef = useRef(crypto);
  useEffect(() => {
    cryptoRef.current = crypto;
  }, [crypto]);

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [notifications, setNotifications] = useState<
    (Notification & { _decryptionFailed?: boolean })[]
  >([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  const decryptNotification = useCallback(
    async (n: any, privKey: CryptoKey | null): Promise<any> => {
      const meta = n.metadata as any;
      const isEncrypted = !!(meta && meta.encryptedKey);

      if (!isEncrypted) return n;

      const currentT = tRef.current;
      const { unwrapKey, decrypt } = cryptoRef.current;

      if (!privKey) {
        return {
          ...n,
          title: currentT("encryptedNotification", {
            defaultValue: "Encrypted Notification",
          }),
          message: currentT("encryptedNotificationDesc", {
            defaultValue: "Encrypted content",
          }),
          _decryptionFailed: true,
        };
      }

      try {
        const dataKey = await unwrapKey(meta.encryptedKey);

        let decryptedTitle = n.title;
        try {
          decryptedTitle = await decrypt(n.title, dataKey);
        } catch {}

        let decryptedMessage = n.message;
        try {
          decryptedMessage = await decrypt(n.message, dataKey);
        } catch {}

        return {
          ...n,
          title: decryptedTitle,
          message: decryptedMessage,
        };
      } catch (err) {
        console.error("Failed to decrypt notification:", err);
        return {
          ...n,
          title: currentT("encryptedNotification", {
            defaultValue: "Encrypted Notification",
          }),
          message: currentT("encryptedNotificationDesc", {
            defaultValue: "Encrypted content",
          }),
          _decryptionFailed: true,
        };
      }
    },
    []
  );

  const refetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoadingNotifications(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/notifications`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        let processed = data;
        try {
          const privKey = await cryptoRef.current.getPrivateKey();
          processed = await Promise.all(
            data.map((n: any) => decryptNotification(n, privKey))
          );
          processed = processed.filter((n: any) => {
            if (n.metadata?.targetDeviceId) {
              return (
                n.metadata.targetDeviceId ===
                localStorage.getItem("runa_device_id")
              );
            }
            return true;
          });
        } catch (decErr) {
          console.error("Failed to decrypt fetched notifications:", decErr);
        }
        setNotifications(processed);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  }, [token, decryptNotification]);

  const refetchBookmarks = useCallback(async () => {
    if (!token) return;
    setLoadingBookmarks(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/bookmarks`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data);
      }
    } catch (err) {
      console.error("Error fetching bookmarks:", err);
    } finally {
      setLoadingBookmarks(false);
    }
  }, [token]);

  // Initial fetch and global event sync (runs once per authenticated session)
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setBookmarks([]);
      return;
    }

    refetchNotifications();
    refetchBookmarks();

    const handleCreated = (e: Event) => {
      const customEvent = e as CustomEvent<Notification>;
      if (!customEvent.detail) return;
      const newNotif = customEvent.detail;
      const activeDeviceId =
        typeof window !== "undefined"
          ? localStorage.getItem("runa_device_id")
          : null;
      if (
        (newNotif.metadata as any)?.targetDeviceId &&
        (newNotif.metadata as any).targetDeviceId !== activeDeviceId
      ) {
        return;
      }
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    };

    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<Notification>;
      if (!customEvent.detail) return;
      const updatedNotif = customEvent.detail;
      setNotifications((prev) =>
        prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
      );
    };

    const handleDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (!customEvent.detail) return;
      const { id } = customEvent.detail;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const handleCleared = () => {
      setNotifications([]);
    };

    const handleBookmarkUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<Bookmark>;
      if (!customEvent.detail) return;
      const updatedBookmark = customEvent.detail;
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.id === updatedBookmark.id);
        if (exists) {
          return prev.map((b) =>
            b.id === updatedBookmark.id ? updatedBookmark : b
          );
        }
        return [updatedBookmark, ...prev];
      });
    };

    const handleBookmarkDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (!customEvent.detail) return;
      const { id } = customEvent.detail;
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    };

    const handleBookmarksChanged = () => {
      refetchBookmarks();
    };

    window.addEventListener("runa-notification-created", handleCreated);
    window.addEventListener("runa-notification-updated", handleUpdated);
    window.addEventListener("runa-notification-deleted", handleDelete);
    window.addEventListener("runa-notifications-cleared", handleCleared);
    window.addEventListener("runa-bookmark-updated", handleBookmarkUpdated);
    window.addEventListener("runa-bookmark-deleted", handleBookmarkDeleted);
    window.addEventListener("runa-bookmarks-changed", handleBookmarksChanged);

    return () => {
      window.removeEventListener("runa-notification-created", handleCreated);
      window.removeEventListener("runa-notification-updated", handleUpdated);
      window.removeEventListener("runa-notification-deleted", handleDelete);
      window.removeEventListener("runa-notifications-cleared", handleCleared);
      window.removeEventListener("runa-bookmark-updated", handleBookmarkUpdated);
      window.removeEventListener("runa-bookmark-deleted", handleBookmarkDeleted);
      window.removeEventListener("runa-bookmarks-changed", handleBookmarksChanged);
    };
  }, [token, refetchNotifications, refetchBookmarks]);

  // Calculate unread Count
  const unreadCount = useMemo(() => {
    const activeDeviceId =
      typeof window !== "undefined"
        ? localStorage.getItem("runa_device_id")
        : null;
    return notifications.filter((n) => {
      if (n.status !== "PENDING") return false;
      const metadata = n.metadata as any;
      if (metadata?.targetDeviceId) {
        return metadata.targetDeviceId === activeDeviceId;
      }
      return true;
    }).length;
  }, [notifications]);

  const deleteBookmark = useCallback(
    async (id: string): Promise<boolean> => {
      if (!token) return false;
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/bookmarks/${id}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          setBookmarks((prev) => prev.filter((b) => b.id !== id));
          window.dispatchEvent(new Event("runa-bookmarks-changed"));
          return true;
        }
        return false;
      } catch (err) {
        console.error("Error deleting bookmark:", err);
        return false;
      }
    },
    [token]
  );

  return (
    <RrNotificationAndBookmarksContext.Provider
      value={{
        notifications,
        unreadCount,
        loadingNotifications,
        refetchNotifications,
        bookmarks,
        loadingBookmarks,
        refetchBookmarks,
        deleteBookmark,
        setNotifications,
      }}
    >
      {children}
    </RrNotificationAndBookmarksContext.Provider>
  );
}
