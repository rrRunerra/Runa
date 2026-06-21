"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Lock, Inbox, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import OverviewTab from "./components/OverviewTab";
import FavoritesTab from "./components/FavoritesTab";
import ListsTab from "./components/ListsTab";
import StatsTab from "./components/StatsTab";
import {
  getConnectionIcon,
  getConnectionColorClass,
} from "./components/ConnectionHelpers";
import Image from "next/image";
import AppSwitcherDropdown from "@/components/AppSwitcherDropdown";
import { apps } from "../../../../../../config/apps";

export interface UserProfileData {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  sidebarCardBackgroundUrl: string | null;
  profileSettings: any | null;
  private: boolean;
  connections: any[];
}

export interface FavoriteItem {
  id: string;
  userId: string;
  type: string;
  mediaId: string;
  createdAt: string;
  title: string;
  image: string;
}

type TabType = "overview" | "favorites" | "lists" | "stats";

export default function UserPageClient() {
  const params = useParams();
  const name = params?.name as string | undefined;
  const { data: session } = useSession();

  const [user, setUser] = useState<UserProfileData | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [listCounts, setListCounts] = useState<
    Record<
      string,
      {
        counts?: Record<string, number>;
        total: number;
        private?: boolean;
        failed?: boolean;
      }
    >
  >({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const isOwner =
    session?.user?.username?.toLowerCase() === name?.toLowerCase();

  useEffect(() => {
    if (name) {
      document.title = `Polaris > User > ${name}`;
    }
  }, [name]);

  useEffect(() => {
    if (!name) return;

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch main user profile
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/${name}`,
        );
        if (!userRes.ok) {
          if (userRes.status === 404) {
            throw new Error("User not found");
          }
          throw new Error("Failed to load user profile");
        }
        const userData = await userRes.json();
        setUser(userData);

        // If user profile is private and we are not the owner, we can skip other fetches
        if (userData.private && !isOwner) {
          setLoading(false);
          return;
        }

        // 2. Fetch favorites and list details concurrently using Promise.allSettled
        const favPromise = fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/user/${name}`,
        ).then(async (r) => (r.ok ? r.json() : []));

        const categories = ["anime", "manga", "tv", "movie", "game", "book"];
        const listPromises = categories.map(async (cat) => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/list/${cat}/user/${name}?limit=1`,
            );
            if (res.ok) {
              const data = await res.json();
              return { category: cat, data };
            }
            if (res.status === 403) {
              return { category: cat, private: true };
            }
          } catch (e) {
            // Ignored
          }
          return { category: cat, failed: true };
        });

        const [favResult, ...listResults] = await Promise.all([
          favPromise,
          ...listPromises,
        ]);

        setFavorites(favResult);

        const countsMap: Record<string, any> = {};
        listResults.forEach((res) => {
          if (res.private) {
            countsMap[res.category] = { total: 0, private: true };
          } else if (res.data) {
            countsMap[res.category] = {
              counts: res.data.counts || {},
              total: res.data.counts?.all || 0,
            };
          } else {
            countsMap[res.category] = { total: 0, failed: true };
          }
        });
        setListCounts(countsMap);
      } catch (err: any) {
        setError(err.message || "Failed to load profile details");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [name, isOwner]);

  // Loading Screen
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans antialiased p-4 lg:p-6">
        <Skeleton className="w-full aspect-5/1 md:aspect-6/1 rounded-3xl relative" />
        <div className="w-full px-4 md:px-6 relative -mt-10 md:-mt-16 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 pb-6 border-b border-border/30">
            <Skeleton className="size-24 md:size-32 rounded-3xl shrink-0" />
            <div className="space-y-2.5 flex-1 pt-4">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error / User Not Found Screen
  if (error || !user) {
    return (
      <div className="w-full min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card/90 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <div className="p-3.5 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mb-4">
            <Inbox className="size-8" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            {error || "User not found"}
          </h1>
          <p className="text-xs text-muted-foreground">
            The profile page could not be loaded. Ensure the spelling is
            correct.
          </p>
          <Link
            href="/polaris/dash"
            className="mt-6 rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Button
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-white hover:bg-muted rounded-xl h-9 flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Private Lock Screen
  if (user.private && !isOwner) {
    return (
      <div className="w-full min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card/90 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-8 text-center flex flex-col items-center justify-center">
          <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-4">
            <Lock className="size-8" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            This profile is private
          </h1>
          <p className="text-xs text-muted-foreground">
            @{user.username} has chosen to keep their profile credentials
            private.
          </p>
          <Link
            href="/polaris/dash"
            className="mt-6 rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Button
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-white hover:bg-muted rounded-xl h-9 flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = user.displayName || user.username;
  const bio = user.profileSettings?.bio || "";
  const location = user.profileSettings?.location || "";
  const joinedDate = user.profileSettings?.joinedAt
    ? new Date(user.profileSettings.joinedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : null;

  // Sum of total items across public lists
  const totalItemsTracked = Object.values(listCounts).reduce(
    (acc, curr) => acc + (curr.total || 0),
    0,
  );
  const polarisApp = apps.find((a) => a.name === "Polaris") || apps[3];

  // Filter connections: don't show private ones if we are not the owner
  const visibleConnections =
    user.connections?.filter((conn: any) => isOwner || !conn.private) || [];

  return (
    <div className="relative flex flex-col w-full min-h-screen gap-6 p-4 lg:p-6 bg-background text-foreground antialiased font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 w-full z-10">
        {/* Top-Left App Switcher */}
        <div className="flex justify-start">
          <AppSwitcherDropdown
            activeApp={polarisApp}
            align="start"
            side="bottom"
            triggerClassName="border border-border/40 bg-card/25 backdrop-blur-xs hover:bg-card/40 hover:border-border/60"
          />
        </div>

        {/* User Profile Header */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-card/25 border border-border/40 shadow-2xl mb-2">
          {/* Banner Image / Gradient */}
          <div className="relative w-full aspect-21/9 sm:aspect-3/1 max-h-[260px] overflow-hidden bg-linear-to-r from-indigo-950/40 via-purple-950/40 to-pink-950/40 border-b border-border/20">
            {user.bannerUrl ? (
              <img
                src={getSafeImageUrl(user.bannerUrl)}
                alt={`${displayName}'s banner`}
                className="w-full h-full object-cover opacity-90 transition-all duration-700 hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-tr from-primary/20 via-violet-900/10 to-transparent relative">
                <div
                  className="absolute inset-0 bg-radial-at-t from-primary/10 via-transparent to-transparent"
                  aria-hidden="true"
                />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-background/80 via-background/20 to-transparent" />
          </div>

          {/* User Info Container */}
          <div className="relative px-6 pb-6 pt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Avatar - overlapping the banner */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0 self-start sm:self-auto z-20">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background ring-4 ring-primary/20 shadow-2xl rounded-full">
                  <AvatarImage
                    src={getSafeImageUrl(user.avatarUrl)}
                    alt={user.username}
                  />
                  <AvatarFallback className="text-3xl font-extrabold bg-muted text-primary border border-border/60">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Text info */}
              <div className="flex-1 flex flex-col gap-1 z-10 pb-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground drop-shadow-md">
                    {displayName}
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider">
                    Profile
                  </span>
                  {isOwner && (
                    <Badge
                      variant="outline"
                      className="bg-primary/5 text-primary border-primary/20 text-[9px] font-bold py-0.5 tracking-wider uppercase"
                    >
                      You
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/80 font-semibold">
                  @{user.username}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex items-center gap-1 border-b border-border/40 pb-px shrink-0"
          role="tablist"
          aria-label="User profile tabs"
        >
          {(["overview", "favorites", "lists", "stats"] as TabType[]).map(
            (tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab}`}
                  id={`tab-${tab}`}
                  className={cn(
                    "relative px-4 py-3 text-xs md:text-sm font-semibold transition-all select-none cursor-pointer uppercase tracking-wider",
                    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-t-xl",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <>
                      <motion.div
                        layoutId="activeUserTabIndicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-md"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                      <motion.div
                        layoutId="activeUserTabHighlight"
                        className="absolute inset-0 bg-primary/5 rounded-t-xl"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                        style={{ pointerEvents: "none" }}
                      />
                    </>
                  )}
                  <span>{tab}</span>
                </button>
              );
            },
          )}
        </div>

        {/* Tab Content Panel */}
        <div
          className="flex-1 pt-4"
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <OverviewTab bio={bio} connections={visibleConnections} />
              )}

              {/* FAVORITES TAB */}
              {activeTab === "favorites" && (
                <FavoritesTab favorites={favorites} />
              )}

              {/* LISTS TAB */}
              {activeTab === "lists" && (
                <ListsTab name={name || ""} listCounts={listCounts} />
              )}

              {/* STATS TAB */}
              {activeTab === "stats" && name && <StatsTab name={name} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
