"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { hasPermission, AquilaFlags } from "@runa/permissions";

export interface RrMediaRefreshButtonProps {
  mediaType: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  mediaId: string;
  onRefreshed?: () => void;
}

export function RrMediaRefreshButton({
  mediaType,
  mediaId,
  onRefreshed,
}: RrMediaRefreshButtonProps): React.JSX.Element | null {
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `cooldown_refresh:${mediaType}:${mediaId}`;

  // Check permission
  const canRefresh = hasPermission(
    session.data?.user?.permissions,
    AquilaFlags.MEDIA_REFRESH
  );

  useEffect(() => {
    // Check local storage for existing cooldown on mount
    const savedCooldown = localStorage.getItem(storageKey);
    if (savedCooldown) {
      const expiry = parseInt(savedCooldown, 10);
      const remaining = Math.ceil((expiry - Date.now()) / 1000);
      if (remaining > 0) {
        setCooldownRemaining(remaining);
        startTimer(remaining);
      } else {
        localStorage.removeItem(storageKey);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [mediaType, mediaId]);

  const startTimer = (durationSeconds: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let remaining = durationSeconds;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        setCooldownRemaining(0);
        localStorage.removeItem(storageKey);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      } else {
        setCooldownRemaining(remaining);
      }
    }, 1000);
  };

  const handleRefresh = async () => {
    if (loading || cooldownRemaining > 0) return;

    setLoading(true);
    const apiType = mediaType === "movie" ? "movie" : mediaType;
    const url = `${process.env.NEXT_PUBLIC_API_URL}/${apiType}/refresh/${mediaId}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (session.data?.accessToken) {
      headers["Authorization"] = `Bearer ${session.data.accessToken}`;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
      });

      if (res.ok) {
        toast.success("Media successfully refreshed!");
        
        // Set 60 seconds cooldown
        const expiry = Date.now() + 60000;
        localStorage.setItem(storageKey, expiry.toString());
        setCooldownRemaining(60);
        startTimer(60);

        if (onRefreshed) {
          onRefreshed();
        }
      } else if (res.status === 429) {
        toast.error("This media was refreshed recently. Please wait.");
      } else {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData.message || "Failed to refresh media details.";
        toast.error(msg);
      }
    } catch (e) {
      toast.error("An error occurred while refreshing.");
    } finally {
      setLoading(false);
    }
  };

  // Only render if the user has the MEDIA_REFRESH permission (or admin, checked by hasPermission)
  if (!canRefresh) return null;

  return (
    <Button
      variant="outline"
      className="w-full cursor-pointer rounded-xl flex items-center justify-center gap-2"
      size="lg"
      disabled={loading || cooldownRemaining > 0}
      onClick={handleRefresh}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (
        <RefreshCw className={`size-4 ${cooldownRemaining > 0 ? "text-muted-foreground" : "text-primary"}`} aria-hidden="true" />
      )}
      <span>
        {cooldownRemaining > 0
          ? `Refresh (${cooldownRemaining}s)`
          : "Force Refresh"}
      </span>
    </Button>
  );
}
