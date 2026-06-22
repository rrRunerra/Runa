"use client";
"use memo";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";
import { SidebarConfig, SidebarItem } from "../../types/SidebarConfig";
import { useSession } from "next-auth/react";
import { useRRSidebar } from "@/hooks/useRRSidebar";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Command, LayoutGrid } from "lucide-react";
import RrAppMenu from "./rrAppMenu";
import RrUserMenu from "./rrUserMenu";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function RrSidebar({ sidebarConfig, ...props }: rrSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const { setSidebarConfig } = useRRSidebar(sidebarConfig);
  const [resolvedSidebarConfig, setResolvedSidebarConfig] =
    useState<SidebarConfig>(sidebarConfig);
  const { isMobile, setOpenMobile } = useSidebar();

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
        <SidebarContent>
          {/*
             TODO 
            */}
        </SidebarContent>
        <SidebarFooter>
          <RrUserMenu session={session} />
        </SidebarFooter>
      </Sidebar>
      {isMobile && (
        <BottomDock
          navConfig={resolvedSidebarConfig}
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
  navConfig: SidebarConfig;
  pathname: string;
  setOpenMobile: (open: boolean) => void;
}): React.JSX.Element | null {
  const phoneSection = navConfig.find(
    (s) => s.section?.toLowerCase() === "#$phone",
  );
  if (!phoneSection || phoneSection.items.length === 0) return null;

  const items = phoneSection.items;

  // Find items for each position (1 to 4)
  const item1 = items.find((i) => i.position === 1);
  const item2 = items.find((i) => i.position === 2);
  const item3 = items.find((i) => i.position === 3);
  const item4 = items.find((i) => i.position === 4);

  // Group items into left and right buckets dynamically
  const leftItems: SidebarItem[] = [];
  const rightItems: SidebarItem[] = [];

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
          <DockItem
            key={item.label}
            item={item}
            isActive={pathname === item.href}
          />
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
          <DockItem
            key={item.label}
            item={item}
            isActive={pathname === item.href}
          />
        ))}
      </div>
    </div>
  );
}

function DockItem({
  item,
  isActive,
}: {
  item: SidebarItem;
  isActive: boolean;
}): React.JSX.Element {
  if (item.component) {
    return <>{item.component}</>;
  }
  return (
    <Link
      href={item.href || "#"}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-full transition-colors duration-200 min-w-[58px]",
        isActive
          ? "text-primary font-bold"
          : "text-muted-foreground/70 hover:text-foreground",
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
      <span
        className={cn(
          "relative z-10 transition-transform duration-200",
          isActive && "scale-105",
        )}
      >
        {item.icon}
      </span>
      <span className="text-[9px] tracking-tight font-medium relative z-10">
        {item.label}
      </span>
    </Link>
  );
}

interface rrSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sidebarConfig: SidebarConfig;
}
