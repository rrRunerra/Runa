"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  LinkIcon,
  Unlink,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Spinner } from "./ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";


type Connection = {
  id: string;
  provider: string;
  linkedUsername: string;
  connectionId: string | null;
  createdAt: string;
  expiresAt: string | null;
};

const PROVIDERS = [
  {
    id: "anilist",
    name: "AniList",
    description: "Sync your watch list progress automatically.",
    url: "https://anilist.co",
    icon: `https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/AniList_logo.svg/960px-AniList_logo.svg.png`,
    accentColor: "bg-[#3db4f2]/10 border-[#3db4f2]/20 text-[#3db4f2] hover:bg-[#3db4f2]/20",
    glowColor: "shadow-[#3db4f2]/10",
  },
  {
    id: "mal",
    name: "MyAnimeList",
    description: "Keep your traditional anime lists synchronized.",
    url: "https://myanimelist.net",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/MyAnimeList_favicon.svg/3840px-MyAnimeList_favicon.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
    accentColor: "bg-[#2e51a2]/10 border-[#2e51a2]/20 text-[#2e51a2] hover:bg-[#2e51a2]/20",
    glowColor: "shadow-[#2e51a2]/10",
  },
  {
    id: "simkl",
    name: "Simkl",
    description: "Sync your anime, movies, and TV shows in one place.",
    url: "https://simkl.com",
    icon: "https://play-lh.googleusercontent.com/DliaDatmrt_M8drBtsafddTyhcxN5W3UAcpQRjoq7MViP3iwHBMegVmKIxDAjHrFACQ",
    accentColor: "bg-[#e50914]/10 border-[#e50914]/20 text-[#e50914] hover:bg-[#e50914]/20",
    glowColor: "shadow-[#e50914]/10",
  },
];

export function ConnectionsTab(): React.JSX.Element {
  const { data: session } = useSession();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/connections`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      setConnections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load connections.");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchConnections();

    // Check for callback parameters
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
  }, [fetchConnections]);

  const handleConnect = (providerId: string) => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to link accounts.");
      return;
    }
    setIsActionLoading(providerId);
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/connections/${providerId.toLowerCase()}/connect?token=${session.accessToken}&redirectUrl=${redirectUrl}`;
  };

  const handleDisconnect = async (providerId: string) => {
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

  const getConnection = (providerId: string) =>
    connections.find((c) => c.provider.toLowerCase() === providerId.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Integrations & Apps
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Link and manage third-party trackers to synchronize your watching history.
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

      <div className="space-y-3.5">
        {PROVIDERS.map((provider) => {
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
                  : "border-border/60 hover:border-primary/30"
              )}
            >
              {/* Left Side: Logo & Info */}
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    "flex items-center justify-center size-11 rounded-xl overflow-hidden shadow-sm transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2 shrink-0 bg-secondary/30 border border-border/30",
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
                  {isConnected && conn.linkedUsername && (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/80 font-medium">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Username:</span>
                      <span className="text-foreground">{conn.linkedUsername}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Actions */}
              <div className="flex items-center justify-end gap-2 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/20">
                {isConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs font-semibold h-8 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      disabled={loading}
                      onClick={() => handleDisconnect(provider.id)}
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
                    onClick={() => handleConnect(provider.id)}
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
      </div>

      {/* Sync Tips Alert Card */}
      {/* <div className="p-4 rounded-xl bg-secondary/10 border border-border/30 flex items-start gap-3">
        <HelpCircle className="size-5 text-primary mt-0.5 shrink-0" />
        <div className="space-y-1">
          <span className="font-semibold text-xs text-foreground block">
            Syncing Issues?
          </span>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            If your watch progress or statistics aren't syncing automatically, try disconnecting and reconnecting your profile to refresh the access token permissions.
          </p>
        </div>
      </div> */}
    </div>
  );
}
