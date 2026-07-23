"use client";

import React, { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Users, Loader2, Star, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { fetcher } from "@/lib/fetcher";

interface FriendProgressEntry {
  id: string | number;
  username: string;
  status: string;
  progress: number | null;
  volumes: number | null;
  score: number | null;
  updatedAt: string;
  friend: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    nickname: string | null;
  } | null;
}

interface RrMediaFriendsProgressProps {
  mediaId: string;
  mediaType: string; // "anime" | "manga" | "tv" | "movie" | "game" | "book"
}

const getWatchlistUrl = (username: string, type: string): string => {
  const typeLower = type.toLowerCase();
  switch (typeLower) {
    case "anime":
      return `/aquila/user/${username}/anime`;
    case "manga":
      return `/aquila/user/${username}/manga`;
    case "tv":
      return `/aquila/user/${username}/tv`;
    case "movie":
      return `/aquila/user/${username}/movies`;
    case "game":
      return `/aquila/user/${username}/games`;
    case "book":
      return `/aquila/user/${username}/books`;
    default:
      return `/polaris/user/${username}`;
  }
};

export function RrMediaFriendsProgress({
  mediaId,
  mediaType,
}: RrMediaFriendsProgressProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const { data: session, status: authStatus } = useSession();
  const [limit, setLimit] = useState<number>(5);

  const fetchUrl =
    mediaId && authStatus === "authenticated" && session?.accessToken
      ? `${process.env.NEXT_PUBLIC_API_URL}/friends/media-progress?mediaId=${encodeURIComponent(mediaId)}&mediaType=${encodeURIComponent(mediaType)}&limit=${limit}`
      : null;

  const { data = [], isLoading } = useSWR<FriendProgressEntry[]>(
    fetchUrl ? [fetchUrl, session?.accessToken] : null,
    fetcher,
    { shouldRetryOnError: false },
  );

  if (authStatus !== "authenticated" || (!isLoading && data.length === 0)) {
    return null; // Return null if unauthenticated or no friends tracking
  }

  const getStatusLabel = (status: string): string => {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case "WATCHING":
        return t("aquila.watching");
      case "PLAYING":
        return t("aquila.playing");
      case "READING":
        return t("aquila.reading");
      case "COMPLETED":
        return t("aquila.completed");
      case "ON_HOLD":
        return t("aquila.onHold");
      case "DROPPED":
        return t("aquila.dropped");
      case "PLANNING":
        return t("aquila.planning");
      default:
        return status;
    }
  };

  const getProgressLabel = (progress: number | null, type: string): string => {
    if (progress === null) return "";
    const typeLower = type.toLowerCase();
    if (typeLower === "anime" || typeLower === "tv") {
      return `${t("aquila.episodeShort")} ${progress}`;
    }
    if (typeLower === "manga" || typeLower === "book") {
      return `${t("aquila.chapterShort")} ${progress}`;
    }
    if (typeLower === "game") {
      return `${progress} ${t("aquila.hoursShort")}`;
    }
    return `${progress}`;
  };

  const showProgress = (status: string): boolean => {
    const statusUpper = status.toUpperCase();
    return !["COMPLETED", "FINISHED", "PLANNING"].includes(statusUpper);
  };

  const hasMore = data.length === limit;

  return (
    <Card className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-4 space-y-3.5 shadow-sm hover:shadow-md transition-all duration-200">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-1.5 border-b border-border/20 pb-2">
        <Users className="size-3.5 text-primary shrink-0" />
        <span>{t("aquila.friendsActivity")}</span>
      </h3>

      {isLoading && data.length === 0 ? (
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ScrollArea className="max-h-65 pr-1.5">
            <div className="flex flex-col gap-2">
              {data.map((entry) => {
                const friend = entry.friend;
                if (!friend) return null;

                const nameToDisplay =
                  friend.nickname || friend.displayName || friend.username;
                const statusLabel = getStatusLabel(entry.status);
                const progressLabel = showProgress(entry.status)
                  ? getProgressLabel(entry.progress, mediaType)
                  : "";
                const watchlistUrl = getWatchlistUrl(
                  friend.username,
                  mediaType,
                );

                return (
                  <div
                    key={friend.username}
                    className="relative flex items-center justify-between gap-2 py-2 px-3 rounded-xl border border-border/10 bg-muted/15 hover:bg-muted/40 transition-all duration-200"
                  >
                    {/* Card-wide Link to friend's watchlist */}
                    <Link
                      href={watchlistUrl}
                      className="absolute inset-0 rounded-xl z-0"
                      aria-label={`${nameToDisplay}'s watchlist`}
                    />

                    {/* Left: Avatar & Username */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 z-10">
                      <Avatar className="h-8 w-8 border shrink-0">
                        <AvatarImage
                          src={
                            friend.avatarUrl
                              ? getSafeImageUrl(friend.avatarUrl)
                              : ""
                          }
                        />
                        <AvatarFallback className="text-[10px] font-bold uppercase">
                          {friend.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        href={`/polaris/user/${friend.username}`}
                        className="text-[13px] font-semibold text-foreground truncate hover:text-primary transition-colors pointer-events-auto z-20"
                        title={nameToDisplay}
                      >
                        {nameToDisplay}
                      </Link>
                    </div>

                    {/* Middle: Status & Progress */}
                    <div className="flex items-center justify-center text-center px-2 z-10 shrink-0">
                      <span className="text-xs font-medium text-muted-foreground bg-accent/20 border border-border/20 px-2.5 py-1 rounded-lg truncate">
                        {statusLabel} {progressLabel && `• ${progressLabel}`}
                      </span>
                    </div>

                    {/* Right: Score */}
                    <div className="flex items-center justify-end z-10 min-w-10 shrink-0">
                      {entry.score ? (
                        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                          <Star className="size-3 fill-amber-500 shrink-0" />
                          {entry.score}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60 italic">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {hasMore && (
            <Button
              variant="ghost"
              size="xs"
              onClick={(): void => setLimit((prev) => prev + 5)}
              className="w-full text-[10px] h-7 font-bold text-muted-foreground hover:text-foreground hover:bg-muted border border-dashed border-border/40 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
            >
              <ChevronDown className="size-3" />
              {t("showMore")}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
