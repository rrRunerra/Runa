"use client";

import type React from "react";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useFetch } from "@/hooks/useFetch";
import {
  LinkIcon,
  Unlink,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

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

import { apps as registeredApps } from "../../../../config/apps";
import { PROVIDERS_METADATA, ConnectionCapability } from "@runa/connections/metadata";

const PROVIDERS = PROVIDERS_METADATA;

const IMPORTABLE_CAPABILITIES: Record<string, { label: string; key: string }> = {
  [ConnectionCapability.ANIME]: { label: "Anime List", key: "anime" },
  [ConnectionCapability.MANGA]: { label: "Manga List", key: "manga" },
  [ConnectionCapability.MOVIES]: { label: "Movies List", key: "movie" },
  [ConnectionCapability.TV_SHOWS]: { label: "TV Shows List", key: "tv" },
};

interface RrConnectionsTabProps {
  onOpenChange: (open: boolean) => void;
}

export function RrConnectionsTab({ onOpenChange }: RrConnectionsTabProps): React.JSX.Element {
  const { data: session } = useSession();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [expandedMetadata, setExpandedMetadata] = useState<Record<string, boolean>>({});
  const [importStatus, setImportStatus] = useState<Record<string, { total: number; processed: number; status: 'processing' | 'completed' | 'failed'; error?: string; failedItems?: any[] }>>({});
  const [showImportDialog, setShowImportDialog] = useState<string | null>(null);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([]);
  const [failedImports, setFailedImports] = useState<{ providerId: string; items: any[] } | null>(null);

  const pollImportStatus = useCallback(async (providerId: string): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/connections/${providerId.toLowerCase()}/import/status`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch import status");
      const data = await res.json();
      
      setImportStatus((prev) => {
        const old = prev[providerId.toLowerCase()];
        if (old?.status === "processing") {
          if (data.status === "completed") {
            if (data.failedItems && data.failedItems.length > 0) {
              setFailedImports({ providerId, items: data.failedItems });
            } else {
              toast.success(`Import from ${providerId.toUpperCase()} completed successfully!`);
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }
          } else if (data.status === "failed") {
            toast.error(`Import from ${providerId.toUpperCase()} failed: ${data.error || "Unknown error"}`);
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
  }, [session, setFailedImports]);

  const handleImport = async (providerId: string, mediaTypes: string[]): Promise<void> => {
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
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to start import");
      }
      toast.info(`Import started for ${providerId.toUpperCase()}...`);
      pollImportStatus(providerId);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to start list import.");
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

  const { data: connectionsData, loading: connectionsLoading, refetch: refetchConnections } = useFetch<Connection[]>(
    session?.accessToken ? `${process.env.NEXT_PUBLIC_API_URL}/connections` : "",
    {
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
      enabled: !!session?.accessToken,
    }
  );

  useEffect(() => {
    if (connectionsData) {
      setConnections(Array.isArray(connectionsData) ? connectionsData : []);
    }
  }, [connectionsData]);

  useEffect(() => {
    setIsLoading(connectionsLoading);
  }, [connectionsLoading]);

  const fetchConnections = useCallback((): void => {
    refetchConnections();
  }, [refetchConnections]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success("Account connected successfully!");
      const newUrl = window.location.pathname + "?settings=connections";
      window.history.replaceState({}, document.title, newUrl);
    } else if (params.get("error")) {
      const err = params.get("error");
      toast.error(
        err === "oauth_failed"
          ? "Authentication with the third-party app failed."
          : "An error occurred during authentication."
      );
      const newUrl = window.location.pathname + "?settings=connections";
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  useEffect(() => {
    if (!session?.accessToken || isLoading || connections.length === 0) return;

    const importableProviders = ["anilist", "mal", "simkl"];
    for (const conn of connections) {
      const providerId = conn.provider.toLowerCase();
      if (importableProviders.includes(providerId)) {
        pollImportStatus(providerId);
      }
    }
  }, [session, connections, isLoading, pollImportStatus]);

  const handleConnect = (providerId: string): void => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to link accounts.");
      return;
    }
    setIsActionLoading(providerId);
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/connections/${providerId.toLowerCase()}/connect?token=${session.accessToken}&redirectUrl=${redirectUrl}`;
  };

  const handleDisconnect = async (providerId: string): Promise<void> => {
    if (!confirm(`Are you sure you want to disconnect ${providerId.toUpperCase()}?`)) {
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
        }
      );
      if (!res.ok) throw new Error("Failed to disconnect");

      setConnections((prev) =>
        prev.filter((c) => c.provider.toLowerCase() !== providerId.toLowerCase())
      );
      toast.success(`${providerId.toUpperCase()} disconnected successfully.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to disconnect service.");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleTogglePrivate = async (providerId: string, currentPrivate: boolean): Promise<void> => {
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
        }
      );
      if (!res.ok) throw new Error("Failed to update privacy setting");
      const updated = await res.json();
      
      setConnections((prev) =>
        prev.map((c) =>
          c.provider.toLowerCase() === providerId.toLowerCase()
            ? { ...c, private: updated.private }
            : c
        )
      );
      toast.success(
        `Connection is now ${updated.private ? "private" : "public"}.`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update privacy setting.");
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse">
          Fetching your integration status...
        </p>
      </div>
    );
  }

  const getConnection = (providerId: string): Connection | undefined =>
    connections.find((c) => c.provider.toLowerCase() === providerId.toLowerCase());

  const uniqueAppKeys = Array.from(new Set(PROVIDERS.map((p) => p.primaryApp)));

  const apps = uniqueAppKeys.map((key) => {
    const configApp = registeredApps.find(
      (a) => a.name.toLowerCase() === key.toLowerCase()
    );
    return {
      name: configApp?.name || key.charAt(0).toUpperCase() + key.slice(1),
      description: configApp?.connectionDescription || `Integrations for ${key}.`,
      providers: PROVIDERS.filter((p) => p.primaryApp === key),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Integrations & Apps
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Link and manage third-party integrations for your Runa apps.
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

      <div className="space-y-6">
        {apps.map((app): React.JSX.Element => (
          <Card key={app.name}>
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
                {app.name}
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                {app.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {app.providers.map((provider): React.JSX.Element => {
                const conn = getConnection(provider.id);
                const isConnected = !!conn;
                const loading = isActionLoading === provider.id;

                return (
                  <div
                    key={provider.id}
                    className={cn(
                      "group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all duration-300 bg-card/30 backdrop-blur-xs",
                      isConnected
                        ? "border-emerald-500/20 hover:border-emerald-500/40"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    {/* Left Side: Logo & Info */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className={cn(
                          "flex items-center justify-center size-11 rounded-xl overflow-hidden shadow-sm transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2 shrink-0 bg-secondary/30 border border-border",
                          provider.glowColor && `shadow-md ${provider.glowColor}`
                        )}
                      >
                        <Image
                          src={provider.icon}
                          alt={provider.name}
                          width={44}
                          height={44}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {provider.name}
                          </span>
                          {isConnected ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full font-semibold text-[10px] px-2 py-0">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground/60 border-border/40 rounded-full font-medium text-[10px] px-2 py-0">
                              Offline
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                          {provider.description}
                        </p>
                        {isConnected && conn && conn.linkedUsername && (
                          <div className="flex flex-col gap-1.5 pt-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 font-medium">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Username:</span>
                              <span className="text-foreground">{conn.linkedUsername}</span>
                            </div>
                            {conn.metadata && typeof conn.metadata === 'object' && Object.keys(conn.metadata).length > 0 && (
                              <div className="space-y-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleMetadata(provider.id)}
                                  className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  {expandedMetadata[provider.id] ? "Hide connection data" : "Show connection data"}
                                </button>
                                {expandedMetadata[provider.id] && (
                                  <pre className="text-[9px] font-mono p-2 bg-muted/40 border border-border/40 rounded-lg max-w-xs overflow-x-auto max-h-[120px] text-muted-foreground">
                                    {JSON.stringify(conn.metadata, null, 2)}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Actions */}
                    <div className="flex items-center justify-end gap-2 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/20">
                      {isConnected && conn && (
                        <div className="flex items-center gap-1.5 mr-2">
                          <Switch
                            id={`private-switch-${provider.id}`}
                            checked={conn.private}
                            onCheckedChange={() => handleTogglePrivate(provider.id, conn.private)}
                            disabled={loading}
                            className="scale-75"
                          />
                          <label
                            htmlFor={`private-switch-${provider.id}`}
                            className="text-[11px] font-semibold text-muted-foreground cursor-pointer select-none"
                          >
                            Private
                          </label>
                        </div>
                      )}
                      {isConnected ? (
                        <>
                          {["anilist", "mal", "simkl"].includes(provider.id.toLowerCase()) && (
                            <>
                              {importStatus[provider.id.toLowerCase()]?.status === "processing" ? (
                                <div className="flex flex-col gap-1 shrink-0 w-full md:w-auto md:min-w-[140px] mr-2">
                                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Spinner className="h-2.5 w-2.5 text-primary animate-spin" />
                                      Importing list...
                                    </span>
                                    <span>
                                      {importStatus[provider.id.toLowerCase()]?.processed}/
                                      {importStatus[provider.id.toLowerCase()]?.total}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary transition-all duration-500 ease-out"
                                      style={{
                                        width: `${
                                          (importStatus[provider.id.toLowerCase()]?.total || 0) > 0
                                            ? ((importStatus[provider.id.toLowerCase()]?.processed || 0) /
                                                (importStatus[provider.id.toLowerCase()]?.total || 1)) *
                                              100
                                            : 0
                                        }%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg text-xs font-semibold h-8 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40 shrink-0 mr-2 group/import-btn"
                                  onClick={() => openImportDialog(provider.id)}
                                >
                                  <RefreshCw className="h-3.5 w-3.5 mr-1 transition-transform duration-500 ease-in-out group-hover/import-btn:rotate-180" />
                                  Import List
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs font-semibold h-8 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                            disabled={loading}
                            onClick={(): Promise<void> => handleDisconnect(provider.id)}
                          >
                            {loading ? (
                              <Spinner className="h-3.5 w-3.5 mr-1" />
                            ) : (
                              <Unlink className="h-3.5 w-3.5 mr-1" />
                            )}
                            Disconnect
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="size-8 rounded-lg shrink-0"
                            asChild
                          >
                            <a href={provider.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="size-3.5" />
                            </a>
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-lg text-xs font-semibold h-8 bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                          disabled={loading}
                          onClick={(): void => handleConnect(provider.id)}
                        >
                          {loading ? (
                            <Spinner className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <LinkIcon className="h-3.5 w-3.5 mr-1" />
                          )}
                          Connect Account
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Done Closing button */}
      <div className="flex justify-end pt-4 border-t border-border mt-6">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="text-xs sm:text-sm h-9 px-5 rounded-xl cursor-pointer"
        >
          Close Settings
        </Button>
      </div>

      <Dialog open={!!showImportDialog} onOpenChange={(open) => { if (!open) setShowImportDialog(null); }}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">Select Lists to Import</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">
              Choose which watchlists you would like to import from {showImportDialog?.toUpperCase()}.
            </p>
            <div className="space-y-3">
              {PROVIDERS.find(p => p.id === showImportDialog)?.capabilities
                .filter(cap => cap in IMPORTABLE_CAPABILITIES)
                .map(cap => {
                  const { label, key } = IMPORTABLE_CAPABILITIES[cap];
                  const isChecked = selectedMediaTypes.includes(key);
                  return (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/15 hover:bg-secondary/25 transition-all">
                      <Checkbox
                        id={`media-type-${key}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMediaTypes(prev => [...prev, key]);
                          } else {
                            setSelectedMediaTypes(prev => prev.filter(k => k !== key));
                          }
                        }}
                      />
                      <label
                        htmlFor={`media-type-${key}`}
                        className="text-xs font-semibold text-foreground select-none cursor-pointer flex-1"
                      >
                        {label}
                      </label>
                    </div>
                  );
                })
              }
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(null)} className="rounded-lg h-9 text-xs">
              Cancel
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
              Start Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!failedImports} onOpenChange={(open) => { if (!open) setFailedImports(null); }}>
        <DialogContent className="max-w-3xl sm:max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              Failed Import Items ({failedImports?.items.length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              The following items from <strong>{failedImports?.providerId.toUpperCase()}</strong> could not be imported automatically. You can manually search and link them using the Edit dialog for the respective media entry.
            </p>
            <div className="border border-border rounded-xl overflow-hidden bg-muted/10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-secondary/25 border-b border-border text-muted-foreground font-semibold">
                    <th className="p-3">Title</th>
                    <th className="p-3 w-20">Type</th>
                    <th className="p-3 w-24">ID</th>
                    <th className="p-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {failedImports?.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                      <td className="p-3 font-medium text-foreground max-w-[280px] truncate" title={item.title}>
                        {item.title}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0 font-medium">
                          {item.mediaType}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-muted-foreground">
                        {item.providerId}
                      </td>
                      <td className="p-3 text-amber-500/90 font-medium max-w-[280px] truncate" title={item.reason}>
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-end pt-3 border-t border-border">
            <Button size="sm" onClick={() => { setFailedImports(null); window.location.reload(); }} className="rounded-lg h-9 text-xs font-semibold px-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
