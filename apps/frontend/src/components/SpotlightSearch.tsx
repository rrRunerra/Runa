"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useNavigation } from "@/hooks/useNavigation";
import { apps } from "../../config/apps";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Sparkles,
  Settings,
  LogOut,
  Moon,
  Sun,
  Laptop,
  ArrowRight,
  AppWindow,
  Compass,
  Palette,
  ChevronRight,
  User,
} from "lucide-react";
import React from "react";

interface SpotlightSearchItem {
  id: string;
  label: string;
  category: "Applications" | "Navigation" | "Actions";
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  badge?: string;
}

export default function SpotlightSearch(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { navbarConfig } = useNavigation();

  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  const openRef = useRef<boolean>(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Double-Shift key detection
  useEffect(() => {
    let lastShiftTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is inside an input/textarea/editable element
      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement && activeElement.getAttribute("contenteditable") === "true");

      if (e.key === "Shift") {
        const now = Date.now();
        if (now - lastShiftTime < 300) {
          // Double Shift detected
          const isOpen = openRef.current;
          if (isOpen || !isInput) {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }
        lastShiftTime = now;
      } else {
        // Reset if other keys are pressed
        lastShiftTime = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Build the list of searchable items
  const items: SpotlightSearchItem[] = [];

  // 1. Applications Category
  apps.forEach((app) => {
    items.push({
      id: `app-${app.name.toLowerCase()}`,
      label: app.name,
      category: "Applications",
      icon: (
        <div className="flex size-6 items-center justify-center rounded-md border border-border/50 bg-background text-foreground shadow-sm group-data-selected/command-item:border-primary/30">
          {app.logo}
        </div>
      ),
      badge: app.description,
      action: () => {
        setOpen(false);
        router.push(app.href);
      },
    });
  });

  // Find active application based on current pathname
  const activeApp = apps.find((app) => pathname?.startsWith(app.href));

  // 2. Navigation Category (dynamically extracted from active Navigation Context)
  if (activeApp && navbarConfig && navbarConfig.length > 0) {
    navbarConfig.forEach((section) => {
      // Skip phone section if present
      if (section.section?.toLowerCase() === "phone") return;

      section.items.forEach((navItem) => {
        // Only include if user has access
        if (
          navItem.role &&
          session?.user?.role !== "ADMIN" &&
          navItem.role !== session?.user?.role
        ) {
          return;
        }

        // Only include if it belongs to the active app
        const isFromActiveApp = navItem.href && navItem.href.startsWith(activeApp.href);

        // Add main navigation item
        if (navItem.href && isFromActiveApp) {
          items.push({
            id: `nav-${navItem.label.toLowerCase()}`,
            label: navItem.label,
            category: "Navigation",
            icon: navItem.icon ? (
              <span className="opacity-60 group-data-selected/command-item:opacity-100">{navItem.icon}</span>
            ) : (
              <Compass className="size-4 opacity-60" />
            ),
            badge: section.section,
            action: () => {
              setOpen(false);
              router.push(navItem.href);
            },
          });
        }

        // Add children sub-items
        if (navItem.children && navItem.children.length > 0) {
          navItem.children.forEach((childItem) => {
            if (
              childItem.role &&
              session?.user?.role !== "ADMIN" &&
              childItem.role !== session?.user?.role
            ) {
              return;
            }

            const isChildFromActiveApp = childItem.href && childItem.href.startsWith(activeApp.href);
            if (!isChildFromActiveApp) return;

            items.push({
              id: `nav-${navItem.label.toLowerCase()}-${childItem.label.toLowerCase()}`,
              label: `${navItem.label} › ${childItem.label}`,
              category: "Navigation",
              icon: childItem.icon ? (
                <span className="opacity-60 group-data-selected/command-item:opacity-100">{childItem.icon}</span>
              ) : (
                <ChevronRight className="size-4 opacity-60" />
              ),
              badge: section.section,
              action: () => {
                setOpen(false);
                router.push(childItem.href);
              },
            });
          });
        }
      });
    });
  }

  // 3. System Actions Category
  // Profile Action
  if (session?.user) {
    items.push({
      id: "action-profile",
      label: "My Profile",
      category: "Actions",
      icon: <User className="size-4 opacity-60 group-data-selected/command-item:opacity-100" />,
      action: () => {
        setOpen(false);
        router.push(`/polaris/user/${session.user.username}`);
      },
    });
  }

  // Settings Action
  items.push({
    id: "action-settings",
    label: "Open Settings",
    category: "Actions",
    icon: <Settings className="size-4 opacity-60 group-data-selected/command-item:opacity-100" />,
    action: () => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("runa-open-settings"));
    },
  });

  // Appearance Action
  items.push({
    id: "action-appearance",
    label: "Open Appearance Customizer",
    category: "Actions",
    icon: <Palette className="size-4 opacity-60 group-data-selected/command-item:opacity-100" />,
    action: () => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("runa-open-appearance"));
    },
  });

  // Theme Actions
  items.push({
    id: "action-theme-dark",
    label: "Switch Theme: Dark Mode",
    category: "Actions",
    icon: <Moon className="size-4 opacity-60 group-data-selected/command-item:opacity-100" />,
    action: () => {
      setTheme("dark");
      setOpen(false);
    },
  });

  items.push({
    id: "action-theme-light",
    label: "Switch Theme: Light Mode",
    category: "Actions",
    icon: <Sun className="size-4 opacity-60 group-data-selected/command-item:opacity-100" />,
    action: () => {
      setTheme("light");
      setOpen(false);
    },
  });

  items.push({
    id: "action-theme-system",
    label: "Switch Theme: System Settings",
    category: "Actions",
    icon: <Laptop className="size-4 opacity-60 group-data-selected/command-item:opacity-100" />,
    action: () => {
      setTheme("system");
      setOpen(false);
    },
  });

  // Logout Action
  if (session) {
    items.push({
      id: "action-logout",
      label: "Log Out",
      category: "Actions",
      icon: <LogOut className="size-4 text-destructive group-data-selected/command-item:text-destructive-foreground" />,
      action: () => {
        setOpen(false);
        signOut({ redirect: false });
      },
    });
  }

  // Filter items based on search input
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase()) ||
    (item.badge && item.badge.toLowerCase().includes(search.toLowerCase()))
  );

  const applicationsGroup = filteredItems.filter((i) => i.category === "Applications");
  const navigationGroup = filteredItems.filter((i) => i.category === "Navigation");
  const actionsGroup = filteredItems.filter((i) => i.category === "Actions");

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Spotlight Search"
      description="Quickly switch apps, jump to navigation pages, or perform platform actions."
      className="sm:max-w-3xl! bg-popover/90 backdrop-blur-xl border border-border/40 shadow-2xl p-0 overflow-hidden"
    >
      <div className="relative border-b border-border/30 w-full">
        <CommandInput
          placeholder="Search apps, pages, actions... (Double Shift to close)"
          value={search}
          onValueChange={setSearch}
          className="border-none bg-transparent focus:ring-0 focus:outline-hidden py-4 px-3 w-full text-base"
        />
      </div>
      <CommandList className="max-h-[480px] overflow-y-auto p-3 no-scrollbar">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          No matches found for &ldquo;{search}&rdquo;
        </CommandEmpty>

        {applicationsGroup.length > 0 && (
          <CommandGroup heading="Applications" className="px-2">
            {applicationsGroup.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={item.action}
                className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-all duration-200 group/item"
              >
                <div className="flex size-7 items-center justify-center rounded-lg border border-border/50 bg-background text-foreground shadow-sm group-data-selected/command-item:border-primary/30 group-data-selected/command-item:scale-105 transition-all">
                  {item.icon}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-bold text-sm text-foreground group-data-selected/command-item:text-primary">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="text-xs text-muted-foreground group-data-selected/command-item:text-muted-foreground/80">
                      {item.badge}
                    </span>
                  )}
                </div>
                <ArrowRight className="size-4 opacity-0 group-data-selected/command-item:opacity-100 transition-opacity text-primary" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {applicationsGroup.length > 0 && (navigationGroup.length > 0 || actionsGroup.length > 0) && (
          <CommandSeparator className="my-2.5 bg-border/40" />
        )}

        {navigationGroup.length > 0 && (
          <CommandGroup heading="Navigation" className="px-2">
            {navigationGroup.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={item.action}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-all duration-200"
              >
                <div className="flex size-7 items-center justify-center rounded-lg border border-border/30 bg-background/50 text-muted-foreground group-data-selected/command-item:bg-primary group-data-selected/command-item:text-primary-foreground group-data-selected/command-item:border-transparent transition-colors shadow-2xs">
                  {item.icon}
                </div>
                <span className="font-semibold text-sm text-foreground flex-1">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-muted border border-border/30 text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {navigationGroup.length > 0 && actionsGroup.length > 0 && (
          <CommandSeparator className="my-2.5 bg-border/40" />
        )}

        {actionsGroup.length > 0 && (
          <CommandGroup heading="System Actions" className="px-2">
            {actionsGroup.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={item.action}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-all duration-200"
              >
                <div className="flex size-7 items-center justify-center rounded-lg border border-border/30 bg-background/50 text-muted-foreground group-data-selected/command-item:bg-accent group-data-selected/command-item:text-accent-foreground group-data-selected/command-item:border-transparent transition-colors shadow-2xs">
                  {item.icon}
                </div>
                <span className="font-semibold text-sm text-foreground flex-1">
                  {item.label}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="border-t border-border/35 bg-muted/30 px-5 py-3 flex items-center justify-between text-xs text-muted-foreground select-none">
        <div className="flex items-center gap-2">
          <span>Navigate:</span>
          <kbd className="px-1.5 py-0.5 rounded-sm bg-muted border border-border/50 font-mono text-[10px]">↑</kbd>
          <kbd className="px-1.5 py-0.5 rounded-sm bg-muted border border-border/50 font-mono text-[10px]">↓</kbd>
          <span className="ml-1.5">Select:</span>
          <kbd className="px-1.5 py-0.5 rounded-sm bg-muted border border-border/50 font-mono text-[10px]">⏎</kbd>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Double-tap</span>
          <kbd className="px-1.5 py-0.5 rounded-sm bg-primary/10 border border-primary/20 font-sans font-semibold text-[10px] text-primary">Shift</kbd>
          <span>to close</span>
        </div>
      </div>
    </CommandDialog>
  );
}
