"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
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
  entries?: Array<any>;
}

export function RrUserListHeader({
  userData,
  listTitle,
}: RrUserListHeaderProps): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!userData) return null;

  const profileLink = `/polaris/user/${encodeURIComponent(userData.username)}`;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-border/40 shadow-2xl mb-4 select-none group">
      {/* Banner Container matching exact 4.5:1 aspect ratio */}
      <div className="relative w-full aspect-4.5/1 overflow-hidden bg-muted/40">
        {userData.bannerUrl ? (
          <Image
            src={getSafeImageUrl(userData.bannerUrl)}
            alt={t("aquila.userBannerAlt", {
              name: userData.displayName || userData.username,
            })}
            fill
            sizes="100vw"
            className="object-cover object-center opacity-95 transition-transform duration-700 hover:scale-[1.01]"
            priority
            unoptimized
          />
        ) : (
          /* Fallback Ambient Gradient Mesh */
          <div className="w-full h-full bg-linear-to-br from-primary/25 via-muted/30 to-accent/20 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary/25 via-transparent to-transparent" />
            <div className="absolute top-1/3 left-1/4 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          </div>
        )}

        {/* Ambient Dark Bottom Vignette */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />

        {/* Separate Floating Cards Floating Over the Banner */}
        <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-6 z-20 flex items-center gap-3 sm:gap-4 max-w-[90%]">
          {/* Floating Card 1: Avatar -> Link to Polaris User Page */}
          <Link
            href={profileLink}
            className="relative shrink-0 rounded-full p-1 bg-card/65 backdrop-blur-xl border border-border/60 shadow-2xl shadow-black/40 transition-transform duration-300 hover:scale-105 hover:border-primary/50"
            title={t("aquila.viewProfile", {
              name: userData.displayName || userData.username,
            })}
          >
            <Avatar className="h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20 border-2 border-background shadow-md rounded-full">
              <AvatarImage
                src={getSafeImageUrl(userData.avatarUrl)}
                alt={userData.username}
              />
              <AvatarFallback className="text-xl sm:text-2xl font-black bg-muted text-primary border border-border">
                {userData.displayName?.[0]?.toUpperCase() ||
                  userData.username?.[0]?.toUpperCase() ||
                  "?"}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Floating Card 2: Display Name & List Badge -> Link to Polaris User Page */}
          <Link
            href={profileLink}
            className="flex items-center gap-2 sm:gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/60 shadow-2xl shadow-black/40 hover:bg-card/85 hover:border-primary/50 transition-all group/name"
            title={t("aquila.viewProfile", {
              name: userData.displayName || userData.username,
            })}
          >
            <h2 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-foreground truncate drop-shadow-sm group-hover/name:text-primary transition-colors">
              {userData.displayName || userData.username}
            </h2>
            <Badge
              variant="secondary"
              className="uppercase tracking-wider text-[9px] sm:text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 shadow-xs backdrop-blur-md shrink-0"
            >
              {listTitle}
            </Badge>
          </Link>
        </div>
      </div>
    </div>
  );
}
