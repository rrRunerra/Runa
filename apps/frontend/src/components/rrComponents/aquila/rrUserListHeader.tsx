"use client";

import React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getSafeImageUrl } from "@/lib/inputValidation";

export interface RrUserListHeaderProps {
  userData: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  } | null;
  listTitle: string;
}

export function RrUserListHeader({
  userData,
  listTitle,
}: RrUserListHeaderProps): React.JSX.Element | null {
  if (!userData) return null;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-card/40 border border-border/40 shadow-2xl mb-2 select-none">
      {/* Banner Image / Gradient */}
      <div className="relative w-full aspect-4.5/1 overflow-hidden bg-linear-to-r from-primary/10 via-muted/20 to-accent/10 border-b border-border/30">
        {userData.bannerUrl ? (
          <Image
            src={getSafeImageUrl(userData.bannerUrl)}
            alt={`${userData.displayName || userData.username}'s banner`}
            fill
            sizes="100vw"
            className="object-cover opacity-90 transition-all duration-700 hover:scale-105"
            priority
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-linear-to-tr from-primary/20 via-primary/5 to-transparent relative">
            <div className="absolute inset-0 bg-radial-at-t from-primary/10 via-transparent to-transparent" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      {/* User Info Container */}
      <div className="relative px-6 pb-6 pt-3 flex flex-col sm:flex-row sm:items-end gap-5">
        {/* Avatar - overlapping the banner */}
        <div className="relative -mt-16 sm:-mt-20 shrink-0 self-start sm:self-auto z-20">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background ring-4 ring-primary/20 shadow-2xl rounded-full">
            <AvatarImage
              src={getSafeImageUrl(userData.avatarUrl)}
              alt={userData.username}
            />
            <AvatarFallback className="text-3xl font-extrabold bg-muted text-primary border border-border">
              {userData.displayName?.[0]?.toUpperCase() ||
                userData.username?.[0]?.toUpperCase() ||
                "?"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Text info */}
        <div className="flex-1 flex flex-col gap-1 z-10 pb-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground drop-shadow-md">
              {userData.displayName || userData.username}
            </h2>
            <Badge
              variant="secondary"
              className="mt-0.5 uppercase tracking-wider text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              {listTitle}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground/80 font-medium">
            @{userData.username}
          </p>
        </div>
      </div>
    </div>
  );
}
