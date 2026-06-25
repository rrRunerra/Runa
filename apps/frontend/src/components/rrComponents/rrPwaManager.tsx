"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";

/**
 * RrPwaManager
 *
 * Handles three responsibilities:
 *  1. Service worker registration (`/sw.js`)
 *  2. Browser Notification permission request
 *  3. Bridging the encrypted WebSocket notification stream → native
 *     browser notifications.
 *
 * Decryption uses the same E2EE primitives as `RrNotificationsModal`.
 * If decryption fails for any reason the notification is silently dropped —
 * we never show encrypted/garbled content to the user.
 *
 * This component renders nothing — mount it once inside Providers.
 */
export function RrPwaManager() {
  const { data: session } = useSession();
  const { getPrivateKey } = useRRe2ee();
  const socketRef = useRef<Socket | null>(null);

  // ── 1. Register service worker ────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.info("[Runa PWA] Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[Runa PWA] Service worker registration failed:", err);
      });
  }, []);

  // ── 2. Request notification permission (once, when session is ready) ──────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!session?.accessToken) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        console.info("[Runa PWA] Notification permission:", perm);
      });
    }
  }, [session?.accessToken]);

  // ── 3. WebSocket → native notification bridge ─────────────────────────────
  useEffect(() => {
    if (!session?.accessToken) return;

    const wsUrl =
      process.env.NEXT_PUBLIC_API_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");

    const socket: Socket = io(`${wsUrl}/notifications`, {
      query: { token: session.accessToken },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("notification:created", async (raw: Record<string, unknown>) => {
      // Only proceed if the user has granted notification permission
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      try {
        const meta = raw.metadata as Record<string, unknown> | undefined;
        const isEncrypted = !!(meta && meta.encryptedKey);

        let title: string;
        let body: string;

        if (isEncrypted) {
          // Get the user's private key — bail out silently if unavailable
          const privKey = await getPrivateKey();
          if (!privKey) return;

          const { decryptEmailDataKey, decryptEmailString } = await import(
            "@runa/crypto/browser"
          );

          // Derive the per-notification data key using the user's private key.
          // encryptedKey arrives as a JSON string — parse it into the struct
          // expected by decryptEmailDataKey.
          const encryptedKeyPayload =
            typeof meta!.encryptedKey === "string"
              ? (JSON.parse(meta!.encryptedKey as string) as {
                  ephemeralPublicKey: string;
                  iv: string;
                  tag: string;
                  ciphertext: string;
                })
              : (meta!.encryptedKey as {
                  ephemeralPublicKey: string;
                  iv: string;
                  tag: string;
                  ciphertext: string;
                });

          const dataKey = await decryptEmailDataKey(encryptedKeyPayload, privKey);

          // Decrypt title — if this throws we bail out (don't show garbled text)
          title = await decryptEmailString(raw.title as string, dataKey);

          // Decrypt body — fall back to empty string if missing
          body = raw.message
            ? await decryptEmailString(raw.message as string, dataKey)
            : "";
        } else {
          // Unencrypted notification — show as-is
          title = (raw.title as string) ?? "New notification";
          body = (raw.message as string) ?? "";
        }

        // Device-targeted notifications: only show on the intended device
        const targetDeviceId = (meta as any)?.targetDeviceId as
          | string
          | undefined;
        if (
          targetDeviceId &&
          targetDeviceId !== localStorage.getItem("runa_device_id")
        ) {
          return;
        }

        // Show the native browser notification
        const sw = await navigator.serviceWorker.ready;
        sw.showNotification(title, {
          body,
          icon: "/android-chrome-192x192.png",
          badge: "/favicon-32x32.png",
          tag: raw.id as string,
          data: { url: "/polaris/dash" },
        });
      } catch {
        // Decryption failed — silently drop the notification
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.accessToken, getPrivateKey]);

  return null;
}
