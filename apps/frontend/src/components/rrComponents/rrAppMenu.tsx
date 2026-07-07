"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Session } from "next-auth";
import { ChevronsUpDown, Bookmark, Loader2 } from "lucide-react";

import { useBookmarks } from "@/hooks/useBookmarks";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { rrApp, rrApps } from "../../../config/rrApps";
import { SidebarMenuButton, useSidebar } from "../ui/sidebar";
import Image from "next/image";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { hasPermission } from "@runa/permissions";

export default function RrAppMenu({
  session,
}: {
  session: Session | null;
}): React.ReactNode {
  const { isMobile } = useSidebar();

  const visibleApps = useMemo((): rrApp[] => {
    return rrApps.filter((app: rrApp): boolean => {
      if (!app.permissions || app.permissions.length === 0) return true;
      return hasPermission(session?.user?.permissions, app.permissions, "any");
    });
  }, [session]);

  const [activeApp, setActiveApp] = useState<rrApp>(rrApps[0]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const {
    bookmarks,
    loading,
    mutate: refetch,
  } = useBookmarks({
    enabled: !!(session && isMenuOpen),
  });

  // Sync active app based on route
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const currentApp = rrApps.find((app: rrApp): boolean => pathname.startsWith(app.href));
      if (currentApp && visibleApps.some((app: rrApp): boolean => app.href === currentApp.href)) {
        setActiveApp(currentApp);
      } else if (visibleApps.length > 0) {
        setActiveApp(visibleApps[0]);
      }
    }
  }, [visibleApps, session]);

  return (
    <DropdownMenu onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground "
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
            {typeof activeApp.icon === "string" ? (
              activeApp.icon ? (
                <Image src={activeApp.icon} className="size-4" alt="" />
              ) : (
                <span className="text-xs font-bold">{activeApp.name[0]}</span>
              )
            ) : (
              activeApp.icon
            )}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium text-primary">
              {activeApp.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {activeApp.descriptionShort}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        align="start"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Applications
        </DropdownMenuLabel>
        <div className="flex flex-col gap-1 max-h-[165px] overflow-y-auto no-scrollbar">
          {visibleApps.map((app: rrApp) => (
            <DropdownMenuItem
              key={app.name}
              onClick={() => setActiveApp(app)}
              className="gap-2 p-2"
              asChild
            >
              <Link href={app.href}>
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {typeof app.icon === "string" ? (
                    app.icon ? (
                      <Image
                        src={app.icon}
                        width={14}
                        height={14}
                        className="size-3.5 shrink-0"
                        alt=""
                      />
                    ) : (
                      <span className="text-[10px] font-bold">
                        {app.name[0]}
                      </span>
                    )
                  ) : (
                    app.icon
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <span className="truncate font-medium  mr-2">{app.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {app.descriptionShort}
                  </span>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>

        {session && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Bookmarks
            </DropdownMenuLabel>

            {loading ? (
              <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Loading bookmarks...
              </div>
            ) : !bookmarks || bookmarks.length === 0 ? (
              <div className="text-center py-4 px-2 text-xs text-muted-foreground/50 border border-dashed rounded-md m-2">
                No bookmarks saved
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <DropdownMenuItem
                  key={bookmark.name}
                  className="gap-2 p-2"
                  asChild
                >
                  <Link href={bookmark.redirect}>
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      {bookmark.icon ? (
                        <img
                          src={getSafeImageUrl(bookmark.icon)}
                          className=""
                          alt=""
                        />
                      ) : (
                        <Bookmark className="size-3.5 shrink-0" />
                      )}
                    </div>
                    {bookmark.name}
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
