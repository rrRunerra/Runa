"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  LinkIcon,
  Unlink,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Connection = {
  id: string;
  provider: string;
  username: string;
  connectionId: string | null;
  createdAt: string;
  expiresAt: string | null;
};

const PROVIDERS = [
  {
    id: "anilist",
    name: "AniList",
    description: "Connect to sync your anime and manga progress.",
    url: "https://anilist.co",
    icon: "/anilist.svg",
    invert: true,
  },
  {
    id: "mal",
    name: "MyAnimeList",
    description: "Connect to sync your anime and manga progress.",
    url: "https://myanimelist.net",
    icon: "/mal.svg",
    invert: false,
  },
  {
    id: "simkl",
    name: "Simkl",
    description: "Connect to sync your anime, movies, and TV shows.",
    url: "https://simkl.com",
    icon: "/simkl.svg",
    invert: false,
  },
];

function ConnectionsContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/polaris/api/connections");
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      setConnections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load your connections.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchConnections();
    }
  }, [status, router, fetchConnections]);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccess(true);
      router.replace("/polaris/connections");
    }
    const err = searchParams.get("error");
    if (err) {
      setError(
        err === "oauth_failed"
          ? "Authentication with the third-party app failed."
          : "An error occurred.",
      );
      router.replace("/polaris/connections");
    }
  }, [searchParams, router]);

  const handleConnect = (providerId: string) => {
    setIsActionLoading(providerId);
    window.location.href = `/polaris/api/connections/${providerId}/connect`;
  };

  const handleDisconnect = async (providerId: string) => {
    if (
      !confirm(
        `Are you sure you want to disconnect ${providerId.toUpperCase()}?`,
      )
    )
      return;

    setIsActionLoading(providerId);
    try {
      const res = await fetch(
        `/polaris/api/connections?provider=${providerId.toUpperCase()}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to disconnect");

      setConnections((prev) =>
        prev.filter(
          (c) => c.provider.toLowerCase() !== providerId.toLowerCase(),
        ),
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to disconnect service.");
    } finally {
      setIsActionLoading(null);
    }
  };

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Loading your connections...
        </p>
      </div>
    );
  }

  const getConnection = (providerId: string) =>
    connections.find(
      (c) => c.provider.toLowerCase() === providerId.toLowerCase(),
    );

  return (
    <div className="container mx-auto p-6 md:p-10 max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-primary to-primary/60">
          Connections
        </h1>
        <p className="text-muted-foreground text-lg">
          Sync your watch lists and progress with third-party tracking services.
        </p>
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="bg-destructive/10 border-destructive/20 mb-6"
        >
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            {error}
            <Button variant="ghost" size="xs" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-primary/10 border-primary/20 text-primary mb-6">
          <CheckCircle2 className="h-5 w-5" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            Changes applied successfully.
            <Button variant="ghost" size="xs" onClick={() => setSuccess(false)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROVIDERS.map((provider) => {
          const conn = getConnection(provider.id);
          const isConnected = !!conn;
          const loading = isActionLoading === provider.id;

          return (
            <Card
              key={provider.id}
              className="group flex flex-col h-full bg-card/40 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center size-10 rounded-lg overflow-hidden shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                      provider.id === "anilist"
                        ? "bg-[#3db4f2] p-2"
                        : "bg-transparent",
                    )}
                  >
                    <Image
                      src={provider.icon}
                      alt={provider.name}
                      width={40}
                      height={40}
                      className={cn(
                        "w-full h-full object-cover",
                        provider.invert && "invert",
                      )}
                    />
                  </div>
                  <CardTitle className="text-xl font-bold">
                    {provider.name}
                  </CardTitle>
                </div>
                <CardAction>
                  {isConnected ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-primary/15 text-primary border-primary/10 font-bold px-3 py-1"
                    >
                      Connected
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full text-muted-foreground/60 border-border/40 font-bold px-3 py-1"
                    >
                      Disconnected
                    </Badge>
                  )}
                </CardAction>
                <CardDescription className="mt-2 line-clamp-2">
                  {provider.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {isConnected ? (
                  <div className="p-3 rounded-lg bg-background/50 border border-border/40 space-y-1.5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between overflow-hidden">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Account
                      </span>
                      <span className="text-sm font-semibold truncate ml-2">
                        {conn.username}
                      </span>
                    </div>
                    {conn.createdAt && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 uppercase tracking-widest pt-1 border-t border-border/20">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        Since {new Date(conn.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[68px] flex items-center justify-center p-4 rounded-lg border border-dashed border-border/40 bg-muted/10">
                    <p className="text-xs text-muted-foreground/60 text-center italic">
                      Link account to start sync.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-4 pb-6 flex gap-2 mt-auto">
                {isConnected ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 group/btn rounded-full"
                      disabled={loading}
                      onClick={() => handleDisconnect(provider.id)}
                    >
                      {loading ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                      <span>Disconnect</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="shrink-0 rounded-full"
                      asChild
                    >
                      <a
                        href={provider.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-[0.98] rounded-full"
                    disabled={loading}
                    onClick={() => handleConnect(provider.id)}
                  >
                    {loading ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                    Connect {provider.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 p-8 rounded-3xl bg-secondary/10 border border-border/30 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2">
          <RefreshCw className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold">Sync Issues?</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          If your watch history isn't updating correctly, try refreshing your
          connection or reconnecting your account.
        </p>
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-6 hover:bg-primary/5 border-primary/20"
            onClick={fetchConnections}
          >
            <RefreshCw className="mr-2" />
            Refresh status
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Spinner className="h-10 w-10 text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Loading your connections...
          </p>
        </div>
      }
    >
      <ConnectionsContent />
    </Suspense>
  );
}
