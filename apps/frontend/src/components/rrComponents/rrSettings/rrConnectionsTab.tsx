"use client";

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

// Sub-components
import { RrConnectionCard } from "./rrConnectionsTabComponents/rrConnectionCard";

type Connection = {
  id: string;
  provider: string;
  linkedUsername: string;
  connectionId: string | null;
  createdAt: string;
  expiresAt: string | null;
  private: boolean;
  metadata?: any;
};

import { rrApps } from "../../../../config/rrApps";
import {
  PROVIDERS_METADATA,
  ConnectionCapability,
} from "@runa/connections/metadata";

const PROVIDERS = PROVIDERS_METADATA;

const IMPORTABLE_CAPABILITIES: Record<string, { label: string; key: string }> =
  {
    [ConnectionCapability.ANIME]: { label: "Anime List", key: "anime" },
    [ConnectionCapability.MANGA]: { label: "Manga List", key: "manga" },
    [ConnectionCapability.MOVIES]: { label: "Movies List", key: "movie" },
    [ConnectionCapability.TV_SHOWS]: { label: "TV Shows List", key: "tv" },
  };

type ImportStatus = {
  status: "idle" | "processing" | "completed" | "failed";
  progress?: number;
  total?: number;
  currentActivity?: string;
  failedItems?: any[];
  error?: string;
};

interface RrConnectionsTabProps {
  onOpenChange: (open: boolean) => void;
}

export function RrConnectionsTab({
  onOpenChange,
}: RrConnectionsTabProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [expandedMetadata, setExpandedMetadata] = useState<
    Record<string, boolean>
  >({});
  const [importStatus, setImportStatus] = useState<
    Record<string, ImportStatus>
  >({});
  const [showImportDialog, setShowImportDialog] = useState<string | null>(null);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([]);
  const [failedImports, setFailedImports] = useState<{
    providerId: string;
    items: any[];
  } | null>(null);

  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    mutate: refetchConnections,
  } = useSWR<Connection[]>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/connections`, session.accessToken]
      : null,
    fetcher,
  );

  const pollImportStatus = useCallback(
    async (providerId: string): Promise<void> => {
      if (!session?.accessToken) return;
      try {
        const data = (await fetcher([
          `${process.env.NEXT_PUBLIC_API_URL}/connections/${providerId.toLowerCase()}/import/status`,
          session.accessToken,
        ])) as ImportStatus;

        setImportStatus((prev) => {
          const old = prev[providerId.toLowerCase()];
          if (old?.status === "processing") {
            if (data.status === "completed") {
              if (data.failedItems && data.failedItems.length > 0) {
                setFailedImports({ providerId, items: data.failedItems });
              } else {
                toast.success(
                  t("connections.importSuccess", { provider: providerId.toUpperCase() }),
                );
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              }
            } else if (data.status === "failed") {
              toast.error(
                t("connections.importFailed", { provider: providerId.toUpperCase(), error: data.error || t("connections.unknownError") }),
              );
            }
          }
          return {
            ...prev,
            [providerId.toLowerCase()]: data,
          };
        });

        if (data.status === "processing") {
          setTimeout(() => pollImportStatus(providerId), 5000);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [session, setFailedImports, t],
  );

  const handleImport = async (
    providerId: string,
    mediaTypes: string[],
  ): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/connections/${providerId.toLowerCase()}/import`,
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
      toast.info(t("connections.importStarted", { provider: providerId.toUpperCase() }));
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

  const connections: Connection[] = Array.isArray(connectionsData)
    ? connectionsData
    : [];

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
      if (importableProviders.includes(providerId)) {
        pollImportStatus(providerId);
      }
    }
  }, [session, connections, connectionsLoading, pollImportStatus]);

  const fetchConnections = useCallback((): void => {
    refetchConnections();
  }, [refetchConnections]);

  const handleConnect = (providerId: string): void => {
    if (!session?.accessToken) {
      toast.error(t("connections.mustBeLoggedIn"));
      return;
    }
    setIsActionLoading(providerId);
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/connections/${providerId.toLowerCase()}/connect?token=${session.accessToken}&redirectUrl=${redirectUrl}`;
  };

  const handleDisconnect = async (providerId: string): Promise<void> => {
    if (
      !confirm(
        t("connections.disconnectConfirm", { provider: providerId.toUpperCase() }),
      )
    ) {
      return;
    }

    setIsActionLoading(providerId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/connections/remove/${providerId.toLowerCase()}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        },
      );
      if (!res.ok) {
        throw new Error(t("connections.failedDisconnect"));
      }

      refetchConnections();
      toast.success(t("connections.disconnectSuccess", { provider: providerId.toUpperCase() }));
    } catch (err) {
      console.error(err);
      toast.error(t("connections.failedDisconnect"));
    } finally {
      setIsActionLoading(null);
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
        `${process.env.NEXT_PUBLIC_API_URL}/connections/save`,
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
          status: updated.private ? t("connections.private") : t("connections.public"),
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

  if (connectionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Spinner className="size-8 text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse">
          {t("connections.fetchingStatus")}
        </p>
      </div>
    );
  }

  const getConnection = (providerId: string): Connection | undefined =>
    connections.find(
      (c) => c.provider.toLowerCase() === providerId.toLowerCase(),
    );

  const uniqueAppKeys = Array.from(new Set(PROVIDERS.map((p) => p.primaryApp)));

  const apps = uniqueAppKeys.map((key) => {
    const configApp = rrApps.find(
      (a) => a.name.toLowerCase() === key.toLowerCase(),
    );
    const appName = configApp?.name || key.charAt(0).toUpperCase() + key.slice(1);
    return {
      name: appName,
      description: t("connections.integrationsFor", { app: appName }),
      providers: PROVIDERS.filter((p) => p.primaryApp === key),
    };
  });

  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h3 className="text-sm font-semibold text-foreground">
            {t("connections.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("connections.description")}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={fetchConnections}
          className="rounded-lg hover:bg-muted"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-6 p-2">
        {apps.map(
          (app): React.JSX.Element => (
            <Card key={app.name}>
              <CardHeader className="border-b border-border/40 pb-3 text-left">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
                  {app.name}
                </CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                  {app.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-4 pt-4">
                {app.providers.map((provider): React.JSX.Element => {
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
                      handleDisconnect={() => handleDisconnect(provider.id)}
                      handleConnect={() => handleConnect(provider.id)}
                    />
                  );
                })}
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {/* Done Closing button */}
      <div className="flex justify-end pt-4 border-t border-border mt-6">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="text-xs sm:text-sm h-9 px-5 rounded-xl cursor-pointer"
        >
          {t("connections.closeSettingsBtn")}
        </Button>
      </div>

      <Dialog
        open={!!showImportDialog}
        onOpenChange={(open) => {
          if (!open) setShowImportDialog(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {t("connections.selectImportTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <p className="text-xs text-muted-foreground">
              {t("connections.selectImportDesc", { provider: showImportDialog?.toUpperCase() })}
            </p>
            <div className="flex flex-col gap-3">
              {PROVIDERS.find((p) => p.id === showImportDialog)
                ?.capabilities.filter((cap) => cap in IMPORTABLE_CAPABILITIES)
                .map((cap) => {
                  const { key } = IMPORTABLE_CAPABILITIES[cap];
                  const isChecked = selectedMediaTypes.includes(key);
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/15 hover:bg-secondary/25 transition-all"
                    >
                      <Checkbox
                        id={`media-type-${key}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMediaTypes((prev) => [...prev, key]);
                          } else {
                            setSelectedMediaTypes((prev) =>
                              prev.filter((k) => k !== key),
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={`media-type-${key}`}
                        className="text-xs font-semibold text-foreground select-none cursor-pointer flex-1"
                      >
                        {t(`mediaTypes.${key}`)}
                      </label>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(null)}
              className="rounded-lg h-9 text-xs"
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              disabled={selectedMediaTypes.length === 0}
              onClick={() => {
                if (showImportDialog) {
                  handleImport(showImportDialog, selectedMediaTypes);
                  setShowImportDialog(null);
                }
              }}
              className="rounded-lg h-9 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/95"
            >
              {t("connections.startImportBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!failedImports}
        onOpenChange={(open) => {
          if (!open) setFailedImports(null);
        }}
      >
        <DialogContent className="max-w-3xl sm:max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[80vh] flex! flex-col text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full bg-warning animate-pulse" />
              {t("connections.failedItemsTitle", { count: failedImports?.items.length })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 pr-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("connections.failedItemsDesc", { provider: failedImports?.providerId.toUpperCase() })}
            </p>
            <div className="border border-border rounded-xl overflow-hidden bg-muted/10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-secondary/25 border-b border-border text-muted-foreground font-semibold">
                    <th className="p-3">{t("connections.tableTitle")}</th>
                    <th className="p-3 w-20">{t("connections.tableType")}</th>
                    <th className="p-3 w-24">{t("connections.tableId")}</th>
                    <th className="p-3">{t("connections.tableReason")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {failedImports?.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-secondary/10 transition-colors"
                    >
                      <td
                        className="p-3 font-medium text-foreground max-w-[280px] truncate"
                        title={item.title}
                      >
                        {item.title}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] px-1.5 py-0 font-medium"
                        >
                          {t(`mediaTypes.${item.mediaType}`)}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-muted-foreground">
                        {item.providerId}
                      </td>
                      <td
                        className="p-3 text-warning font-medium max-w-[280px] truncate"
                        title={item.reason}
                      >
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-end pt-3 border-t border-border">
            <Button
              size="sm"
              onClick={() => {
                setFailedImports(null);
                window.location.reload();
              }}
              className="rounded-lg h-9 text-xs font-semibold px-4"
            >
              {t("connections.closeBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
