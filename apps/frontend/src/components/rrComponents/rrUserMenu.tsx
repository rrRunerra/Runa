"use client";

import { Session } from "next-auth";
import Image from "next/image";
import { SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import {
  Bell,
  Bookmark,
  ChevronsUpDown,
  LogIn,
  LogOut,
  Palette,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Languages,
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "../ui/dropdown-menu";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "../ui/sidebar";
import Link from "next/link";
import { useNotificationAndBookmarks } from "@/components/Providers/rrNotificationAndBookmarksProvider";
import { Badge } from "../ui/badge";
import { RrConstellationBuilderModal } from "./rrConstellationBuilderModal";
import { RrNotificationsModal } from "./rrNotificationsModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { SettingsDialog } from "./rrSettings/rrSettingsModal";
import { RrAppearanceModal } from "./rrAppearanceModal";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { useTranslation } from "react-i18next";
import { RrLanguageSelector } from "./rrLanguageSelector";

export default function RrUserMenu({ session }: { session: Session | null }) {
  const { unreadCount } = useNotificationAndBookmarks();
  const { t } = useTranslation();

  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [showLockConfirmation, setShowLockConfirmation] = useState(false);

  const [bookmarkName, setBookmarkName] = useState("");
  const [bookmarkIcon, setBookmarkIcon] = useState("");

  const { isMobile } = useSidebar();
  const { isEncryptionUnlocked, isKeysExist, lockEncryption, setShowUnlockDialog } =
    useRRCrypto();

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
      const customEvent = e as CustomEvent<{
        name?: string;
        icon?: string;
        redirect?: string;
      }>;
      if (customEvent.detail) {
        if (customEvent.detail.name) setBookmarkName(customEvent.detail.name);
        if (customEvent.detail.icon) setBookmarkIcon(customEvent.detail.icon);
      } else {
        setBookmarkName(document.title || "New Bookmark");
        const faviconEl =
          document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        setBookmarkIcon(faviconEl?.href || "/favicon.ico");
      }
      setIsBuilderOpen(true);
    };

    const handleOpenNotifications = () => {
      setIsNotificationsOpen(true);
    };

    window.addEventListener("runa-open-settings", handleOpenSettings);
    window.addEventListener("runa-open-appearance", handleOpenAppearance);
    window.addEventListener("runa-open-builder", handleOpenBuilder);
    window.addEventListener("runa-open-notifications", handleOpenNotifications);

    return () => {
      window.removeEventListener("runa-open-settings", handleOpenSettings);
      window.removeEventListener("runa-open-appearance", handleOpenAppearance);
      window.removeEventListener("runa-open-builder", handleOpenBuilder);
      window.removeEventListener(
        "runa-open-notifications",
        handleOpenNotifications,
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("settings") || params.has("category")) {
        setIsSettingsOpen(true);
      }
    }
  }, []);

  // Sync localStorage language → cookie on mount so server components read the right locale
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("runa-language");
      if (saved) {
        document.cookie = `runa-language=${saved};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      }
    }
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
                className="relative h-12 w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 border border-border/40 hover:border-border/85 hover:bg-muted/50 data-[state=open]:bg-muted/80 data-[state=open]:border-border overflow-hidden isolate transform-[translate3d(0,0,0)]"
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
                  <div className="relative overflow-hidden flex-row flex items-center gap-3.5 px-3 py-2.5 text-left text-sm  border border-border/50 hover:border-border hover:bg-muted rounded-xl mb-2 transition-all duration-200 isolate transform-[translate3d(0,0,0)]">
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

                    <Avatar className="h-9 w-9 border border-zinc-300 dark:border-zinc-800/60 z-10 shrink-0">
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
                  {t("notifications")}
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
                  {t("addBookmark")}
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
                  {t("appearance")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsSettingsOpen(true);
                  }}
                >
                  <Settings />
                  {t("settings")}
                </DropdownMenuItem>
                <RrLanguageSelector variant="submenu" />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    if (isEncryptionUnlocked) {
                      setShowLockConfirmation(true);
                    } else {
                      setShowUnlockDialog(true);
                    }
                  }}
                >
                  {isEncryptionUnlocked ? (
                    <ShieldCheck className="text-emerald-400" />
                  ) : (
                    <Shield className="text-amber-500" />
                  )}
                  <span>{t("lockEncryption")}</span>
                  <Badge
                    className={cn(
                      "ml-auto h-4 px-1.5 border text-[8px] font-bold rounded-full flex items-center justify-center",
                      isEncryptionUnlocked
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                    )}
                  >
                    {isEncryptionUnlocked ? t("active") : t("locked")}
                  </Badge>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ redirect: false })}>
                <LogOut className="size-4 text-red-400/80" />
                <span className="font-bold text-red-400/80">{t("logOut")}</span>
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
            <span className="font-semibold text-foreground" suppressHydrationWarning>{t("logIn")}</span>
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
          onOpenChange={(open) => {
            setIsSettingsOpen(open);
            if (!open) {
              const url = new URL(window.location.href);
              url.searchParams.delete("settings");
              url.searchParams.delete("category");
              url.searchParams.delete("success");
              url.searchParams.delete("error");
              window.history.replaceState(null, "", url.toString());
            }
          }}
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

      {showLockConfirmation && (
        <Dialog
          open={showLockConfirmation}
          onOpenChange={setShowLockConfirmation}
        >
          <DialogContent className="max-w-md bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-6 rounded-2xl">
            <DialogHeader className="pb-3 border-b border-zinc-800/40">
              <DialogTitle className="flex items-center gap-2 text-md font-bold text-foreground">
                <ShieldAlert className="size-5 text-red-500" />
                {t("lockEncryptionQuestion")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t("lockEncryptionDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowLockConfirmation(false)}
                className="h-9 px-4 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={() => {
                  lockEncryption();
                  setShowLockConfirmation(false);
                }}
                className="h-9 px-4 bg-red-600 hover:bg-red-500 text-white border border-red-500/30 text-xs font-semibold rounded-lg shadow-lg active:scale-95 transition-all"
              >
                {t("lockEncryption")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
