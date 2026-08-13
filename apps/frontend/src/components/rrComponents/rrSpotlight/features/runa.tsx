import React from "react";
import {
  BaseSpotlightFeature,
  SpotlightAction,
  SpotlightActionContext,
} from "../BaseSpotlightFeature";
import {
  Moon,
  Sun,
  Laptop,
  Palette,
  Settings,
  Bell,
  Sparkles,
  PanelLeft,
  LogOut,
  Shield,
} from "lucide-react";
import { THEMES } from "@/config/themes";
import { settingsNavConfig } from "@/config/settings";

export default class RunaSpotlightFeature extends BaseSpotlightFeature {
  id = "runa";
  name = "System";

  getActions(context: SpotlightActionContext): SpotlightAction[] {
    const actions: SpotlightAction[] = [];

    // 1. Theme controls (parameterized)
    actions.push({
      id: "action-theme",
      label: context.t("spotlight.switchTheme"),
      category: "Actions",
      icon: <Palette className="size-4 text-foreground/70" />,
      badge: context.t("spotlight.systemUiTheme"),
      parameters: [
        {
          name: "theme",
          label: context.t("spotlight.themeMode"),
          type: "select",
          options: [
            { label: context.t("spotlight.darkMode"), value: "dark" },
            { label: context.t("spotlight.lightMode"), value: "light" },
            { label: context.t("spotlight.systemSettings"), value: "system" },
          ],
        },
        {
          name: "interfaceTheme",
          label: context.t("spotlight.interfaceTheme"),
          type: "select",
          options: THEMES.map((t) => ({
            label: context.t("spotlight.themeWithName", { name: t.name }),
            value: t.id,
          })),
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
    const settingsOptions = settingsNavConfig
      .filter((c) => {
        return true;
      })
      .map((c) => {
        const Icon = c.icon;
        return {
          label: context.t("settingsDialog." + c.id, { defaultValue: c.name }),
          value: c.id,
          icon: <Icon className="size-4 text-foreground/70" />,
        };
      });

    actions.push(
      {
        id: "action-settings",
        label: context.t("spotlight.settings"),
        category: "Actions",
        icon: <Settings className="size-4 text-foreground/70" />,
        badge: context.t("spotlight.configurePlatform"),
        parameters: [
          {
            name: "category",
            label: context.t("spotlight.settingsTab"),
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
        label: context.t("spotlight.openNotifications"),
        category: "Actions",
        icon: <Bell className="size-4 text-foreground/70" />,
        badge: context.t("spotlight.systemAlerts"),
        action: () => {
          window.dispatchEvent(new CustomEvent("runa-open-notifications"));
        },
      },
      {
        id: "action-appearance",
        label: context.t("spotlight.openAppearance"),
        category: "Actions",
        icon: <Palette className="size-4 text-foreground/70" />,
        badge: context.t("spotlight.visualCustomizer"),
        action: () => {
          window.dispatchEvent(new CustomEvent("runa-open-appearance"));
        },
      },
    );

    // 3. Constellation builder workspace
    actions.push({
      id: "action-constellation-builder",
      label: context.t("spotlight.constellationBuilder"),
      category: "Actions",
      icon: <Sparkles className="size-4 text-foreground/70" />,
      badge: context.t("spotlight.starsEditor"),
      action: () => {
        window.dispatchEvent(new CustomEvent("runa-open-builder"));
      },
    });

    // 4. Toggle Left Sidebar
    actions.push({
      id: "action-sidebar-toggle",
      label: context.t("spotlight.toggleSidebar"),
      category: "Actions",
      icon: <PanelLeft className="size-4 text-foreground/70" />,
      badge: context.t("spotlight.uiShortcut"),
      action: () => {
        context.toggleSidebar();
      },
    });

    // 5. Unlock Encryption (if locked)
    if (!context.isEncryptionUnlocked) {
      actions.push({
        id: "action-unlock-encryption",
        label: context.t("spotlight.unlockEncryption"),
        category: "Actions",
        icon: <Shield className="size-4 text-warning" />,
        badge: context.t("spotlight.encryptionSecurity"),
        action: () => {
          context.setShowUnlockDialog(true);
        },
      });
    }

    // 6. Sign Out
    actions.push({
      id: "action-logout",
      label: context.t("spotlight.logOut"),
      category: "Actions",
      icon: <LogOut className="size-4 text-destructive" />,
      badge: context.t("spotlight.sessionLogout"),
      action: () => {
        context.signOut();
      },
    });

    return actions;
  }
}
