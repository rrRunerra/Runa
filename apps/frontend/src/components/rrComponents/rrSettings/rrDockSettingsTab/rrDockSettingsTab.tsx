"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { Save, Smartphone } from "lucide-react";
import { hasPermission } from "@runa/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RrPillNav, type RrPillNavItem } from "@/components/rrComponents/rrPillNav";
import { rrApps } from "@/config/rrApps";
import type { SidebarConfig, SidebarItem } from "@/types/SidebarConfig";

// App Sidebar Configurations
import { getAquariusSidebarConfig } from "@/config/sidebarConfigs/aquariusSidebarConfig";
import { getAquilaSidebarConfig } from "@/config/sidebarConfigs/aquilaSidebarConfig";
import { getLacertaSidebarConfig } from "@/config/sidebarConfigs/lacertaSidebarConfig";
import { getLynxSidebarConfig } from "@/config/sidebarConfigs/lynxSidebarConfig";
import { getLyraSidebarConfig } from "@/config/sidebarConfigs/lyraSidebarConfig";
import { getMonocerosSidebarConfig } from "@/config/sidebarConfigs/monocerosSidebarConfig";
import { getPegasusSidebarConfig } from "@/config/sidebarConfigs/pegasusSidebarConfig";

import RrBottomDock from "@/components/rrComponents/rrBottomDock";

// Modular Sub-Components & Types
import {
  type DockPositions,
  type DockConnection,
  RrDockShortcutsGrid,
} from "./rrDockSettingsTabComponents";

export interface RrDockSettingsTabProps {
  /** Callback to close parent settings modal */
  onOpenChange: (open: boolean) => void;
  /** Callback to register custom action buttons in the parent modal footer */
  setFooterContent?: (content: React.ReactNode | null) => void;
}

/**
 * Component managing mobile dock shortcuts and navigation customization across Runa applications.
 */
export function RrDockSettingsTab({
  onOpenChange,
  setFooterContent,
}: RrDockSettingsTabProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const [selectedAppHref, setSelectedAppHref] = useState<string>("/aquila");
  const [focusedSlot, setFocusedSlot] = useState<string | null>("1");
  const [tempPositions, setTempPositions] = useState<DockPositions>({
    "1": null,
    "2": null,
    "3": null,
    "4": null,
  });

  const [connections, setConnections] = useState<DockConnection[]>([]);
  const [emails, setEmails] = useState<any[]>([]);

  // Fetch connections for dynamic sidebar configs (e.g. Aquila)
  const { data: connectionsData } = useSWR<DockConnection[]>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/connections`, session.accessToken]
      : null,
    fetcher,
  );

  // Fetch emails for dynamic sidebar configs (e.g. Pegasus)
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

  // Determine initial active app from current URL pathname
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pathname = window.location.pathname;
    const app = rrApps.find((a: any) => pathname.startsWith(a.href));
    if (app && app.name.toLowerCase() !== "polaris") {
      setSelectedAppHref(app.href);
    }
  }, []);

  // Compute active sidebar config for the selected app
  const currentConfig = useMemo((): SidebarConfig => {
    if (selectedAppHref === "/aquila") {
      return getAquilaSidebarConfig(session, connections, t);
    }
    if (selectedAppHref === "/lynx") {
      return getLynxSidebarConfig({}, t);
    }
    if (selectedAppHref === "/pegasus") {
      return getPegasusSidebarConfig(emails, t);
    }
    if (selectedAppHref === "/aquarius") {
      return getAquariusSidebarConfig(t);
    }
    if (selectedAppHref === "/lacerta") {
      return getLacertaSidebarConfig(t);
    }
    if (selectedAppHref === "/lyra") {
      return getLyraSidebarConfig(t);
    }
    if (selectedAppHref === "/monoceros") {
      return getMonocerosSidebarConfig(t);
    }
    return [];
  }, [selectedAppHref, session, connections, emails, t]);

  // Helper to lookup item metadata by href or label key
  const findItemByKey = useCallback(
    (key: string | null | undefined): SidebarItem | undefined => {
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
    },
    [currentConfig],
  );

  // Sync positions from localStorage or defaults
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
      const defaults: DockPositions = {
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

  // Slot interaction handlers
  const handleFocusSlot = useCallback((pos: string): void => {
    setFocusedSlot(pos);
  }, []);

  const handleClearSlot = useCallback((pos: string): void => {
    setTempPositions((prev) => ({
      ...prev,
      [pos]: null,
    }));
    setFocusedSlot(pos);
  }, []);

  const handleSelectItem = useCallback(
    (itemKey: string): void => {
      if (!focusedSlot) return;
      const newPositions = { ...tempPositions };

      // Unassign from any other slot that currently has this item
      Object.keys(newPositions).forEach((key) => {
        if (newPositions[key] === itemKey) {
          newPositions[key] = null;
        }
      });

      // Assign to currently focused slot
      newPositions[focusedSlot] = itemKey;
      setTempPositions(newPositions);

      // Auto-advance to the next slot (1 -> 2 -> 3 -> 4)
      const slotOrder = ["1", "2", "3", "4"];
      const currentIndex = slotOrder.indexOf(focusedSlot);
      const nextIndex = (currentIndex + 1) % slotOrder.length;
      setFocusedSlot(slotOrder[nextIndex]);
    },
    [focusedSlot, tempPositions],
  );

  const handleSave = useCallback((): void => {
    const storageKey = `runa-phone-dock-items-${selectedAppHref}`;
    localStorage.setItem(storageKey, JSON.stringify(tempPositions));
    window.dispatchEvent(new Event("runa-sidebar-changed"));
    toast.success(t("sidebar.shortcutsUpdated"));
    onOpenChange(false);
  }, [selectedAppHref, tempPositions, onOpenChange, t]);

  // Register footer buttons inside settings modal
  useEffect(() => {
    if (!setFooterContent) return;

    setFooterContent(
      <div className="flex items-center justify-end w-full gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="text-xs h-9 px-4 rounded-xl cursor-pointer"
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          className="gap-2 text-xs font-semibold h-9 px-5 rounded-xl cursor-pointer bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Save className="size-3.5" />
          <span>{t("saveChanges")}</span>
        </Button>
      </div>,
    );

    return () => setFooterContent(null);
  }, [setFooterContent, onOpenChange, handleSave, t]);

  // Build grouped items map for available shortcuts
  const userPermissions = session?.user?.permissions;
  const groupedItems = useMemo(() => {
    const map: Record<string, SidebarItem[]> = {};
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

        const secName = sec.section || t("sidebarGeneral", "General");
        const itemKey =
          item.href || (item.component ? `label:${item.label}` : undefined);
        const hasChildren = item.children && item.children.length > 0;

        if (itemKey || hasChildren) {
          if (!map[secName]) map[secName] = [];
          const isAlreadyAdded = map[secName].some((i) => {
            const existingKey =
              i.href || (i.component ? `label:${i.label}` : undefined);
            if (existingKey === itemKey && itemKey !== undefined) return true;
            if (existingKey === undefined && i.label === item.label) return true;
            return false;
          });
          if (!isAlreadyAdded) {
            map[secName].push(item);
          }
        }
      });
    });
    return map;
  }, [currentConfig, userPermissions, t]);

  // App navigation pill items
  const navItems: RrPillNavItem<string>[] = useMemo(() => {
    return rrApps
      .filter((app: any) => app.name.toLowerCase() !== "polaris")
      .map((app: any) => ({
        id: app.href,
        label: app.name,
      }));
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 h-full text-left">
      {/* App Sub-Navigation Pills (anchored to top right) */}
      <div className="flex items-center justify-end w-full shrink-0">
        <RrPillNav
          items={navItems}
          activeId={selectedAppHref}
          onChange={(href) => setSelectedAppHref(href)}
          layoutId="dockAppNav"
        />
      </div>

      {/* Main Card Container filling full space */}
      <Card className="flex-1 flex flex-col min-h-0 h-full border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
          {/* Top Section: Interactive Phone Dock Mockup using RrBottomDock */}
          <div className="flex flex-col gap-3 items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Smartphone className="size-3.5 text-primary" />
              <span>{t("sidebar.mobileDockPreview")}</span>
            </div>

            <RrBottomDock
              pathname={selectedAppHref}
              isPreview={true}
              tempPositions={tempPositions}
              focusedSlot={focusedSlot}
              onFocusSlot={handleFocusSlot}
              onClearSlot={handleClearSlot}
              findItemByKey={findItemByKey}
              emptySlotLabel={t("sidebar.emptySlot")}
            />
          </div>

          {/* Bottom Section: Categorized Shortcuts Grid */}
          <RrDockShortcutsGrid
            groupedItems={groupedItems}
            tempPositions={tempPositions}
            focusedSlot={focusedSlot}
            onSelectItem={handleSelectItem}
            userPermissions={userPermissions}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default RrDockSettingsTab;
