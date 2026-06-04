"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLogStats, type LogStats } from "@/actions/getLogStats";
import { getLogs, type LogEntry } from "@/actions/getLogs";
import { cn } from "@/lib/utils";
import type { LynxLogType } from "@runa/database";
import { Search, Terminal, Activity, Sliders } from "lucide-react";

interface LogTerminalProps {
  initialLogs: LogEntry[];
  initialCursor?: number;
  type?: LynxLogType;
}

export function LogTerminal({
  initialLogs,
  initialCursor,
  type,
}: LogTerminalProps) {
  // Use a Map to ensure uniqueness by ID if StrictMode fires twice
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);

  const [cursor, setCursor] = useState<number | undefined | null>(
    initialCursor,
  );
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialCursor !== undefined);

  const [contextFilter, setContextFilter] = useState("");
  const [debouncedContext, setDebouncedContext] = useState("");
  const [stats, setStats] = useState<LogStats | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isInitialMount = useRef(true);

  // Debounce context filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContext(contextFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [contextFilter]);

  // Fetch stats
  useEffect(() => {
    getLogStats(debouncedContext, type).then(setStats);
  }, [debouncedContext, type]);

  // Reset logs when filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const fetchFirstBatch = async () => {
      setLoading(true);
      try {
        const { logs: newLogs, nextCursor } = await getLogs(
          undefined,
          50,
          type,
          debouncedContext,
        );
        setLogs(newLogs);
        setCursor(nextCursor);
        setHasMore(nextCursor !== undefined);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFirstBatch();
  }, [debouncedContext, type]);

  const loadMoreLogs = useCallback(async () => {
    if (loading || !hasMore || cursor === null || cursor === undefined) return;

    setLoading(true);
    try {
      const { logs: newLogs, nextCursor } = await getLogs(
        cursor,
        50,
        type,
        debouncedContext,
      );

      // Deduplicate using functional update to access current logs state
      setLogs((prev) => {
        const existingIds = new Set(prev.map((l: any) => l.id));
        const uniqueNewLogs = newLogs.filter(
          (log: any) => !existingIds.has(log.id),
        );
        if (uniqueNewLogs.length === 0) return prev;
        return [...prev, ...uniqueNewLogs];
      });

      setCursor(nextCursor);
      setHasMore(nextCursor !== undefined);
    } catch (error) {
      console.error("Failed to load more logs:", error);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, type, debouncedContext]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadMoreLogs();
        }
      },
      { threshold: 0.1, root: scrollContainer },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMoreLogs, loading, hasMore]);

  const getLogColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "INFO": return "text-blue-400";
      case "WARN": return "text-amber-400";
      case "ERROR": return "text-red-400 font-semibold";
      case "DEBUG": return "text-zinc-500";
      case "VERBOSE": return "text-purple-400";
      default: return "text-zinc-300";
    }
  };

  const getLogBadgeStyle = (type: string) => {
    switch (type.toUpperCase()) {
      case "INFO":
        return "bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.08)]";
      case "WARN":
        return "bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.08)]";
      case "ERROR":
        return "bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_8px_rgba(239,68,68,0.08)]";
      case "DEBUG":
        return "bg-zinc-800/40 text-zinc-500 border-zinc-700/25";
      case "VERBOSE":
        return "bg-purple-500/10 text-purple-400 border-purple-500/25 shadow-[0_0_8px_rgba(168,85,247,0.08)]";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700/25";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(date));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-5 select-none">
      {/* Stats & Filter Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-950/20 backdrop-blur-xl p-5 rounded-2xl border border-zinc-800/40 shadow-xl font-mono text-sm text-muted-foreground">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/50 flex items-center gap-1.5">
            <Activity className="size-3.5" />
            Total Logs
          </span>
          <span className="text-2xl text-foreground font-bold">
            {stats?.total ?? "-"}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 relative">
          <label
            htmlFor="context-filter"
            className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/50 flex items-center gap-1.5"
          >
            <Search className="size-3.5" />
            Context Filter
          </label>
          <input
            id="context-filter"
            type="text"
            value={contextFilter}
            onChange={(e) => setContextFilter(e.target.value)}
            placeholder="Filter by context…"
            className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all w-full placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="col-span-1 md:col-span-2 flex items-center justify-start md:justify-end gap-3 md:gap-5 text-xs flex-wrap border-t border-zinc-800/30 md:border-t-0 pt-3 md:pt-0">
          {stats &&
            Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold select-none", getLogBadgeStyle(type))}>
                  {type}
                </span>
                <span className="text-zinc-400 font-bold font-mono">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Terminal View Body */}
      <div className="flex flex-col flex-1 bg-zinc-950/70 rounded-2xl shadow-inner border border-zinc-800/40 overflow-hidden relative">
        {/* Top bar simulating actual Console */}
        <div className="h-9 border-b border-zinc-900 bg-zinc-950/90 flex items-center px-4 justify-between shrink-0 select-none">
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-rose-500/40 border border-rose-500/25" />
            <span className="size-3 rounded-full bg-amber-500/40 border border-amber-500/25" />
            <span className="size-3 rounded-full bg-emerald-500/40 border border-emerald-500/25" />
          </div>
          <div className="text-[10px] text-muted-foreground/60 font-mono flex items-center gap-1.5 uppercase font-bold tracking-widest">
            <Terminal className="size-3.5" />
            system.terminal
          </div>
          <div className="w-14" />
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-5 space-y-2 font-mono text-xs no-scrollbar"
        >
          {logs.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-muted-foreground italic border-2 border-dashed border-zinc-800/40 rounded-xl bg-zinc-900/10">
              <span className="text-base font-semibold">No logs found</span>
              <span className="text-xs mt-1 text-muted-foreground/60">
                Try adjusting your filters or checking back later
              </span>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col md:flex-row md:items-start gap-1.5 md:gap-4 hover:bg-white/5 px-2.5 py-1.5 md:py-1 rounded-lg transition-colors group"
              >
                {/* Mobile: Type + Context, Desktop: full row */}
                <div className="flex items-center gap-2 md:contents">
                  <span className="hidden md:inline text-muted-foreground/45 whitespace-nowrap w-[130px] shrink-0 select-none opacity-50 group-hover:opacity-100 transition-opacity order-first">
                    {formatDate(log.createdAt)}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase select-none w-auto md:w-[70px] text-center shrink-0",
                      getLogBadgeStyle(log.type),
                    )}
                  >
                    {log.type}
                  </span>
                  <span
                    className="text-sky-400 w-auto md:w-[160px] shrink-0 truncate font-semibold"
                    title={log.context || ""}
                  >
                    {log.context ? `[${log.context}]` : ""}
                  </span>
                </div>
                <span className={cn("flex-1 break-all text-xs select-text", getLogColor(log.type))}>
                  {log.message}
                </span>
              </div>
            ))
          )}

          {/* Loading / Scroll Anchor */}
          <div
            ref={observerTarget}
            className="h-6 py-3 flex items-center justify-center text-muted-foreground/60 text-[10px] font-bold uppercase select-none"
          >
            {loading ? "Loading metrics..." : hasMore ? "" : "End of logs"}
          </div>
        </div>
      </div>
    </div>
  );
}
