"use client";

import { Session } from "next-auth";
import { SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import {
  Bell,
  Bookmark,
  ChevronsUpDown,
  LogIn,
  LogOut,
  Palette,
  Settings,
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "../ui/sidebar";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { useFetch } from "@/hooks/useFetch";
import { Badge } from "../ui/badge";
import { RrConstellationBuilderModal } from "./rrConstellationBuilderModal";
import { RrNotificationsModal } from "./rrNotificationsModal";
import { SettingsDialog } from "./rrSettings/rrSettingsModal";
import { RrAppearanceModal } from "./rrAppearanceModal";

export default function RrUserMenu({ session }: { session: Session | null }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const [bookmarkName, setBookmarkName] = useState("");
  const [bookmarkIcon, setBookmarkIcon] = useState("");

  const { isMobile } = useSidebar();

  const { data: notificationsData, refetch: refetchNotifications } = useFetch<any[]>(
    session?.accessToken ? `${process.env.NEXT_PUBLIC_API_URL}/notifications` : "",
    {
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
      enabled: !!session?.accessToken,
    }
  );

  useEffect(() => {
    if (notificationsData) {
      const activeDeviceId = typeof window !== "undefined" ? localStorage.getItem("runa_device_id") : null;
      const pendingCount = notificationsData.filter((n: any) => {
        if (n.status !== "PENDING") return false;
        if (n.metadata?.targetDeviceId) {
          return n.metadata.targetDeviceId === activeDeviceId;
        }
        return true;
      }).length;
      setUnreadCount(pendingCount);
    }
  }, [notificationsData]);

  useEffect(() => {
    if (!session?.accessToken) return;

    const wsUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const socket: Socket = io(`${wsUrl}/notifications`, {
      query: { token: session.accessToken },
      transports: ["websocket"],
    });

    const handleCreated = (newNotification: any) => {
      const activeDeviceId = typeof window !== "undefined" ? localStorage.getItem("runa_device_id") : null;
      if (newNotification.metadata?.targetDeviceId && newNotification.metadata.targetDeviceId !== activeDeviceId) {
        return;
      }
      refetchNotifications();
    };

    const handleUpdated = () => {
      refetchNotifications();
    };

    const handleDelete = () => {
      refetchNotifications();
    };

    const handleCleared = () => {
      refetchNotifications();
    };

    socket.on("notification:created", handleCreated);
    socket.on("notification:updated", handleUpdated);
    socket.on("notification:deleted", handleDelete);
    socket.on("notifications:cleared", handleCleared);

    return () => {
      socket.disconnect();
    };
  }, [session?.accessToken, refetchNotifications]);

  useEffect(() => {
    const handleOpenSettings = (e: Event) => {
      const customEvent = e as CustomEvent<{ category?: string }>;
      const category = customEvent.detail?.category;
      if (category) {
        const url = new URL(window.location.href);
        url.searchParams.set("settings", category);
        window.history.replaceState(null, "", url.toString());
      }
      setIsSettingsOpen(true);
    };

    const handleOpenAppearance = () => {
      setIsAppearanceOpen(true);
    };

    const handleOpenBuilder = (e: Event) => {
      const customEvent = e as CustomEvent<{ name?: string; icon?: string; redirect?: string }>;
      if (customEvent.detail) {
        if (customEvent.detail.name) setBookmarkName(customEvent.detail.name);
        if (customEvent.detail.icon) setBookmarkIcon(customEvent.detail.icon);
      } else {
        setBookmarkName(document.title || "New Bookmark");
        const faviconEl = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        setBookmarkIcon(faviconEl?.href || "/favicon.ico");
      }
      setIsBuilderOpen(true);
    };

    window.addEventListener("runa-open-settings", handleOpenSettings);
    window.addEventListener("runa-open-appearance", handleOpenAppearance);
    window.addEventListener("runa-open-builder", handleOpenBuilder);

    return () => {
      window.removeEventListener("runa-open-settings", handleOpenSettings);
      window.removeEventListener("runa-open-appearance", handleOpenAppearance);
      window.removeEventListener("runa-open-builder", handleOpenBuilder);
    };
  }, []);

  return (
    <>
      {session ? (
        <SidebarMenuItem>
          {/* Closed menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="relative h-12 w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 border border-transparent hover:border-zinc-800/40 hover:bg-white/5 data-[state=open]:bg-white/5 data-[state=open]:border-zinc-800/40 overflow-hidden isolate transform-[translate3d(0,0,0)]"
              >
                {/* Custom card bg image */}
                {session.user?.sidebarCardBackgroundUrl && (
                  <>
                    <div
                      className="absolute inset-0 bg-cover bg-center z-0"
                      style={{
                        backgroundImage: `url(${getSafeImageUrl(session.user.sidebarCardBackgroundUrl)})`,
                      }}
                    />
                    <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/40 to-transparent z-0" />
                  </>
                )}

                {/* User avatar */}
                <div className="relative shrink-0 z-10">
                  <Avatar className="h-9 w-9 border border-zinc-800/60 shadow-sm">
                    <AvatarImage
                      src={
                        session.user?.avatarUrl
                          ? getSafeImageUrl(session.user.avatarUrl)
                          : ""
                      }
                    />
                    <AvatarFallback>
                      {session.user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Notification badge with numbers */}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground border border-zinc-950">
                      {unreadCount}
                    </span>
                  )}
                </div>

                {/*username and email*/}
                <div className="grid flex-1 text-left text-sm leading-tight ml-1.5 z-10">
                  <span
                    className={cn(
                      "truncate font-semibold",
                      session.user?.sidebarCardBackgroundUrl
                        ? "text-white"
                        : "text-foreground",
                    )}
                  >
                    {session.user?.username}
                  </span>
                  <span
                    className={cn(
                      "truncate text-xs",
                      session.user?.sidebarCardBackgroundUrl
                        ? "text-zinc-300"
                        : "text-muted-foreground/75",
                    )}
                  >
                    {session.user?.email}
                  </span>
                </div>

                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            {/* Opened menu */}
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              {/* User banner card */}
              <DropdownMenuLabel className="p-0 font-normal">
                <Link href={`/polaris/user/${session.user.username}`}>
                  <div className="relative overflow-hidden flex items-center gap-3.5 px-3 py-2.5 text-left text-sm bg-zinc-900/40 border border-zinc-800/30 hover:border-zinc-700/45 hover:bg-zinc-800/30 rounded-xl mb-2 transition-all duration-200 isolate transform-[translate3d(0,0,0)]">
                    {/* Custom Card Background Image */}
                    {session.user?.sidebarCardBackgroundUrl && (
                      <>
                        <div
                          className="absolute inset-0 bg-cover bg-center z-0"
                          style={{
                            backgroundImage: `url(${getSafeImageUrl(session.user.sidebarCardBackgroundUrl)})`,
                          }}
                        />
                        <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/40 to-transparent z-0" />
                      </>
                    )}

                    <Avatar className="h-9 w-9 border border-zinc-800/60 z-10 shrink-0">
                      <AvatarImage
                        src={
                          session.user?.avatarUrl
                            ? getSafeImageUrl(session.user.avatarUrl)
                            : ""
                        }
                        alt={session.user?.username}
                      />
                      <AvatarFallback>
                        {session.user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight z-10">
                      <span
                        className={cn(
                          "truncate font-bold",
                          session.user?.sidebarCardBackgroundUrl
                            ? "text-white"
                            : "text-foreground",
                        )}
                      >
                        {session.user?.username}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs",
                          session.user?.sidebarCardBackgroundUrl
                            ? "text-zinc-300"
                            : "text-muted-foreground/80",
                        )}
                      >
                        {session.user?.email}
                      </span>
                    </div>
                  </div>
                </Link>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsNotificationsOpen(true);
                  }}
                >
                  <Bell />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge className="ml-auto h-4 px-1 bg-primary text-primary-foreground text-[8px] font-bold rounded-full flex items-center justify-center min-w-4">
                      {unreadCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setBookmarkName(document.title || "New Bookmark");
                    const faviconEl =
                      document.querySelector<HTMLLinkElement>(
                        "link[rel~='icon']",
                      );
                    setBookmarkIcon(faviconEl?.href || "/favicon.ico");
                    setIsBuilderOpen(true);
                  }}
                >
                  <Bookmark />
                  Add Bookmark
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsAppearanceOpen(true);
                  }}
                >
                  <Palette />
                  Appearance
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsSettingsOpen(true);
                  }}
                >
                  <Settings />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ redirect: false })}>
                <LogOut className="size-4 text-red-400/80" />
                <span className="font-bold text-red-400/80">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      ) : (
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() =>
              signIn("Credentials", {
                callbackUrl: window.location.pathname,
              })
            }
            className="border border-zinc-800/50 shadow-sm hover:bg-white/5 rounded-xl transition-colors h-11"
          >
            <LogIn className="size-4 text-primary" />
            <span className="font-semibold text-foreground">Log in</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}

      {isAppearanceOpen && (
        <RrAppearanceModal
          open={isAppearanceOpen}
          onOpenChange={setIsAppearanceOpen}
        />
      )}

      {isSettingsOpen && (
        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      )}

      {isNotificationsOpen && (
        <RrNotificationsModal
          open={isNotificationsOpen}
          onOpenChange={setIsNotificationsOpen}
        />
      )}

      {isBuilderOpen && (
        <RrConstellationBuilderModal
          open={isBuilderOpen}
          onOpenChange={setIsBuilderOpen}
          initialIcon={bookmarkIcon}
          initialName={bookmarkName}
          initialRedirect={window.location.href}
        />
      )}
    </>
  );
}
