"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  Activity, 
  Terminal, 
  Server, 
  Bot, 
  RefreshCw, 
  Sliders, 
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthOptions, Session } from "next-auth";
import { hasPermission, LynxBitField } from "@runa/permissions";
import { useTranslation } from "react-i18next";



interface LogEntry {
  id: number;
  type: string;
  message: string;
  context: string | null;
  createdAt: Date | string;
}

export interface StatsPayload {
  status: "online" | "idle" | "dnd" | "offline";
  profile: {
    name: string;
    avatar: string;
    description: string;
    discriminator: string;
  };
  stats: {
    servers: number;
    commands: number;
    events: number;
    ping: number;
  };
}

interface LynxDashboardClientProps {
  initialStats: StatsPayload | null;
  initialLogs: LogEntry[];
  session: Session | null
}

export default function LynxDashboardClient({
  initialStats,
  initialLogs,
  session
}: LynxDashboardClientProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<StatsPayload | null>(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-sync real stats in the background every 15 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/lynx/api/stats", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Auto-sync stats failed:", err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/lynx/api/stats", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        toast.success(t("lynx.metricsUpdated"));
      } else {
        toast.error(t("lynx.failedFetchStats"));
      }
    } catch {
      toast.error(t("lynx.errorStatsApi"));
    } finally {
      setIsRefreshing(false);
    }
  };


  const getLogTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "ERROR": return "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]";
      case "WARN": return "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]";
      case "INFO": return "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]";
      case "VERBOSE": return "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]";
      case "DEBUG": return "bg-zinc-800 text-zinc-400 border border-zinc-700/30";
      default: return "bg-zinc-800 text-zinc-300";
    }
  };

  const activeStatus = stats?.status || "offline";
  const statusColor = {
    online: "bg-emerald-500 shadow-emerald-500/50",
    idle: "bg-amber-500 shadow-amber-500/50",
    dnd: "bg-rose-500 shadow-rose-500/50",
    offline: "bg-zinc-500 shadow-zinc-500/50"
  }[activeStatus];

  const statusLabel = {
    online: t("lynx.statusOnline"),
    idle: t("lynx.statusIdle"),
    dnd: t("lynx.statusDnd"),
    offline: t("lynx.statusOffline")
  }[activeStatus];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 350, damping: 25 }
    }
  } as const;

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      {/* Dashboard Title & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Bot className="size-8 text-primary" />
            {t("lynx.dashboardTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("lynx.dashboardDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasPermission(session?.user.permissions, LynxBitField.Flags.VIEW_LOGS) && <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900/40 border border-zinc-800/60 hover:bg-zinc-800/30 hover:border-zinc-700/50 cursor-pointer transition-all duration-300 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            {t("lynx.syncMetrics")}
          </motion.button>}
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* LEFT COLUMN: Bot Profile & Quick Actions */}
        <div className="space-y-6 lg:col-span-1">
          {/* Bot Profile Card */}
          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-2xl flex flex-col items-center text-center isolate transform-[translate3d(0,0,0)]"
          >
            {/* Top aura */}
            <div className="absolute top-0 inset-x-0 h-20 bg-linear-to-b from-primary/10 to-transparent pointer-events-none" />

            <div className="relative group mt-4">
              <div className="absolute -inset-1.5 rounded-full bg-linear-to-r from-primary to-purple-600 opacity-20 blur-md group-hover:opacity-40 transition-opacity duration-500" />
              <img
                src={stats?.profile?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                alt="Lynx Avatar"
                className="relative size-24 rounded-full border-2 border-zinc-800/80 shadow-inner object-cover"
              />
              <div className={cn("absolute bottom-1 right-1 size-5 rounded-full border-4 border-zinc-950 flex items-center justify-center shadow-lg", statusColor)}>
                <span className="absolute size-3 rounded-full bg-current opacity-75 animate-ping pointer-events-none" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-foreground mt-4 flex items-center gap-1.5 font-sans">
              {stats?.profile?.name || "Lynx"}
              {stats?.profile?.discriminator && stats?.profile?.discriminator !== "0" && (
                <span className="text-sm font-semibold text-muted-foreground/60">
                  #{stats.profile.discriminator}
                </span>
              )}
            </h2>
            <div className="text-[10px] uppercase font-bold tracking-widest text-primary mt-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              {statusLabel}
            </div>

            <p className="text-xs text-muted-foreground mt-4 max-w-xs leading-relaxed">
              {stats?.profile?.description || t("lynx.botDefaultDescription")}
            </p>
          </motion.div>

        </div>

        {/* RIGHT COLUMN: Real metrics grid & Realtime Log Stream */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              variants={itemVariants}
              className="p-5 rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700/40 transition-colors duration-300"
            >
              <div className="absolute top-0 right-0 size-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">{t("lynx.discordServers")}</span>
                <div className="size-8 rounded-lg border border-zinc-800 bg-zinc-900/50 text-primary flex items-center justify-center shadow-inner">
                  <Server className="size-4" />
                </div>
              </div>
              <span className="text-3xl font-bold text-foreground mt-6 block relative z-10 font-mono">
                {stats?.stats?.servers ?? "0"}
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-5 rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700/40 transition-colors duration-300"
            >
              <div className="absolute top-0 right-0 size-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">{t("lynx.registeredCmds")}</span>
                <div className="size-8 rounded-lg border border-zinc-800 bg-zinc-900/50 text-sky-400 flex items-center justify-center shadow-inner">
                  <Sliders className="size-4" />
                </div>
              </div>
              <span className="text-3xl font-bold text-foreground mt-6 block relative z-10 font-mono">
                {stats?.stats?.commands ?? "0"}
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-5 rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700/40 transition-colors duration-300"
            >
              <div className="absolute top-0 right-0 size-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">{t("lynx.activeEvents")}</span>
                <div className="size-8 rounded-lg border border-zinc-800 bg-zinc-900/50 text-purple-400 flex items-center justify-center shadow-inner">
                  <Terminal className="size-4" />
                </div>
              </div>
              <span className="text-3xl font-bold text-foreground mt-6 block relative z-10 font-mono">
                {stats?.stats?.events ?? "0"}
              </span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="p-5 rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700/40 transition-colors duration-300"
            >
              <div className="absolute top-0 right-0 size-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">{t("lynx.gatewayPing")}</span>
                <div className="size-8 rounded-lg border border-zinc-800 bg-zinc-900/50 text-emerald-400 flex items-center justify-center shadow-inner">
                  <Activity className="size-4 animate-pulse" />
                </div>
              </div>
              <span className="text-3xl font-bold text-foreground mt-6 block relative z-10 font-mono">
                {stats?.stats?.ping ? `${stats.stats.ping}ms` : "-"}
              </span>
            </motion.div>
          </div>

          {/* Quick Logs Terminal Preview */}
          {hasPermission(session?.user.permissions, LynxBitField.Flags.VIEW_LOGS) &&<motion.div
            variants={itemVariants}
            className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <Terminal className="size-4 text-primary" />
                {t("lynx.logTerminalPreview")}
              </h3>
              <Link
                href="/lynx/logs"
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-semibold transition-colors duration-200"
              >
                {t("lynx.openTerminal")}
                <BookOpen className="size-3.5" />
              </Link>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-zinc-950/80 p-4 font-mono text-[11px] leading-relaxed space-y-2 overflow-x-auto shadow-inner no-scrollbar">
              {initialLogs && initialLogs.length > 0 ? (
                initialLogs.map(log => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3.5 hover:bg-white/5 py-1 px-1.5 rounded transition-colors duration-200">
                    <span className="text-[10px] text-muted-foreground/40 select-none whitespace-nowrap hidden sm:inline">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase select-none shrink-0 border", getLogTypeColor(log.type))}>
                      {log.type}
                    </span>
                    <span className="text-sky-400 shrink-0 select-none">
                      {log.context ? `[${log.context}]` : ""}
                    </span>
                    <span className="text-zinc-300 truncate max-w-full">
                      {log.message}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground/50 py-8 italic select-none">
                  {t("lynx.noRecentLogs")}
                </div>
              )}
            </div>
          </motion.div>}
        </div>
      </motion.div>
    </div>
  );
}
