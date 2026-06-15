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
import { cn, getSafeImageUrl } from "@/lib/utils";
import { signIn, signOut, useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { apps } from "../../config/apps";
import { useNavigation } from "@/hooks/useNavigation";
import type {
  NavbarConfig,
  NavSection,
  NavItem,
} from "@/components/Providers/NavigationProvider";
import { hasPermission } from "@runa/permissions";
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

  useEffect(() => {
    const handleOpenAppearance = () => setIsAppearanceOpen(true);
    const handleOpenSettings = () => setIsSettingsOpen(true);

    window.addEventListener("runa-open-appearance", handleOpenAppearance);
    window.addEventListener("runa-open-settings", handleOpenSettings);

    return () => {
      window.removeEventListener("runa-open-appearance", handleOpenAppearance);
      window.removeEventListener("runa-open-settings", handleOpenSettings);
    };
  }, []);

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
      <Sidebar
        variant="floating"
        className="**:data-[sidebar=sidebar-inner]:bg-zinc-950/40 **:data-[sidebar=sidebar-inner]:backdrop-blur-xl **:data-[sidebar=sidebar-inner]:border **:data-[sidebar=sidebar-inner]:border-zinc-800/40 **:data-[sidebar=sidebar-inner]:shadow-2xl **:data-[sidebar=sidebar-inner]:rounded-2xl"
        {...props}
      >
      {/* ── App switcher header ─────────────────────────── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="relative h-12 w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 border border-transparent hover:border-zinc-800/40 hover:bg-white/5 data-[state=open]:bg-white/5 data-[state=open]:border-zinc-800/40"
                  asChild
                >
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-md shrink-0">
                      {activeApp.logo}
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight ml-1.5">
                      <span className="truncate font-semibold text-foreground">
                        {activeApp.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground/80">
                        {activeApp.description}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                  </motion.button>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-80 rounded-2xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-3"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={12}
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
                      Applications
                    </span>
                    <span className="text-muted-foreground/60 text-[9px] font-medium flex items-center gap-1">
                      Press <kbd className="px-1 py-0.5 rounded-sm bg-muted border border-border/50 text-[8px] font-sans font-semibold">Shift</kbd> twice to search
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {apps.map((app, idx) => {
                      const isActive = activeApp.name === app.name;
                      
                      const hoverBorderClass = app.hoverBorderClass || "hover:border-indigo-500/40 hover:bg-indigo-950/10 hover:shadow-indigo-500/5";
                      const logoWrapperClass = app.logoWrapperClass || "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white";
                      const badgeText = app.badgeText || "";
                      const badgeColor = app.badgeColor || "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";

                      return (
                        <Link href={app.href} key={idx} className="block">
                          <DropdownMenuItem
                            onClick={() => setActiveApp(app)}
                            asChild
                          >
                            <motion.div
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className={cn(
                                "group relative flex flex-col items-start gap-2.5 p-3 rounded-xl border border-zinc-800/40 bg-zinc-900/10 cursor-pointer text-left transition-all duration-300 hover:shadow-md outline-hidden select-none",
                                hoverBorderClass,
                                isActive && "border-primary/40 bg-primary/5 shadow-md shadow-primary/5"
                              )}
                            >
                              <div className="flex w-full items-center justify-between">
                                <div className={cn(
                                  "flex size-7 items-center justify-center rounded-lg shadow-sm transition-all duration-300",
                                  logoWrapperClass,
                                  isActive && "scale-105 shadow-md"
                                )}>
                                  {app.logo}
                                </div>
                                {badgeText && (
                                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-semibold border tracking-wide", badgeColor)}>
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                <span className="font-bold text-xs text-foreground group-hover:text-foreground">
                                  {app.name}
                                </span>
                                <span className="text-[10px] leading-tight text-muted-foreground line-clamp-1 group-hover:text-muted-foreground/80">
                                  {app.description}
                                </span>
                              </div>
                            </motion.div>
                          </DropdownMenuItem>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Nav sections ────────────────────────────────── */}
      <SidebarContent className="no-scrollbar px-2">
        <LayoutGroup id="sidebar">
          {/* SECTIONS */}
          {resolvedNavConfig
          .filter(
            (c: NavSection) =>
              (!c.permission || hasPermission(session?.user?.permissions, c.permission, c.permissionOperator)) &&
              c.items.filter((item: NavItem) =>
                !item.permission || hasPermission(session?.user?.permissions, item.permission, item.permissionOperator || "all")
              ).length > 0 &&
              c.section?.toLowerCase() !== "phone",
          )
          .map((section: NavSection, sectionIdx: number) => (
            <SidebarGroup key={sectionIdx} className="mb-1">
              {section.section && (
                <SidebarGroupLabel className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-widest mb-1.5">
                  {section.section}
                </SidebarGroupLabel>
              )}
              <SidebarMenu className="gap-1.5">
                {section.items
                  .filter((item: NavItem) =>
                    !item.permission || hasPermission(session?.user?.permissions, item.permission, item.permissionOperator || "all")
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
                    
                    const isActive = hasHref && (pathname === item.href || isChildActive);

                    const MenuItem = (
                      <SidebarMenuItem key={itemIdx}>
                        {hasHref ? (
                          <SidebarMenuButton
                            asChild
                            tooltip={item.label}
                            className={cn(
                              "relative transition-colors duration-200 rounded-xl h-9.5 px-3",
                              isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                          >
                            <Link href={item.href} className="relative z-10 w-full flex items-center">
                              {isActive && (
                                <>
                                  <motion.div
                                    layoutId="activeSidebarNavIndicator"
                                    className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-md"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                  />
                                  <motion.div
                                    layoutId="activeSidebarNavHighlight"
                                    className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/10"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    style={{ pointerEvents: "none" }}
                                  />
                                </>
                              )}
                              <span className="flex items-center gap-2.5 w-full relative z-20">
                                {item.icon}
                                <span className="truncate">{truncate(item.label, 18)}</span>
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        ) : (
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.label}
                              className={cn(
                                "relative transition-colors duration-200 rounded-xl h-9.5 px-3",
                                isChildActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                              )}
                            >
                              <span className="flex items-center gap-2.5 w-full relative z-20">
                                {isChildActive && (
                                  <motion.div
                                    layoutId="activeSidebarNavHighlight"
                                    className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/10"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    style={{ pointerEvents: "none" }}
                                  />
                                )}
                                {item.icon}
                                <span className="truncate">{truncate(item.label, 18)}</span>
                                <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-muted-foreground/60 group-hover:text-foreground" />
                              </span>
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                        )}

                        {hasChildren && (
                          <>
                            {hasHref && (
                              <CollapsibleTrigger asChild>
                                <SidebarMenuAction className="data-[state=open]:rotate-90 z-30">
                                  <ChevronRight className="size-4 text-muted-foreground/60 hover:text-foreground" />
                                  <span className="sr-only">Toggle</span>
                                </SidebarMenuAction>
                              </CollapsibleTrigger>
                            )}
                             <CollapsibleContent>
                               <SidebarMenuSub className="border-l border-zinc-800/40 ml-4.5 pl-3 py-1 gap-1">
                                 {item.children
                                   ?.filter((child: any) =>
                                     !child.permission || hasPermission(session?.user?.permissions, child.permission, child.permissionOperator || "all")
                                   )
                                   .map((child: any, childIdx: number) => {
                                     const isSubActive = pathname === child.href;
                                    return (
                                      <SidebarMenuSubItem key={childIdx}>
                                        <SidebarMenuSubButton
                                          asChild
                                          className={cn(
                                            "relative transition-colors duration-200 rounded-lg px-2.5 py-1.5 h-8",
                                            isSubActive ? "text-primary font-semibold" : "text-muted-foreground/80 hover:text-foreground hover:bg-white/5"
                                          )}
                                        >
                                          <Link href={child.href} className="relative z-10 w-full flex items-center">
                                            {isSubActive && (
                                              <motion.div
                                                layoutId="activeSubmenuHighlight"
                                                className="absolute inset-0 bg-primary/5 rounded-lg border border-primary/5"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                style={{ pointerEvents: "none" }}
                                              />
                                            )}
                                            <span className="flex items-center gap-2 relative z-20">
                                              {child.icon}
                                              <span className="truncate">{truncate(child.label, 16)}</span>
                                            </span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    );
                                  }
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
        </LayoutGroup>
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
                    className="relative h-12 w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 border border-transparent hover:border-zinc-800/40 hover:bg-white/5 data-[state=open]:bg-white/5 data-[state=open]:border-zinc-800/40 overflow-hidden isolate transform-[translate3d(0,0,0)]"
                  >
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
                    
                    <Avatar className="h-9 w-9 border border-zinc-800/60 shadow-sm shrink-0 z-10">
                      <AvatarImage src={session.user?.avatarUrl ? getSafeImageUrl(session.user.avatarUrl) : ""} />
                      <AvatarFallback className="rounded-md bg-primary/10 text-primary z-10">
                        {session.user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight ml-1.5 z-10">
                      <span className={cn(
                        "truncate font-semibold",
                        session.user?.sidebarCardBackgroundUrl ? "text-white" : "text-foreground"
                      )}>
                        {session.user?.username}
                      </span>
                      <span className={cn(
                        "truncate text-xs",
                        session.user?.sidebarCardBackgroundUrl ? "text-zinc-300" : "text-muted-foreground/75"
                      )}>
                        {session.user?.email}
                      </span>
                    </div>
                    <ChevronsUpDown className={cn(
                      "ml-auto size-4 transition-colors z-10",
                      session.user?.sidebarCardBackgroundUrl
                        ? "text-zinc-400 group-hover:text-white"
                        : "text-muted-foreground/60 group-hover:text-foreground"
                    )} />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-60 rounded-2xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-2.5"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={12}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <Link href={resolvedProfileHref}>
                      <div
                        className="relative overflow-hidden flex items-center gap-3.5 px-3 py-2.5 text-left text-sm bg-zinc-900/40 border border-zinc-800/30 hover:border-zinc-700/45 hover:bg-zinc-800/30 rounded-xl mb-2 transition-all duration-200 isolate transform-[translate3d(0,0,0)]"
                      >
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
                            src={session.user?.avatarUrl ? getSafeImageUrl(session.user.avatarUrl) : ""}
                            alt={session.user?.username}
                          />
                          <AvatarFallback className="rounded-md bg-primary/10 text-primary font-bold z-10">
                            {session.user?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight z-10">
                          <span className={cn(
                            "truncate font-bold",
                            session.user?.sidebarCardBackgroundUrl ? "text-white" : "text-foreground"
                          )}>
                            {session.user?.username}
                          </span>
                          <span className={cn(
                            "truncate text-xs",
                            session.user?.sidebarCardBackgroundUrl ? "text-zinc-300" : "text-muted-foreground/80"
                          )}>
                            {session.user?.email}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-800/40 my-1.5" />

                  <DropdownMenuGroup className="space-y-0.5">
                    <DropdownMenuItem
                      className="cursor-pointer gap-2.5 px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 rounded-xl transition-all duration-200"
                      onSelect={(e) => {
                        e.preventDefault();
                        setIsAppearanceOpen(true);
                      }}
                    >
                      <Palette className="size-4 text-primary/80" />
                      Appearance
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2.5 px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 rounded-xl transition-all duration-200"
                      onSelect={(e) => {
                        e.preventDefault();
                        setIsSettingsOpen(true);
                      }}
                    >
                      <Settings className="size-4 text-primary/80" />
                      Settings
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-zinc-800/40 my-1.5" />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2.5 px-3 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 rounded-xl transition-all duration-200"
                    onClick={() => signOut({ redirect: false })}
                  >
                    <LogOut className="size-4 text-red-400/80" />
                    <span className="font-bold">Log out</span>
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-1 px-3 py-2 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 shadow-2xl w-[calc(100%-2rem)] max-w-sm md:hidden select-none rounded-full">
      {/* Left items */}
      <div className="flex items-center gap-0.5 flex-1 justify-around">
        {leftItems.map((item) => (
          <DockItem key={item.label} item={item} isActive={pathname === item.href} />
        ))}
      </div>

      {/* Middle Switcher Button */}
      <motion.button
        onClick={() => setOpenMobile(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center justify-center size-10.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer shrink-0 mx-1.5"
        aria-label="Toggle Navigation Drawer"
      >
        <LayoutGrid className="size-4" />
      </motion.button>

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
        "relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-full transition-colors duration-200 min-w-[58px]",
        isActive 
          ? "text-primary font-bold" 
          : "text-muted-foreground/70 hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="activeDockBubble"
          className="absolute inset-0 bg-primary/10 rounded-full border border-primary/20"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{ pointerEvents: "none" }}
        />
      )}
      <span className={cn("relative z-10 transition-transform duration-200", isActive && "scale-105")}>
        {item.icon}
      </span>
      <span className="text-[9px] tracking-tight font-medium relative z-10">
        {item.label}
      </span>
    </Link>
  );
}
