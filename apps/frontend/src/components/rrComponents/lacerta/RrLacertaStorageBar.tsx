"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { HardDrive, AlertTriangle } from "lucide-react";

import { fetcher } from "@/lib/fetcher";
import { Progress } from "@/components/ui/progress";

interface StorageInfo {
  used: number;
  limit: number;
  blocked: boolean;
}

export default function RrLacertaStorageBar(): React.JSX.Element | null {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const { data, error } = useSWR<StorageInfo>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/storage-info`, session.accessToken]
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 15000, // Refresh storage usage every 15 seconds
    }
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const percentage = useMemo(() => {
    if (!data || data.limit === 0) return 0;
    return Math.min(100, Math.max(0, (data.used / data.limit) * 100));
  }, [data]);

  if (!data || error) {
    return null;
  }

  const isNearLimit = percentage >= 85;
  const isOverLimit = percentage >= 100;

  return (
    <div className="px-4 py-3 mx-2 my-2 border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all rounded-xl select-none">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-foreground/80">
          {data.blocked ? (
            <AlertTriangle className="size-3.5 text-destructive" />
          ) : (
            <HardDrive className={`size-3.5 ${isNearLimit ? "text-amber-500" : "text-primary"}`} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {t("lacerta.storageUsageTitle", "Storage")}
          </span>
        </div>
        {data.blocked && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive border border-destructive/20 uppercase tracking-wide">
            {t("lacerta.storageBlocked", "Blocked")}
          </span>
        )}
      </div>

      <Progress
        value={percentage}
        className="h-1.5 w-full bg-muted border border-border/20"
        indicatorClassName={
          data.blocked || isOverLimit
            ? "bg-destructive transition-all"
            : isNearLimit
            ? "bg-amber-500 transition-all"
            : "bg-primary transition-all"
        }
      />

      <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground font-semibold">
        <span>
          {t("lacerta.storageUsedProgress", "{{used}} of {{limit}}", {
            used: formatBytes(data.used),
            limit: formatBytes(data.limit),
          })}
        </span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}
