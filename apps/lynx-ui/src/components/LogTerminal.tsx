"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { LogEntry, getLogs } from "../actions/getLogs";
import { LogStats, getLogStats } from "../actions/getLogStats";
import { cn } from "@runa/ui";
import { LynxLogType } from "@runa/database";

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
  const [ids, setIds] = useState(new Set(initialLogs.map((l) => l.id)));

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
    // If it's the initial render and filter is empty, don't reset if we have initialLogs
    if (debouncedContext === "" && logs === initialLogs) return;

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
        setIds(new Set(newLogs.map((l: any) => l.id)));
        setCursor(nextCursor);
        setHasMore(nextCursor !== undefined);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFirstBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    switch (type) {
      case "INFO":
        return "text-blue-600 dark:text-blue-400";
      case "WARN":
        return "text-amber-600 dark:text-amber-400";
      case "ERROR":
        return "text-red-600 dark:text-red-400";
      case "DEBUG":
        return "text-muted-foreground/70";
      case "VERBOSE":
        return "text-purple-500 dark:text-purple-400";
      default:
        return "text-foreground";
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
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* Stats & Filter Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-4 rounded-lg border border-border text-sm font-mono text-muted-foreground">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-muted-foreground/60">
            Total Logs
          </span>
          <span className="text-xl text-foreground font-bold">
            {stats?.total ?? "-"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-muted-foreground/60">
            Context Filter
          </span>
          <input
            type="text"
            value={contextFilter}
            onChange={(e) => setContextFilter(e.target.value)}
            placeholder="Filter by context..."
            className="bg-transparent border-b border-border text-foreground focus:outline-none focus:border-primary transition-colors w-full placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="col-span-1 md:col-span-2 flex items-center justify-start md:justify-end gap-3 md:gap-6 text-xs flex-wrap">
          {stats &&
            Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className={cn("font-bold", getLogColor(type))}>
                  {type}
                </span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="flex flex-col flex-1 bg-background rounded-lg shadow-inner border border-border overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm no-scrollbar scrollbar-hide"
        >
          <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          {logs.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground italic border-2 border-dashed border-border rounded-lg">
              <span className="text-lg">No logs found</span>
              <span className="text-xs">
                Try adjusting your filters or checking back later
              </span>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col md:flex-row md:items-start gap-1 md:gap-4 hover:bg-muted/30 px-2 py-1 md:py-0.5 rounded transition-colors group"
              >
                {/* Mobile: Type + Context in row, Desktop: full layout */}
                <div className="flex items-center gap-2 md:contents">
                  <span
                    className={cn(
                      "font-bold w-auto md:w-[70px] shrink-0",
                      getLogColor(log.type),
                    )}
                  >
                    [{log.type}]
                  </span>
                  <span
                    className="text-primary w-auto md:w-[200px] shrink-0 truncate text-xs md:text-sm"
                    title={log.context || ""}
                  >
                    {log.context ? `[${log.context}]` : ""}
                  </span>
                  <span className="hidden md:inline text-muted-foreground whitespace-nowrap w-[150px] shrink-0 select-none opacity-50 group-hover:opacity-100 transition-opacity order-first">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
                <span className="flex-1 text-foreground break-all text-xs md:text-sm">
                  {log.message}
                </span>
              </div>
            ))
          )}

          {/* Loading / Scroll Anchor */}
          <div
            ref={observerTarget}
            className="h-4 py-2 flex items-center justify-center text-muted-foreground text-xs"
          >
            {loading ? "Loading..." : hasMore ? "" : "End of logs"}
          </div>
        </div>
      </div>
    </div>
  );
}
