"use client";

import type React from "react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavbarConfig, NavItem } from "@/components/Providers/NavigationProvider";
import { useSession } from "next-auth/react";
import { apps } from "../../config/apps";
import { getAquilaSidebarConfig } from "../../config/aquilaSidebarConfig";
import { getLynxSidebarConfig } from "../../config/lynxSidebarConfig";
import { toast } from "sonner";
import { hasPermission } from "@runa/permissions";


interface Connection {
  id: string;
  provider: string;
  linkedUsername: string;
  connectionId: string | null;
  createdAt: string;
  expiresAt: string | null;
  private: boolean;
  metadata?: any;
}

interface SidebarSettingsTabProps {
  onOpenChange: (open: boolean) => void;
  navConfig?: NavbarConfig;
}

export interface SidebarSettingsTabRef {
  handleSave: () => void;
}

export const SidebarSettingsTab = forwardRef<SidebarSettingsTabRef, SidebarSettingsTabProps>(
  ({ onOpenChange, navConfig }, ref) => {
    const { data: session } = useSession();
    const [selectedAppHref, setSelectedAppHref] = useState<string>("/aquila");
    const [focusedSlot, setFocusedSlot] = useState<string | null>("1");
    const [tempPositions, setTempPositions] = useState<Record<string, string | null>>({
      "1": null,
      "2": null,
      "3": null,
      "4": null,
    });
    const [connections, setConnections] = useState<Connection[]>([]);

    useEffect(() => {
      if (session?.accessToken) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/connections`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
          .then((res) => res.json())
          .then((data) => setConnections(Array.isArray(data) ? data : []))
          .catch((err) => console.error("Failed to fetch connections", err));
      }
    }, [session?.accessToken]);

    const getActiveAppHref = (): string => {
      if (typeof window === "undefined") return "/aquila";
      const pathname = window.location.pathname;
      const app = apps.find((a) => pathname.startsWith(a.href));
      if (app && app.name.toLowerCase() !== "polaris") {
        return app.href;
      }
      return "/aquila";
    };

    // Initialize dropdown to the current app on mount
    useEffect(() => {
      setSelectedAppHref(getActiveAppHref());
    }, []);

    // Resolve config for selected app
    const resolveConfigForApp = (appHref: string): NavbarConfig => {
      if (appHref === "/aquila") {
        return getAquilaSidebarConfig(session, connections);
      }
      if (appHref === "/lynx") {
        return getLynxSidebarConfig({});
      }
      return navConfig || [];
    };

    const currentConfig = resolveConfigForApp(selectedAppHref);

    const findItemByHref = (href: string | null | undefined): NavItem | undefined => {
      if (!href) return undefined;
      for (const section of currentConfig) {
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

    useEffect(() => {
      const storageKey = `runa-phone-dock-items-${selectedAppHref}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setTempPositions(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      } else {
        const phoneSection = currentConfig.find(
          (s) => s.section?.toLowerCase() === "phone"
        );
        const defaults: Record<string, string | null> = {
          "1": null,
          "2": null,
          "3": null,
          "4": null,
        };
        if (phoneSection) {
          phoneSection.items.forEach((item) => {
            if (item.position && item.href) {
              defaults[item.position.toString()] = item.href;
            }
          });
        }
        setTempPositions(defaults);
      }
    }, [selectedAppHref]);

    const handleFocusSlot = (pos: string) => {
      const positions = ["1", "2", "3", "4"];
      const index = positions.indexOf(pos);
      
      // Block selection if any preceding slot is empty
      for (let i = 0; i < index; i++) {
        if (!tempPositions[positions[i]]) {
          toast.warning(`Position ${positions[i]} must be filled before selecting Position ${pos}.`);
          return;
        }
      }
      setFocusedSlot(pos);
    };

    const handleClearSlot = (pos: string) => {
      const newPositions = { ...tempPositions, [pos]: null };
      
      // Pack items to remove gaps
      const values = Object.values(newPositions).filter(Boolean);
      const packed: Record<string, string | null> = {
        "1": values[0] || null,
        "2": values[1] || null,
        "3": values[2] || null,
        "4": values[3] || null,
      };
      
      setTempPositions(packed);
      
      // Auto focus the new first empty slot
      const firstEmpty = ["1", "2", "3", "4"].find((p) => !packed[p]) || "1";
      setFocusedSlot(firstEmpty);
    };

    const handleSelectItem = (href: string) => {
      if (!focusedSlot) return;
      const newPositions = { ...tempPositions };
      
      // Clear from previous slot if assigned
      Object.keys(newPositions).forEach((key) => {
        if (newPositions[key] === href) {
          newPositions[key] = null;
        }
      });
      newPositions[focusedSlot] = href;

      // Pack items to keep layout clean and gap-free
      const values = Object.values(newPositions).filter(Boolean);
      const packed: Record<string, string | null> = {
        "1": values[0] || null,
        "2": values[1] || null,
        "3": values[2] || null,
        "4": values[3] || null,
      };
      
      setTempPositions(packed);

      // Focus next available slot
      const firstEmpty = ["1", "2", "3", "4"].find((p) => !packed[p]) || "1";
      setFocusedSlot(firstEmpty);
    };

    const handleSave = () => {
      const storageKey = `runa-phone-dock-items-${selectedAppHref}`;
      localStorage.setItem(storageKey, JSON.stringify(tempPositions));
      window.dispatchEvent(new Event("runa-sidebar-changed"));
      onOpenChange(false);
    };

    useImperativeHandle(ref, () => ({
      handleSave,
    }));

    // Group availableItems by section
    const userPermissions = session?.user?.permissions;
    const groupedItems: Record<string, NavItem[]> = {};
    currentConfig.forEach((sec) => {
      if (sec.section?.toLowerCase() === "phone") return;
      
      // Check section permission access
      const canAccessSection = !sec.permission || hasPermission(userPermissions, sec.permission, "any");
      if (!canAccessSection) return;

      sec.items.forEach((item) => {
        // Check item permission access
        const canAccessItem = !item.permission || hasPermission(userPermissions, item.permission, "any");
        if (!canAccessItem) return;

        const secName = sec.section || "General";
        if (item.href && !item.href.startsWith("/polaris")) {
          if (!groupedItems[secName]) groupedItems[secName] = [];
          if (!groupedItems[secName].some((i) => i.href === item.href)) {
            groupedItems[secName].push(item);
          }
        }
      });
    });

    // Preview replicas
    const preview1 = findItemByHref(tempPositions["1"]);
    const preview2 = findItemByHref(tempPositions["2"]);
    const preview3 = findItemByHref(tempPositions["3"]);
    const preview4 = findItemByHref(tempPositions["4"]);

    const leftItems: NavItem[] = [];
    const rightItems: NavItem[] = [];

    if (preview1) leftItems.push(preview1);

    if (!preview3 && !preview4) {
      if (preview2) leftItems.push(preview2);
    } else if (!preview3 && preview4) {
      if (preview2) leftItems.push(preview2);
      leftItems.push(preview4);
    } else {
      if (preview2) leftItems.push(preview2);
      if (preview3) rightItems.push(preview3);
      if (preview4) rightItems.push(preview4);
    }

    const InteractiveDockSlot = ({ pos }: { pos: string }): React.JSX.Element => {
      const href = tempPositions[pos];
      const item = findItemByHref(href);
      const isFocused = focusedSlot === pos;
      const isAssigned = !!item;

      return (
        <div className="relative group/slot flex flex-col items-center">
          <button
            type="button"
            onClick={() => handleFocusSlot(pos)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl transition-all duration-200 min-w-[54px] min-h-[44px] border relative cursor-pointer outline-none select-none",
              isFocused
                ? "bg-sidebar-accent/80 border-primary text-sidebar-accent-foreground font-semibold shadow-[0_0_8px_rgba(139,92,246,0.35)] scale-105 z-10"
                : isAssigned
                  ? "bg-transparent border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  : "bg-transparent border-dashed border-sidebar-border/30 text-sidebar-foreground/20 hover:bg-sidebar-accent/10 hover:border-sidebar-border/40"
            )}
          >
            {isAssigned ? (
              <>
                <span className="scale-90 transition-transform duration-200 group-hover/slot:scale-100">{item.icon}</span>
                <span className="text-[9px] tracking-tight font-medium truncate max-w-[48px]">
                  {item.label}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold opacity-45">+{pos}</span>
                <span className="text-[8px] tracking-tight opacity-30 font-medium">Empty</span>
              </>
            )}
          </button>

          {isAssigned && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearSlot(pos);
              }}
              className={cn(
                "absolute -top-1 -right-1 size-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer z-20",
                isFocused
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-75 group-hover/slot:opacity-100 group-hover/slot:scale-100"
              )}
              aria-label={`Clear position ${pos}`}
            >
              <span className="text-[9px] leading-none font-bold">×</span>
            </button>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Customize Phone Sidebar / Dock</h3>
            <p className="text-xs text-muted-foreground">
              Customize your shortcuts for mobile. Select a position slot (1 to 4) below, then click any item from the available list to assign it.
            </p>
          </div>
          
          {/* App Selector Dropdown */}
          <div className="flex flex-col gap-1 shrink-0 w-full sm:w-auto">
            <label htmlFor="app-select" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Application
            </label>
            <select
              id="app-select"
              value={selectedAppHref}
              onChange={(e) => setSelectedAppHref(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border/80 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground cursor-pointer font-medium min-w-[140px]"
            >
              {apps
                .filter((app) => app.name.toLowerCase() !== "polaris")
                .map((app) => (
                  <option key={app.href} value={app.href}>
                    {app.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Interactive Live Dock Selector */}
        <div className="flex items-center justify-center py-4 w-full">
          <div className="flex items-center justify-between gap-1 px-3 py-2 bg-sidebar/95 backdrop-blur-md border border-sidebar-border rounded-full shadow-2xl w-full select-none max-w-sm">
            {/* Left slots */}
            <div className="flex items-center gap-0.5 flex-1 justify-around">
              <InteractiveDockSlot pos="1" />
              <InteractiveDockSlot pos="2" />
            </div>

            {/* Switcher Button */}
            <div className="flex items-center justify-center size-10.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 shrink-0 mx-1.5">
              <LayoutGrid className="size-4" />
            </div>

            {/* Right slots */}
            <div className="flex items-center gap-0.5 flex-1 justify-around">
              <InteractiveDockSlot pos="3" />
              <InteractiveDockSlot pos="4" />
            </div>
          </div>
        </div>

        {/* Available Items */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-foreground">Available Navigation Shortcuts</span>
            {!focusedSlot ? (
              <span className="text-[10px] text-primary font-semibold animate-pulse">
                Select a slot above to assign items
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Assigning to <strong className="text-primary font-semibold">Position {focusedSlot}</strong>
              </span>
            )}
          </div>
          
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 no-scrollbar border border-border/50 rounded-xl p-3 bg-muted/5">
            {Object.entries(groupedItems).map(([secName, items]) => (
              <div key={secName} className="space-y-1.5">
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                  {secName}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((item) => {
                    const assignedPos = Object.keys(tempPositions).find((key) => tempPositions[key] === item.href);
                    const isAssigned = !!assignedPos;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        disabled={!focusedSlot}
                        onClick={() => item.href && handleSelectItem(item.href)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all duration-200 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                          isAssigned
                            ? "bg-muted/30 border-border text-muted-foreground"
                            : "bg-background border-border/50 hover:bg-muted hover:border-border text-foreground"
                        )}
                      >
                        <span className="scale-75 shrink-0 opacity-80">{item.icon}</span>
                        <span className="truncate flex-1">{item.label}</span>
                        {isAssigned && (
                          <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                            Pos {assignedPos}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

SidebarSettingsTab.displayName = "SidebarSettingsTab";
