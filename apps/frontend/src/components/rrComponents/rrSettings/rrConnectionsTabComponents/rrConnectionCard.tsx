import * as React from "react";
import Image from "next/image";
import { LinkIcon, Unlink, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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

export interface RrConnectionCardProps {
  provider: {
    id: string;
    name: string;
    description: string;
    icon: string;
    url: string;
    glowColor?: string;
  };
  conn: Connection | undefined;
  loading: boolean;
  importStatus: any;
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
  const isConnected = !!conn;

  return (
    <div
      className={cn(
        "group relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all duration-300 bg-card/30 backdrop-blur-xs text-left",
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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">
              {provider.name}
            </span>
            {isConnected ? (
              <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full font-semibold text-[10px] px-2 py-0">
                Active
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-muted-foreground/60 border-border/40 rounded-full font-medium text-[10px] px-2 py-0"
              >
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
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
                  Username:
                </span>
                <span className="text-foreground">
                  {conn.linkedUsername}
                </span>
              </div>
              {conn.metadata &&
                typeof conn.metadata === "object" &&
                Object.keys(conn.metadata).length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <button
                      type="button"
                      onClick={toggleMetadata}
                      className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {expandedMetadata
                        ? "Hide connection data"
                        : "Show connection data"}
                    </button>
                    {expandedMetadata && (
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
              onCheckedChange={handleTogglePrivate}
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
            {["anilist", "mal", "simkl"].includes(
              provider.id.toLowerCase()
            ) && (
              <>
                {importStatus?.status === "processing" ? (
                  <div className="flex flex-col gap-1 shrink-0 w-full md:w-auto md:min-w-[140px] mr-2">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Spinner className="size-2.5 text-primary animate-spin" />
                        Importing list...
                      </span>
                      <span>
                        {importStatus?.processed} / {importStatus?.total}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{
                          width: `${
                            (importStatus?.total || 0) > 0
                              ? ((importStatus?.processed || 0) /
                                  (importStatus?.total || 1)) *
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
                    onClick={openImportDialog}
                  >
                    <RefreshCw className="size-3.5 mr-1 transition-transform duration-500 ease-in-out group-hover/import-btn:rotate-180" />
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
              onClick={handleDisconnect}
            >
              {loading ? (
                <Spinner className="size-3.5 mr-1" />
              ) : (
                <Unlink className="size-3.5 mr-1" />
              )}
              Disconnect
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-lg"
              asChild
            >
              <a href={provider.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="rounded-lg text-xs font-semibold h-8 bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            disabled={loading}
            onClick={handleConnect}
          >
            {loading ? (
              <Spinner className="size-3.5 mr-1" />
            ) : (
              <LinkIcon className="size-3.5 mr-1" />
            )}
            Connect Account
          </Button>
        )}
      </div>
    </div>
  );
}
