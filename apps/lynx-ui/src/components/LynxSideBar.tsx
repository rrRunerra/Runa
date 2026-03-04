"use client";

import {
  BadgeCheck,
  Bell,
  Bot,
  ChevronRight,
  ChevronsUpDown,
  HomeIcon,
  Key,
  LogIn,
  LogOut,
  Settings,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import React, { useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  NavbarConfig,
  useNavigation,
} from "@runa/ui";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./sidebar";
import { apps } from "@/config/apps";

export default function LynxSideBar({
  navConfig,
  ...props
}: {
  navConfig: NavbarConfig;
  props?: React.ComponentProps<typeof Sidebar>;
}) {
  const { data: session } = useSession();
  const { navbarConfig } = useNavigation(navConfig as any);

  const { isMobile } = useSidebar();
  const pathname = usePathname();

  const [activeApp, setActiveApp] = useState(apps[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");

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
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl bg-popover text-popover-foreground border border-border/50 shadow-md p-2"
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
          .filter((c) =>
            !c.role || session?.user?.role === "ADMIN"
              ? true
              : c.role === session?.user?.role,
          )
          .map((section, sectionIdx) => (
            <SidebarGroup key={sectionIdx} className="mb-4">
              <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                {section.section}
              </SidebarGroupLabel>
              <SidebarMenu className="gap-1.5">
                {section.items
                  .filter((item) =>
                    !item.role || session?.user?.role === "ADMIN"
                      ? true
                      : item.role === session?.user?.role,
                  )
                  .map((item, itemIdx) => {
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
                                ? item.label.slice(0, 18) + "..."
                                : item.label}
                            </Link>
                          </SidebarMenuButton>
                        ) : (
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.label}>
                              {item.icon}
                              {item.label.length > 18
                                ? item.label.slice(0, 18) + "..."
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
                                {item.children?.map((child, childIdx) => (
                                  <SidebarMenuSubItem key={childIdx}>
                                    <SidebarMenuSubButton asChild>
                                      <Link href={child.href}>
                                        {child.icon}
                                        {child.label.length > 16
                                          ? child.label.slice(0, 16) + "..."
                                          : child.label}
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
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
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-popover text-popover-foreground shadow-md border border-border/50"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={12}
                >
                  <Link href={`/astral/users/${session.user.username}`}>
                    <DropdownMenuLabel className="p-0 font-normal">
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
                    </DropdownMenuLabel>
                  </Link>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2"
                      onSelect={() => {
                        setActiveTab("api-keys");
                        setSettingsOpen(true);
                      }}
                    >
                      <Key className="size-4" />
                      Api keys
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors duration-200"
                    onClick={() => signOut()}
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
                onClick={() => signIn()}
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
