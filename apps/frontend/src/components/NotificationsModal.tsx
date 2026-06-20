"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle,
  XCircle,
  Smartphone,
  ShieldAlert,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Notification,
  NotificationStatus,
} from "@runa/notifications";
import { deriveMasterKey, encryptMasterKeyForDevice, exportPublicKey, generateKeyPair } from "@/lib/crypto";

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
}

export function NotificationsModal({
  open,
  onOpenChange,
  onUnreadCountChange,
}: NotificationsModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const unreadCount = notifications.filter(
    (n) => n.status === "PENDING"
  ).length;

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  // Helper to load E2E private key from localStorage and import it
  const getPrivateKey = useCallback(async (): Promise<CryptoKey | null> => {
    const stored = localStorage.getItem("runa_user_private_key");
    if (!stored) return null;
    try {
      const jwk = JSON.parse(stored);
      return await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ["deriveKey", "deriveBits"]
      );
    } catch {
      return null;
    }
  }, []);

  const decryptNotification = useCallback(async (n: any, privKey: CryptoKey | null): Promise<any> => {
    const meta = n.metadata as any;
    if (!meta || !meta.encryptedKey || !privKey) return n;

    try {
      const { decryptEmailDataKey, decryptEmailString } = await import("@/lib/crypto");
      const dataKey = await decryptEmailDataKey(meta.encryptedKey, privKey);
      
      let decryptedTitle = n.title;
      try { decryptedTitle = await decryptEmailString(n.title, dataKey); } catch {}

      let decryptedMessage = n.message;
      try { decryptedMessage = await decryptEmailString(n.message, dataKey); } catch {}

      return {
        ...n,
        title: decryptedTitle,
        message: decryptedMessage,
      };
    } catch (err) {
      console.error("Failed to decrypt notification:", err);
      return n;
    }
  }, []);

  // Fetch notifications initially
  const fetchNotifications = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        try {
          const privKey = await getPrivateKey();
          const decrypted = await Promise.all(data.map((n: any) => decryptNotification(n, privKey)));
          setNotifications(decrypted);
        } catch (decErr) {
          console.error("Failed to decrypt fetched notifications:", decErr);
          setNotifications(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session, getPrivateKey, decryptNotification]);

  useEffect(() => {
    if (open && session?.accessToken) {
      fetchNotifications();
    }
  }, [open, session, fetchNotifications]);

  // Setup WebSocket connection for live notifications
  useEffect(() => {
    if (!session?.accessToken) return;

    const wsUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const socket: Socket = io(`${wsUrl}/notifications`, {
      query: { token: session.accessToken },
      transports: ["websocket"],
    });

    socket.on("notification:created", async (newNotification: Notification) => {
      const privKey = await getPrivateKey();
      const decrypted = await decryptNotification(newNotification, privKey);
      setNotifications((prev) => [decrypted, ...prev]);
      const meta = decrypted.metadata as any;
      if (meta && meta.type === "email") {
        toast.info(`New Email: ${decrypted.title}`, {
          description: decrypted.message,
          action: {
            label: "Open",
            onClick: () => {
              router.push(`/pegasus/account/${meta.emailAccountId}/${meta.emailFolder}?messageId=${meta.emailMessageId}`);
            },
          },
        });
      } else {
        toast.info(`New Notification: ${decrypted.title}`);
      }
    });

    socket.on("notification:updated", async (updatedNotification: Notification) => {
      const privKey = await getPrivateKey();
      const decrypted = await decryptNotification(updatedNotification, privKey);
      setNotifications((prev) =>
        prev.map((n) => (n.id === decrypted.id ? decrypted : n))
      );
    });

    socket.on("notification:deleted", ({ id }: { id: string }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    });

    socket.on("notifications:cleared", () => {
      setNotifications([]);
    });

    socket.on("email:new", (data: any) => {
      const event = new CustomEvent("runa-email-new", { detail: data });
      window.dispatchEvent(event);
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.accessToken, getPrivateKey, decryptNotification, router]);

  // Mark a notification as read/dismissed
  const handleDismiss = async (id: string) => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ status: "READ" }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: "READ" as NotificationStatus } : n))
        );
        toast.success("Notification dismissed");
      }
    } catch (err) {
      toast.error("Failed to dismiss notification");
    }
  };

  const handleDelete = async (id: string) => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        toast.success("Notification deleted");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (res.ok) {
        setNotifications([]);
        toast.success("All notifications cleared");
      } else {
        throw new Error("Failed to clear");
      }
    } catch (err) {
      toast.error("Failed to clear notifications");
    }
  };

  // Deny a device linking request
  const handleDeny = async (id: string) => {
    if (!session?.accessToken) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ status: "DENIED" }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: "DENIED" as NotificationStatus } : n))
        );
        toast.success("Device request denied");
      }
    } catch (err) {
      toast.error("Failed to deny request");
    } finally {
      setProcessingId(null);
    }
  };

  // Approve a device linking request
  const handleApprove = async (id: string, requestPublicKey: string) => {
    if (!session?.accessToken || !session?.user?.username) return;
    const password = passwords[id];
    if (!password) {
      toast.error("Please enter your account password to authorize this device.");
      return;
    }

    setProcessingId(id);
    try {
      // 1. Derive master key from password
      const masterCryptoKey = await deriveMasterKey(password, session.user.username);
      
      // Export derived master key as raw material (base64url)
      const exportedMasterBuffer = await window.crypto.subtle.exportKey("raw", masterCryptoKey);
      const masterKeyMaterial = btoa(String.fromCharCode(...new Uint8Array(exportedMasterBuffer)));

      // 2. Generate temporary keypair for the ECDH key exchange
      const ownKeyPair = await generateKeyPair();
      
      // 3. Encrypt the master key material using ECDH key wrapping
      const { ciphertext, iv } = await encryptMasterKeyForDevice(
        masterKeyMaterial,
        requestPublicKey,
        ownKeyPair.privateKey
      );

      // Export own temporary public key to send alongside
      const ownPublicKeyBase64 = await exportPublicKey(ownKeyPair.publicKey);

      // 4. Send approval package to server
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          notificationId: id,
          // We payload both the ciphertext, iv, and the sender public key
          encryptedMasterKey: JSON.stringify({ ciphertext, iv, senderPublicKey: ownPublicKeyBase64 }),
        }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: "APPROVED" as NotificationStatus } : n))
        );
        toast.success("Device authorized successfully!");
        setPasswords((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit authorization");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Authorization failed. Check your password.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-zinc-800/40">
          <div className="flex items-center justify-between w-full pr-8">
            <DialogTitle className="flex items-center gap-2 text-md font-bold text-foreground">
              <Bell className="size-4.5 text-primary" />
              Notification Center
            </DialogTitle>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-7 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-md px-2 transition-all cursor-pointer"
              >
                Clear All
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Manage your incoming status logs and interactive authorizations.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-6 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Loading alerts...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-center">
            <div className="p-3.5 rounded-full bg-zinc-900 border border-zinc-800/60 text-muted-foreground/40">
              <Bell className="size-6" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">No notifications yet</span>
            <span className="text-[10px] text-muted-foreground/60">We will notify you here when things happen.</span>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px] pr-1.5 py-2">
            <div className="space-y-3.5">
              {notifications.map((n) => {
                const isInteractive = n.type === "INTERACTIVE";
                const isPending = n.status === "PENDING";

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      const meta = n.metadata as any;
                      if (meta && meta.type === "email") {
                        onOpenChange(false);
                        router.push(`/pegasus/account/${meta.emailAccountId}/${meta.emailFolder}?messageId=${meta.emailMessageId}`);
                        handleDismiss(n.id);
                      }
                    }}
                    className={`p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/10 hover:bg-zinc-900/35 transition-all duration-200 flex flex-col gap-3 relative overflow-hidden ${
                      n.metadata && (n.metadata as any).type === "email"
                        ? "cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/30"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 w-full min-w-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary mt-0.5 shrink-0">
                          {isInteractive ? (
                            <Smartphone className="size-4" />
                          ) : (
                            <Bell className="size-4" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-xs font-bold text-foreground break-words max-w-full">
                              {n.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider shrink-0 ${
                                n.status === "PENDING"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : n.status === "APPROVED"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : n.status === "DENIED"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700/50"
                              }`}
                            >
                              {n.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-normal break-all">
                            {n.message}
                          </p>
                          <span className="text-[9px] text-muted-foreground/50 block">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {(!isInteractive || !isPending) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(n.id);
                          }}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer shrink-0 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    {isInteractive && isPending && (
                      <div className="mt-1 border-t border-zinc-800/40 pt-3 space-y-3.5">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor={`pwd-${n.id}`}
                            className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide"
                          >
                            Account Password
                          </Label>
                          <Input
                            id={`pwd-${n.id}`}
                            type="password"
                            placeholder="Enter password to authorize"
                            value={passwords[n.id] || ""}
                            onChange={(e) =>
                              setPasswords((prev) => ({
                                ...prev,
                                [n.id]: e.target.value,
                              }))
                            }
                            className="h-8 px-2.5 text-xs bg-zinc-950 border-zinc-800 rounded-lg"
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeny(n.id)}
                            disabled={processingId === n.id}
                            className="h-8 rounded-lg px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs font-semibold"
                          >
                            <XCircle className="size-3.5 mr-1" />
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(n.id, n.metadata?.publicKey || "")}
                            disabled={processingId === n.id || !passwords[n.id]}
                            className="h-8 rounded-lg px-4 bg-primary text-primary-foreground text-xs font-semibold"
                          >
                            {processingId === n.id ? (
                              <Loader2 className="size-3.5 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="size-3.5 mr-1" />
                            )}
                            Authorize Device
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
