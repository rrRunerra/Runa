"use client";

import {
  ChevronRight,
  ChevronsUpDown,
  LinkIcon,
  LogIn,
  LogOut,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import { apps } from "../../config/apps";
import { useNavigation } from "@/hooks/useNavigation";
import type {
  NavbarConfig,
  NavSection,
  NavItem,
} from "@/components/Providers/NavigationProvider";
import {
  useSidebar,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { AppearanceDialog } from "@/components/AppearanceDialog";
import { usePathname } from "next/navigation";

interface AppSideBarProps extends React.ComponentProps<typeof Sidebar> {
  /**
   * The nav sections to render in the sidebar body.
   * Build this with your app's config function and pass it in.
   */
  navConfig: NavbarConfig;
  /**
   * Extra items rendered inside the footer user dropdown (after Connections).
   */
  extraFooterItems?: React.ReactNode;
  /**
   * Override the profile link in the footer dropdown.
   * Defaults to `/polaris/user/:id`.
   */
  profileHref?: string;
  /**
   * Override the Connections link in the footer dropdown.
   * Defaults to `/polaris/connections`.
   */
  connectionsHref?: string;
  /**
   * Override the Appearance link in the footer dropdown.
   * Defaults to `/polaris/appearance`.
   */
  appearanceHref?: string;
}

export default function AppSideBar({
  navConfig,
  extraFooterItems,
  profileHref,
  connectionsHref = "/polaris/connections",
  appearanceHref = "/polaris/appearance",
  ...props
}: AppSideBarProps) {
  const { data: session } = useSession();
  const { setNavbarConfig } = useNavigation();
  const { isMobile } = useSidebar();
  const pathname = usePathname();

  const [activeApp, setActiveApp] = useState(apps[0]);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);

  // Sync the passed-in navConfig into the navigation context
  useEffect(() => {
    setNavbarConfig(() => navConfig);
  }, [navConfig, setNavbarConfig]);

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
      {/* ── App switcher header ─────────────────────────── */}
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
                {apps.map((app, idx) => (
                  <Link href={app.href} key={idx}>
                    <DropdownMenuItem
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

      {/* ── Nav sections ────────────────────────────────── */}
      <SidebarContent className="no-scrollbar px-2">
        {navConfig
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

                    const truncate = (s: string, n: number) =>
                      s.length > n ? `${s.slice(0, n)}...` : s;
                    const isChildActive =
                      item.children?.some(
                        (child: any) => pathname === child.href,
                      ) ?? false;
                    const MenuItem = (
                      <SidebarMenuItem key={itemIdx}>
                        {hasHref ? (
                          <SidebarMenuButton
                            asChild
                            tooltip={item.label}
                            isActive={pathname === item.href || isChildActive}
                          >
                            <Link href={item.href}>
                              {item.icon}
                              {truncate(item.label, 18)}
                            </Link>
                          </SidebarMenuButton>
                        ) : (
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.label}
                              isActive={isChildActive}
                            >
                              {item.icon}
                              {truncate(item.label, 18)}
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
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={pathname === child.href}
                                      >
                                        <Link href={child.href}>
                                          {child.icon}
                                          {truncate(child.label, 16)}
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
                          defaultOpen={isChildActive}
                          className="group/collapsible mt-1"
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

      {/* ── User footer ─────────────────────────────────── */}
      <SidebarFooter>
        <SidebarMenu>
          {session ? (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-9 w-9 rounded-md border border-border/50 shadow-sm">
                      <AvatarImage src={session.user?.avatarUrl ?? ""} />
                      <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                        {session.user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight ml-1">
                      <span className="truncate font-semibold text-sidebar-foreground">
                        {session.user?.username}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {session.user?.email}
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
                            src={session.user?.avatarUrl ?? ""}
                            alt={session.user?.username}
                          />
                          <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                            {session.user?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold text-foreground">
                            {session.user?.username}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {session.user?.email}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />

                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 p-2 rounded-md"
                      onSelect={(e) => {
                        e.preventDefault();
                        setIsAppearanceOpen(true);
                      }}
                    >
                      <Palette className="size-4" />
                      Appearance
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

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
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                onClick={() =>
                  signIn("Credentials", {
                    callbackUrl: window.location.pathname,
                  })
                }
                className="border border-border shadow-sm hover:bg-sidebar-accent transition-colors"
              >
                <LogIn className="size-4" />
                <span className="font-medium">Log in</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>

      <AppearanceDialog
        open={isAppearanceOpen}
        onOpenChange={setIsAppearanceOpen}
      />
    </Sidebar>
  );
}
