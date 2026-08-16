"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import {
  Bell,
  CheckCircle,
  XCircle,
  Smartphone,
  Loader2,
  Trash2,
  Lock,
  Menu,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
import { Notification, NotificationStatus } from "@runa/notifications";
import {
  deriveMasterKey,
  encryptMasterKeyForDevice,
  exportPublicKey,
  generateKeyPair,
  hybridEncryptMasterKeyForDevice,
  base64UrlToBuffer,
} from "@runa/crypto/browser";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface NotificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
}

const PAGE_SIZE = 10;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface NotificationIconProps {
  type: string;
  decryptionFailed?: boolean;
}

function NotificationIcon({
  type,
  decryptionFailed,
}: NotificationIconProps): React.JSX.Element {
  const iconClass = cn(
    "p-2 rounded-lg border shrink-0 mt-0.5",
    decryptionFailed
      ? "bg-destructive/10 border-destructive/20 text-destructive"
      : type === "INTERACTIVE"
        ? "bg-primary/10 border-primary/20 text-primary"
        : type === "CONFIRMATION"
          ? "bg-primary/10 border-primary/20 text-primary"
          : "bg-muted text-muted-foreground",
  );

  return (
    <div className={iconClass}>
      {decryptionFailed ? (
        <Lock className="size-4" />
      ) : type === "INTERACTIVE" ? (
        <Smartphone className="size-4" />
      ) : (
        <Bell className="size-4" />
      )}
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  const badgeClass = cn(
    "text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider shrink-0",
    status === "PENDING"
      ? "bg-warning/10 text-warning border-warning/20"
      : status === "APPROVED"
        ? "bg-success/10 text-success border-success/20"
        : status === "DENIED"
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-muted text-muted-foreground",
  );

  return (
    <Badge variant="outline" className={badgeClass}>
      {status}
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RrNotificationsModal({
  open,
  onOpenChange,
  onUnreadCountChange,
}: NotificationsModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { getPrivateKey, unwrapKey, decrypt } = useRRCrypto();

  const [notifications, setNotifications] = useState<
    (Notification & { _decryptionFailed?: boolean })[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(
    (n) => n.status === "PENDING",
  ).length;

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  const decryptNotification = useCallback(
    async (n: any, privKey: CryptoKey | null): Promise<any> => {
      const meta = n.metadata as any;
      const isEncrypted = !!(meta && meta.encryptedKey);

      if (!isEncrypted) return n;

      if (!privKey) {
        return {
          ...n,
          title: t("encryptedNotification"),
          message: t("encryptedNotificationDesc"),
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
          title: t("encryptedNotification"),
          message: t("encryptedNotificationDesc"),
          _decryptionFailed: true,
        };
      }
    },
    [t],
  );

  const fetchNotifications = useCallback(
    async (skip = 0, append = false) => {
      if (!session?.accessToken) return;

      if (skip === 0) setIsLoading(true);
      else setIsFetchingMore(true);

      try {
        const query = new URLSearchParams({
          take: PAGE_SIZE.toString(),
          skip: skip.toString(),
        });
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

          setHasMore(data.length >= PAGE_SIZE);

          let processedData = [];
          try {
            const privKey = await getPrivateKey();
            processedData = await Promise.all(
              data.map((n: any) => decryptNotification(n, privKey)),
            );

            // Filter out device requests not intended for this device
            processedData = processedData.filter((n: any) => {
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
            processedData = data.map((n: any) => ({
              ...n,
              title: t("encryptedNotification"),
              message: t("failedLoadDecryptionKeys"),
              _decryptionFailed: true,
            }));
          }

          setNotifications((prev) =>
            append ? [...prev, ...processedData] : processedData,
          );
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [session, getPrivateKey, decryptNotification, filterType, t],
  );

  useEffect(() => {
    if (open && session?.accessToken) {
      fetchNotifications(0, false);
    }
  }, [open, session, filterType, fetchNotifications]);

  useEffect(() => {
    const el = observerTarget.current;
    if (!el) return;

    const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      if (!node) return null;
      let parent = node.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;
        const isScrollable =
          (overflowY === "auto" || overflowY === "scroll") &&
          parent.scrollHeight > parent.clientHeight;

        if (isScrollable) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    };

    const scrollParent = getScrollParent(el);

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoading &&
          !isFetchingMore
        ) {
          fetchNotifications(notifications.length, true);
        }
      },
      {
        root: scrollParent,
        threshold: 0.1,
        rootMargin: "100px",
      },
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
    };
  }, [
    hasMore,
    isLoading,
    isFetchingMore,
    notifications.length,
    fetchNotifications,
  ]);

  // Listen to live notification events dispatched by the global RrWebSocketProvider
  useEffect(() => {
    const handleCreated = (e: Event) => {
      const customEvent = e as CustomEvent<
        Notification & { _decryptionFailed?: boolean }
      >;
      if (!customEvent.detail) return;
      const newNotification = customEvent.detail;
      if (filterType !== "ALL" && newNotification.type !== filterType) return;
      const targetDeviceId = (newNotification.metadata as any)?.targetDeviceId;
      if (
        targetDeviceId &&
        targetDeviceId !== localStorage.getItem("runa_device_id")
      ) {
        return;
      }
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotification.id)) return prev;
        return [newNotification, ...prev];
      });
    };

    const handleUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<
        Notification & { _decryptionFailed?: boolean }
      >;
      if (!customEvent.detail) return;
      const updatedNotification = customEvent.detail;
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === updatedNotification.id ? updatedNotification : n,
        ),
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

    window.addEventListener("runa-notification-created", handleCreated);
    window.addEventListener("runa-notification-updated", handleUpdated);
    window.addEventListener("runa-notification-deleted", handleDelete);
    window.addEventListener("runa-notifications-cleared", handleCleared);

    return () => {
      window.removeEventListener("runa-notification-created", handleCreated);
      window.removeEventListener("runa-notification-updated", handleUpdated);
      window.removeEventListener("runa-notification-deleted", handleDelete);
      window.removeEventListener("runa-notifications-cleared", handleCleared);
    };
  }, [filterType]);

  const handleDismiss = async (id: string) => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ status: "READ" }),
        },
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, status: "READ" as NotificationStatus } : n,
          ),
        );
        window.dispatchEvent(
          new CustomEvent("runa-notification-updated", {
            detail: { id, status: "READ" },
          }),
        );
        toast.success(t("notificationDismissed"));
      }
    } catch {
      toast.error(t("failedDismissNotification"));
    }
  };

  const handleMarkAllRead = async () => {
    if (!session?.accessToken) return;
    const pendingNotifs = notifications.filter((n) => n.status === "PENDING");
    if (pendingNotifs.length === 0) return;

    try {
      await Promise.all(
        pendingNotifs.map(async (n) => {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/notifications/${n.id}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.accessToken}`,
              },
              body: JSON.stringify({ status: "READ" }),
            },
          );
        }),
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n.status === "PENDING"
            ? { ...n, status: "READ" as NotificationStatus }
            : n,
        ),
      );
      pendingNotifs.forEach((n) => {
        window.dispatchEvent(
          new CustomEvent("runa-notification-updated", {
            detail: { id: n.id, status: "READ" },
          }),
        );
      });
      toast.success(t("allNotificationsRead"));
    } catch {
      toast.error(t("failedMarkNotificationsRead"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        window.dispatchEvent(
          new CustomEvent("runa-notification-deleted", { detail: { id } }),
        );
        toast.success(t("notificationDeleted"));
      } else {
        throw new Error("Failed to delete");
      }
    } catch {
      toast.error(t("failedDeleteNotification"));
    }
  };

  const handleClearAll = async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      if (res.ok) {
        setNotifications([]);
        window.dispatchEvent(new CustomEvent("runa-notifications-cleared"));
        toast.success(t("allNotificationsCleared"));
      } else {
        throw new Error("Failed to clear");
      }
    } catch {
      toast.error(t("failedClearNotifications"));
    }
  };

  const handleGenericStatusUpdate = async (
    id: string,
    status: "APPROVED" | "DENIED",
  ) => {
    if (!session?.accessToken) {
      toast.error("No active session found");
      return;
    }
    setProcessingId(id);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ status }),
        },
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, status: status as NotificationStatus } : n,
          ),
        );
        toast.success(
          status === "APPROVED" ? t("requestApproved") : t("requestDenied"),
        );
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.message || t("failedUpdateRequest"));
      }
    } catch {
      toast.error(t("failedUpdateRequest"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveDevice = async (
    id: string,
    requestPublicKey: string,
    requestMlKemPublicKey?: string | null,
  ) => {
    if (!session?.accessToken) {
      toast.error("No active session token found");
      return;
    }
    if (!session?.user?.username) {
      toast.error("Username missing from session");
      return;
    }
    const password = passwords[id];
    if (!password) {
      toast.error(t("enterPasswordAuthorizeDevice"));
      return;
    }

    setProcessingId(id);
    try {
      const masterCryptoKey = await deriveMasterKey(
        password,
        session.user?.username || "",
      );
      const exportedMasterBuffer = await window.crypto.subtle.exportKey(
        "raw",
        masterCryptoKey,
      );
      const masterKeyMaterial = btoa(
        String.fromCharCode(...new Uint8Array(exportedMasterBuffer)),
      );
      const ownKeyPair = await generateKeyPair();
      const ownPublicKeyBase64 = await exportPublicKey(ownKeyPair.publicKey);

      let encryptedMasterKeyPayload: any;

      if (requestMlKemPublicKey) {
        const targetDeviceMlKemPublicKeyBytes = new Uint8Array(
          base64UrlToBuffer(requestMlKemPublicKey),
        );
        const { ciphertext, iv, mlkemCiphertext } =
          await hybridEncryptMasterKeyForDevice(
            masterKeyMaterial,
            requestPublicKey,
            targetDeviceMlKemPublicKeyBytes,
            ownKeyPair.privateKey,
          );
        encryptedMasterKeyPayload = {
          ciphertext,
          iv,
          mlkemCiphertext,
          senderPublicKey: ownPublicKeyBase64,
        };
      } else {
        const { ciphertext, iv } = await encryptMasterKeyForDevice(
          masterKeyMaterial,
          requestPublicKey,
          ownKeyPair.privateKey,
        );
        encryptedMasterKeyPayload = {
          ciphertext,
          iv,
          senderPublicKey: ownPublicKeyBase64,
        };
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            notificationId: id,
            encryptedMasterKey: JSON.stringify(encryptedMasterKeyPayload),
          }),
        },
      );

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, status: "APPROVED" as NotificationStatus }
              : n,
          ),
        );
        toast.success(t("deviceAuthorizedSuccess"));
        setPasswords((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || t("failedSubmitAuthorization"));
      }
    } catch (err: any) {
      toast.error(err.message || t("authFailedCheckPassword"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleAction = (
    n: Notification & { _decryptionFailed?: boolean },
    actionType: "APPROVE" | "DENY",
  ) => {
    if (n.type === "INTERACTIVE") {
      if (actionType === "APPROVE") {
        handleApproveDevice(
          n.id,
          (n.metadata as any)?.publicKey || "",
          (n.metadata as any)?.mlKemPublicKey || null,
        );
      } else {
        handleGenericStatusUpdate(n.id, "DENIED");
      }
    } else if (n.type === "CONFIRMATION" || n.type === "PROMPT") {
      handleGenericStatusUpdate(
        n.id,
        actionType === "APPROVE" ? "APPROVED" : "DENIED",
      );
    }
  };

  const handleNotificationClick = async (
    n: Notification & { _decryptionFailed?: boolean },
  ) => {
    const meta = n.metadata as any;
    if (meta && meta.type === "email" && meta.emailMessageId) {
      if (n.status === "PENDING") {
        handleDismiss(n.id);
      }
      onOpenChange(false);
      const accountId = meta.emailAccountId || "unified";
      const folder = meta.emailFolder || "inbox";
      router.push(
        `/pegasus/account/${accountId}/${folder}?messageId=${meta.emailMessageId}`,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border shadow-xl p-6 rounded-xl">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between w-full pr-8">
            <DialogTitle className="flex items-center gap-2 text-md font-bold text-foreground">
              <Bell className="size-4.5 text-primary" />
              {t("notifications")}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-30 text-xs">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                  <SelectItem value="INFO">{t("info")}</SelectItem>
                  <SelectItem value="CONFIRMATION">
                    {t("confirmation")}
                  </SelectItem>
                  <SelectItem value="PROMPT">{t("prompt")}</SelectItem>
                  <SelectItem value="INTERACTIVE">{t("security")}</SelectItem>
                </SelectContent>
              </Select>

              {notifications.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    >
                      <Menu className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {unreadCount > 0 && (
                      <DropdownMenuItem
                        onClick={handleMarkAllRead}
                        className="cursor-pointer text-xs font-semibold"
                      >
                        {t("markAllRead")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={handleClearAll}
                      className="cursor-pointer text-xs font-semibold text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      {t("clearAll")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {t("notificationsDesc")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-6 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">
              {t("loadingAlerts")}
            </span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2.5 text-center">
            <div className="p-3.5 rounded-full bg-muted border text-muted-foreground">
              <Bell className="size-6" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {t("noNotificationsYet")}
            </span>
          </div>
        ) : (
          <ScrollArea className="max-h-125 pr-2 py-2">
            <div className="flex flex-col gap-3">
              {notifications.map((n) => {
                const isPending = n.status === "PENDING";
                const requiresInput =
                  n.type === "INTERACTIVE" || n.type === "PROMPT";
                const isActionable = n.type !== "INFO" && isPending;
                const isEmailNotif =
                  n.metadata &&
                  (n.metadata as any).type === "email" &&
                  (n.metadata as any).emailMessageId;

                return (
                  <div
                    key={n.id}
                    className={cn(
                      "p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3 relative",
                      isEmailNotif &&
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                    )}
                    onClick={() => {
                      if (isEmailNotif) {
                        handleNotificationClick(n);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 w-full min-w-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <NotificationIcon
                          type={n.type}
                          decryptionFailed={n._decryptionFailed}
                        />
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span
                              className={cn(
                                "text-xs font-bold wrap-break-word max-w-full",
                                n._decryptionFailed
                                  ? "text-destructive"
                                  : "text-foreground",
                              )}
                            >
                              {n.title}
                            </span>
                            <StatusBadge status={n.status} />
                          </div>
                          <p
                            className={cn(
                              "text-[11px] leading-normal wrap-break-word",
                              n._decryptionFailed
                                ? "text-destructive/80 italic"
                                : "text-muted-foreground",
                            )}
                          >
                            {n.message}
                          </p>
                          <span className="text-[9px] text-muted-foreground/60 block">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {!isActionable && (
                        <div className="flex items-center gap-1 shrink-0">
                          {isPending && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss(n.id);
                              }}
                              className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer shrink-0 transition-colors"
                              title="Mark as read"
                            >
                              <CheckCircle className="size-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(n.id);
                            }}
                            className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0 transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {isActionable && !n._decryptionFailed && (
                      <div className="mt-1 border-t pt-3 flex flex-col gap-3.5">
                        {requiresInput && (
                          <div className="flex flex-col gap-1.5">
                            <Label
                              htmlFor={`input-${n.id}`}
                              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide"
                            >
                              {n.type === "INTERACTIVE"
                                ? t("accountPassword")
                                : t("inputRequired")}
                            </Label>
                            <Input
                              id={`input-${n.id}`}
                              type={
                                n.type === "INTERACTIVE" ? "password" : "text"
                              }
                              placeholder={
                                n.type === "INTERACTIVE"
                                  ? t("enterPasswordAuthorize")
                                  : t("enterDetails")
                              }
                              value={passwords[n.id] || ""}
                              onChange={(e) =>
                                setPasswords((prev) => ({
                                  ...prev,
                                  [n.id]: e.target.value,
                                }))
                              }
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
                            className="h-8 rounded-md px-3 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold"
                          >
                            <XCircle className="size-3.5 mr-1" /> {t("deny")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAction(n, "APPROVE")}
                            disabled={
                              processingId === n.id ||
                              (requiresInput && !passwords[n.id])
                            }
                            className="h-8 rounded-md px-4 bg-primary text-primary-foreground text-xs font-semibold"
                          >
                            {processingId === n.id ? (
                              <Loader2 className="size-3.5 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="size-3.5 mr-1" />
                            )}
                            {n.type === "INTERACTIVE"
                              ? t("authorize")
                              : t("approve")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Infinite Scroll Trigger */}
              <div
                ref={observerTarget}
                className="h-4 w-full flex items-center justify-center py-4"
              >
                {isFetchingMore && (
                  <Loader2 className="size-4 text-primary animate-spin" />
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
