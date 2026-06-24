"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Filter,
  Lock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Notification, NotificationStatus, NotificationType } from "@runa/notifications";
import {
  deriveMasterKey,
  encryptMasterKeyForDevice,
  exportPublicKey,
  generateKeyPair,
} from "@runa/crypto/browser";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
}

const PAGE_SIZE = 10;

export function RrNotificationsModal({
  open,
  onOpenChange,
  onUnreadCountChange,
}: NotificationsModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { getPrivateKey } = useRRe2ee();
  
  const [notifications, setNotifications] = useState<(Notification & { _decryptionFailed?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.status === "PENDING").length;

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  const decryptNotification = useCallback(
    async (n: any, privKey: CryptoKey | null): Promise<any> => {
      const meta = n.metadata as any;
      if (!meta || !meta.encryptedKey || !privKey) return n;

      try {
        const { decryptEmailDataKey, decryptEmailString } = await import("@runa/crypto/browser");
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
        return {
          ...n,
          title: "Encrypted Notification",
          message: "This notification is encrypted and could not be decrypted on this device.",
          _decryptionFailed: true,
        };
      }
    },
    [],
  );

  const fetchNotifications = useCallback(async (skip = 0, append = false) => {
    if (!session?.accessToken) return;
    
    if (skip === 0) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const query = new URLSearchParams({ take: PAGE_SIZE.toString(), skip: skip.toString() });
      if (filterType !== "ALL") {
        query.append("type", filterType);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications?${query.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );

      if (res.ok) {
        const data = await res.json();
        
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        let processedData = [];
        try {
          const privKey = await getPrivateKey();
          processedData = await Promise.all(data.map((n: any) => decryptNotification(n, privKey)));
          
          // Filter out device requests not intended for this device
          processedData = processedData.filter((n: any) => {
            if (n.metadata?.targetDeviceId) {
              return n.metadata.targetDeviceId === localStorage.getItem("runa_device_id");
            }
            return true;
          });
        } catch (decErr) {
          console.error("Failed to decrypt fetched notifications:", decErr);
          processedData = data.map((n: any) => ({
            ...n,
            title: "Encrypted Notification",
            message: "Failed to load decryption keys.",
            _decryptionFailed: true
          }));
        }

        setNotifications((prev) => append ? [...prev, ...processedData] : processedData);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [session, getPrivateKey, decryptNotification, filterType]);

  useEffect(() => {
    if (open && session?.accessToken) {
      fetchNotifications(0, false);
    }
  }, [open, session, filterType, fetchNotifications]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isFetchingMore) {
          fetchNotifications(notifications.length, true);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [hasMore, isLoading, isFetchingMore, notifications.length, fetchNotifications]);

  // Setup WebSocket connection for live notifications
  useEffect(() => {
    if (!session?.accessToken) return;

    const wsUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const socket: Socket = io(`${wsUrl}/notifications`, {
      query: { token: session.accessToken },
      transports: ["websocket"],
    });

    socket.on("notification:created", async (newNotification: Notification) => {
      if (filterType !== "ALL" && newNotification.type !== filterType) return;
      
      const privKey = await getPrivateKey();
      const decrypted = await decryptNotification(newNotification, privKey);
      const targetDeviceId = (decrypted.metadata as any)?.targetDeviceId;
      if (targetDeviceId && targetDeviceId !== localStorage.getItem("runa_device_id")) {
        return;
      }
      setNotifications((prev) => [decrypted, ...prev]);
      toast.info(`New Notification: ${decrypted.title}`);
    });

    socket.on("notification:updated", async (updatedNotification: Notification) => {
      const privKey = await getPrivateKey();
      const decrypted = await decryptNotification(updatedNotification, privKey);
      setNotifications((prev) => prev.map((n) => (n.id === decrypted.id ? decrypted : n)));
    });

    socket.on("notification:deleted", ({ id }: { id: string }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    });

    socket.on("notifications:cleared", () => {
      setNotifications([]);
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.accessToken, getPrivateKey, decryptNotification, router, filterType]);

  const handleDismiss = async (id: string) => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ status: "READ" }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: "READ" as NotificationStatus } : n));
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
        headers: { Authorization: `Bearer ${session.accessToken}` },
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
        headers: { Authorization: `Bearer ${session.accessToken}` },
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

  const handleGenericStatusUpdate = async (id: string, status: "APPROVED" | "DENIED") => {
    if (!session?.accessToken) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: status as NotificationStatus } : n));
        toast.success(status === "APPROVED" ? "Request Approved" : "Request Denied");
      }
    } catch (err) {
      toast.error(`Failed to update request`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveDevice = async (id: string, requestPublicKey: string) => {
    if (!session?.accessToken || !session?.user?.username) return;
    const password = passwords[id];
    if (!password) {
      toast.error("Please enter your account password to authorize this device.");
      return;
    }

    setProcessingId(id);
    try {
      const masterCryptoKey = await deriveMasterKey(password, session.user.username);
      const exportedMasterBuffer = await window.crypto.subtle.exportKey("raw", masterCryptoKey);
      const masterKeyMaterial = btoa(String.fromCharCode(...new Uint8Array(exportedMasterBuffer)));
      const ownKeyPair = await generateKeyPair();
      const { ciphertext, iv } = await encryptMasterKeyForDevice(masterKeyMaterial, requestPublicKey, ownKeyPair.privateKey);
      const ownPublicKeyBase64 = await exportPublicKey(ownKeyPair.publicKey);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({
          notificationId: id,
          encryptedMasterKey: JSON.stringify({ ciphertext, iv, senderPublicKey: ownPublicKeyBase64 }),
        }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: "APPROVED" as NotificationStatus } : n));
        toast.success("Device authorized successfully!");
        setPasswords((prev) => { const next = { ...prev }; delete next[id]; return next; });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit authorization");
      }
    } catch (err: any) {
      toast.error(err.message || "Authorization failed. Check your password.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleAction = (n: Notification & { _decryptionFailed?: boolean }, actionType: "APPROVE" | "DENY") => {
    if (n.type === "INTERACTIVE") {
      if (actionType === "APPROVE") {
        handleApproveDevice(n.id, (n.metadata as any)?.publicKey || "");
      } else {
        handleGenericStatusUpdate(n.id, "DENIED");
      }
    } else if (n.type === "CONFIRMATION" || n.type === "PROMPT") {
      handleGenericStatusUpdate(n.id, actionType === "APPROVE" ? "APPROVED" : "DENIED");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border shadow-xl p-6 rounded-xl">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between w-full pr-8">
            <DialogTitle className="flex items-center gap-2 text-md font-bold text-foreground">
              <Bell className="size-4.5 text-primary" />
              Notifications
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="CONFIRMATION">Confirmation</SelectItem>
                  <SelectItem value="PROMPT">Prompt</SelectItem>
                  <SelectItem value="INTERACTIVE">Security</SelectItem>
                </SelectContent>
              </Select>

              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-8 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Stay updated with your latest alerts and requests.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-6 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Loading alerts...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-center">
            <div className="p-3.5 rounded-full bg-muted border text-muted-foreground">
              <Bell className="size-6" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">No notifications yet</span>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px] pr-2 py-2">
            <div className="space-y-3">
              {notifications.map((n) => {
                const isPending = n.status === "PENDING";
                const requiresInput = n.type === "INTERACTIVE" || n.type === "PROMPT";
                const isActionable = n.type !== "INFO" && isPending;

                return (
                  <div
                    key={n.id}
                    className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3 relative"
                  >
                    <div className="flex items-start justify-between gap-3 w-full min-w-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${
                          n._decryptionFailed ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                          n.type === "INTERACTIVE" ? 'bg-primary/10 border-primary/20 text-primary' :
                          n.type === "CONFIRMATION" ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {n._decryptionFailed ? <Lock className="size-4" /> :
                           n.type === "INTERACTIVE" ? <Smartphone className="size-4" /> :
                           <Bell className="size-4" />}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className={`text-xs font-bold wrap-break-word max-w-full ${n._decryptionFailed ? 'text-red-500' : 'text-foreground'}`}>
                              {n.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider shrink-0 ${
                                n.status === "PENDING" ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : n.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : n.status === "DENIED" ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {n.status}
                            </Badge>
                          </div>
                          <p className={`text-[11px] leading-normal break-words ${n._decryptionFailed ? 'text-red-400/80 italic' : 'text-muted-foreground'}`}>
                            {n.message}
                          </p>
                          <span className="text-[9px] text-muted-foreground/60 block">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {(!isActionable) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(n.id)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    {isActionable && !n._decryptionFailed && (
                      <div className="mt-1 border-t pt-3 space-y-3.5">
                        {requiresInput && (
                          <div className="space-y-1.5">
                            <Label htmlFor={`input-${n.id}`} className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                              {n.type === "INTERACTIVE" ? "Account Password" : "Input Required"}
                            </Label>
                            <Input
                              id={`input-${n.id}`}
                              type={n.type === "INTERACTIVE" ? "password" : "text"}
                              placeholder={n.type === "INTERACTIVE" ? "Enter password to authorize" : "Enter details..."}
                              value={passwords[n.id] || ""}
                              onChange={(e) => setPasswords((prev) => ({ ...prev, [n.id]: e.target.value }))}
                              className="h-8 px-2.5 text-xs rounded-md"
                            />
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(n, "DENY")}
                            disabled={processingId === n.id}
                            className="h-8 rounded-md px-3 text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs font-semibold"
                          >
                            <XCircle className="size-3.5 mr-1" /> Deny
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAction(n, "APPROVE")}
                            disabled={processingId === n.id || (requiresInput && !passwords[n.id])}
                            className="h-8 rounded-md px-4 bg-primary text-primary-foreground text-xs font-semibold"
                          >
                            {processingId === n.id ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <CheckCircle className="size-3.5 mr-1" />}
                            {n.type === "INTERACTIVE" ? "Authorize" : "Approve"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Infinite Scroll Trigger */}
              <div ref={observerTarget} className="h-4 w-full flex items-center justify-center py-4">
                {isFetchingMore && <Loader2 className="size-4 text-primary animate-spin" />}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
