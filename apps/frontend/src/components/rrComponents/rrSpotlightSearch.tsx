"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useBaseTheme } from "../Providers/rrThemeProvider";
import { rrApp, rrApps } from "@/config/rrApps";
import { hasPermission } from "@runa/permissions";
import { useSidebar } from "@/components/ui/sidebar";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
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
  Shuffle,
  Calculator,
  Film,
  Clipboard,
} from "lucide-react";
import React from "react";
import { RrMediaRoulette } from "@/components/rrComponents/aquila/rrMediaRoulette";
import { useRRSidebar } from "@/hooks/useRRSidebar";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useSpotlight } from "@/components/Providers/rrSpotlightProvider";
import { spotlightRegistry } from "@/components/rrComponents/rrSpotlight/features";
import {
  BaseSpotlightFeature,
  SpotlightActionContext,
} from "@/components/rrComponents/rrSpotlight/BaseSpotlightFeature";

interface SpotlightSearchItem {
  id: string;
  label: string;
  category:
    "Applications" | "Navigation" | "Actions" | "Clipboard" | "Calculator";
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  badge?: string;
  preview?: () => React.ReactNode;
}

type ActiveFilter = "all" | "apps" | "pages" | "actions";

const FILTERS = ["all", "apps", "pages", "actions"] as const;

// Safe evaluation of simple math expression
function evaluateMath(expression: string): number | null {
  let clean = expression.trim().replace(/^=/, "").replace(/=$/, "").trim();
  clean = clean.replace(/\s+/g, "");
  if (!clean || !/^[0-9+\-*/().]+$/.test(clean)) return null;
  if (/[+\-*/.]$/.test(clean)) return null;

  try {
    const result = new Function(`return ${clean}`)();
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
  } catch {
    // Ignore invalid syntax
  }
  return null;
}

export default function RrSpotlightSearch(): React.JSX.Element | null {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { setBaseTheme } = useBaseTheme();
  const { sidebarConfig } = useRRSidebar();
  const { toggleSidebar } = useSidebar();
  const { isEncryptionUnlocked, setShowUnlockDialog } = useRRCrypto();

  const { clipboardHistory, openPreview, openParameters } = useSpotlight();
  const { t } = useTranslation();

  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [activeRoulette, setActiveRoulette] = useState<
    "anime" | "manga" | "tv" | "movie" | "game" | "book" | null
  >(null);

  const filterLabels = useMemo<Record<ActiveFilter, string>>(
    () => ({
      all: t("spotlight.filterAll"),
      apps: t("spotlight.filterApps"),
      pages: t("spotlight.filterPages"),
      actions: t("spotlight.filterActions"),
    }),
    [t],
  );

  // Dynamic feature loading states
  const [loadedFeatures, setLoadedFeatures] = useState<BaseSpotlightFeature[]>(
    [],
  );
  const [featureActions, setFeatureActions] = useState<SpotlightSearchItem[]>(
    [],
  );
  const [rawActions, setRawActions] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [selectedValue, setSelectedValue] = useState<string>("");

  // Keep a ref in sync without a useEffect — set it directly alongside state
  const openRef = useRef<boolean>(false);
  const handleSetOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setOpen((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        openRef.current = next;
        return next;
      });
    },
    [],
  );

  // Memoized: helper to dispatch settings tab events
  const triggerSettingsTab = useCallback(
    (category: string): void => {
      handleSetOpen(false);
      const url = new URL(window.location.href);
      url.searchParams.set("settings", category);
      window.history.replaceState(null, "", url.toString());
      window.dispatchEvent(new CustomEvent("runa-open-settings"));
    },
    [handleSetOpen],
  );

  // Live Math calculations detection
  const mathResult = useMemo(() => {
    return evaluateMath(search);
  }, [search]);

  // 1. Dynamic import of all registered feature classes globally
  useEffect(() => {
    if (!session?.user) return;

    let active = true;
    const load = async () => {
      const features: BaseSpotlightFeature[] = [];
      const keys = Object.keys(spotlightRegistry);

      for (const key of keys) {
        const loader = spotlightRegistry[key];
        try {
          const module = await loader();
          const FeatureClass = module.default;
          features.push(new FeatureClass());
        } catch (err) {
          console.error(`Failed to load spotlight feature for ${key}`, err);
        }
      }

      if (active) {
        setLoadedFeatures(features);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [session, isEncryptionUnlocked]);

  // 2. Fetch and resolve actions dynamically from loaded features
  useEffect(() => {
    if (loadedFeatures.length === 0) return;

    let active = true;
    const fetchAllActions = async () => {
      const context: SpotlightActionContext = {
        searchQuery: search,
        accessToken: session?.accessToken || "",
        username: session?.user?.username || "",
        pathname,
        clipboardHistory,
        isEncryptionUnlocked,
        userPermissions: session?.user?.permissions,
        openPreview,
        openParameters,
        triggerSettingsTab,
        toggleSidebar,
        setTheme,
        signOut: () => signOut({ redirect: false }),
        setShowUnlockDialog,
        setSearchResults,
        setSearchLoading,
        setBaseTheme,
        t,
      };

      const allSearchItems: SpotlightSearchItem[] = [];
      const allRawActions: any[] = [];

      const results = await Promise.all(
        loadedFeatures.map(async (feature) => {
          try {
            const actions = await feature.getActions(context);
            allRawActions.push(...actions);
            return actions.map((act) => ({
              id: act.id,
              label: act.label,
              category: act.category,
              icon: act.icon,
              badge: act.badge,
              action: () => {
                if (act.parameters && act.parameters.length > 0) {
                  setSearch(`${act.label.toLowerCase()}: `);
                } else {
                  act.action({}, context);
                }
              },
              preview: act.preview ? () => act.preview?.({}) : undefined,
            }));
          } catch (err) {
            console.error(
              `Failed to get actions for feature ${feature.name}`,
              err,
            );
            return [];
          }
        }),
      );

      // Add parameterized actions for navigation items with children
      const activeApp = rrApps.find((app) => pathname?.startsWith(app.href));
      if (activeApp && sidebarConfig && sidebarConfig.length > 0) {
        for (
          let sectionIdx = 0;
          sectionIdx < sidebarConfig.length;
          sectionIdx++
        ) {
          const section = sidebarConfig[sectionIdx];
          if (section.section?.startsWith("#$")) continue;

          for (const navItem of section.items) {
            if (
              navItem.label.startsWith("#$") ||
              navItem.href?.startsWith("#$")
            )
              continue;

            const isFromActiveApp = navItem.href?.startsWith(activeApp.href);
            if (!isFromActiveApp) continue;

            if (navItem.children && navItem.children.length > 0) {
              const cleanedChildren = navItem.children.filter(
                (c) => !c.label.startsWith("#$") && !c.href?.startsWith("#$"),
              );

              if (cleanedChildren.length > 0) {
                const parentActionId = `nav-parent-${navItem.label.toLowerCase().replace(/\s+/g, "-")}`;
                const parentAction = {
                  id: parentActionId,
                  label: navItem.label,
                  category: "Navigation" as const,
                  icon: navItem.icon || (
                    <Compass className="size-4 opacity-70" />
                  ),
                  badge: section.section,
                  parameters: [
                    {
                      name: "folder",
                      label: "Folder",
                      type: "select" as const,
                      options: cleanedChildren.map((c) => ({
                        label: c.label,
                        value: c.label.toLowerCase().replace(/\s+/g, "-"),
                        icon: c.icon,
                      })),
                    },
                  ],
                  action: (params: any) => {
                    handleSetOpen(false);
                    if (!params || !params.folder) {
                      const defaultChild = cleanedChildren[0];
                      if (defaultChild && defaultChild.href) {
                        router.push(defaultChild.href);
                      }
                      return;
                    }
                    const match = cleanedChildren.find(
                      (c) =>
                        c.label.toLowerCase().replace(/\s+/g, "-") ===
                        params.folder,
                    );
                    if (match && match.href) {
                      router.push(match.href);
                    }
                  },
                };

                allRawActions.push(parentAction);
                allSearchItems.push({
                  id: parentAction.id,
                  label: parentAction.label,
                  category: parentAction.category,
                  icon: parentAction.icon,
                  badge: parentAction.badge,
                  action: () => {
                    setSearch(`${parentAction.label.toLowerCase()}: `);
                  },
                });
              }
            }
          }
        }
      }

      for (const list of results) {
        allSearchItems.push(...list);
      }

      if (active) {
        setFeatureActions(allSearchItems);
        setRawActions(allRawActions);
      }
    };

    fetchAllActions();
    return () => {
      active = false;
    };
  }, [
    loadedFeatures,
    search,
    isEncryptionUnlocked,
    session,
    openParameters,
    setShowUnlockDialog,
    pathname,
    clipboardHistory,
    triggerSettingsTab,
    toggleSidebar,
    setTheme,
    sidebarConfig,
    router,
  ]);

  // 3. Generic inline parameter autocomplete parsing
  const parsedAction = useMemo(() => {
    const lowerSearch = search.toLowerCase().trim();
    if (!lowerSearch) return null;

    const action = rawActions.find((act) => {
      if (!act.parameters || act.parameters.length === 0) return false;
      const label = act.label.toLowerCase();
      const id = act.id.toLowerCase();
      return (
        lowerSearch.startsWith(label) ||
        lowerSearch.startsWith(`${label}:`) ||
        (id.includes("browse") && lowerSearch.startsWith("browse")) ||
        (id.includes("roulette") && lowerSearch.startsWith("roulette"))
      );
    });

    if (!action) return null;

    let suffix = search.trim();
    const label = action.label.toLowerCase();

    if (suffix.toLowerCase().startsWith(label)) {
      suffix = suffix.substring(label.length);
    } else if (
      action.id.includes("browse") &&
      suffix.toLowerCase().startsWith("browse")
    ) {
      suffix = suffix.substring(6);
    } else if (
      action.id.includes("roulette") &&
      suffix.toLowerCase().startsWith("roulette")
    ) {
      suffix = suffix.substring(8);
    }

    suffix = suffix.replace(/^[:\s]*/, "").trim();

    const param1 = action.parameters[0];
    const param2 = action.parameters[1];

    let val1 = "";
    let val2 = "";

    if (param1) {
      if (param1.type === "select" && param1.options) {
        const opt = param1.options.find(
          (o: any) =>
            suffix.toLowerCase().startsWith(o.value.toLowerCase()) ||
            suffix.toLowerCase().startsWith(o.label.toLowerCase()),
        );
        if (opt) {
          val1 = opt.value;
          const matchLen = suffix
            .toLowerCase()
            .startsWith(opt.value.toLowerCase())
            ? opt.value.length
            : opt.label.length;
          val2 = suffix.substring(matchLen).trim();
        } else {
          val1 = "";
        }
      } else {
        const parts = suffix.split(/\s+/);
        val1 = parts[0] || "";
        val2 = parts.slice(1).join(" ");
      }
    }

    return {
      action,
      val1,
      val2,
    };
  }, [search, rawActions]);

  const hasValidType = useMemo(() => {
    return !!(
      parsedAction &&
      parsedAction.action.id === "action-aquila-browse" &&
      parsedAction.val1
    );
  }, [parsedAction]);

  const matchedOpt1 = useMemo(() => {
    if (!parsedAction) return null;
    const param1 = parsedAction.action.parameters?.[0];
    return (
      param1?.options?.find(
        (opt: { label: string; value: string; icon?: React.ReactNode }) =>
          opt.value.toLowerCase() === parsedAction.val1?.toLowerCase().trim(),
      ) || null
    );
  }, [parsedAction]);

  useEffect(() => {
    setSearchResults(null);
  }, [search]);

  // Double-Shift key detection
  useEffect(() => {
    let lastShiftTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || !session?.user) return;

      const activeElement = document.activeElement;
      const isInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement &&
          activeElement.getAttribute("contenteditable") === "true");

      if (e.key === "Shift") {
        const now = Date.now();
        if (now - lastShiftTime < 300) {
          if (openRef.current || !isInput) {
            e.preventDefault();
            handleSetOpen((prev) => !prev);
          }
        }
        lastShiftTime = now;
      } else {
        lastShiftTime = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSetOpen, session?.user]);

  // Listen for dynamic runa-open-roulette events from dynamic features
  useEffect(() => {
    const handleRouletteOpen = (e: Event) => {
      const type = (e as CustomEvent).detail?.mediaType;
      if (type) {
        handleSetOpen(false);
        setActiveRoulette(type);
      }
    };
    window.addEventListener("runa-open-roulette", handleRouletteOpen);
    return () => {
      window.removeEventListener("runa-open-roulette", handleRouletteOpen);
    };
  }, [handleSetOpen]);

  // Listen for custom trigger to open spotlight search dialog
  useEffect(() => {
    const handleOpenSpotlight = () => {
      handleSetOpen(true);
    };
    window.addEventListener("runa-open-spotlight", handleOpenSpotlight);
    return () => {
      window.removeEventListener("runa-open-spotlight", handleOpenSpotlight);
    };
  }, [handleSetOpen]);

  // Memoized: full item list — only rebuilt when nav config, session, or path changes
  const items = useMemo<SpotlightSearchItem[]>(() => {
    const result: SpotlightSearchItem[] = [];

    // 1. Applications
    const visibleApps = rrApps.filter((app: rrApp): boolean => {
      if (!app.permissions || app.permissions.length === 0) return true;
      return hasPermission(session?.user?.permissions, app.permissions, "any");
    });

    for (const app of visibleApps) {
      result.push({
        id: `app-${app.name.toLowerCase()}`,
        label: app.name,
        category: "Applications",
        icon: (
          <div className="flex size-6 items-center justify-center rounded-md border border-border/55 bg-background text-foreground shadow-xs group-data-selected/command-item:border-primary/40 group-data-selected/command-item:scale-105 transition-all overflow-hidden">
            {app.iconLeftRing ? (
              <Image
                src={app.iconLeftRing}
                alt={app.name}
                width={20}
                height={20}
                className="size-full object-contain"
              />
            ) : (
              <span className="text-[10px] font-bold">{app.name[0]}</span>
            )}
          </div>
        ),
        badge: app.description,
        action: () => {
          handleSetOpen(false);
          router.push(app.href);
        },
      });
    }

    // 2. Navigation — scoped to the active app
    const activeApp = rrApps.find((app) => pathname?.startsWith(app.href));
    if (activeApp && sidebarConfig && sidebarConfig.length > 0) {
      for (
        let sectionIdx = 0;
        sectionIdx < sidebarConfig.length;
        sectionIdx++
      ) {
        const section = sidebarConfig[sectionIdx];
        if (
          section.section?.toLowerCase() === "phone" ||
          section.section?.startsWith("#$")
        )
          continue;

        const sectionKey = (section.section || `sec-${sectionIdx}`)
          .toLowerCase()
          .replace(/\s+/g, "-");

        for (const navItem of section.items) {
          if (navItem.label.startsWith("#$") || navItem.href?.startsWith("#$"))
            continue;

          const isFromActiveApp = navItem.href?.startsWith(activeApp.href);

          if (
            navItem.href &&
            isFromActiveApp &&
            (!navItem.children || navItem.children.length === 0)
          ) {
            const href = navItem.href;
            result.push({
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
                handleSetOpen(false);
                router.push(href);
              },
            });
          }
        }
      }
    }

    // 3. Dynamic Feature Actions
    for (const act of featureActions) {
      result.push(act);
    }

    // 4. Parameter Autocomplete options
    if (parsedAction) {
      const param1 = parsedAction.action.parameters?.[0];
      if (param1 && param1.type === "select" && param1.options) {
        // Check if val1 matches a valid option value exactly (ignoring trailing space/case)
        const matchedOpt1 = param1.options.find(
          (opt: { label: string; value: string; icon?: React.ReactNode }) =>
            opt.value.toLowerCase() === parsedAction.val1?.toLowerCase().trim(),
        );
        const isValidVal1 = !!matchedOpt1;

        if (!isValidVal1) {
          // User is still selecting or typing parameter 1
          const filterText = parsedAction.val1
            ? parsedAction.val1.toLowerCase().trim()
            : "";
          const filtered = param1.options.filter(
            (opt: { label: string; value: string; icon?: React.ReactNode }) =>
              opt.label.toLowerCase().includes(filterText) ||
              opt.value.toLowerCase().includes(filterText),
          );

          for (const opt of filtered) {
            result.push({
              id: `param-opt-1-${parsedAction.action.id}-${opt.value}`,
              label: opt.label,
              category: "Actions",
              icon: opt.icon || parsedAction.action.icon,
              badge: t("spotlight.selectParam", { param: param1.label }),
              action: () => {
                const prefix = parsedAction.action.label.toLowerCase();
                setSearch(`${prefix}: ${opt.value} `);

                const paramsCount = parsedAction.action.parameters?.length || 0;
                if (paramsCount === 1) {
                  const params = { [param1.name]: opt.value };
                  const context: SpotlightActionContext = {
                    searchQuery: search,
                    accessToken: session?.accessToken || "",
                    username: session?.user?.username || "",
                    pathname,
                    clipboardHistory,
                    isEncryptionUnlocked: false,
                    openPreview,
                    openParameters,
                    triggerSettingsTab,
                    toggleSidebar,
                    setTheme,
                    signOut: () => signOut({ redirect: false }),
                    setShowUnlockDialog: () => {},
                    setSearchResults,
                    setSearchLoading,
                    setBaseTheme,
                    t,
                  };
                  parsedAction.action.action(params, context);
                  handleSetOpen(false);
                  setSearch("");
                }
              },
            });
          }
          return result;
        } else {
          // Parameter 1 is fully filled! Check if there is a Parameter 2.
          const param2 = parsedAction.action.parameters?.[1];
          if (param2 && param2.type === "select" && param2.options) {
            const filterText = parsedAction.val2
              ? parsedAction.val2.toLowerCase().trim()
              : "";
            const filtered2 = param2.options.filter(
              (opt: { label: string; value: string; icon?: React.ReactNode }) =>
                opt.label.toLowerCase().includes(filterText) ||
                opt.value.toLowerCase().includes(filterText),
            );

            for (const opt of filtered2) {
              result.push({
                id: `param-opt-2-${parsedAction.action.id}-${opt.value}`,
                label: opt.label,
                category: "Actions",
                icon: opt.icon || parsedAction.action.icon,
                badge: t("spotlight.selectParamOptional", {
                  param: param2.label,
                }),
                action: () => {
                  const prefix = parsedAction.action.label.toLowerCase();
                  setSearch(`${prefix}: ${matchedOpt1.value} ${opt.value} `);

                  const params = {
                    [param1.name]: matchedOpt1.value,
                    [param2.name]: opt.value,
                  };
                  const context: SpotlightActionContext = {
                    searchQuery: search,
                    accessToken: session?.accessToken || "",
                    username: session?.user?.username || "",
                    pathname,
                    clipboardHistory,
                    isEncryptionUnlocked: false,
                    openPreview,
                    openParameters,
                    triggerSettingsTab,
                    toggleSidebar,
                    setTheme,
                    signOut: () => signOut({ redirect: false }),
                    setShowUnlockDialog: () => {},
                    setSearchResults,
                    setSearchLoading,
                    setBaseTheme,
                    t,
                  };
                  parsedAction.action.action(params, context);
                  handleSetOpen(false);
                  setSearch("");
                },
              });
            }
            return result;
          }
        }
      }
    }

    // 5. Clipboard History
    if (clipboardHistory.length > 0) {
      const isClipboardRequest =
        search.toLowerCase().startsWith("clipboard") || search === "";
      if (isClipboardRequest) {
        clipboardHistory.forEach((text, index) => {
          result.push({
            id: `clipboard-${index}`,
            label: text.length > 60 ? text.substring(0, 60) + "..." : text,
            category: "Clipboard",
            icon: <Clipboard className="size-4 opacity-70" />,
            badge: "Clipboard History",
            action: () => {
              setSearch(text);
            },
          });
        });
      }
    }

    return result;
  }, [
    pathname,
    sidebarConfig,
    session,
    router,
    handleSetOpen,
    search,
    featureActions,
    parsedAction,
    clipboardHistory,
    setBaseTheme,
  ]);

  // Memoized: filter + group split — only recomputes when items, search, or filter changes
  const { applicationsGroup, navigationGroup, actionsGroup, clipboardGroup } =
    useMemo(() => {
      if (hasValidType) {
        return {
          applicationsGroup: [],
          navigationGroup: [],
          actionsGroup: [],
          clipboardGroup: [],
        };
      }

      const lowerSearch = search.toLowerCase();

      const filtered = items.filter((item) => {
        // If it's a parameter autocomplete option, bypass search text matching since we did it inside the items builder!
        if (item.id.startsWith("param-opt-")) {
          return true;
        }

        const searchMatch =
          !lowerSearch ||
          item.label.toLowerCase().includes(lowerSearch) ||
          item.category.toLowerCase().includes(lowerSearch) ||
          (item.badge && item.badge.toLowerCase().includes(lowerSearch));

        if (!searchMatch) return false;

        if (activeFilter === "apps") return item.category === "Applications";
        if (activeFilter === "pages") return item.category === "Navigation";
        if (activeFilter === "actions") return item.category === "Actions";

        return true;
      });

      return {
        applicationsGroup: filtered.filter(
          (i) => i.category === "Applications",
        ),
        navigationGroup: filtered.filter((i) => i.category === "Navigation"),
        actionsGroup: filtered.filter((i) => i.category === "Actions"),
        clipboardGroup: filtered.filter((i) => i.category === "Clipboard"),
      };
    }, [items, search, activeFilter, hasValidType]);

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={handleSetOpen}
        value={selectedValue}
        onValueChange={setSelectedValue}
        shouldFilter={false}
        title={t("spotlight.title")}
        description={t("spotlight.description")}
        className="sm:max-w-3xl bg-popover border border-border shadow-2xl p-0 overflow-hidden"
      >
        <div className="flex flex-col relative border-b border-border w-full bg-popover shrink-0">
          <div className="relative w-full">
            <CommandInput
              placeholder={t("spotlight.placeholder")}
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                // Tab autocomplete option select trigger
                if (e.key === "Tab") {
                  e.preventDefault();
                  if (selectedValue) {
                    const item = items.find((i) => i.id === selectedValue);
                    if (item && item.action) {
                      item.action();
                      return;
                    }
                  }
                }

                // Space bar preview trigger
                if (e.key === " " && selectedValue) {
                  const item = items.find((i) => i.id === selectedValue);
                  if (item?.preview) {
                    e.preventDefault();
                    openPreview(item.preview());
                    return;
                  }
                }

                if (e.key === "Enter") {
                  if (mathResult !== null) {
                    e.preventDefault();
                    navigator.clipboard.writeText(String(mathResult));
                    toast.success(
                      t("spotlight.copiedClipboard", { value: mathResult }),
                    );
                    handleSetOpen(false);
                    setSearch("");
                    return;
                  }

                  if (parsedAction && parsedAction.val1) {
                    e.preventDefault();

                    const params: Record<string, any> = {};
                    const param1 = parsedAction.action.parameters?.[0];
                    const param2 = parsedAction.action.parameters?.[1];
                    const param3 = parsedAction.action.parameters?.[2];

                    if (param1) params[param1.name] = parsedAction.val1;
                    if (param2) params[param2.name] = parsedAction.val2;
                    if (param3) params[param3.name] = param3.defaultValue;

                    const context: SpotlightActionContext = {
                      searchQuery: search,
                      accessToken: session?.accessToken || "",
                      username: session?.user?.username || "",
                      pathname,
                      clipboardHistory,
                      isEncryptionUnlocked,
                      userPermissions: session?.user?.permissions,
                      openPreview,
                      openParameters,
                      triggerSettingsTab,
                      toggleSidebar,
                      setTheme,
                      signOut: () => signOut({ redirect: false }),
                      setShowUnlockDialog,
                      setSearchResults,
                      setSearchLoading,
                      setBaseTheme,
                      t,
                    };

                    parsedAction.action.action(params, context);
                    if (parsedAction.action.id !== "action-aquila-browse") {
                      handleSetOpen(false);
                      setSearch("");
                    }
                    return;
                  }
                }
              }}
              className="border-none bg-transparent text-transparent caret-transparent focus:ring-0 focus:outline-hidden py-4 px-3 w-full text-base placeholder:text-muted-foreground/60 font-sans"
            />
            {/* Mirror display overlay for styled math results & parameter badges */}
            <div className="absolute left-8 inset-y-0 flex items-center pointer-events-none select-none text-base font-normal font-sans">
              {!parsedAction ? (
                <>
                  <style>{`
                    @keyframes spotlightCaretBlink {
                      from, to { background-color: transparent }
                      50% { background-color: currentColor }
                    }
                  `}</style>
                  <span className="text-foreground whitespace-pre">
                    {search}
                  </span>
                  {/* Custom Blinking Caret */}
                  <span
                    className="w-[1.5px] h-4.5 bg-foreground ml-px"
                    style={{
                      animation: "spotlightCaretBlink 1s step-end infinite",
                    }}
                  />
                  {mathResult !== null && (
                    <span className="text-primary font-bold ml-1.5">
                      = {mathResult}
                    </span>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-sm">
                  {/* CSS Keyframes declaration for blinking caret */}
                  <style>{`
                    @keyframes spotlightCaretBlink {
                      from, to { background-color: transparent }
                      50% { background-color: currentColor }
                    }
                  `}</style>

                  {/* Action Prefix */}
                  <span className="text-muted-foreground/60 font-semibold tracking-wide lowercase">
                    {parsedAction.action.label.toLowerCase()}:
                  </span>

                  {/* Parameter 1 rendering */}
                  {matchedOpt1 ? (
                    <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                      {parsedAction.action.parameters?.[0]?.name}:{" "}
                      {matchedOpt1.label}
                    </span>
                  ) : (
                    <>
                      {parsedAction.action.parameters?.[0]?.type === "text" ? (
                        <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-xs font-semibold text-primary flex items-center gap-0">
                          <span>
                            {parsedAction.action.parameters?.[0]?.name}:&nbsp;
                          </span>
                          {parsedAction.val1 ? (
                            <span className="text-foreground whitespace-pre">
                              {parsedAction.val1}
                            </span>
                          ) : null}
                          {/* Blinking Caret inside badge */}
                          <span
                            className="w-[1.5px] h-3 bg-primary ml-px shrink-0"
                            style={{
                              animation:
                                "spotlightCaretBlink 1s step-end infinite",
                            }}
                          />
                        </span>
                      ) : (
                        <div className="flex items-center gap-0">
                          <span className="text-foreground whitespace-pre">
                            {parsedAction.val1}
                          </span>
                          {/* Blinking Caret (before the placeholder) */}
                          <span
                            className="w-[1.5px] h-4.5 bg-foreground ml-px"
                            style={{
                              animation:
                                "spotlightCaretBlink 1s step-end infinite",
                            }}
                          />
                          {!parsedAction.val1 && (
                            <span className="text-muted-foreground/40 italic ml-1">
                              [{parsedAction.action.parameters?.[0]?.name}]
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Parameter 2 rendering (only when matchedOpt1 is resolved) */}
                  {matchedOpt1 && (
                    <>
                      {(() => {
                        const param2 = parsedAction.action.parameters?.[1];
                        if (!param2) return null;

                        if (param2.type === "text") {
                          return (
                            <span className="px-2 py-0.5 rounded bg-accent/20 border border-accent/30 text-xs font-semibold text-accent-foreground flex items-center gap-0">
                              <span>{param2.name}:&nbsp;</span>
                              {parsedAction.val2 ? (
                                <span className="text-foreground whitespace-pre">
                                  {parsedAction.val2}
                                </span>
                              ) : null}
                              {/* Blinking Caret inside badge */}
                              <span
                                className="w-[1.5px] h-3 bg-accent-foreground ml-px shrink-0"
                                style={{
                                  animation:
                                    "spotlightCaretBlink 1s step-end infinite",
                                }}
                              />
                            </span>
                          );
                        }

                        const matchedOpt2 = param2.options?.find(
                          (opt: {
                            label: string;
                            value: string;
                            icon?: React.ReactNode;
                          }) =>
                            opt.value.toLowerCase() ===
                            parsedAction.val2?.toLowerCase().trim(),
                        );

                        if (matchedOpt2) {
                          return (
                            <>
                              <span className="px-2 py-0.5 rounded bg-accent/20 border border-accent/30 text-xs font-semibold text-accent-foreground">
                                {param2.name}: {matchedOpt2.label}
                              </span>
                              {/* Blinking Caret (completed) */}
                              <span
                                className="w-[1.5px] h-4.5 bg-foreground ml-px"
                                style={{
                                  animation:
                                    "spotlightCaretBlink 1s step-end infinite",
                                }}
                              />
                            </>
                          );
                        } else {
                          return (
                            <div className="flex items-center gap-0">
                              <span className="text-foreground whitespace-pre">
                                {parsedAction.val2}
                              </span>
                              {/* Blinking Caret (before placeholder) */}
                              <span
                                className="w-[1.5px] h-4.5 bg-foreground ml-px"
                                style={{
                                  animation:
                                    "spotlightCaretBlink 1s step-end infinite",
                                }}
                              />
                              {!parsedAction.val2 && (
                                <span className="text-muted-foreground/40 italic ml-1">
                                  [{param2.name}]
                                </span>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Category Quick Filter Tags */}
          <div className="flex items-center gap-1.5 px-4 pb-3 pt-2 overflow-x-auto select-none no-scrollbar">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold tracking-wider rounded-full uppercase border cursor-pointer transition-all duration-200",
                  activeFilter === filter
                    ? "bg-primary border-primary text-primary-foreground shadow-xs scale-102"
                    : "bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border-border",
                )}
              >
                {filterLabels[filter]}
              </button>
            ))}
          </div>
        </div>

        <CommandList className="max-h-120 overflow-y-auto p-3 no-scrollbar bg-popover">
          {!hasValidType && (
            <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
              {t("spotlight.noMatches", { search })}
            </CommandEmpty>
          )}

          {/* Browse Media Results Section */}
          {hasValidType && parsedAction && (
            <CommandGroup
              heading={t("spotlight.browseMedia", { media: parsedAction.val1 })}
              className="px-2"
            >
              {searchLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  {t("spotlight.searchingMedia")}
                </div>
              )}
              {!searchLoading && !searchResults && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {t("spotlight.typeToSearch")}
                </div>
              )}
              {!searchLoading &&
                searchResults &&
                searchResults.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {t("spotlight.noMediaFound")}
                  </div>
                )}
              {!searchLoading &&
                searchResults &&
                searchResults.map((item: any) => {
                  const title =
                    item.title?.english ||
                    item.title?.romaji ||
                    item.name ||
                    "Unknown Title";
                  const cover =
                    item.coverImage?.medium ||
                    item.coverImage?.large ||
                    item.image ||
                    "";
                  const typeParam = parsedAction.val1.toLowerCase();
                  const redirectPath = `/aquila/${
                    typeParam === "movie"
                      ? "movies"
                      : typeParam === "game"
                        ? "games"
                        : typeParam === "book"
                          ? "books"
                          : typeParam
                  }/${item.id}`;

                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        handleSetOpen(false);
                        router.push(redirectPath);
                      }}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-all duration-200 group/item"
                    >
                      <div className="w-8 h-11 rounded-md border border-border/50 bg-background overflow-hidden shrink-0 shadow-xs">
                        {cover ? (
                          <img
                            src={cover}
                            alt={title}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Film className="size-4 opacity-50 m-auto mt-3.5" />
                        )}
                      </div>
                      <span className="font-bold text-sm text-foreground flex-1 group-data-selected/command-item:text-primary transition-colors">
                        {title}
                      </span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          )}

          {/* Applications Section */}
          {applicationsGroup.length > 0 && (
            <CommandGroup heading={t("spotlight.filterApps")} className="px-2">
              {applicationsGroup.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
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
            <CommandGroup heading={t("spotlight.filterPages")} className="px-2">
              {navigationGroup.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
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
            <CommandGroup
              heading={t("spotlight.filterActions")}
              className="px-2"
            >
              {actionsGroup.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
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

          {/* Clipboard Group */}
          {clipboardGroup.length > 0 && (
            <>
              {actionsGroup.length > 0 && (
                <CommandSeparator className="my-2.5 bg-border/40" />
              )}
              <CommandGroup
                heading={t("spotlight.clipboardHistory")}
                className="px-2"
              >
                {clipboardGroup.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={item.action}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-all duration-200 group/item"
                  >
                    <div className="flex size-7 items-center justify-center rounded-lg border border-border/30 bg-background/50 text-muted-foreground group-data-selected/command-item:bg-primary group-data-selected/command-item:text-primary-foreground group-data-selected/command-item:border-transparent transition-colors shadow-2xs">
                      {item.icon}
                    </div>
                    <span className="font-semibold text-sm text-foreground flex-1 truncate">
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
            </>
          )}
        </CommandList>

        <div className="border-t border-border bg-muted/30 px-5 py-3 flex items-center justify-between text-xs text-muted-foreground select-none shrink-0">
          <div className="flex items-center gap-2">
            <span>{t("spotlight.navigate")}:</span>
            <kbd className="px-1.5 py-0.5 rounded-sm bg-muted border border-border/50 font-mono text-[10px]">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded-sm bg-muted border border-border/50 font-mono text-[10px]">
              ↓
            </kbd>
            <span className="ml-1.5">{t("spotlight.select")}:</span>
            <kbd className="px-1.5 py-0.5 rounded-sm bg-muted border border-border/50 font-mono text-[10px]">
              ⏎
            </kbd>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{t("spotlight.doubleTap")}</span>
            <kbd className="px-1.5 py-0.5 rounded-sm bg-primary/10 border border-primary/20 font-sans font-semibold text-[10px] text-primary animate-pulse">
              Shift
            </kbd>
            <span>{t("spotlight.toClose")}</span>
          </div>
        </div>
      </CommandDialog>
      {activeRoulette && session?.user && (
        <RrMediaRoulette
          username={session?.user?.username || ""}
          mediaType={activeRoulette}
          baseUrl={`/aquila/user/${session?.user?.username || ""}/${activeRoulette === "tv" ? "tv" : activeRoulette === "movie" ? "movies" : activeRoulette === "game" ? "games" : activeRoulette === "book" ? "books" : activeRoulette}`}
          open={activeRoulette !== null}
          onOpenChange={(open) => {
            if (!open) setActiveRoulette(null);
          }}
          triggerButton={false}
        />
      )}
    </>
  );
}
