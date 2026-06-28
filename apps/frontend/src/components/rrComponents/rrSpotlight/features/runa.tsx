import React from "react";
import { BaseSpotlightFeature, SpotlightAction, SpotlightActionContext } from "../BaseSpotlightFeature";
import { Moon, Sun, Laptop, Palette, Settings, Bell, Sparkles, PanelLeft, LogOut, Shield } from "lucide-react";
import { THEMES } from "../../../../config/themes";
import { settingsNavConfig } from "../../../../config/settings";

export default class RunaSpotlightFeature extends BaseSpotlightFeature {
  id = "runa";
  name = "System";

  getActions(context: SpotlightActionContext): SpotlightAction[] {
    const actions: SpotlightAction[] = [];

    // 1. Theme controls (parameterized)
    actions.push({
      id: "action-theme",
      label: "Switch Theme",
      category: "Actions",
      icon: <Palette className="size-4 text-foreground/70" />,
      badge: "System UI Theme",
      parameters: [
        {
          name: "theme",
          label: "Theme Mode",
          type: "select",
          options: [
            { label: "Dark Mode", value: "dark" },
            { label: "Light Mode", value: "light" },
            { label: "System Settings", value: "system" },
          ],
        },
        {
          name: "interfaceTheme",
          label: "Interface Theme",
          type: "select",
          options: THEMES.map((t) => ({ label: `${t.name} Theme`, value: t.id })),
        },
      ],
      action: (params) => {
        if (!params || !params.theme) return;
        context.setTheme(params.theme);
        if (params.interfaceTheme && context.setBaseTheme) {
          context.setBaseTheme(params.interfaceTheme);
        }
      },
    });

    // 2. Settings (parameterized), notifications, appearance
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    const settingsOptions = settingsNavConfig.filter((c) => {
      if (c.id === "mailAccounts") {
        return !!context.pathname?.startsWith("/pegasus");
      }
      if (c.id === "sidebar") {
        return isMobile;
      }
      return true;
    }).map((c) => {
      const Icon = c.icon;
      return {
        label: c.name,
        value: c.id,
        icon: <Icon className="size-4 text-foreground/70" />,
      };
    });

    actions.push(
      {
        id: "action-settings",
        label: "Settings",
        category: "Actions",
        icon: <Settings className="size-4 text-foreground/70" />,
        badge: "Configure Runa platform",
        parameters: [
          {
            name: "category",
            label: "Settings Tab",
            type: "select",
            options: settingsOptions,
          },
        ],
        action: (params) => {
          if (!params || !params.category) return;
          context.triggerSettingsTab(params.category);
        },
      },
      {
        id: "action-notifications",
        label: "Open Notifications Feed",
        category: "Actions",
        icon: <Bell className="size-4 text-foreground/70" />,
        badge: "System Alerts",
        action: () => {
          window.dispatchEvent(new CustomEvent("runa-open-notifications"));
        },
      },
      {
        id: "action-appearance",
        label: "Open Appearance Customizer",
        category: "Actions",
        icon: <Palette className="size-4 text-foreground/70" />,
        badge: "Visual customizer",
        action: () => {
          window.dispatchEvent(new CustomEvent("runa-open-appearance"));
        },
      }
    );

    // 3. Constellation builder workspace
    actions.push({
      id: "action-constellation-builder",
      label: "Constellation Builder Workspace",
      category: "Actions",
      icon: <Sparkles className="size-4 text-foreground/70" />,
      badge: "Stars Editor",
      action: () => {
        window.dispatchEvent(new CustomEvent("runa-open-builder"));
      },
    });

    // 4. Toggle Left Sidebar
    actions.push({
      id: "action-sidebar-toggle",
      label: "Toggle Left Sidebar",
      category: "Actions",
      icon: <PanelLeft className="size-4 text-foreground/70" />,
      badge: "UI Shortcut",
      action: () => {
        context.toggleSidebar();
      },
    });

    // 5. Unlock Encryption (if locked)
    if (!context.isE2eeUnlocked) {
      actions.push({
        id: "action-unlock-e2ee",
        label: "Unlock Encryption",
        category: "Actions",
        icon: <Shield className="size-4 text-warning" />,
        badge: "Encryption Security",
        action: () => {
          context.setShowUnlockDialog(true);
        },
      });
    }

    // 6. Sign Out
    actions.push({
      id: "action-logout",
      label: "Log Out",
      category: "Actions",
      icon: <LogOut className="size-4 text-destructive" />,
      badge: "Session logout",
      action: () => {
        context.signOut();
      },
    });

    return actions;
  }
}
