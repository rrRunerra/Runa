"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface RrSidebarUserCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  sidebarCardBackgroundUrl?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
  showEmail?: boolean;
  unreadCount?: number;
  showChevrons?: boolean;
  className?: string;
  avatarClassName?: string;
}

export const RrSidebarUserCard = React.forwardRef<
  HTMLDivElement,
  RrSidebarUserCardProps
>(
  (
    {
      sidebarCardBackgroundUrl,
      avatarUrl,
      displayName,
      username,
      email,
      showEmail = false,
      unreadCount = 0,
      showChevrons = true,
      className,
      avatarClassName,
      ...props
    },
    ref
  ) => {
    const safeBgUrl = sidebarCardBackgroundUrl
      ? sidebarCardBackgroundUrl.startsWith("blob:")
        ? sidebarCardBackgroundUrl
        : getSafeImageUrl(sidebarCardBackgroundUrl)
      : null;

    const safeAvatarUrl = avatarUrl
      ? avatarUrl.startsWith("blob:")
        ? avatarUrl
        : getSafeImageUrl(avatarUrl)
      : "";

    const nameToShow = displayName || username || "User";
    const initial = nameToShow.charAt(0).toUpperCase();

    return (
      <div
        ref={ref}
        {...props}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 rounded-xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden transition-all duration-300 isolate transform-[translate3d(0,0,0)] select-none",
          className
        )}
      >
        {/* Background image & gradient overlay */}
        {safeBgUrl && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center z-0"
              style={{ backgroundImage: `url(${safeBgUrl})` }}
            />
            {/* Dark gradient scrim on text region for 100% contrast on bright/white images */}
            <div className="absolute inset-0 bg-linear-to-r from-black/92 via-black/75 to-black/20 z-0" />
          </>
        )}

        {/* Avatar & optional unread badge */}
        <div className="relative shrink-0 z-10">
          <Avatar
            className={cn(
              "size-9 border border-zinc-800/60 shadow-xs",
              avatarClassName
            )}
          >
            <AvatarImage src={safeAvatarUrl} alt={nameToShow} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold uppercase">
              {initial}
            </AvatarFallback>
          </Avatar>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground border border-zinc-950">
              {unreadCount}
            </span>
          )}
        </div>

        {/* User Info with high contrast white text & text shadow */}
        <div className="grid flex-1 text-left leading-tight ml-1 z-10 min-w-0">
          <span
            className={cn(
              "truncate text-sm font-extrabold",
              safeBgUrl
                ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]"
                : "text-foreground"
            )}
          >
            {nameToShow}
          </span>
          {showEmail && email && (
            <span
              className={cn(
                "truncate text-xs font-medium mt-0.5",
                safeBgUrl
                  ? "text-zinc-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]"
                  : "text-muted-foreground/80"
              )}
            >
              {email}
            </span>
          )}
        </div>

        {/* Optional Chevrons */}
        {showChevrons && (
          <ChevronsUpDown
            className={cn(
              "ml-auto size-4 z-10 shrink-0",
              safeBgUrl
                ? "text-zinc-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                : "text-muted-foreground/70"
            )}
          />
        )}
      </div>
    );
  }
);

RrSidebarUserCard.displayName = "RrSidebarUserCard";
