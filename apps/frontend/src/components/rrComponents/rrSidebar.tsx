"use client";
"use memo";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "../ui/sidebar";
import {
  SidebarConfig,
  SidebarItem,
  SidebarItemChild,
  SidebarSection,
} from "../../types/SidebarConfig";
import { useSession } from "next-auth/react";
import { useRRSidebar } from "@/hooks/useRRSidebar";
import { usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { ChevronRight, Command, LayoutGrid } from "lucide-react";
import RrAppMenu from "./rrAppMenu";
import RrUserMenu from "./rrUserMenu";


import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import RrBottomDock from "./rrBottomDock";
import { rrApps } from "../../../config/rrApps";
import { Badge } from "../ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

export default function RrSidebar({ sidebarConfig: initialSidebarConfig, ...props }: rrSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const { sidebarConfig, setSidebarConfig } = useRRSidebar(initialSidebarConfig);
  const [dockTrigger, setDockTrigger] = useState(0);

  useEffect(() => {
    const handleChanged = () => {
      setDockTrigger((prev) => prev + 1);
    };
    window.addEventListener("runa-sidebar-changed", handleChanged);
    return () => {
      window.removeEventListener("runa-sidebar-changed", handleChanged);
    };
  }, []);

  const resolvedSidebarConfig = useMemo(() => {
    const getActiveAppHref = () => {
      if (typeof window !== "undefined") {
        const pathname = window.location.pathname;
        const currentApp = rrApps.find((app) => pathname.startsWith(app.href));
        if (currentApp) {
          return currentApp.href;
        }
      }
      return "";
    };

    const storageKey = `runa-phone-dock-items-${getActiveAppHref()}`;
    const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;

    let customDockMap: Record<string, string | null> | null = null;
    if (stored) {
      try {
        customDockMap = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }

    let config = sidebarConfig;

    if (customDockMap) {
      const phoneSectionIdx = sidebarConfig.findIndex(
        (s) => s.section?.toLowerCase().replace(/[^a-z]/g, "") === "phone",
      );

      if (phoneSectionIdx !== -1) {
        const findItemByHref = (
          key: string | null | undefined,
        ): SidebarItem | undefined => {
          if (!key) return undefined;
          for (const section of sidebarConfig) {
            for (const item of section.items) {
              const itemKey = item.href || (item.component ? `label:${item.label}` : undefined);
              if (itemKey === key) return item;
              if (item.children) {
                for (const child of item.children) {
                  const childKey = child.href || (child.component ? `label:${child.label}` : undefined);
                  if (childKey === key) return child;
                }
              }
            }
          }
          return undefined;
        };

        const newItems: SidebarItem[] = [];
        for (const pos of ["1", "2", "3", "4"]) {
          const key = customDockMap[pos];
          if (key) {
            const matchedItem = findItemByHref(key);
            if (matchedItem) {
              newItems.push({
                ...matchedItem,
                position: parseInt(pos, 10),
              });
            }
          }
        }
        config = sidebarConfig.map((section, idx) => {
          if (idx === phoneSectionIdx) {
            return {
              ...section,
              items: newItems,
            };
          }
          return section;
        });
      }
    }

    // Apply sorting by position (positive at the top, undefined in the middle, negative at the bottom)
    return config.map((section) => {
      const itemsWithIndex = section.items.map((item, index) => ({ item, index }));
      itemsWithIndex.sort((a, b) => {
        const posA = a.item.position !== undefined ? a.item.position : 0;
        const posB = b.item.position !== undefined ? b.item.position : 0;

        if (posA > 0 && posB > 0) return posA - posB || a.index - b.index;
        if (posA > 0) return -1;
        if (posB > 0) return 1;

        if (posA < 0 && posB < 0) return posA - posB || a.index - b.index;
        if (posA < 0) return 1;
        if (posB < 0) return -1;

        return a.index - b.index;
      });
      return {
        ...section,
        items: itemsWithIndex.map((x) => x.item),
      };
    });
  }, [sidebarConfig, dockTrigger]);

  return (
    <>
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <RrAppMenu session={session} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="no-scrollbar">
          <LayoutGroup id="sidebar">
            {/* SECTIONS */}

            {resolvedSidebarConfig
              .filter(
                (section: SidebarSection) =>
                  section.section.toLowerCase() !== "#$phone",
              )
              .map((section: SidebarSection, sectionIdx: number) => (
                <SidebarGroup key={sectionIdx}>
                  {section.section && (
                    <SidebarGroupLabel>{section.section}</SidebarGroupLabel>
                  )}

                  <SidebarMenu>
                    {section.items
                      .filter((item: SidebarItem) => (item.position ?? 0) >= 0)
                      .map((item: SidebarItem, itemIdx: number) => {
                        const hasChildren =
                          item.children && item.children.length > 0;
                        const hasHref = !!item.href;

                      const truncate = (str: string, n: number) =>
                        str.length > n ? `${str.slice(0, n)}...` : str;

                      const isChildActive =
                        hasChildren &&
                        item.children!.some(
                          (child: SidebarItemChild) => pathname === child.href,
                        );
                      const isActive =
                        (item.href && pathname === item.href) || isChildActive;

                      const MenuItem = (
                        <SidebarMenuItem key={itemIdx}>
                          {item.component ? (
                            item.component
                          ) : hasHref ? (
                            <SidebarMenuButton
                              asChild
                              tooltip={item.label}
                              isActive={isActive}
                            >
                              <Link
                                href={item.href || "#"}
                                className="w-full flex items-center justify-between"
                              >
                                <span className="flex items-center gap-2">
                                  {item.icon}
                                  <span className="truncate">
                                    {truncate(item.label, 18)}
                                  </span>
                                </span>
                                {item.badge && (
                                  <Badge variant="outline">{item.badge}</Badge>
                                )}
                              </Link>
                            </SidebarMenuButton>
                          ) : (
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.label}
                                isActive={isActive}
                              >
                                <span className="w-full flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    {item.icon}
                                    <span className="truncate">
                                      {truncate(item.label, 18)}
                                    </span>
                                  </span>
                                  <span className="flex items-center gap-1.5 ml-auto">
                                    {item.badge && (
                                      <Badge variant="outline">
                                        {item.badge}
                                      </Badge>
                                    )}
                                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                  </span>
                                </span>
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
                                <SidebarMenuSub className="">
                                  {item.children?.map(
                                    (
                                      child: SidebarItemChild,
                                      childIdx: number,
                                    ) => {
                                      const isSubActive =
                                        pathname === child.href;
                                      return (
                                        <SidebarMenuSubItem key={childIdx}>
                                          {child.component ? (
                                            child.component
                                          ) : (
                                            <SidebarMenuSubButton
                                              asChild
                                              isActive={isSubActive}
                                            >
                                              <Link
                                                href={child.href || "#"}
                                                className="w-full flex items-center justify-between"
                                              >
                                                <span className="flex items-center gap-2">
                                                  {child.icon}
                                                  <span className="truncate">
                                                    {truncate(child.label, 16)}
                                                  </span>
                                                </span>
                                                {child.badge && (
                                                  <Badge variant="outline">
                                                    {child.badge}
                                                  </Badge>
                                                )}
                                              </Link>
                                            </SidebarMenuSubButton>
                                          )}
                                        </SidebarMenuSubItem>
                                      );
                                    },
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
        <SidebarFooter>
          {resolvedSidebarConfig
            .filter(
              (section: SidebarSection) =>
                section.section.toLowerCase() !== "#$phone",
            )
            .flatMap((section: SidebarSection) =>
              section.items.filter((item: SidebarItem) => (item.position ?? 0) < 0),
            )
            .map((item: SidebarItem, idx: number) => (
              <div key={idx} className="w-full">
                {item.component ? item.component : null}
              </div>
            ))}
          <SidebarMenu>
            <RrUserMenu session={session} />
          </SidebarMenu>
        </SidebarFooter>

      </Sidebar>
      {isMobile && (
        <RrBottomDock
          navConfig={resolvedSidebarConfig}
          pathname={pathname}
          setOpenMobile={setOpenMobile}
        />
      )}
    </>
  );
}


export interface rrSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sidebarConfig: SidebarConfig;
}
