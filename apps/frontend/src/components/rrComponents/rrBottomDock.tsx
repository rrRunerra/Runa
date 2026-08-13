"use client";

import React from "react";
import { LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  SidebarConfig,
  SidebarItem,
  SidebarItemChild,
} from "@/types/SidebarConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";

interface DockItemData {
  label: string;
  icon: React.ReactNode;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  component?: React.ReactNode;
  children?: SidebarItemChild[];
}

interface RrBottomDockProps {
  pathname: string;
  navConfig?: SidebarConfig;
  setOpenMobile?: (open: boolean) => void;
  items?: DockItemData[];
  className?: string;
}

export default function RrBottomDock({
  pathname,
  navConfig,
  setOpenMobile,
  items: customItems,
  className,
}: RrBottomDockProps): React.JSX.Element | null {
  // If custom items are provided, render them
  if (customItems) {
    return (
      <RrCustomBottomDock
        customItems={customItems}
        pathname={pathname}
        className={className}
      />
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

  const checkActive = (item: SidebarItem) => {
    const isChildActive =
      item.children && item.children.some((child) => pathname === child.href);
    return (item.href && pathname === item.href) || !!isChildActive;
  };

  const mapItem = (item?: SidebarItem) => {
    if (!item)
      return <div className="min-w-15 sm:min-w-17 min-h-12.5 sm:min-h-13.5" />;
    return (
      <RrDockItem
        key={item.href || item.label}
        item={{
          label: item.label,
          icon: item.icon,
          href: item.href,
          isActive: checkActive(item),
          component: item.component,
          children: item.children,
        }}
        pathname={pathname}
      />
    );
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-1 sm:gap-2 px-2.5 py-2 sm:px-4 sm:py-2.5 bg-background/85 backdrop-blur-2xl border border-border/80 shadow-2xl w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-md md:hidden select-none rounded-full"
    >
      {/* Left items */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-1 justify-around">
        {mapItem(item1)}
        {mapItem(item2)}
      </div>

      {/* Middle Switcher Button */}
      {setOpenMobile && (
        <motion.button
          onClick={() => setOpenMobile(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center size-11.5 sm:size-12.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer shrink-0 mx-1 sm:mx-1.5"
          aria-label="Toggle Navigation Drawer"
        >
          <LayoutGrid className="size-5 sm:size-5.5" />
        </motion.button>
      )}

      {/* Right items */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-1 justify-around">
        {mapItem(item3)}
        {mapItem(item4)}
      </div>
    </div>
  );
}

function RrDockItem({
  item,
  pathname,
}: {
  item: DockItemData;
  pathname?: string;
}): React.JSX.Element {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = React.useRef(false);
  const cleanupContextMenuRef = React.useRef<(() => void) | null>(null);

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    if ("button" in e && e.button !== 0) return;
    if (!item.children || item.children.length === 0) return;

    if (cleanupContextMenuRef.current) {
      cleanupContextMenuRef.current();
    }

    isLongPressRef.current = false;

    const blockContextMenu = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    window.addEventListener("contextmenu", blockContextMenu, { capture: true });

    const cleanup = () => {
      setTimeout(() => {
        window.removeEventListener("contextmenu", blockContextMenu, {
          capture: true,
        });
      }, 500);
      window.removeEventListener("mouseup", cleanup);
      window.removeEventListener("touchend", cleanup);
      window.removeEventListener("touchcancel", cleanup);
      cleanupContextMenuRef.current = null;
    };

    cleanupContextMenuRef.current = cleanup;

    window.addEventListener("mouseup", cleanup);
    window.addEventListener("touchend", cleanup);
    window.addEventListener("touchcancel", cleanup);

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setDropdownOpen(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(50);
        } catch (err) {
          // ignore vibrate security exceptions
        }
      }
    }, 300);
  };

  const endPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        isLongPressRef.current = false;
      }, 100);
    }
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (cleanupContextMenuRef.current) {
      cleanupContextMenuRef.current();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (item.onClick) {
      item.onClick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (item.children && item.children.length > 0) {
      e.preventDefault();
    }
  };

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
          "relative z-10 transition-transform duration-200 [&>svg]:size-5 sm:[&>svg]:size-5.5",
          item.isActive && "scale-105",
        )}
      >
        {item.icon}
      </span>
      <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight font-medium relative z-10 whitespace-nowrap truncate max-w-14.5 sm:max-w-17.5 text-center">
        {item.label}
      </span>
    </>
  );

  const buttonClass = cn(
    "relative flex flex-col items-center justify-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-colors duration-200 min-w-15 sm:min-w-17 min-h-12.5 sm:min-h-13.5 cursor-pointer pointer-events-auto",
    item.isActive
      ? "text-primary font-bold"
      : "text-muted-foreground/70 hover:text-foreground",
  );

  // If item has children, render dropdown
  if (item.children && item.children.length > 0) {
    const triggerElement = item.onClick ? (
      <Button
        className={buttonClass}
        style={{ WebkitTouchCallout: "none" }}
        onClick={handleClick}
        onMouseDown={startPress}
        onTouchStart={startPress}
        onMouseUp={endPress}
        onTouchEnd={endPress}
        onMouseLeave={cancelPress}
        onTouchMove={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={handleContextMenu}
      >
        {content}
      </Button>
    ) : (
      <Link
        href={item.href || "#"}
        className={buttonClass}
        style={{ WebkitTouchCallout: "none" }}
        onClick={handleClick}
        onMouseDown={startPress}
        onTouchStart={startPress}
        onMouseUp={endPress}
        onTouchEnd={endPress}
        onMouseLeave={cancelPress}
        onTouchMove={cancelPress}
        onTouchCancel={cancelPress}
        onContextMenu={handleContextMenu}
      >
        {content}
      </Link>
    );

    return (
      <DropdownMenu
        open={dropdownOpen}
        onOpenChange={(open) => {
          if (open) {
            if (isLongPressRef.current) {
              setDropdownOpen(true);
            }
          } else {
            setDropdownOpen(false);
          }
        }}
      >
        <DropdownMenuTrigger asChild onContextMenu={handleContextMenu}>
          {triggerElement}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="w-48 bg-background/95 backdrop-blur-md"
        >
          {item.children.map((child) => {
            const isChildActive = pathname === child.href;
            return (
              <DropdownMenuItem key={child.label} asChild>
                {child.component ? (
                  child.component
                ) : (
                  <Link
                    href={child.href || "#"}
                    className={cn(
                      "flex items-center gap-2 w-full cursor-pointer px-2.5 py-2 rounded-md transition-colors duration-200 text-xs sm:text-sm",
                      isChildActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-muted",
                    )}
                  >
                    {child.icon && (
                      <span
                        className={cn(
                          "[&>svg]:size-4",
                          isChildActive
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {child.icon}
                      </span>
                    )}
                    <span>{child.label}</span>
                  </Link>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

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

function RrCustomBottomDock({
  customItems,
  pathname,
  className,
}: {
  customItems: DockItemData[];
  pathname: string;
  className?: string;
}): React.JSX.Element {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef(false);
  const hasDraggedRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const scrollLeftRef = React.useRef(0);
  const [isGrabbing, setIsGrabbing] = React.useState(false);

  // Auto-scroll active item into view
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeEl = el.querySelector<HTMLElement>("[data-active='true']");
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [customItems]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !scrollRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    setIsGrabbing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    const dx = e.pageX - startXRef.current;
    if (Math.abs(dx) > 5) {
      hasDraggedRef.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeftRef.current - dx;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setIsGrabbing(false);
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
    }
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/85 backdrop-blur-2xl border border-border/80 shadow-2xl w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-md sm:max-w-lg select-none rounded-full overflow-hidden pointer-events-auto",
        className,
      )}
    >
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        className={cn(
          "flex items-center overflow-x-auto no-scrollbar px-2 py-2 sm:py-2.5 snap-x snap-mandatory w-full touch-pan-x cursor-grab active:cursor-grabbing",
          isGrabbing && "snap-none select-none",
        )}
      >
        {customItems.map((item) => (
          <div
            key={item.label}
            data-active={item.isActive ? "true" : "false"}
            className="flex-[0_0_20%] shrink-0 snap-center flex justify-center"
          >
            <RrDockItem item={item} pathname={pathname} />
          </div>
        ))}
      </div>
    </div>
  );
}
