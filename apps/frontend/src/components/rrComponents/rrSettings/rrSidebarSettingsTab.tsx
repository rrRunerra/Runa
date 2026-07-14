"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarConfig, SidebarItem } from "@/types/SidebarConfig";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { rrApps } from "../../../../config/rrApps";
import { getAquariusSidebarConfig } from "../../../../config/aquariusSidebarConfig";
import { getAquilaSidebarConfig } from "../../../../config/aquilaSidebarConfig";
import { getLacertaSidebarConfig } from "../../../../config/lacertaSidebarConfig";
import { getLynxSidebarConfig } from "../../../../config/lynxSidebarConfig";
import { getLyraSidebarConfig } from "../../../../config/lyraSidebarConfig";
import { getMonocerosSidebarConfig } from "../../../../config/monocerosSidebarConfig";
import { getPegasusSidebarConfig } from "../../../../config/pegasusSidebarConfig";
import { toast } from "sonner";
import { hasPermission } from "@runa/permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

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

interface RrSidebarSettingsTabProps {
  onOpenChange: (open: boolean) => void;
}

export function RrSidebarSettingsTab({
  onOpenChange,
}: RrSidebarSettingsTabProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [selectedAppHref, setSelectedAppHref] = useState<string>("/aquila");
  const [focusedSlot, setFocusedSlot] = useState<string | null>("1");
  const [tempPositions, setTempPositions] = useState<
    Record<string, string | null>
  >({
    "1": null,
    "2": null,
    "3": null,
    "4": null,
  });
  const [connections, setConnections] = useState<Connection[]>([]);
  const [emails, setEmails] = useState<any[]>([]);

  const { data: connectionsData } = useSWR<Connection[]>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/connections`, session.accessToken]
      : null,
    fetcher,
  );

  const { data: emailsData } = useSWR<any[]>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/emails`, session.accessToken]
      : null,
    fetcher,
  );

  useEffect(() => {
    if (connectionsData) {
      setConnections(Array.isArray(connectionsData) ? connectionsData : []);
    }
  }, [connectionsData]);

  useEffect(() => {
    if (emailsData) {
      setEmails(Array.isArray(emailsData) ? emailsData : []);
    }
  }, [emailsData]);

  const getActiveAppHref = (): string => {
    if (typeof window === "undefined") return "/aquila";
    const pathname = window.location.pathname;
    const app = rrApps.find((a) => pathname.startsWith(a.href));
    if (app && app.name.toLowerCase() !== "polaris") {
      return app.href;
    }
    return "/aquila";
  };

  useEffect(() => {
    setSelectedAppHref(getActiveAppHref());
  }, []);

  const currentConfig = useMemo((): SidebarConfig => {
    if (selectedAppHref === "/aquila") {
      return getAquilaSidebarConfig(session, connections);
    }
    if (selectedAppHref === "/lynx") {
      return getLynxSidebarConfig({}, t);
    }
    if (selectedAppHref === "/pegasus") {
      return getPegasusSidebarConfig(emails);
    }
    if (selectedAppHref === "/aquarius") {
      return getAquariusSidebarConfig();
    }
    if (selectedAppHref === "/lacerta") {
      return getLacertaSidebarConfig();
    }
    if (selectedAppHref === "/lyra") {
      return getLyraSidebarConfig();
    }
    if (selectedAppHref === "/monoceros") {
      return getMonocerosSidebarConfig();
    }
    return [];
  }, [selectedAppHref, session, connections, emails]);

  const findItemByHref = (
    key: string | null | undefined,
  ): SidebarItem | undefined => {
    if (!key) return undefined;
    for (const section of currentConfig) {
      for (const item of section.items) {
        const itemKey =
          item.href || (item.component ? `label:${item.label}` : undefined);
        if (itemKey === key) return item;
        if (item.children) {
          for (const child of item.children) {
            const childKey =
              child.href ||
              (child.component ? `label:${child.label}` : undefined);
            if (childKey === key) return child;
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
        const parsed = JSON.parse(stored);
        setTempPositions((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(parsed)) return prev;
          return parsed;
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      const phoneSection = currentConfig.find(
        (s) => s.section?.toLowerCase().replace(/[^a-z]/g, "") === "phone",
      );
      const defaults: Record<string, string | null> = {
        "1": null,
        "2": null,
        "3": null,
        "4": null,
      };
      if (phoneSection) {
        phoneSection.items.forEach((item) => {
          if (item.position) {
            const itemKey =
              item.href || (item.component ? `label:${item.label}` : null);
            if (itemKey) {
              defaults[item.position.toString()] = itemKey;
            }
          }
        });
      }
      setTempPositions((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(defaults)) return prev;
        return defaults;
      });
    }
  }, [selectedAppHref, currentConfig]);

  const handleFocusSlot = (pos: string): void => {
    const positions = ["1", "2", "3", "4"];
    const index = positions.indexOf(pos);

    for (let i = 0; i < index; i++) {
      if (!tempPositions[positions[i]]) {
        toast.warning(
          `Position ${positions[i]} must be filled before selecting Position ${pos}.`,
        );
        return;
      }
    }
    setFocusedSlot(pos);
  };

  const handleClearSlot = (pos: string): void => {
    const newPositions = { ...tempPositions, [pos]: null };
    const values = Object.values(newPositions).filter(Boolean);
    const packed: Record<string, string | null> = {
      "1": values[0] || null,
      "2": values[1] || null,
      "3": values[2] || null,
      "4": values[3] || null,
    };

    setTempPositions(packed);
    const firstEmpty = ["1", "2", "3", "4"].find((p) => !packed[p]) || "1";
    setFocusedSlot(firstEmpty);
  };

  const handleSelectItem = (itemKey: string): void => {
    if (!focusedSlot) return;
    const newPositions = { ...tempPositions };

    Object.keys(newPositions).forEach((key) => {
      if (newPositions[key] === itemKey) {
        newPositions[key] = null;
      }
    });
    newPositions[focusedSlot] = itemKey;

    const values = Object.values(newPositions).filter(Boolean);
    const packed: Record<string, string | null> = {
      "1": values[0] || null,
      "2": values[1] || null,
      "3": values[2] || null,
      "4": values[3] || null,
    };

    setTempPositions(packed);
    const firstEmpty = ["1", "2", "3", "4"].find((p) => !packed[p]) || "1";
    setFocusedSlot(firstEmpty);
  };

  const handleSave = (): void => {
    const storageKey = `runa-phone-dock-items-${selectedAppHref}`;
    localStorage.setItem(storageKey, JSON.stringify(tempPositions));
    window.dispatchEvent(new Event("runa-sidebar-changed"));
    toast.success("Phone shortcuts updated successfully!");
    onOpenChange(false);
  };

  const userPermissions = session?.user?.permissions;
  const groupedItems: Record<string, SidebarItem[]> = {};
  currentConfig.forEach((sec) => {
    const secNameLower =
      sec.section?.toLowerCase().replace(/[^a-z]/g, "") || "";
    if (secNameLower === "phone") return;

    const canAccessSection =
      !sec.permissions ||
      hasPermission(userPermissions, sec.permissions, "any");
    if (!canAccessSection) return;

    sec.items.forEach((item) => {
      const canAccessItem =
        !item.permissions ||
        hasPermission(userPermissions, item.permissions, "any");
      if (!canAccessItem) return;

      const secName = sec.section || "General";
      const itemKey =
        item.href || (item.component ? `label:${item.label}` : undefined);
      const hasChildren = item.children && item.children.length > 0;

      if (itemKey || hasChildren) {
        if (!groupedItems[secName]) groupedItems[secName] = [];
        const isAlreadyAdded = groupedItems[secName].some((i) => {
          const existingKey =
            i.href || (i.component ? `label:${i.label}` : undefined);
          if (existingKey === itemKey && itemKey !== undefined) return true;
          if (existingKey === undefined && i.label === item.label) return true;
          return false;
        });
        if (!isAlreadyAdded) {
          groupedItems[secName].push(item);
        }
      }
    });
  });

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
              ? "bg-primary/10 border-primary text-foreground font-semibold shadow-[0_0_8px_rgba(139,92,246,0.35)] scale-105 z-10"
              : isAssigned
                ? "bg-transparent border-transparent text-foreground/80 hover:bg-muted hover:text-foreground"
                : "bg-transparent border-dashed border-border/50 text-foreground/20 hover:bg-muted/10 hover:border-border/40",
          )}
        >
          {isAssigned ? (
            <>
              <span className="scale-90 transition-transform duration-200 group-hover/slot:scale-100">
                {item.icon}
              </span>
              <span className="text-[9px] tracking-tight font-medium truncate max-w-[48px]">
                {item.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold opacity-45">+{pos}</span>
              <span className="text-[8px] tracking-tight opacity-30 font-medium">
                Empty
              </span>
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
                : "opacity-0 scale-75 group-hover/slot:opacity-100 group-hover/slot:scale-100",
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
    <div className="flex flex-col gap-5 text-left">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-col gap-0.5">
            <CardTitle>Customize Phone Sidebar / Dock</CardTitle>
            <CardDescription>
              Customize your shortcuts for mobile. Select a position slot (1 to
              4) below, then click any item from the available list to assign
              it.
            </CardDescription>
          </div>

          {/* App Selector Dropdown */}
          <div className="flex flex-col gap-1 shrink-0 w-full sm:w-auto">
            <label
              htmlFor="app-select"
              className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
            >
              Application
            </label>
            <select
              id="app-select"
              value={selectedAppHref}
              onChange={(e) => setSelectedAppHref(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground cursor-pointer font-medium min-w-[140px]"
            >
              {rrApps
                .filter((app) => app.name.toLowerCase() !== "polaris")
                .map((app) => (
                  <option key={app.href} value={app.href}>
                    {app.name}
                  </option>
                ))}
            </select>
          </div>
        </CardHeader>

        {/* Interactive Live Dock Selector */}
        <CardContent className="flex items-center justify-center py-4 w-full">
          <div className="flex items-center justify-between gap-1 px-3 py-2 bg-card/95 border border-border rounded-full shadow-2xl w-full select-none max-w-sm">
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
        </CardContent>
      </Card>

      {/* Available Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Available Navigation Shortcuts</CardTitle>
          <CardDescription>
            {!focusedSlot ? (
              <span className="text-[10px] text-primary font-semibold animate-pulse">
                Select a slot above to assign items
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Assigning to{" "}
                <strong className="text-primary font-semibold">
                  Position {focusedSlot}
                </strong>
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1 no-scrollbar p-3">
          {Object.entries(groupedItems).map(([secName, items]) => (
            <div key={secName} className="flex flex-col gap-1.5">
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                {secName}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((item) => {
                  const itemKey =
                    item.href ||
                    (item.component ? `label:${item.label}` : undefined);
                  const hasChildren = item.children && item.children.length > 0;
                  const visibleChildren = (item.children || []).filter(
                    (child) => {
                      return (
                        !child.permissions ||
                        hasPermission(userPermissions, child.permissions, "any")
                      );
                    },
                  );

                  if (!itemKey && visibleChildren.length === 0) return null;

                  if (hasChildren && visibleChildren.length > 0) {
                    const parentAssignedPos = itemKey
                      ? Object.keys(tempPositions).find(
                          (key) => tempPositions[key] === itemKey,
                        )
                      : undefined;

                    const assignedChildrenPositions = visibleChildren
                      .map((child) => {
                        const childKey =
                          child.href ||
                          (child.component
                            ? `label:${child.label}`
                            : undefined);
                        const pos = childKey
                          ? Object.keys(tempPositions).find(
                              (key) => tempPositions[key] === childKey,
                            )
                          : undefined;
                        return pos ? { label: child.label, pos } : null;
                      })
                      .filter((c): c is { label: string; pos: string } => !!c);

                    const isAnyAssigned =
                      !!parentAssignedPos ||
                      assignedChildrenPositions.length > 0;

                    let assignedPositionsText = "";
                    if (
                      parentAssignedPos &&
                      assignedChildrenPositions.length > 0
                    ) {
                      assignedPositionsText = `Pos ${parentAssignedPos}, ${assignedChildrenPositions.map((c) => c.pos).join(", ")}`;
                    } else if (parentAssignedPos) {
                      assignedPositionsText = `Pos ${parentAssignedPos}`;
                    } else if (assignedChildrenPositions.length > 0) {
                      assignedPositionsText = `Pos ${assignedChildrenPositions.map((c) => c.pos).join(", ")}`;
                    }

                    return (
                      <DropdownMenu key={itemKey || `parent:${item.label}`}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            disabled={!focusedSlot}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all duration-200 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 w-full justify-between",
                              isAnyAssigned
                                ? "bg-muted/30 border-border text-muted-foreground font-semibold"
                                : "bg-background border-border hover:bg-muted hover:border-border text-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="scale-75 shrink-0 opacity-80">
                                {item.icon}
                              </span>
                              <span className="truncate flex-1">
                                {item.label}
                              </span>
                            </span>

                            <span className="flex items-center gap-1.5 shrink-0 ml-1">
                              {assignedPositionsText && (
                                <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                                  {assignedPositionsText}
                                </span>
                              )}
                              <ChevronDown className="size-3 opacity-60" />
                            </span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-56 bg-card border border-border shadow-xl rounded-xl p-1 z-200"
                        >
                          <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                            Add to Position {focusedSlot}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-border/40" />

                          {itemKey && (
                            <DropdownMenuItem
                              disabled={!focusedSlot}
                              onClick={() => handleSelectItem(itemKey)}
                              className="text-xs flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer hover:bg-muted"
                            >
                              <span className="font-semibold">
                                {item.label} (Main)
                              </span>
                              {parentAssignedPos && (
                                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                                  Pos {parentAssignedPos}
                                </span>
                              )}
                            </DropdownMenuItem>
                          )}

                          {itemKey && visibleChildren.length > 0 && (
                            <DropdownMenuSeparator className="bg-border/40" />
                          )}

                          {visibleChildren.map((child) => {
                            const childKey =
                              child.href ||
                              (child.component
                                ? `label:${child.label}`
                                : undefined);
                            if (!childKey) return null;
                            const childAssignedPos = Object.keys(
                              tempPositions,
                            ).find((key) => tempPositions[key] === childKey);

                            return (
                              <DropdownMenuItem
                                key={childKey}
                                disabled={!focusedSlot}
                                onClick={() => handleSelectItem(childKey)}
                                className="text-xs flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer hover:bg-muted"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="scale-75 shrink-0 opacity-70">
                                    {child.icon}
                                  </span>
                                  <span>{child.label}</span>
                                </span>
                                {childAssignedPos && (
                                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">
                                    Pos {childAssignedPos}
                                  </span>
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }

                  if (itemKey) {
                    const assignedPos = Object.keys(tempPositions).find(
                      (key) => tempPositions[key] === itemKey,
                    );
                    const isAssigned = !!assignedPos;
                    return (
                      <button
                        key={itemKey}
                        type="button"
                        disabled={!focusedSlot}
                        onClick={() => handleSelectItem(itemKey)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all duration-200 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                          isAssigned
                            ? "bg-muted/30 border-border text-muted-foreground font-semibold"
                            : "bg-background border-border hover:bg-muted hover:border-border text-foreground",
                        )}
                      >
                        <span className="scale-75 shrink-0 opacity-80">
                          {item.icon}
                        </span>
                        <span className="truncate flex-1">{item.label}</span>
                        {isAssigned && (
                          <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
                            Pos {assignedPos}
                          </span>
                        )}
                      </button>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))}
        </CardContent>

        {/* Action Footer */}
        <CardFooter className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground rounded-xl h-9 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer"
          >
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
