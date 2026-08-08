"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Notification } from "@runa/notifications";
import { useRRCrypto } from "@/hooks/useRRCrypto";

export interface RrWebSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  on: (event: string, callback: (...args: any[]) => void) => () => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

const RrWebSocketContext = createContext<RrWebSocketContextValue | undefined>(
  undefined
);

export function useRrWebSocket() {
  const context = useContext(RrWebSocketContext);
  if (context === undefined) {
    throw new Error(
      "useRrWebSocket must be used within a RrWebSocketProvider"
    );
  }
  return context;
}

export const useWebSocket = useRrWebSocket;

export function RrWebSocketProvider({
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

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

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
        console.error("Failed to decrypt notification in WebSocket:", err);
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

  // Maintain 1 continuous WebSocket connection across the whole site
  // Depends ONLY on `token` so it does not reconnect on component re-renders
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const wsUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const socketInstance: Socket = io(`${wsUrl}/notifications`, {
      query: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("connect_error", () => {
      setIsConnected(false);
    });

    const handleCreated = async (newNotification: Notification) => {
      try {
        const privKey = await cryptoRef.current.getPrivateKey();
        const decrypted = await decryptNotification(newNotification, privKey);
        const targetDeviceId = (decrypted.metadata as any)?.targetDeviceId;
        const activeDeviceId =
          typeof window !== "undefined"
            ? localStorage.getItem("runa_device_id")
            : null;

        if (
          targetDeviceId &&
          activeDeviceId &&
          targetDeviceId !== activeDeviceId
        ) {
          return;
        }

        // Show toast notification across the entire site
        if (decrypted.title) {
          toast.info(
            tRef.current("newNotificationToast", {
              title: decrypted.title,
              defaultValue: `New notification: ${decrypted.title}`,
            })
          );
        }

        window.dispatchEvent(
          new CustomEvent("runa-notification-created", { detail: decrypted })
        );
      } catch (err) {
        console.error("Error processing live notification:", err);
        window.dispatchEvent(
          new CustomEvent("runa-notification-created", {
            detail: newNotification,
          })
        );
      }
    };

    const handleUpdated = async (updatedNotification: Notification) => {
      try {
        const privKey = await cryptoRef.current.getPrivateKey();
        const decrypted = await decryptNotification(
          updatedNotification,
          privKey
        );
        window.dispatchEvent(
          new CustomEvent("runa-notification-updated", { detail: decrypted })
        );
      } catch {
        window.dispatchEvent(
          new CustomEvent("runa-notification-updated", {
            detail: updatedNotification,
          })
        );
      }
    };

    const handleDelete = ({ id }: { id: string }) => {
      window.dispatchEvent(
        new CustomEvent("runa-notification-deleted", { detail: { id } })
      );
    };

    const handleCleared = () => {
      window.dispatchEvent(new CustomEvent("runa-notifications-cleared"));
    };

    const handleEmail = (data: any) => {
      window.dispatchEvent(new CustomEvent("runa-email-new", { detail: data }));
      window.dispatchEvent(new Event("runa-sidebar-changed"));
    };

    const handleBookmarkUpdate = (updatedBookmark: any) => {
      window.dispatchEvent(
        new CustomEvent("runa-bookmark-updated", { detail: updatedBookmark })
      );
      window.dispatchEvent(new Event("runa-bookmarks-changed"));
    };

    const handleBookmarkDelete = ({ id }: { id: string }) => {
      window.dispatchEvent(
        new CustomEvent("runa-bookmark-deleted", { detail: { id } })
      );
      window.dispatchEvent(new Event("runa-bookmarks-changed"));
    };

    socketInstance.on("notification:created", handleCreated);
    socketInstance.on("notification:updated", handleUpdated);
    socketInstance.on("notification:deleted", handleDelete);
    socketInstance.on("notifications:cleared", handleCleared);
    socketInstance.on("email:new", handleEmail);
    socketInstance.on("bookmark:updated", handleBookmarkUpdate);
    socketInstance.on("bookmark:deleted", handleBookmarkDelete);

    return () => {
      socketInstance.off("notification:created", handleCreated);
      socketInstance.off("notification:updated", handleUpdated);
      socketInstance.off("notification:deleted", handleDelete);
      socketInstance.off("notifications:cleared", handleCleared);
      socketInstance.off("email:new", handleEmail);
      socketInstance.off("bookmark:updated", handleBookmarkUpdate);
      socketInstance.off("bookmark:deleted", handleBookmarkDelete);
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, decryptNotification]);

  const on = useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      if (socketRef.current) {
        socketRef.current.on(event, callback);
      }
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, callback);
        }
      };
    },
    []
  );

  const off = useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    },
    []
  );

  const emit = useCallback((event: string, ...args: any[]) => {
    if (socketRef.current) {
      socketRef.current.emit(event, ...args);
    }
  }, []);

  return (
    <RrWebSocketContext.Provider
      value={{
        socket,
        isConnected,
        on,
        off,
        emit,
      }}
    >
      {children}
    </RrWebSocketContext.Provider>
  );
}
