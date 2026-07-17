"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, Mail, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface UserProfileInfo {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  createdAt?: string | Date;
  userPublicKey?: string | null;
  bio?: string;
}

interface UserProfileCardProps {
  user: UserProfileInfo;
  children: React.ReactNode;
  triggerMode?: "click" | "hover";
}

export default function UserProfileCard({
  user,
  children,
  triggerMode = "click",
}: UserProfileCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getGradientForUser = (username: string) => {
    const colors = [
      "from-pink-500 to-rose-500",
      "from-purple-600 to-indigo-600",
      "from-blue-500 to-teal-500",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-violet-600 to-purple-600",
      "from-cyan-500 to-blue-500",
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getJoinDate = () => {
    if (!user.createdAt) return t("lacerta.userProfile.joinDateUnknown", "Unknown");
    const date = new Date(user.createdAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleMouseEnter = () => {
    if (triggerMode !== "hover") return;

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (!open && !openTimerRef.current) {
      openTimerRef.current = setTimeout(() => {
        setOpen(true);
        openTimerRef.current = null;
      }, 2000); // 2 seconds delay
    }
  };

  const handleMouseLeave = () => {
    if (triggerMode !== "hover") return;

    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (open && !closeTimerRef.current) {
      closeTimerRef.current = setTimeout(() => {
        setOpen(false);
        closeTimerRef.current = null;
      }, 300); // Give user brief moment to slide cursor into PopoverContent
    }
  };

  const handleContentMouseEnter = () => {
    if (triggerMode !== "hover") return;

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleContentMouseLeave = () => {
    if (triggerMode !== "hover") return;

    if (open && !closeTimerRef.current) {
      closeTimerRef.current = setTimeout(() => {
        setOpen(false);
        closeTimerRef.current = null;
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const gradientClass = getGradientForUser(user.username);
  const initials = (user.displayName || user.username || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="hover:underline cursor-pointer font-bold hover:text-primary transition-colors inline-flex"
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
        className="w-72 p-0 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl z-50 text-white"
      >
        {/* Banner */}
        <div className="relative h-20 w-full">
          {user.bannerUrl ? (
            <Image
              src={user.bannerUrl}
              alt={t("lacerta.userProfile.bannerAlt", "Profile Banner")}
              fill
              className="object-cover"
            />
          ) : (
            <div className={`h-full w-full bg-linear-to-br ${gradientClass}`} />
          )}

          {/* Overlapping Avatar */}
          <div className="absolute top-10 left-4">
            <div className="relative group size-[72px] rounded-full border-4 border-neutral-900 bg-neutral-800 flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={t("lacerta.userProfile.avatarAlt", { username: user.username, defaultValue: "{{username}}'s avatar" })}
                  width={72}
                  height={72}
                  className="object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-neutral-300">
                  {initials}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Card Body */}
        <div className="pt-10 px-4 pb-4">
          <div className="flex flex-col">
            <span className="text-base font-bold text-white leading-tight">
              {user.displayName || user.username}
            </span>
            <span className="text-xs text-neutral-400 mt-0.5">
              @{user.username}
            </span>
          </div>

          <div className="h-px bg-neutral-800 my-4" />

          {/* User Details */}
          <div className="flex flex-col gap-3.5">
            {/* About Me */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                {t("lacerta.userProfile.aboutMe", "About Me")}
              </span>
              <div className="text-xs text-neutral-200 leading-normal text-left">
                {user.bio || t("lacerta.userProfile.noBio", "No bio written yet.")}
              </div>
            </div>
          </div>

          <div className="h-px bg-neutral-800 my-4" />

          {/* Mock Action Button */}
          <button className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98">
            <MessageSquare className="size-3.5" />
            {t("lacerta.userProfile.sendMessage", "Send Message")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
