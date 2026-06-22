import { Session } from "next-auth";
import { SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import {
  Badge,
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
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "../ui/sidebar";
import Link from "next/link";
import { ConstellationBuilderModal } from "../stars/ConstellationBuilderModal";
import { NotificationsModal } from "../NotificationsModal";
import { SettingsDialog } from "../SettingsDialog";

export default function RrUserMenu({ session }: { session: Session | null }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const [bookmarkName, setBookmarkName] = useState("");
  const [bookmarkIcon, setBookmarkIcon] = useState("");

  const { isMobile } = useSidebar();

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
                    <AvatarFallback className="rounded-md bg-primary/10 text-primary">
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
                      <AvatarFallback className="rounded-md bg-primary/10 text-primary font-bold z-10">
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

      {/* {isAppearanceOpen && (
        <AppearanceSettingsModal
          open={isAppearanceOpen}
          onOpenChange={setIsAppearanceOpen}
        />
      )} */}

      {/* {isSettingsOpen && (
        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      )} */}

      {isNotificationsOpen && (
        <NotificationsModal
          open={isNotificationsOpen}
          onOpenChange={setIsNotificationsOpen}
        />
      )}

      {isBuilderOpen && (
        <ConstellationBuilderModal
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
