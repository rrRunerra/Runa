import type React from "react";
import { Link2, Trash2, Eye, EyeOff, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";
import { ConnectionMetadata, ConnectionCapability } from "@runa/connections/metadata";

const CAPABILITY_LABELS: Record<string, string> = {
  [ConnectionCapability.ANIME]: "Anime Tracking",
  [ConnectionCapability.MANGA]: "Manga Tracking",
  [ConnectionCapability.MOVIES]: "Movie Tracking",
  [ConnectionCapability.TV_SHOWS]: "TV Show Tracking",
  [ConnectionCapability.AUTH]: "OAuth Login",
};

interface RrConnectionCardProps {
  provider: ConnectionMetadata;
  conn?: {
    id: string;
    provider: string;
    linkedUsername: string;
    connectionId: string | null;
    createdAt: string;
    expiresAt: string | null;
    private: boolean;
    metadata?: any;
  };
  loading: boolean;
  importStatus?: {
    status: "idle" | "processing" | "completed" | "failed";
    progress?: number;
    total?: number;
    currentActivity?: string;
    failedItems?: any[];
    error?: string;
  };
  expandedMetadata: boolean;
  toggleMetadata: () => void;
  handleTogglePrivate: () => void;
  openImportDialog: () => void;
  handleDisconnect: () => void;
  handleConnect: () => void;
}

export function RrConnectionCard({
  provider,
  conn,
  loading,
  importStatus,
  expandedMetadata,
  toggleMetadata,
  handleTogglePrivate,
  openImportDialog,
  handleDisconnect,
  handleConnect,
}: RrConnectionCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const isConnected = !!conn;
  const supportsImport = provider.capabilities.some((c: ConnectionCapability) =>
    [
      ConnectionCapability.ANIME,
      ConnectionCapability.MANGA,
      ConnectionCapability.MOVIES,
      ConnectionCapability.TV_SHOWS,
    ].includes(c)
  );

  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all text-left">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="size-10 rounded-xl bg-card border border-border/60 p-2 flex items-center justify-center shrink-0 shadow-2xs">
            {provider.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={provider.icon}
                alt={provider.name}
                className="size-full object-contain rounded-sm"
              />
            ) : (
              <Link2 className="size-5 text-primary" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground truncate">
                {provider.name}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-full ${
                  isConnected
                    ? "bg-success/10 text-success border-success/30"
                    : "bg-muted/40 text-muted-foreground border-border/50"
                }`}
              >
                {isConnected
                  ? t("connections.statusConnected")
                  : t("connections.statusDisconnected")}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              {isConnected
                ? `@${conn.linkedUsername}`
                : provider.description}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <>
              {supportsImport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openImportDialog}
                  disabled={importStatus?.status === "processing"}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5"
                >
                  {importStatus?.status === "processing" ? (
                    <Spinner className="size-3" />
                  ) : (
                    <Download className="size-3" />
                  )}
                  <span className="hidden sm:inline">
                    {importStatus?.status === "processing"
                      ? t("connections.importing")
                      : t("connections.importData")}
                  </span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleTogglePrivate}
                disabled={loading}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                title={
                  conn.private
                    ? t("connections.makePublic")
                    : t("connections.makePrivate")
                }
              >
                {conn.private ? (
                  <EyeOff className="size-3.5 text-warning" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title={t("connections.disconnect")}
              >
                {loading ? (
                  <Spinner className="size-3" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={loading}
              className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <Spinner className="size-3" />
              ) : (
                <Link2 className="size-3" />
              )}
              <span>{t("connections.connectBtn")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Connection Capabilities & Expanded Metadata */}
      <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5 flex-wrap">
          {provider.capabilities.map((cap: ConnectionCapability) => (
            <span
              key={cap}
              className="px-1.5 py-0.5 rounded bg-muted/40 border border-border/30 font-medium"
            >
              {CAPABILITY_LABELS[cap] || cap}
            </span>
          ))}
        </div>

        {conn?.metadata && (
          <button
            type="button"
            onClick={toggleMetadata}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-auto"
          >
            <span>{t("connections.metadata")}</span>
            {expandedMetadata ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>
        )}
      </div>

      {expandedMetadata && conn?.metadata && (
        <pre className="p-2.5 rounded-lg bg-black/40 border border-border/40 text-[10px] font-mono overflow-x-auto text-muted-foreground mt-1 max-h-36">
          {JSON.stringify(conn.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}
