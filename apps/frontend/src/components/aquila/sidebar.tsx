"use client";

import {
  ChevronRight,
  ChevronsUpDown,
  LinkIcon,
  LogIn,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { apps } from "../../../config/apps";
import { getAquilaSidebarConfig } from "../../../config/aquilaSidebarConfig";
import { useNavigation } from "@/hooks/useNavigation";
import type {
  NavbarConfig,
  NavSection,
  NavItem,
} from "../Providers/NavigationProvider";
import {
  useSidebar,
  SidebarHeader,
  Sidebar,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "../ui/sidebar";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTitle, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AquilaSideBarProps extends React.ComponentProps<typeof Sidebar> {
  /**
   * Override the nav sections rendered in the sidebar body.
   * When omitted the sidebar fetches connections from /aquila/api/connections
   * and builds the config from getAquilaSidebarConfig automatically.
   */
  navConfig?: NavbarConfig;
  /**
   * Provide pre-fetched connections so the sidebar skips its internal fetch.
   * Only used when navConfig is NOT provided.
   */
  connections?: any[];
  /**
   * Items to show in the footer user dropdown in addition to the defaults.
   * E.g. links to app-specific settings pages.
   */
  extraFooterItems?: React.ReactNode;
  /**
   * Profile page href used in the footer dropdown (defaults to /polaris/user/:id).
   */
  profileHref?: string;
  /**
   * Connections page href used in the footer dropdown (defaults to /polaris/connections).
   */
  connectionsHref?: string;
}

export default function AquilaSideBar({
  navConfig: navConfigProp,
  connections: connectionsProp,
  extraFooterItems,
  profileHref,
  connectionsHref = "/polaris/connections",
  ...props
}: AquilaSideBarProps) {
  const { data: session } = useSession();

  // Internal connections state — only used when caller doesn't supply navConfig or connections
  const [fetchedConnections, setFetchedConnections] = useState<any[]>([]);

  useEffect(() => {
    if (navConfigProp || connectionsProp) return; // skip fetch when caller controls config
    fetch("/aquila/api/connections")
      .then((res) => res.json())
      .then((data) => setFetchedConnections(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to fetch connections", err));
  }, [navConfigProp, connectionsProp]);

  const connections = connectionsProp ?? fetchedConnections;

  const derivedNavConfig = useMemo(
    () =>
      navConfigProp ?? getAquilaSidebarConfig(session, connections),
    [navConfigProp, session, connections],
  );

  const { navbarConfig, setNavbarConfig } = useNavigation();

  // Sync derived config into the navigation context while preserving dynamic sections
  useEffect(() => {
    setNavbarConfig((prev: NavbarConfig) => {
      if (prev.length === 0) return derivedNavConfig;

      const next = [...prev];
      derivedNavConfig.forEach((baseSection) => {
        const index = next.findIndex((s) => s.section === baseSection.section);
        if (index !== -1) {
          next[index] = baseSection;
        } else {
          next.push(baseSection);
        }
      });

      return next.filter(
        (s) =>
          !derivedNavConfig.some((b) => b.section === s.section) ||
          derivedNavConfig.some((b) => b.section === s.section),
      ) as NavbarConfig;
    });
  }, [derivedNavConfig, setNavbarConfig]);

  const { isMobile } = useSidebar();

  const [activeApp, setActiveApp] = useState(apps[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const pathname = window.location.pathname;
    const app = apps.find((a) => pathname.startsWith(a.href));
    if (app) setActiveApp(app);
  }, []);

  const resolvedProfileHref =
    profileHref ?? `/polaris/user/${session?.user?.id}`;

  if (!activeApp) return null;

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors duration-200"
                >
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md shadow-sm">
                    {activeApp.logo}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {activeApp.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {activeApp.description}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl bg-popover text-popover-foreground shadow-md p-2"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={12}
              >
                <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-2 px-2">
                  Applications
                </DropdownMenuLabel>
                {apps.map((app, appIdx) => (
                  <Link href={app.href} key={appIdx}>
                    <DropdownMenuItem
                      key={app.name}
                      onClick={() => setActiveApp(app)}
                      className="gap-3 p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer transition-colors duration-200"
                    >
                      <div className="flex size-7 items-center justify-center rounded-md border border-border/50 bg-background text-foreground shadow-sm">
                        {app.logo}
                      </div>
                      <span className="font-medium">{app.name}</span>
                    </DropdownMenuItem>
                  </Link>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="no-scrollbar px-2">
        {navbarConfig
          .filter(
            (c: NavSection) =>
              (!c.role || session?.user?.role === "ADMIN"
                ? true
                : c.role === session?.user?.role) && c.items.length > 0,
          )
          .map((section: NavSection, sectionIdx: number) => (
            <SidebarGroup key={sectionIdx} className="mb-1">
              {section.section && (
                <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">
                  {section.section}
                </SidebarGroupLabel>
              )}
              <SidebarMenu className="gap-1.5">
                {section.items
                  .filter((item: NavItem) =>
                    !item.role || session?.user?.role === "ADMIN"
                      ? true
                      : item.role === session?.user?.role,
                  )
                  .map((item: NavItem, itemIdx: number) => {
                    const hasChildren =
                      item.children && item.children.length > 0;
                    const hasHref = !!item.href;

                    const MenuItem = (
                      <SidebarMenuItem key={itemIdx}>
                        {hasHref ? (
                          <SidebarMenuButton asChild tooltip={item.label}>
                            <Link href={item.href}>
                              {item.icon}
                              {item.label.length > 18
                                ? `${item.label.slice(0, 18)}...`
                                : item.label}
                            </Link>
                          </SidebarMenuButton>
                        ) : (
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.label}>
                              {item.icon}
                              {item.label.length > 18
                                ? `${item.label.slice(0, 18)}...`
                                : item.label}
                              <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                        )}

                        {hasChildren && (
                          <>
                            {hasHref && (
                              <CollapsibleTrigger asChild>
                                <SidebarMenuAction className="data-[state=open]:rotate-90">
                                  <ChevronRight />
                                  <span className="sr-only">Toggle</span>
                                </SidebarMenuAction>
                              </CollapsibleTrigger>
                            )}
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.children?.map(
                                  (child: any, childIdx: number) => (
                                    <SidebarMenuSubItem key={childIdx}>
                                      <SidebarMenuSubButton asChild>
                                        <Link href={child.href}>
                                          {child.icon}
                                          {child.label.length > 16
                                            ? `${child.label.slice(0, 16)}...`
                                            : child.label}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ),
                                )}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </>
                        )}
                      </SidebarMenuItem>
                    );

                    if (hasChildren) {
                      return (
                        <Collapsible
                          key={itemIdx}
                          asChild
                          defaultOpen={false}
                          className="group/collapsible mt-1 "
                        >
                          {MenuItem}
                        </Collapsible>
                      );
                    }

                    return MenuItem;
                  })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {session && (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-9 w-9 rounded-md border border-border/50 shadow-sm">
                      <AvatarImage src={session?.user?.avatarUrl ?? ""} />
                      <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                        {session?.user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                      <span className="truncate font-semibold text-sidebar-foreground">
                        {session?.user?.username}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {session?.user?.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-popover text-popover-foreground shadow-md p-2"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={12}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <Link href={resolvedProfileHref}>
                      <div className="flex items-center gap-3 px-2 py-2 text-left text-sm bg-sidebar-accent/50 rounded-md mb-2">
                        <Avatar className="h-9 w-9 rounded-md border border-border/50">
                          <AvatarImage
                            src={session?.user?.avatarUrl ?? ""}
                            alt={session?.user?.username}
                          />
                          <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                            {session?.user?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold text-foreground">
                            {session?.user?.username}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {session?.user?.email}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />

                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 p-2 rounded-md"
                      asChild
                    >
                      <Link href={connectionsHref}>
                        <LinkIcon className="size-4" />
                        Connections
                      </Link>
                    </DropdownMenuItem>
                    {extraFooterItems}
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors duration-200 p-2 rounded-md"
                    onClick={() => signOut({ redirect: false })}
                  >
                    <LogOut className="size-4" />
                    <span className="font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}
          {!session && (
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                onClick={() => {
                  signIn("Credentials", {
                    callbackUrl: `${window.location.pathname}`,
                  });
                }}
                className="border border-border shadow-sm hover:bg-sidebar-accent transition-colors"
              >
                <LogIn className="size-4" />
                <span className="font-medium">Log in</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogTitle hidden>Settings</DialogTitle>
        <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden border border-border shadow-xl rounded-xl"></DialogContent>
      </Dialog>
    </Sidebar>
  );
}
