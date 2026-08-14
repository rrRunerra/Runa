"use client";

import type React from "react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { RrConfirmDialog } from "@/components/rrComponents/rrConfirmDialog";
import { RrPillNav, type RrPillNavItem } from "@/components/rrComponents/rrPillNav";
import { cn } from "@/lib/utils";
import {
  RR_SETTINGS_API_ENDPOINTS,
  RR_SETTINGS_LIMITS,
  RR_SETTINGS_STORAGE_KEYS,
} from "@/lib/constants";
import { rrApps, type rrApp } from "@/config/rrApps";
import {
  PROVIDERS_METADATA,
  ConnectionCapability,
  type ConnectionMetadata,
} from "@runa/connections/metadata";

// Sub-components
import { RrConnectionCard } from "./rrConnectionsTabComponents/rrConnectionCard";
import {
  RrImportMediaDialog,
  IMPORTABLE_CAPABILITIES,
} from "./rrConnectionsTabComponents/rrImportMediaDialog";
import {
  RrFailedImportsDialog,
  type FailedImportItem,
} from "./rrConnectionsTabComponents/rrFailedImportsDialog";

/**
 * Model representation of an established connection returned from the backend.
 */
export interface Connection {
  id: string;
  provider: string;
  linkedUsername: string;
  connectionId: string | null;
  createdAt: string;
  expiresAt: string | null;
  private: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Polling import status payload from backend.
 */
export interface ImportStatus {
  status: "idle" | "processing" | "completed" | "failed";
  progress?: number;
  total?: number;
  currentActivity?: string;
  failedItems?: FailedImportItem[];
  error?: string;
}

/**
 * Props for RrConnectionsTab.
 */
export interface RrConnectionsTabProps {
  /** Callback to close the parent settings modal */
  onOpenChange: (open: boolean) => void;
  /** Optional callback to render controls inside the parent modal footer */
  setFooterContent?: (content: React.ReactNode | null) => void;
}

const PROVIDERS = PROVIDERS_METADATA;

/**
 * Main component managing third-party OAuth and list service connections.
 * Grouped into app sub-tabs (Aquila, Lynx, Polaris) with full vertical layout.
 */
export function RrConnectionsTab({
  onOpenChange,
  setFooterContent,
}: RrConnectionsTabProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [expandedMetadata, setExpandedMetadata] = useState<Record<string, boolean>>({});
  const [importStatus, setImportStatus] = useState<Record<string, ImportStatus>>({});
  const [showImportDialog, setShowImportDialog] = useState<string | null>(null);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([]);
  const [failedImports, setFailedImports] = useState<{
    providerId: string;
    items: FailedImportItem[];
  } | null>(null);

  // Disconnect Confirmation Dialog state
  const [disconnectProviderId, setDisconnectProviderId] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  // Refresh cooldown & timer state
  const [refreshCountdown, setRefreshCountdown] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);

  useEffect(() => {
    const lastRefresh = localStorage.getItem(
      RR_SETTINGS_STORAGE_KEYS.LAST_CONNECTIONS_REFRESH,
    );
    if (lastRefresh) {
      const parsedTime = parseInt(lastRefresh, 10);
      setLastRefreshTime(parsedTime);
      const elapsed = Date.now() - parsedTime;
      const remaining = Math.max(
        0,
        RR_SETTINGS_LIMITS.CONNECTIONS_REFRESH_COOLDOWN_SECONDS -
          Math.floor(elapsed / 1000),
      );
      if (remaining > 0) {
        setRefreshCountdown(remaining);
      }
    }
  }, []);

  useEffect(() => {
    if (refreshCountdown <= 0) return;
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshCountdown]);

  const pollingTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const initialCheckedRef = useRef<Record<string, boolean>>({});

  const clearPollTimer = useCallback((providerId: string) => {
    const key = providerId.toLowerCase();
    if (pollingTimersRef.current[key]) {
      clearTimeout(pollingTimersRef.current[key]);
      delete pollingTimersRef.current[key];
    }
  }, []);

  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    mutate: refetchConnections,
  } = useSWR<Connection[]>(
    session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.CONNECTIONS}`,
          session.accessToken,
        ]
      : null,
    fetcher,
  );

  const connections: Connection[] = Array.isArray(connectionsData)
    ? connectionsData
    : [];

  const getConnection = useCallback(
    (providerId: string): Connection | undefined =>
      connections.find(
        (c) => c.provider.toLowerCase() === providerId.toLowerCase(),
      ),
    [connections],
  );

  // Group providers by primary app
  const uniqueAppKeys = useMemo(
    () => Array.from(new Set(PROVIDERS.map((p) => p.primaryApp))),
    [],
  );

  const apps = useMemo(() => {
    return uniqueAppKeys.map((key) => {
      const configApp = rrApps.find(
        (a: rrApp) => a.name.toLowerCase() === key.toLowerCase(),
      );
      const appName =
        configApp?.name || key.charAt(0).toUpperCase() + key.slice(1);
      const appProviders = PROVIDERS.filter((p) => p.primaryApp === key);
      const connectedCount = appProviders.filter((p) => !!getConnection(p.id)).length;

      return {
        id: key.toLowerCase(),
        name: appName,
        providers: appProviders,
        connectedCount,
      };
    });
  }, [uniqueAppKeys, getConnection]);

  // Active app sub-tab
  const [activeAppId, setActiveAppId] = useState<string>(
    apps[0]?.id ?? "aquila",
  );

  const pollImportStatus = useCallback(
    async (providerId: string): Promise<void> => {
      if (!session?.accessToken) return;
      const key = providerId.toLowerCase();
      clearPollTimer(key);

      try {
        const data = (await fetcher([
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.CONNECTIONS_IMPORT_STATUS(
            key,
          )}`,
          session.accessToken,
        ])) as ImportStatus;

        setImportStatus((prev) => {
          const old = prev[key];
          if (old?.status === "processing") {
            if (data.status === "completed") {
              if (data.failedItems && data.failedItems.length > 0) {
                setFailedImports({ providerId, items: data.failedItems });
              } else {
                toast.success(
                  t("connections.importSuccess", {
                    provider: providerId.toUpperCase(),
                  }),
                );
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              }
            } else if (data.status === "failed") {
              toast.error(
                t("connections.importFailed", {
                  provider: providerId.toUpperCase(),
                  error: data.error || t("connections.unknownError"),
                }),
              );
            }
          }
          return {
            ...prev,
            [key]: data,
          };
        });

        if (data.status === "processing") {
          pollingTimersRef.current[key] = setTimeout(
            () => pollImportStatus(providerId),
            RR_SETTINGS_LIMITS.POLL_IMPORT_INTERVAL_MS,
          );
        }
      } catch (err) {
        console.error(err);
      }
    },
    [session, clearPollTimer, t],
  );

  const handleImport = async (
    providerId: string,
    mediaTypes: string[],
  ): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.CONNECTIONS_IMPORT_START(
          providerId,
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ mediaTypes }),
        },
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || t("connections.failedStartImport"));
      }
      toast.info(
        t("connections.importStarted", { provider: providerId.toUpperCase() }),
      );
      pollImportStatus(providerId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t("connections.failedStartImport"));
    }
  };

  const openImportDialog = (providerId: string): void => {
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return;
    const initialTypes = provider.capabilities
      .filter((cap) => cap in IMPORTABLE_CAPABILITIES)
      .map((cap) => IMPORTABLE_CAPABILITIES[cap].key);
    setSelectedMediaTypes(initialTypes);
    setShowImportDialog(providerId);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success(t("connections.connectedSuccess"));
      const newUrl = window.location.pathname + "?settings=connections";
      window.history.replaceState({}, document.title, newUrl);
    } else if (params.get("error")) {
      const err = params.get("error");
      toast.error(
        err === "oauth_failed"
          ? t("connections.authFailed")
          : t("connections.authError"),
      );
      const newUrl = window.location.pathname + "?settings=connections";
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [t]);

  useEffect(() => {
    if (!session?.accessToken || connectionsLoading || connections.length === 0)
      return;

    const importableProviders = ["anilist", "mal", "simkl", "trakt"];
    for (const conn of connections) {
      const providerId = conn.provider.toLowerCase();
      if (
        importableProviders.includes(providerId) &&
        !initialCheckedRef.current[providerId]
      ) {
        initialCheckedRef.current[providerId] = true;
        pollImportStatus(providerId);
      }
    }
  }, [session, connections, connectionsLoading, pollImportStatus]);

  useEffect(() => {
    return () => {
      Object.values(pollingTimersRef.current).forEach((timer) =>
        clearTimeout(timer),
      );
      pollingTimersRef.current = {};
    };
  }, []);

  const handleRefreshConnections = useCallback(async (): Promise<void> => {
    if (isRefreshing || refreshCountdown > 0) return;
    setIsRefreshing(true);
    try {
      await refetchConnections();
      const now = Date.now();
      localStorage.setItem(
        RR_SETTINGS_STORAGE_KEYS.LAST_CONNECTIONS_REFRESH,
        now.toString(),
      );
      setLastRefreshTime(now);
      setRefreshCountdown(
        RR_SETTINGS_LIMITS.CONNECTIONS_REFRESH_COOLDOWN_SECONDS,
      );
      toast.success(t("connections.refreshSuccess"));
    } catch (err: unknown) {
      console.error(err);
      toast.error(t("connections.unknownError"));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshCountdown, refetchConnections, t]);

  // Listen for OAuth completion from popup/new tab
  useEffect(() => {
    const handleAuthSuccess = (): void => {
      refetchConnections();
      toast.success(t("connections.connectedSuccess"));
      setIsActionLoading(null);
    };

    // 1. window.addEventListener("message")
    const onMessage = (event: MessageEvent): void => {
      if (event.data?.type === "RUNA_OAUTH_RESULT") {
        if (event.data.success) {
          handleAuthSuccess();
        } else if (event.data.error || event.data.message) {
          toast.error(event.data.message || event.data.error);
          setIsActionLoading(null);
        }
      }
    };
    window.addEventListener("message", onMessage);

    // 2. BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("runa_oauth_channel");
      channel.onmessage = (event: MessageEvent): void => {
        if (event.data?.type === "RUNA_OAUTH_RESULT") {
          if (event.data.success) {
            handleAuthSuccess();
          } else if (event.data.error || event.data.message) {
            toast.error(event.data.message || event.data.error);
            setIsActionLoading(null);
          }
        }
      };
    } catch (err) {
      console.error("BroadcastChannel error:", err);
    }

    // 3. Storage event
    const onStorage = (event: StorageEvent): void => {
      if (event.key === "runa_oauth_event" && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed.success) {
            handleAuthSuccess();
          }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    // 4. Focus event
    const onFocus = (): void => {
      refetchConnections();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      channel?.close();
    };
  }, [refetchConnections, t]);

  const handleConnect = (providerId: string): void => {
    if (!session?.accessToken) {
      toast.error(t("connections.mustBeLoggedIn"));
      return;
    }
    setIsActionLoading(providerId);
    const callbackUrl = `${window.location.origin}/connections/callback`;
    const redirectUrl = encodeURIComponent(callbackUrl);
    const connectUrl = `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.CONNECTIONS_CONNECT(
      providerId,
    )}?token=${session.accessToken}&redirectUrl=${redirectUrl}`;
    window.open(connectUrl, "_blank", "noopener,noreferrer");
    setIsActionLoading(null);
  };

  const handleConfirmDisconnect = async (): Promise<void> => {
    if (!disconnectProviderId || !session?.accessToken) return;
    setIsDisconnecting(true);
    setIsActionLoading(disconnectProviderId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.CONNECTIONS_DISCONNECT(
          disconnectProviderId,
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );
      if (!res.ok) {
        throw new Error(t("connections.failedDisconnect"));
      }

      refetchConnections();
      toast.success(
        t("connections.disconnectSuccess", {
          provider: disconnectProviderId.toUpperCase(),
        }),
      );
      setDisconnectProviderId(null);
    } catch (err) {
      console.error(err);
      toast.error(t("connections.failedDisconnect"));
    } finally {
      setIsActionLoading(null);
      setIsDisconnecting(false);
    }
  };

  const handleTogglePrivate = async (
    providerId: string,
    currentPrivate: boolean,
  ): Promise<void> => {
    if (!session?.accessToken) return;
    setIsActionLoading(providerId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.CONNECTIONS_SAVE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            provider: providerId.toUpperCase(),
            private: !currentPrivate,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(t("connections.failedUpdatePrivacy"));
      }
      const updated = (await res.json()) as Connection;

      refetchConnections();
      toast.success(
        t("connections.privacyUpdated", {
          status: updated.private
            ? t("connections.private")
            : t("connections.public"),
        }),
      );
    } catch (err) {
      console.error(err);
      toast.error(t("connections.failedUpdatePrivacy"));
    } finally {
      setIsActionLoading(null);
    }
  };

  const toggleMetadata = (providerId: string): void => {
    setExpandedMetadata((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  // Register parent modal footer content
  useEffect(() => {
    if (!setFooterContent) return;

    setFooterContent(
      <div className="flex items-center justify-between w-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefreshConnections}
          disabled={isRefreshing || refreshCountdown > 0}
          className="gap-2 text-xs rounded-xl cursor-pointer"
        >
          {isRefreshing ? (
            <Spinner className="size-3.5" />
          ) : (
            <RefreshCw
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
          )}
          <span>
            {refreshCountdown > 0
              ? `${t("connections.refreshBtn")} (${refreshCountdown}s)`
              : t("connections.refreshBtn")}
          </span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="text-xs h-9 px-5 rounded-xl cursor-pointer"
        >
          {t("connections.closeSettingsBtn")}
        </Button>
      </div>,
    );

    return () => setFooterContent(null);
  }, [
    setFooterContent,
    onOpenChange,
    handleRefreshConnections,
    isRefreshing,
    refreshCountdown,
    t,
  ]);

  const navItems: RrPillNavItem<string>[] = useMemo(() => {
    return apps.map((app) => ({
      id: app.id,
      label: app.name,
      badge:
        app.connectedCount > 0 ? (
          <Badge
            variant="secondary"
            className="ml-1 px-1.5 py-0 text-[10px] h-4 font-mono font-bold"
          >
            {app.connectedCount}
          </Badge>
        ) : undefined,
    }));
  }, [apps]);

  const activeApp = useMemo(
    () => apps.find((a) => a.id === activeAppId) ?? apps[0],
    [apps, activeAppId],
  );

  const activeAppProviders: ConnectionMetadata[] = activeApp?.providers ?? [];
  const selectedImportProvider = showImportDialog
    ? PROVIDERS.find((p) => p.id === showImportDialog)
    : undefined;

  if (connectionsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 min-h-0 h-full">
        <Spinner className="size-8 text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse">
          {t("connections.fetchingStatus")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 h-full text-left">
      {/* App Sub-Navigation Pills (anchored to the right) */}
      <div className="flex items-center justify-end w-full shrink-0">
        <RrPillNav
          items={navItems}
          activeId={activeApp?.id ?? activeAppId}
          onChange={(id) => setActiveAppId(id)}
          layoutId="connectionsAppNav"
        />
      </div>

      {/* Main Connections Card taking all remaining vertical space */}
      <Card className="flex-1 flex flex-col min-h-0 h-full border border-border bg-card shadow-xs">
        <CardContent className="p-4 flex-1 overflow-y-auto min-h-0 scrollbar-thin flex flex-col gap-3">
          {activeAppProviders.map((provider) => {
            const conn = getConnection(provider.id);
            return (
              <RrConnectionCard
                key={provider.id}
                provider={provider}
                conn={conn}
                loading={isActionLoading === provider.id}
                importStatus={importStatus[provider.id.toLowerCase()]}
                expandedMetadata={!!expandedMetadata[provider.id]}
                toggleMetadata={() => toggleMetadata(provider.id)}
                handleTogglePrivate={() =>
                  handleTogglePrivate(provider.id, conn?.private ?? false)
                }
                openImportDialog={() => openImportDialog(provider.id)}
                handleDisconnect={() => setDisconnectProviderId(provider.id)}
                handleConnect={() => handleConnect(provider.id)}
              />
            );
          })}
        </CardContent>
      </Card>

      {/* Import Media Dialog */}
      <RrImportMediaDialog
        providerId={showImportDialog}
        provider={selectedImportProvider}
        selectedMediaTypes={selectedMediaTypes}
        onToggleMediaType={(key) => {
          setSelectedMediaTypes((prev) =>
            prev.includes(key)
              ? prev.filter((k) => k !== key)
              : [...prev, key],
          );
        }}
        onStartImport={() => {
          if (showImportDialog) {
            handleImport(showImportDialog, selectedMediaTypes);
            setShowImportDialog(null);
          }
        }}
        onClose={() => setShowImportDialog(null)}
      />

      {/* Failed Items Dialog */}
      <RrFailedImportsDialog
        failedImports={failedImports}
        onClose={() => {
          setFailedImports(null);
          window.location.reload();
        }}
      />

      {/* Disconnect Provider Confirmation Dialog */}
      <RrConfirmDialog
        open={!!disconnectProviderId}
        onOpenChange={(open: boolean) => {
          if (!open) setDisconnectProviderId(null);
        }}
        title={t("connections.disconnectConfirmTitle")}
        description={
          disconnectProviderId
            ? t("connections.disconnectConfirm", {
                provider: disconnectProviderId.toUpperCase(),
              })
            : ""
        }
        confirmText={t("connections.disconnectBtn")}
        variant="destructive"
        isSubmitting={isDisconnecting}
        onConfirm={handleConfirmDisconnect}
      />
    </div>
  );
}
