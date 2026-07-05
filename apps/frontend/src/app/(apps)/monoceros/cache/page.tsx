"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import useSWR from "swr";
import {
  Zap,
  Search,
  Eye,
  Trash2,
  AlertCircle,
  RefreshCw,
  Trash,
  Loader2,
  CornerDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { hasPermission, RunaFlags } from "@runa/permissions";

import {
  getCacheKeys,
  getCacheValue,
  deleteCacheKey,
  flushCache,
} from "@/actions/monocerosCacheActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function MonocerosCachePage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<any>(null);
  const [selectedTtl, setSelectedTtl] = useState<number | null>(null);
  const [isValueLoading, setIsValueLoading] = useState(false);

  const [isFlushOpen, setIsFlushOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Redirect unauthorized users
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/monoceros/unauthorized");
    }
    if (
      status === "authenticated" &&
      session?.user?.permissions &&
      !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)
    ) {
      redirect("/monoceros/unauthorized");
    }
  }, [status, session]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // SWR for key retrieval
  const {
    data: keys = [],
    error,
    isLoading,
    mutate,
  } = useSWR(
    status === "authenticated" ? ["monoceros-cache-keys", debouncedQuery] : null,
    async () => {
      return getCacheKeys(debouncedQuery ? `*${debouncedQuery}*` : undefined);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const handleViewValue = async (key: string) => {
    setSelectedKey(key);
    setIsValueLoading(true);
    setIsViewOpen(true);
    try {
      const res = await getCacheValue(key);
      setSelectedValue(res.value);
      setSelectedTtl(res.ttl);
    } catch (err: any) {
      toast.error(err.message || "Failed to load cache value");
      setIsViewOpen(false);
    } finally {
      setIsValueLoading(false);
    }
  };

  const handleDeleteKey = (key: string) => {
    startTransition(async () => {
      try {
        await deleteCacheKey(key);
        toast.success(`Key "${key}" deleted successfully`);
        mutate();
        if (selectedKey === key) {
          setIsViewOpen(false);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to delete key");
      }
    });
  };

  const handleFlushCache = () => {
    startTransition(async () => {
      try {
        await flushCache();
        toast.success("Cache database flushed successfully");
        setIsFlushOpen(false);
        mutate();
      } catch (err: any) {
        toast.error(err.message || "Failed to flush cache");
      }
    });
  };

  const formatTtl = (ttl: number) => {
    if (ttl === -1) {
      return (
        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 bg-zinc-900/40">
          Never Expires
        </Badge>
      );
    }
    if (ttl === -2 || ttl < 0) {
      return (
        <Badge variant="destructive" className="text-[10px]">
          Expired / Not Found
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
        {ttl}s remaining
      </Badge>
    );
  };

  const renderValueContent = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-muted-foreground italic">null / undefined</span>;
    }
    if (typeof val === "object") {
      return (
        <pre className="bg-zinc-950 p-4 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[350px]">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    }
    return (
      <div className="bg-zinc-950 p-4 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[350px]">
        {String(val)}
      </div>
    );
  };

  if (status === "loading") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Zap className="size-8 text-yellow-500 fill-yellow-500/15" />
            Cache Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Inspect keys, view values, check TTL exipration, and flush the Redis/Memory cache client.
          </p>
        </div>

        <Button
          onClick={() => setIsFlushOpen(true)}
          variant="destructive"
          className="w-full sm:w-auto font-semibold rounded-lg shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2 h-9 px-4 text-sm"
        >
          <Trash className="size-4" />
          Flush Cache
        </Button>
      </div>

      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/40 border border-border/50 p-4 rounded-xl backdrop-blur-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search key patterns..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-lg"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Badge variant="outline" className="h-9 px-3 rounded-lg border-border font-medium flex items-center gap-1.5">
            Total Keys: {keys.length}
          </Badge>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20">
            <Loader2 className="size-8 text-primary animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto min-h-[300px]">
          <Table>
            <TableHeader className="bg-muted/30 border-b border-border/50">
              <TableRow>
                <TableHead className="py-3.5 px-4 font-bold text-foreground">Key Name</TableHead>
                <TableHead className="py-3.5 px-4 font-bold text-foreground w-[180px]">Expiration (TTL)</TableHead>
                <TableHead className="w-[120px] text-right py-3.5 px-4 font-bold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length > 0 ? (
                keys.map((item) => (
                  <TableRow key={item.key} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="py-3 px-4 font-mono text-xs font-medium text-foreground max-w-[400px] truncate">
                      {item.key}
                    </TableCell>
                    <TableCell className="py-3 px-4">{formatTtl(item.ttl)}</TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          onClick={() => handleViewValue(item.key)}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/5"
                          onClick={() => handleDeleteKey(item.key)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                    {searchQuery ? "No cache keys match your search query." : "No cache keys found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Flush Cache Modal */}
      <Dialog open={isFlushOpen} onOpenChange={setIsFlushOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="size-5" />
              Flush Cache Database?
            </DialogTitle>
            <DialogDescription className="pt-2">
              This action will completely delete all cache entries in the current cache client driver. This could cause temporary latency spikes in the system as records are re-fetched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsFlushOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFlushCache} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Yes, Flush Cache
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Value Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm max-w-[90%] truncate flex items-center gap-2">
              <CornerDownRight className="size-4 text-primary" />
              {selectedKey}
            </DialogTitle>
            <DialogDescription className="pt-1 flex items-center gap-2">
              <span>Cache Value details.</span>
              {selectedTtl !== null && formatTtl(selectedTtl)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isValueLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="size-6 text-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground">Cached Content:</span>
                {renderValueContent(selectedValue)}
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            {selectedKey && (
              <Button
                variant="destructive"
                onClick={() => handleDeleteKey(selectedKey)}
                disabled={isPending || isValueLoading}
              >
                Delete Key
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
