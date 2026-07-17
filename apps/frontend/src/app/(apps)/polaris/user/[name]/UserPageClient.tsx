"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Lock, Inbox, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useTranslation } from "react-i18next";

// Shared Components
import RrAppMenu from "@/components/rrComponents/rrAppMenu";
import RrUserMenu from "@/components/rrComponents/rrUserMenu";
import RrOverviewTab from "@/components/rrComponents/polaris/rrOverviewTab";
import RrFavoritesTab from "@/components/rrComponents/polaris/rrFavoritesTab";
import RrListsTab from "@/components/rrComponents/polaris/rrListsTab";
import RrStatsTab from "@/components/rrComponents/polaris/rrStatsTab";

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

type TabType = "overview" | "favorites" | "lists" | "stats";

export default function UserPageClient(): React.ReactNode {
  const { t } = useTranslation();
  const params = useParams();
  const name = params?.name as string | undefined;
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const isOwner =
    session?.user?.username?.toLowerCase() === name?.toLowerCase();

  const profileUrl = name
    ? `${process.env.NEXT_PUBLIC_API_URL}/users/${name}`
    : null;

  const {
    data: user,
    isLoading: loading,
    error,
  } = useSWR<UserProfileData>(
    profileUrl ? [profileUrl, session?.accessToken] : null,
    fetcher,
  );

  useEffect(() => {
    if (name) {
      document.title = `Polaris > User > ${name}`;
    }
  }, [name]);

  // Loading Screen
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans antialiased p-4 lg:p-6 gap-6 max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between border rounded-xl p-3 bg-card shadow-sm">
          <Skeleton className="h-10 w-48 rounded-md" />
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
        <Skeleton className="w-full aspect-4.5/1 rounded-xl" />
        <div className="w-full px-4 md:px-6 relative -mt-10 md:-mt-16 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 pb-6 border-b">
            <Skeleton className="size-24 md:size-32 rounded-full shrink-0" />
            <div className="space-y-2 flex-1 pt-4">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error / User Not Found Screen
  if (error || !user) {
    return (
      <div className="w-full min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border shadow-sm rounded-xl p-8 text-center flex flex-col items-center justify-center">
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive mb-4">
            <Inbox className="size-8" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold mb-2">
            {error ? t("polaris.user.failedLoadProfile", "Failed to load profile") : t("polaris.user.userNotFound", "User not found")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {t("polaris.user.profileNotFoundDesc", "The profile page could not be loaded. Ensure the username spelling is correct.")}
          </p>
          <Link href="/polaris">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("polaris.user.backToDashboard", "Back to Dashboard")}
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
        <div className="max-w-md w-full bg-card border shadow-sm rounded-xl p-8 text-center flex flex-col items-center justify-center">
          <div className="p-3 rounded-xl bg-primary/10 text-primary mb-4">
            <Lock className="size-8" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold mb-2">{t("polaris.user.profileIsPrivate", "This profile is private")}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {t("polaris.user.profilePrivateDesc", "@{{username}} has chosen to keep their profile credentials private.", { username: user.username })}
          </p>
          <Link href="/polaris">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("polaris.user.backToDashboard", "Back to Dashboard")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = user.displayName || user.username;
  const bio = user.profileSettings?.bio || "";
  const visibleConnections =
    user.connections?.filter((conn: any) => isOwner || !conn.private) || [];

  const tabLabels: Record<TabType, string> = {
    overview: t("polaris.user.tabs.overview", "Overview"),
    favorites: t("polaris.user.tabs.favorites", "Favorites"),
    lists: t("polaris.user.tabs.lists", "Lists"),
    stats: t("polaris.user.tabs.stats", "Stats"),
  };

  return (
    <div className="relative flex flex-col w-full min-h-screen gap-6 p-4 lg:p-6 bg-background text-foreground antialiased font-sans max-w-7xl mx-auto pb-24 mb-12">
      {/* Top Header - App Switcher & User Menu (scrolls with page) */}
      <header className="flex items-center justify-between border rounded-xl p-2 bg-card shadow-sm z-20">
        <div className="w-56 shrink-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <RrAppMenu session={session} />
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <div className="w-56 shrink-0">
          <SidebarMenu>
            <RrUserMenu session={session} />
          </SidebarMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 w-full z-10">
        {/* User Profile Header / Banner Card */}
        <div className="relative w-full rounded-xl overflow-hidden bg-card border shadow-sm">
          {/* Flat Cinematic Banner Image */}
          <div className="relative w-full aspect-4.5/1 overflow-hidden bg-muted border-b">
            {user.bannerUrl ? (
              <img
                src={getSafeImageUrl(user.bannerUrl)}
                alt={`${displayName}'s banner`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/5" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent" />
          </div>

          {/* User Info Container */}
          <div className="relative px-6 pb-6 pt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Avatar overlapping the banner */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0 self-start sm:self-auto z-20">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-card shadow-sm rounded-full">
                  <AvatarImage
                    src={getSafeImageUrl(user.avatarUrl)}
                    alt={user.username}
                  />
                  <AvatarFallback className="text-3xl font-bold bg-muted text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Identity text */}
              <div className="flex-1 flex flex-col gap-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {displayName}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="font-semibold text-xs py-0.5"
                  >
                    {t("polaris.user.profileBadge", "Profile")}
                  </Badge>
                  {isOwner && (
                    <Badge
                      variant="outline"
                      className="font-semibold text-xs py-0.5"
                    >
                      {t("polaris.user.youBadge", "You")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  @{user.username}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex items-center gap-1 border-b pb-px shrink-0 overflow-x-auto"
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
                    "relative px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted-foreground/30 border-b-2 border-transparent",
                  )}
                >
                  {tabLabels[tab]}
                </button>
              );
            },
          )}
        </div>

        {/* Tab Content Panel */}
        <div
          className="flex-1 pt-4 pb-16"
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === "overview" && (
            <RrOverviewTab bio={bio} connections={visibleConnections} />
          )}

          {activeTab === "favorites" && name && (
            <RrFavoritesTab username={name} session={session} />
          )}

          {activeTab === "lists" && name && (
            <RrListsTab name={name} session={session} />
          )}

          {activeTab === "stats" && name && <RrStatsTab name={name} />}
        </div>
      </main>
    </div>
  );
}
