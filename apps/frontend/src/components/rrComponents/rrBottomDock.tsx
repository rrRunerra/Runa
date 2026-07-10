"use client";

import React from "react";
import { LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SidebarConfig, SidebarItem } from "@/types/SidebarConfig";

interface DockItemData {
  label: string;
  icon: React.ReactNode;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  component?: React.ReactNode;
}

interface RrBottomDockProps {
  pathname: string;
  navConfig?: SidebarConfig;
  setOpenMobile?: (open: boolean) => void;
  items?: DockItemData[];
}

export default function RrBottomDock({
  pathname,
  navConfig,
  setOpenMobile,
  items: customItems,
}: RrBottomDockProps): React.JSX.Element | null {
  // If custom items are provided, render them
  if (customItems) {
    return (
      <div className="fixed bottom-3.5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur-xl border border-border/80 shadow-2xl w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-sm select-none rounded-full overflow-hidden">
        <div className="flex items-center overflow-x-auto no-scrollbar px-1 py-1.5 sm:py-2 snap-x snap-mandatory w-full">
          {customItems.map((item) => (
            <div
              key={item.label}
              className="flex-[0_0_20%] shrink-0 snap-center flex justify-center"
            >
              <RrDockItem item={item} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback to SidebarConfig if provided
  if (!navConfig) return null;

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

  const mapItem = (item?: SidebarItem) => {
    if (!item) return <div className="min-w-[48px] sm:min-w-[58px] min-h-[38px] sm:min-h-[44px]" />;
    return (
      <RrDockItem
        key={item.href || item.label}
        item={{
          label: item.label,
          icon: item.icon,
          href: item.href,
          isActive: pathname === item.href,
          component: item.component,
        }}
      />
    );
  };

  return (
    <div className="fixed bottom-3.5 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-background/80 backdrop-blur-xl border border-border/80 shadow-2xl w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-sm md:hidden select-none rounded-full">
      {/* Left items */}
      <div className="flex items-center gap-0.5 flex-1 justify-around">
        {mapItem(item1)}
        {mapItem(item2)}
      </div>

      {/* Middle Switcher Button */}
      {setOpenMobile && (
        <motion.button
          onClick={() => setOpenMobile(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center size-9 sm:size-10.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer shrink-0 mx-1"
          aria-label="Toggle Navigation Drawer"
        >
          <LayoutGrid className="size-3.5 sm:size-4" />
        </motion.button>
      )}

      {/* Right items */}
      <div className="flex items-center gap-0.5 flex-1 justify-around">
        {mapItem(item3)}
        {mapItem(item4)}
      </div>
    </div>
  );
}

function RrDockItem({ item }: { item: DockItemData }): React.JSX.Element {
  const content = (
    <>
      {item.isActive && (
        <motion.div
          layoutId="activeDockBubble"
          className="absolute inset-0 bg-primary/10 rounded-full border border-primary/20"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{ pointerEvents: "none" }}
        />
      )}
      <span
        className={cn(
          "relative z-10 transition-transform duration-200 [&>svg]:size-3.5 sm:[&>svg]:size-4",
          item.isActive && "scale-105",
        )}
      >
        {item.icon}
      </span>
      <span className="text-[8px] sm:text-[9px] tracking-tight font-medium relative z-10 whitespace-nowrap truncate max-w-[48px] sm:max-w-[64px] text-center">
        {item.label}
      </span>
    </>
  );

  const buttonClass = cn(
    "relative flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-full transition-colors duration-200 min-w-[48px] sm:min-w-[58px] min-h-[38px] sm:min-h-[44px]",
    item.isActive
      ? "text-primary font-bold"
      : "text-muted-foreground/70 hover:text-foreground",
  );

  if (item.component && React.isValidElement(item.component)) {
    return React.cloneElement(
      item.component as React.ReactElement<{ children?: React.ReactNode }>,
      {
        children: (
          <button type="button" className={buttonClass}>
            {content}
          </button>
        ),
      },
    );
  }

  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} className={buttonClass}>
        {content}
      </button>
    );
  }

  return (
    <Link href={item.href || "#"} className={buttonClass}>
      {content}
    </Link>
  );
}
