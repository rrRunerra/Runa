"use client";
"use no memo";

import {
  ChevronRight,
  ChevronsUpDown,
  LinkIcon,
  LogIn,
  LogOut,
  Palette,
  Settings,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { signIn, signOut, useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState, Suspense } from "react";
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
import { SettingsDialog } from "@/components/SettingsDialog";
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
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();

  const [activeApp, setActiveApp] = useState(apps[0]);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [resolvedNavConfig, setResolvedNavConfig] = useState<NavbarConfig>(navConfig);

  useEffect(() => {
    const getActiveAppHref = () => {
      if (typeof window === "undefined") return "/aquila";
      const pathname = window.location.pathname;
      const app = apps.find((a) => pathname.startsWith(a.href));
      return app ? app.href : "/aquila";
    };

    const loadAndInjectCustomDock = () => {
      const storageKey = `runa-phone-dock-items-${getActiveAppHref()}`;
      const stored = localStorage.getItem(storageKey);
      
      let customDockMap: Record<string, string | null> | null = null;
      if (stored) {
        try {
          customDockMap = JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }

      if (customDockMap) {
        const phoneSectionIdx = navConfig.findIndex(
          (s) => s.section?.toLowerCase() === "phone"
        );

        if (phoneSectionIdx !== -1) {
          const findItemByHref = (href: string | null | undefined): NavItem | undefined => {
            if (!href) return undefined;
            for (const section of navConfig) {
              for (const item of section.items) {
                if (item.href === href) return item;
                if (item.children) {
                  for (const child of item.children) {
                    if (child.href === href) return child;
                  }
                }
              }
            }
            return undefined;
          };

          const newItems: NavItem[] = [];
          for (const pos of ["1", "2", "3", "4"]) {
            const href = customDockMap[pos];
            if (href) {
              const matchedItem = findItemByHref(href);
              if (matchedItem) {
                newItems.push({
                  ...matchedItem,
                  position: parseInt(pos, 10),
                });
              }
            }
          }

          const updatedNavConfig = navConfig.map((section, idx) => {
            if (idx === phoneSectionIdx) {
              return {
                ...section,
                items: newItems,
              };
            }
            return section;
          });

          setResolvedNavConfig(updatedNavConfig);
        } else {
          setResolvedNavConfig(navConfig);
        }
      } else {
        setResolvedNavConfig(navConfig);
      }
    };

    loadAndInjectCustomDock();

    window.addEventListener("runa-sidebar-changed", loadAndInjectCustomDock);
    return () => {
      window.removeEventListener("runa-sidebar-changed", loadAndInjectCustomDock);
    };
  }, [navConfig]);

  // Sync the resolvedNavConfig into the navigation context
  useEffect(() => {
    setNavbarConfig(() => resolvedNavConfig);
  }, [resolvedNavConfig, setNavbarConfig]);

  useEffect(() => {
    const pathname = window.location.pathname;
    const app = apps.find((a) => pathname.startsWith(a.href));
    if (app) setActiveApp(app);
  }, []);

  const resolvedProfileHref =
    profileHref ?? `/polaris/user/${session?.user?.username}`;

  if (!activeApp) return null;


  return (
    <>
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
        {resolvedNavConfig
          .filter(
            (c: NavSection) =>
              (!c.role || session?.user?.role === "ADMIN"
                ? true
                : c.role === session?.user?.role) &&
              c.items.length > 0 &&
              c.section?.toLowerCase() !== "phone",
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
                    <Avatar className="h-9 w-9  border border-border/50 shadow-sm">
                      <AvatarImage src={session.user?.avatarUrl ? process.env.NEXT_PUBLIC_API_URL + session.user?.avatarUrl : ""} />
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
                        <Avatar className="h-9 w-9 border border-border/50">
                          <AvatarImage
                            src={session.user?.avatarUrl ? process.env.NEXT_PUBLIC_API_URL + session.user?.avatarUrl : ""}
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
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 p-2 rounded-md"
                      onSelect={(e) => {
                        e.preventDefault();
                        setIsSettingsOpen(true);
                      }}
                    >
                      <Settings className="size-4" />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  {/* <DropdownMenuGroup>
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
                  </DropdownMenuGroup> */}

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
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        navConfig={navConfig}
      />
    </Sidebar>
    {isMobile && (
      <BottomDock
        navConfig={resolvedNavConfig}
        pathname={pathname}
        setOpenMobile={setOpenMobile}
      />
    )}
    </>
  );
}

function BottomDock({
  navConfig,
  pathname,
  setOpenMobile,
}: {
  navConfig: NavbarConfig;
  pathname: string;
  setOpenMobile: (open: boolean) => void;
}): React.JSX.Element | null {
  const phoneSection = navConfig.find(
    (s) => s.section?.toLowerCase() === "phone",
  );
  if (!phoneSection || phoneSection.items.length === 0) return null;

  const items = phoneSection.items;

  // Find items for each position (1 to 4)
  const item1 = items.find((i) => i.position === 1);
  const item2 = items.find((i) => i.position === 2);
  const item3 = items.find((i) => i.position === 3);
  const item4 = items.find((i) => i.position === 4);

  // Group items into left and right buckets dynamically
  const leftItems: NavItem[] = [];
  const rightItems: NavItem[] = [];

  if (item1) leftItems.push(item1);

  if (!item3 && !item4) {
    // 2 position should be on the left if 3 and 4 are empty
    if (item2) leftItems.push(item2);
  } else if (!item3 && item4) {
    // same for 4 if 3 is empty (position 4 goes on the left side)
    if (item2) leftItems.push(item2);
    leftItems.push(item4);
  } else {
    // default distribution
    if (item2) leftItems.push(item2);
    if (item3) rightItems.push(item3);
    if (item4) rightItems.push(item4);
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-1 px-3 py-2 bg-sidebar/95 backdrop-blur-md border border-sidebar-border rounded-full shadow-2xl w-[calc(100%-2rem)] max-w-sm md:hidden select-none">
      {/* Left items */}
      <div className="flex items-center gap-0.5 flex-1 justify-around">
        {leftItems.map((item) => (
          <DockItem key={item.label} item={item} isActive={pathname === item.href} />
        ))}
      </div>

      {/* Middle Switcher Button */}
      <button
        onClick={() => setOpenMobile(true)}
        className="flex items-center justify-center size-10.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer shrink-0 mx-1.5"
        aria-label="Toggle Navigation Drawer"
      >
        <LayoutGrid className="size-4" />
      </button>

      {/* Right items */}
      <div className="flex items-center gap-0.5 flex-1 justify-around">
        {rightItems.map((item) => (
          <DockItem key={item.label} item={item} isActive={pathname === item.href} />
        ))}
      </div>
    </div>
  );
}

function DockItem({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}): React.JSX.Element {
  return (
    <Link
      href={item.href || "#"}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl transition-all duration-200 min-w-[54px]",
        isActive 
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" 
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
      )}
    >
      <span className="scale-90">{item.icon}</span>
      <span className="text-[9px] tracking-tight font-medium">
        {item.label}
      </span>
    </Link>
  );
}
