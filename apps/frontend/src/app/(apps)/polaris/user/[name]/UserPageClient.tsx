"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  User,
  Lock,
  Tv,
  Book,
  Gamepad2,
  BookOpen,
  Film,
  Heart,
  Calendar,
  Settings,
  ExternalLink,
  Loader2,
  Inbox,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getSafeImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StatsDashboard from "@/components/aquila/stats/StatsDashboard";

// Custom Brand SVGs
const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 127.14 96.36" fill="currentColor" {...props}>
    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.95,54.65,1,77.53a105.73,105.73,0,0,0,32,16.19,79,79,0,0,0,6.85-11.15,68.42,68.42,0,0,1-10.75-5.13c.91-.66,1.8-1.34,2.65-2a75.58,75.58,0,0,0,80.83,0c.85.7,1.74,1.37,2.65,2a68.42,68.42,0,0,1-10.75,5.13,79,79,0,0,0,6.85,11.15,105.73,105.73,0,0,0,32-16.19C129.66,48.78,123.6,26,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
  </svg>
);

const AniListIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 17.53v2.42a.62.62 0 0 1-.62.63H15a.62.62 0 0 1-.62-.63v-2.42a.62.62 0 0 1 .62-.63h8.38a.62.62 0 0 1 .62.63zm-9.33-4.52a.62.62 0 0 0-.62.63v5.62a.62.62 0 0 0 .62.63h3.58a.62.62 0 0 0 .62-.63v-5.62a.62.62 0 0 0-.62-.63zM2.4 20.58h6.24a2.4 2.4 0 0 0 2.4-2.4V4.8A2.4 2.4 0 0 0 8.64 2.4H2.4A2.4 2.4 0 0 0 0 4.8v13.38a2.4 2.4 0 0 0 2.4 2.4zm2.16-5.83h1.92a2.4 2.4 0 0 1 2.4 2.4v.63a.48.48 0 0 1-.48.48H4.08a.48.48 0 0 1-.48-.48v-.63a2.4 2.4 0 0 1 2.4-2.4zm12.33-9.95l6.57 10.12a.63.63 0 0 1-.53.97H13.43a.63.63 0 0 1-.53-.97l6.57-10.12a.62.62 0 0 1 1.06 0z"/>
  </svg>
);

const MALIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M11.96 0C5.355 0 0 5.355 0 11.96c0 6.605 5.355 11.96 11.96 11.96 6.605 0 11.96-5.355 11.96-11.96C23.92 5.355 18.565 0 11.96 0zm-1.802 16.486H8.563V9.262H7.218l.707-1.121H10.16v8.345zm4.846 0h-1.523l-.683-2.684-1.22 2.684h-1.464l2.124-4.521-1.92-3.824h1.564l1.103 2.508 1.157-2.508h1.464L13.1 12.02l1.904 4.466zm3.328 0H16.41V8.141h1.517v6.828h2.02v1.517z"/>
  </svg>
);

const SimklIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.88 16.892H6.12v-9.78h11.76v9.78zM12 9.006c-1.656 0-3 1.344-3 3s1.344 3 3 3 3-1.344 3-3-1.344-3-3-3z"/>
  </svg>
);

function getConnectionIcon(provider: string) {
  const p = provider.toUpperCase();
  if (p === "DISCORD") return DiscordIcon;
  if (p === "ANILIST") return AniListIcon;
  if (p === "MAL") return MALIcon;
  return SimklIcon;
}

function getConnectionColorClass(provider: string): string {
  const p = provider.toUpperCase();
  if (p === "DISCORD") return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  if (p === "ANILIST") return "bg-sky-500/10 text-sky-400 border-sky-500/20";
  if (p === "MAL") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  return "bg-amber-500/10 text-amber-400 border-amber-500/20";
}

interface UserProfileData {
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

interface FavoriteItem {
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
  const [listCounts, setListCounts] = useState<Record<string, { counts?: Record<string, number>; total: number; private?: boolean; failed?: boolean }>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const isOwner = session?.user?.username?.toLowerCase() === name?.toLowerCase();

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
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${name}`);
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
        const favPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites/user/${name}`)
          .then(async (r) => (r.ok ? r.json() : []));

        const categories = ["anime", "manga", "tv", "movie", "game", "book"];
        const listPromises = categories.map(async (cat) => {
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/list/${cat}/user/${name}?limit=1`);
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
          ...listPromises
        ]);

        setFavorites(favResult);

        const countsMap: Record<string, any> = {};
        listResults.forEach((res) => {
          if (res.private) {
            countsMap[res.category] = { total: 0, private: true };
          } else if (res.data) {
            countsMap[res.category] = {
              counts: res.data.counts || {},
              total: res.data.counts?.all || 0
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
        <div className="max-w-7xl mx-auto w-full px-4 md:px-6 relative -mt-10 md:-mt-16 space-y-6">
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
            <Inbox className="size-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{error || "User not found"}</h1>
          <p className="text-xs text-muted-foreground">The profile page could not be loaded. Ensure the spelling is correct.</p>
          <Link href="/polaris/dash" className="mt-6">
            <Button variant="ghost" className="text-xs text-muted-foreground hover:text-white hover:bg-muted rounded-xl h-9 flex items-center gap-1.5">
              <ArrowLeft className="size-3.5" />
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
            <Lock className="size-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">This profile is private</h1>
          <p className="text-xs text-muted-foreground">@{user.username} has chosen to keep their profile credentials private.</p>
          <Link href="/polaris/dash" className="mt-6">
            <Button variant="ghost" className="text-xs text-muted-foreground hover:text-white hover:bg-muted rounded-xl h-9 flex items-center gap-1.5">
              <ArrowLeft className="size-3.5" />
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
    ? new Date(user.profileSettings.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : null;

  // Favorites group mapping
  const animeFavs = favorites.filter((f) => f.type === "ANIME");
  const mangaFavs = favorites.filter((f) => f.type === "MANGA");
  const tvFavs = favorites.filter((f) => f.type === "TV");
  const movieFavs = favorites.filter((f) => f.type === "MOVIE");
  const gameFavs = favorites.filter((f) => f.type === "GAME");
  const bookFavs = favorites.filter((f) => f.type === "BOOK");

  // Sum of total items across public lists
  const totalItemsTracked = Object.values(listCounts).reduce((acc, curr) => acc + (curr.total || 0), 0);

  return (
    <div className="relative flex flex-col w-full min-h-screen gap-6 p-4 lg:p-6 bg-background text-foreground antialiased font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 w-full z-10 max-w-7xl mx-auto">
        
        {/* User Profile Header */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-card/25 border border-border/40 shadow-2xl mb-2">
          {/* Banner Image / Gradient */}
          <div className="relative h-44 sm:h-60 w-full overflow-hidden bg-linear-to-r from-indigo-950/40 via-purple-950/40 to-pink-950/40 border-b border-border/20">
            {user.bannerUrl ? (
              <img
                src={getSafeImageUrl(user.bannerUrl)}
                alt={`${displayName}'s banner`}
                className="w-full h-full object-cover opacity-90 transition-all duration-700 hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-tr from-primary/20 via-violet-900/10 to-transparent relative">
                <div className="absolute inset-0 bg-radial-at-t from-primary/10 via-transparent to-transparent" />
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
                  <AvatarImage src={getSafeImageUrl(user.avatarUrl)} alt={user.username} />
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
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-bold py-0.5 tracking-wider uppercase">
                      You
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/80 font-semibold">
                  @{user.username}
                </p>

                {/* Profile connection badges in header */}
                {user.connections?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {user.connections.map((conn) => {
                      const Icon = getConnectionIcon(conn.provider);
                      const colorClass = getConnectionColorClass(conn.provider);
                      return (
                        <div
                          key={conn.id}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold select-none uppercase tracking-wide",
                            colorClass
                          )}
                        >
                          <Icon className="size-2.5" />
                          <span>{conn.provider}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-border/40 pb-px shrink-0">
          {(["overview", "favorites", "lists", "stats"] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-4 py-3 text-xs md:text-sm font-semibold transition-all select-none cursor-pointer outline-hidden uppercase tracking-wider",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <>
                    <motion.div
                      layoutId="activeUserTabIndicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-md"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                    <motion.div
                      layoutId="activeUserTabHighlight"
                      className="absolute inset-0 bg-primary/5 rounded-t-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      style={{ pointerEvents: "none" }}
                    />
                  </>
                )}
                <span>{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1">
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Main Panels (2/3 width) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Bio Card */}
                    <Card className="border-border/60 bg-card/30 backdrop-blur-xs rounded-2xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm font-bold uppercase tracking-wider">About Me</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                        {bio ? (
                          <p className="whitespace-pre-wrap">{bio}</p>
                        ) : (
                          <p className="italic text-muted-foreground/60">No description has been written yet.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Detailed Connections Card */}
                    <Card className="border-border/60 bg-card/30 backdrop-blur-xs rounded-2xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm font-bold uppercase tracking-wider">Linked Accounts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {user.connections?.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {user.connections.map((conn) => {
                              const Icon = getConnectionIcon(conn.provider);
                              const colorClass = getConnectionColorClass(conn.provider);
                              return (
                                <div
                                  key={conn.id}
                                  className={cn(
                                    "flex items-center gap-3 p-3.5 rounded-xl border bg-card/25",
                                    colorClass
                                  )}
                                >
                                  <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                                    <Icon className="size-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                                      {conn.provider}
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                      {conn.linkedUsername || "Connected"}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/60 gap-1.5">
                            <User className="size-6 stroke-1" />
                            <span className="text-xs italic">No third-party accounts are linked to this profile.</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Side Stats Panel (1/3 width) */}
                  <div className="space-y-6">
                    <Card className="border-border/60 bg-card/30 backdrop-blur-xs rounded-2xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-sm font-bold uppercase tracking-wider">Overview Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                          <span className="text-xs text-muted-foreground">Total Tracked Items</span>
                          <span className="text-sm font-bold text-white">{totalItemsTracked}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/30">
                          <span className="text-xs text-muted-foreground">Favorites Count</span>
                          <span className="text-sm font-bold text-white">{favorites.length}</span>
                        </div>
                        {location && (
                          <div className="flex justify-between items-center py-2 border-b border-border/30">
                            <span className="text-xs text-muted-foreground">Location</span>
                            <span className="text-sm font-bold text-white truncate max-w-[160px]">{location}</span>
                          </div>
                        )}
                        {joinedDate && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="size-3.5" /> Join Date
                            </span>
                            <span className="text-sm font-bold text-white">{joinedDate}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* FAVORITES TAB */}
              {activeTab === "favorites" && (
                <div className="space-y-8">
                  {favorites.length === 0 ? (
                    <Card className="border-border/60 bg-card/30 backdrop-blur-xs rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
                      <Heart className="size-10 text-muted-foreground/40 stroke-1" />
                      <div className="text-sm font-semibold text-white">No favorites added yet</div>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Tracks and items favorited on Aquila will show up here.
                      </p>
                    </Card>
                  ) : (
                    <>
                      {[
                        { title: "Anime Favorites", items: animeFavs, type: "anime" },
                        { title: "Manga Favorites", items: mangaFavs, type: "manga" },
                        { title: "Game Favorites", items: gameFavs, type: "games" },
                        { title: "TV Show Favorites", items: tvFavs, type: "tv" },
                        { title: "Movie Favorites", items: movieFavs, type: "movies" },
                        { title: "Book Favorites", items: bookFavs, type: "books" }
                      ]
                        .filter((grp) => grp.items.length > 0)
                        .map((grp) => (
                          <div key={grp.title} className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                              <Heart className="size-4 text-purple-400 fill-purple-400/20" />
                              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                                {grp.title} ({grp.items.length})
                              </h3>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                              {grp.items.map((fav) => (
                                <motion.div
                                  key={fav.id}
                                  whileHover={{ y: -4 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="group relative aspect-2/3 rounded-xl overflow-hidden border border-border/60 bg-card/30 cursor-pointer shadow-md"
                                >
                                  {fav.image ? (
                                    <img
                                      src={getSafeImageUrl(fav.image)}
                                      alt={fav.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center p-3 text-center text-[10px] text-muted-foreground/60 bg-muted italic">
                                      {fav.title || "No Image"}
                                    </div>
                                  )}
                                  
                                  {/* Hover overlay for title */}
                                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background via-background/80 to-transparent p-3 pt-6 z-10 transition-opacity duration-200">
                                    <p className="text-[10px] md:text-xs font-semibold text-white line-clamp-2 leading-snug">
                                      {fav.title}
                                    </p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </>
                  )}
                </div>
              )}

              {/* LISTS TAB */}
              {activeTab === "lists" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { id: "anime", title: "Anime List", icon: Tv, redirect: `/aquila/user/${name}/anime` },
                    { id: "manga", title: "Manga List", icon: BookOpen, redirect: `/aquila/user/${name}/manga` },
                    { id: "tv", title: "TV Shows", icon: Tv, redirect: `/aquila/user/${name}/tv` },
                    { id: "movie", title: "Movies", icon: Film, redirect: `/aquila/user/${name}/movies` },
                    { id: "game", title: "Video Games", icon: Gamepad2, redirect: `/aquila/user/${name}/games` },
                    { id: "book", title: "Books", icon: Book, redirect: `/aquila/user/${name}/books` }
                  ].map((list) => {
                    const stats = listCounts[list.id] || { total: 0 };
                    const Icon = list.icon;
                    const isPrivate = stats.private;

                    // Breakdown calculations
                    const counts = stats.counts || {};
                    const activeCount = (counts.watching || 0) + (counts.reading || 0) + (counts.playing || 0);
                    const completedCount = counts.completed || 0;
                    const planningCount = counts.planning || 0;
                    const otherCount = (counts.on_hold || 0) + (counts.dropped || 0);
                    const total = stats.total || 0;

                    const activePct = total > 0 ? (activeCount / total) * 100 : 0;
                    const completedPct = total > 0 ? (completedCount / total) * 100 : 0;
                    const planningPct = total > 0 ? (planningCount / total) * 100 : 0;
                    const otherPct = total > 0 ? (otherCount / total) * 100 : 0;

                    return (
                      <Card key={list.id} className="border-border/60 bg-card/30 backdrop-blur-xs rounded-2xl flex flex-col justify-between overflow-hidden group hover:border-primary/20 transition-all duration-300">
                        <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                              <Icon className="size-4.5" />
                            </div>
                            <CardTitle className="text-white text-sm font-bold">{list.title}</CardTitle>
                          </div>
                          {isPrivate ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] font-bold py-0">
                              Private
                            </Badge>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground font-bold text-xs">
                              {total}
                            </Badge>
                          )}
                        </CardHeader>
                        
                        <CardContent className="pt-4 flex-1 flex flex-col justify-between gap-4">
                          {isPrivate ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/60 gap-1.5">
                              <Lock className="size-6 stroke-1 text-red-400/40" />
                              <span className="text-xs italic">User has set this tracking list to private.</span>
                            </div>
                          ) : total > 0 ? (
                            <div className="space-y-4">
                              {/* Segmented Progress Bar */}
                              <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden flex">
                                {completedCount > 0 && (
                                  <div
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${completedPct}%` }}
                                    title={`Completed: ${completedCount}`}
                                  />
                                )}
                                {activeCount > 0 && (
                                  <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${activePct}%` }}
                                    title={`Active: ${activeCount}`}
                                  />
                                )}
                                {planningCount > 0 && (
                                  <div
                                    className="h-full bg-purple-500 transition-all"
                                    style={{ width: `${planningPct}%` }}
                                    title={`Planning: ${planningCount}`}
                                  />
                                )}
                                {otherCount > 0 && (
                                  <div
                                    className="h-full bg-secondary transition-all"
                                    style={{ width: `${otherPct}%` }}
                                    title={`On Hold/Dropped: ${otherCount}`}
                                  />
                                )}
                              </div>
                              
                              {/* Status Counts Breakdown */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <div className="size-1.5 rounded-full bg-emerald-500" />
                                    <span>Completed</span>
                                  </div>
                                  <span className="font-bold text-white">{completedCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <div className="size-1.5 rounded-full bg-blue-500" />
                                    <span>Active</span>
                                  </div>
                                  <span className="font-bold text-white">{activeCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <div className="size-1.5 rounded-full bg-purple-500" />
                                    <span>Planning</span>
                                  </div>
                                  <span className="font-bold text-white">{planningCount}</span>
                                </div>
                                {otherCount > 0 && (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <div className="size-1.5 rounded-full bg-secondary" />
                                      <span>Other</span>
                                    </div>
                                    <span className="font-bold text-white">{otherCount}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/60">
                              <span className="text-xs italic">No items tracked yet in this category.</span>
                            </div>
                          )}
                          
                          {/* Redirect Button */}
                          {!isPrivate && total > 0 && (
                            <Link href={list.redirect} className="w-full mt-2 block">
                              <Button
                                variant="outline"
                                className="w-full justify-between items-center text-xs h-8 border-border/60 group-hover:border-primary/20 hover:text-white rounded-lg cursor-pointer"
                              >
                                <span>View Tracker List</span>
                                <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                              </Button>
                            </Link>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* STATS TAB */}
              {activeTab === "stats" && name && (
                <StatsDashboard username={name} />
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
