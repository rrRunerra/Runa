"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { apps } from "../../../config/apps";
import { useSidebar } from "@/components/ui/sidebar";
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
  Compass,
  Palette,
  ChevronRight,
  User,
  PanelLeft,
  Bell,
  Shield,
  KeyRound,
} from "lucide-react";
import React from "react";
import { useRRSidebar } from "@/hooks/useRRSidebar";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";

interface SpotlightSearchItem {
  id: string;
  label: string;
  category: "Applications" | "Navigation" | "Actions";
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  badge?: string;
}

export default function RrSpotlightSearch(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { sidebarConfig } = useRRSidebar();
  const { toggleSidebar } = useSidebar();
  const { isE2eeUnlocked, setShowUnlockDialog } = useRRe2ee();

  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "apps" | "pages" | "actions"
  >("all");

  const openRef = useRef<boolean>(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Double-Shift key detection
  useEffect(() => {
    let lastShiftTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement &&
          activeElement.getAttribute("contenteditable") === "true");

      if (e.key === "Shift") {
        const now = Date.now();
        if (now - lastShiftTime < 300) {
          const isOpen = openRef.current;
          if (isOpen || !isInput) {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }
        lastShiftTime = now;
      } else {
        lastShiftTime = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Helper function to dispatch settings tab redirection custom events
  const triggerSettingsTab = (category: string): void => {
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("settings", category);
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new CustomEvent("runa-open-settings"));
  };

  // Build the list of searchable items
  const items: SpotlightSearchItem[] = [];

  // 1. Applications Category
  apps.forEach((app) => {
    items.push({
      id: `app-${app.name.toLowerCase()}`,
      label: app.name,
      category: "Applications",
      icon: (
        <div className="flex size-6 items-center justify-center rounded-md border border-border/55 bg-background text-foreground shadow-xs group-data-selected/command-item:border-primary/40 group-data-selected/command-item:scale-105 transition-all">
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

  const activeApp = apps.find((app) => pathname?.startsWith(app.href));

  // 2. Navigation Category (dynamically extracted from active Navigation Context)
  if (activeApp && sidebarConfig && sidebarConfig.length > 0) {
    sidebarConfig.forEach((section, sectionIdx) => {
      if (section.section?.toLowerCase() === "phone") return;

      const sectionKey = (section.section || `sec-${sectionIdx}`)
        .toLowerCase()
        .replace(/\s+/g, "-");

      section.items.forEach((navItem) => {
        const isFromActiveApp =
          navItem.href && navItem.href.startsWith(activeApp.href);

        if (navItem.href && isFromActiveApp) {
          const href = navItem.href;
          items.push({
            id: `nav-${sectionKey}-${navItem.label.toLowerCase().replace(/\s+/g, "-")}`,
            label: navItem.label,
            category: "Navigation",
            icon: navItem.icon ? (
              <span className="opacity-70 group-data-selected/command-item:opacity-100 transition-opacity">
                {navItem.icon}
              </span>
            ) : (
              <Compass className="size-4 opacity-70" />
            ),
            badge: section.section,
            action: () => {
              setOpen(false);
              router.push(href);
            },
          });
        }

        if (navItem.children && navItem.children.length > 0) {
          navItem.children.forEach((childItem) => {
            const isChildFromActiveApp =
              childItem.href && childItem.href.startsWith(activeApp.href);
            if (!isChildFromActiveApp) return;

            const childHref = childItem.href;
            if (!childHref) return;

            items.push({
              id: `nav-${sectionKey}-${navItem.label.toLowerCase().replace(/\s+/g, "-")}-${childItem.label.toLowerCase().replace(/\s+/g, "-")}`,
              label: `${navItem.label} › ${childItem.label}`,
              category: "Navigation",
              icon: childItem.icon ? (
                <span className="opacity-70 group-data-selected/command-item:opacity-100 transition-opacity">
                  {childItem.icon}
                </span>
              ) : (
                <ChevronRight className="size-4 opacity-70" />
              ),
              badge: section.section,
              action: () => {
                setOpen(false);
                router.push(childHref);
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
      icon: (
        <User className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
      ),
      badge: "Account Details",
      action: () => {
        setOpen(false);
        router.push(`/polaris/user/${session.user.username}`);
      },
    });
  }

  // Settings Main Action
  items.push({
    id: "action-settings",
    label: "Open Settings",
    category: "Actions",
    icon: (
      <Settings className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "System Settings",
    action: () => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("runa-open-settings"));
    },
  });

  // Notifications Action
  items.push({
    id: "action-notifications",
    label: "Open Notifications Feed",
    category: "Actions",
    icon: (
      <Bell className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "System Alerts",
    action: () => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("runa-open-notifications"));
    },
  });

  // Unlock E2EE Action (only visible if not unlocked)
  if (!isE2eeUnlocked) {
    items.push({
      id: "action-unlock-e2ee",
      label: "Unlock Encryption",
      category: "Actions",
      icon: (
        <Shield className="size-4 opacity-70 group-data-selected/command-item:opacity-100 text-amber-500" />
      ),
      badge: "Encryption",
      action: () => {
        setOpen(false);
        setShowUnlockDialog(true);
      },
    });
  }

  // Direct Settings Tabs Actions
  items.push({
    id: "action-settings-account",
    label: "Account Settings",
    category: "Actions",
    icon: (
      <User className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "Settings tab",
    action: () => triggerSettingsTab("account"),
  });

  items.push({
    id: "action-settings-security",
    label: "Security Settings",
    category: "Actions",
    icon: (
      <Settings className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "Settings tab",
    action: () => triggerSettingsTab("security"),
  });

  items.push({
    id: "action-settings-privacy",
    label: "Privacy Settings",
    category: "Actions",
    icon: (
      <Settings className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "Settings tab",
    action: () => triggerSettingsTab("privacy"),
  });

  items.push({
    id: "action-settings-connections",
    label: "Connections Settings",
    category: "Actions",
    icon: (
      <Settings className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "Settings tab",
    action: () => triggerSettingsTab("connections"),
  });

  items.push({
    id: "action-settings-api-keys",
    label: "API Keys",
    category: "Actions",
    icon: (
      <KeyRound className="size-4 opacity-70 text-amber-500 group-data-selected/command-item:opacity-100" />
    ),
    badge: "Settings tab",
    action: () => triggerSettingsTab("apiKeys"),
  });

  // Conditional Mail Settings tab if we're in Pegasus
  const isPegasus = pathname?.startsWith("/pegasus");
  if (isPegasus) {
    items.push({
      id: "action-settings-mail",
      label: "Mail Settings",
      category: "Actions",
      icon: (
        <Settings className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
      ),
      badge: "Settings tab",
      action: () => triggerSettingsTab("mailAccounts"),
    });
  }

  // Constellation Builder Action
  items.push({
    id: "action-constellation-builder",
    label: "Constellation Builder Workspace",
    category: "Actions",
    icon: (
      <Sparkles className="size-4 opacity-70 text-amber-500 group-data-selected/command-item:opacity-100" />
    ),
    badge: "Stars Editor",
    action: () => {
      setOpen(false);
      window.dispatchEvent(new CustomEvent("runa-open-builder"));
    },
  });

  // Toggle Sidebar Action
  items.push({
    id: "action-sidebar-toggle",
    label: "Toggle Left Sidebar",
    category: "Actions",
    icon: (
      <PanelLeft className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "UI Shortcut",
    action: () => {
      setOpen(false);
      toggleSidebar();
    },
  });

  // Appearance Action
  items.push({
    id: "action-appearance",
    label: "Open Appearance Customizer",
    category: "Actions",
    icon: (
      <Palette className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "Visual customizer",
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
    icon: (
      <Moon className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "System UI Theme",
    action: () => {
      setTheme("dark");
      setOpen(false);
    },
  });

  items.push({
    id: "action-theme-light",
    label: "Switch Theme: Light Mode",
    category: "Actions",
    icon: (
      <Sun className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "System UI Theme",
    action: () => {
      setTheme("light");
      setOpen(false);
    },
  });

  items.push({
    id: "action-theme-system",
    label: "Switch Theme: System Settings",
    category: "Actions",
    icon: (
      <Laptop className="size-4 opacity-70 group-data-selected/command-item:opacity-100" />
    ),
    badge: "System UI Theme",
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
      icon: (
        <LogOut className="size-4 text-destructive group-data-selected/command-item:text-destructive-foreground" />
      ),
      badge: "Session logout",
      action: () => {
        setOpen(false);
        signOut({ redirect: false });
      },
    });
  }

  // Filter items based on active category filter tab and search text
  const filteredItems = items.filter((item) => {
    // 1. Text Search Filter
    const searchMatch =
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      (item.badge && item.badge.toLowerCase().includes(search.toLowerCase()));

    if (!searchMatch) return false;

    // 2. Category Tab Filter
    if (activeFilter === "apps") return item.category === "Applications";
    if (activeFilter === "pages") return item.category === "Navigation";
    if (activeFilter === "actions") return item.category === "Actions";

    return true; // "all"
  });

  // Split into structural groups for command sections

  const applicationsGroup = filteredItems.filter(
    (i) => i.category === "Applications",
  );
  const navigationGroup = filteredItems.filter(
    (i) => i.category === "Navigation",
  );
  const actionsGroup = filteredItems.filter((i) => i.category === "Actions");

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Spotlight Search"
      description="Quickly switch apps, jump to navigation pages, or perform platform actions."
      className="sm:max-w-3xl bg-popover border border-border shadow-2xl p-0 overflow-hidden"
    >
      <div className="flex flex-col relative border-b border-border w-full bg-popover shrink-0">
        <CommandInput
          placeholder="Search apps, pages, actions... (Double Shift to close)"
          value={search}
          onValueChange={setSearch}
          className="border-none bg-transparent focus:ring-0 focus:outline-hidden py-4 px-3 w-full text-base placeholder:text-muted-foreground/60"
        />

        {/* Category Quick Filter Tags */}
        <div className="flex items-center gap-1.5 px-4 pb-3 overflow-x-auto select-none no-scrollbar">
          {(["all", "apps", "pages", "actions"] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 text-[10px] font-bold tracking-wider rounded-full uppercase border cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-primary border-primary text-primary-foreground shadow-xs scale-102"
                    : "bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                {filter === "all"
                  ? "All"
                  : filter === "apps"
                    ? "Apps"
                    : filter === "pages"
                      ? "Pages"
                      : "Actions"}
              </button>
            );
          })}
        </div>
      </div>

      <CommandList className="max-h-[480px] overflow-y-auto p-3 no-scrollbar bg-popover">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          No matches found for &ldquo;{search}&rdquo;
        </CommandEmpty>

        {/* Applications Section */}
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

        {applicationsGroup.length > 0 &&
          (navigationGroup.length > 0 || actionsGroup.length > 0) && (
            <CommandSeparator className="my-2.5 bg-border/40" />
          )}

        {/* Navigation Section */}
        {navigationGroup.length > 0 && (
          <CommandGroup heading="Navigation" className="px-2">
            {navigationGroup.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={item.action}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-all duration-200 group/item"
              >
                <div className="flex size-7 items-center justify-center rounded-lg border border-border/30 bg-background/50 text-muted-foreground group-data-selected/command-item:bg-primary group-data-selected/command-item:text-primary-foreground group-data-selected/command-item:border-transparent transition-colors shadow-2xs">
                  {item.icon}
                </div>
                <span className="font-semibold text-sm text-foreground flex-1">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border/30 text-muted-foreground font-semibold">
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

        {/* Actions Section */}
        {actionsGroup.length > 0 && (
          <CommandGroup heading="System Actions" className="px-2">
            {actionsGroup.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={item.action}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-all duration-200 group/item"
              >
                <div className="flex size-7 items-center justify-center rounded-lg border border-border/30 bg-background/50 text-muted-foreground group-data-selected/command-item:bg-accent group-data-selected/command-item:text-accent-foreground group-data-selected/command-item:border-transparent transition-colors shadow-2xs">
                  {item.icon}
                </div>
                <span className="font-semibold text-sm text-foreground flex-1">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 border border-border/20 text-muted-foreground font-medium">
                    {item.badge}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="border-t border-border bg-muted/30 px-5 py-3 flex items-center justify-between text-xs text-muted-foreground select-none shrink-0">
        <div className="flex items-center gap-2">
          <span>Navigate:</span>
          <kbd className="px-1.5 py-0.5 rounded-sm bg-muted border border-border/50 font-mono text-[10px]">
            ↑
          </kbd>
          <kbd className="px-1.5 py-0.5 rounded-sm bg-muted border border-border/50 font-mono text-[10px]">
            ↓
          </kbd>
          <span className="ml-1.5">Select:</span>
          <kbd className="px-1.5 py-0.5 rounded-sm bg-muted border border-border/50 font-mono text-[10px]">
            ⏎
          </kbd>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Double-tap</span>
          <kbd className="px-1.5 py-0.5 rounded-sm bg-primary/10 border border-primary/20 font-sans font-semibold text-[10px] text-primary animate-pulse">
            Shift
          </kbd>
          <span>to close</span>
        </div>
      </div>
    </CommandDialog>
  );
}
