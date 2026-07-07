"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { Notification } from "@runa/notifications";

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
  notifications: Notification[];
  unreadCount: number;
  loadingNotifications: boolean;
  refetchNotifications: () => Promise<void>;
  bookmarks: Bookmark[];
  loadingBookmarks: boolean;
  refetchBookmarks: () => Promise<void>;
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

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

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
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoadingNotifications(false);
    }
  }, [token]);

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

  // Initial fetch and WebSocket connection
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setBookmarks([]);
      return;
    }

    // Fetch data once
    refetchNotifications();
    refetchBookmarks();

    // Setup Socket.io connection
    const wsUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const socket: Socket = io(`${wsUrl}/notifications`, {
      query: { token },
      transports: ["websocket"],
    });

    const handleCreated = (newNotification: any) => {
      const activeDeviceId =
        typeof window !== "undefined"
          ? localStorage.getItem("runa_device_id")
          : null;
      if (
        newNotification.metadata?.targetDeviceId &&
        newNotification.metadata.targetDeviceId !== activeDeviceId
      ) {
        return;
      }
      setNotifications((prev) => [newNotification, ...prev]);
    };

    const handleUpdated = (updatedNotification: any) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
      );
    };

    const handleDelete = ({ id }: { id: string }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const handleCleared = () => {
      setNotifications([]);
    };

    const handleEmailNew = (data: any) => {
      window.dispatchEvent(new CustomEvent("runa-email-new", { detail: data }));
      window.dispatchEvent(new Event("runa-sidebar-changed"));
    };

    const handleBookmarkUpdated = (updatedBookmark: any) => {
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.id === updatedBookmark.id);
        if (exists) {
          return prev.map((b) => (b.id === updatedBookmark.id ? updatedBookmark : b));
        }
        return [updatedBookmark, ...prev];
      });
      window.dispatchEvent(new Event("runa-bookmarks-changed"));
    };

    const handleBookmarkDeleted = ({ id }: { id: string }) => {
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      window.dispatchEvent(new Event("runa-bookmarks-changed"));
    };

    socket.on("notification:created", handleCreated);
    socket.on("notification:updated", handleUpdated);
    socket.on("notification:deleted", handleDelete);
    socket.on("notifications:cleared", handleCleared);
    socket.on("email:new", handleEmailNew);
    socket.on("bookmark:updated", handleBookmarkUpdated);
    socket.on("bookmark:deleted", handleBookmarkDeleted);

    return () => {
      socket.off("notification:created", handleCreated);
      socket.off("notification:updated", handleUpdated);
      socket.off("notification:deleted", handleDelete);
      socket.off("notifications:cleared", handleCleared);
      socket.off("email:new", handleEmailNew);
      socket.off("bookmark:updated", handleBookmarkUpdated);
      socket.off("bookmark:deleted", handleBookmarkDeleted);
      socket.disconnect();
    };
  }, [token, refetchNotifications, refetchBookmarks]);

  // Listener for global bookmarks-changed event to re-fetch/sync
  useEffect(() => {
    if (!token) return;
    const handleGlobalChange = () => {
      refetchBookmarks();
    };
    window.addEventListener("runa-bookmarks-changed", handleGlobalChange);
    return () => {
      window.removeEventListener("runa-bookmarks-changed", handleGlobalChange);
    };
  }, [token, refetchBookmarks]);

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
      }}
    >
      {children}
    </RrNotificationAndBookmarksContext.Provider>
  );
}
