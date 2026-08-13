"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { settingsNavConfig } from "../../../config/settings";
import { useTranslation } from "react-i18next";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import RrBottomDock from "../rrBottomDock";

// New modular settings tab components
import { RrAccountSettingsTab } from "./rrAccountSettingsTab";
import { RrSecuritySettingsTab } from "./rrSecuritySettingsTab";
import { RrPrivacySettingsTab } from "./rrPrivacySettingsTab";
import { RrConnectionsTab } from "./rrConnectionsTab";
import { RrSidebarSettingsTab } from "./rrSidebarSettingsTab";
import { RrMailSettingsTab } from "./rrMailSettingsTab";
import { RrApiKeysTab } from "./rrApiKeysTab";
import { RrListsTab } from "./rrListsTab";
import { RrArrSettingsTab } from "./rrArrSettingsTab";
import { RrConstellationBuilderModal } from "../rrConstellationBuilderModal";

type rrCategory =
  | "account"
  | "connections"
  | "privacy"
  | "sidebar"
  | "security"
  | "mailAccounts"
  | "apiKeys"
  | "lists"
  | "arrServices"
  | "constellation";

export interface rrSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
}: rrSettingsDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<rrCategory>("account");
  const [isConstellationBuilderOpen, setIsConstellationBuilderOpen] =
    useState(false);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const isPegasus = pathname.startsWith("/pegasus");

  const [footerContent, setFooterContent] = useState<React.ReactNode | null>(
    null,
  );

  useEffect(() => {
    setFooterContent(null);
  }, [activeCategory]);

  useEffect(() => {
    if (open) {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category") || params.get("settings");

      switch (cat) {
        case "connections":
          setActiveCategory("connections");
          break;
        case "privacy":
          setActiveCategory("privacy");
          break;
        case "security":
          setActiveCategory("security");
          break;
        case "sidebar":
          setActiveCategory("sidebar");
          break;
        case "mailAccounts":
          setActiveCategory("mailAccounts");
          break;
        case "apiKeys":
          setActiveCategory("apiKeys");
          break;
        case "lists":
          setActiveCategory("lists");
          break;
        case "arrServices":
          setActiveCategory("arrServices");
          break;
        default:
          setActiveCategory("account");
      }
    }
  }, [open, isPegasus]);

  const navItems: { id: rrCategory; name: string; icon: React.ElementType }[] =
    settingsNavConfig
      .filter((item) => {
        if (item.id === "sidebar" && !isMobile) return false;
        if (
          item.visibleOn &&
          !item.visibleOn.some((route) => pathname.startsWith(route))
        )
          return false;
        return true;
      })
      .map((item) => ({
        id: item.id as rrCategory,
        name: item.label,
        icon: item.icon,
      }));

  const mobileDockItems = navItems.map((item) => ({
    label: t("settingsDialog." + item.id),
    icon: <item.icon className="size-4" />,
    isActive: activeCategory === item.id,
    onClick: () => {
      if (item.id === "constellation") {
        setIsConstellationBuilderOpen(true);
      } else {
        setActiveCategory(item.id);
      }
    },
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] max-w-[96vw] xl:max-w-[1550px] 2xl:max-w-[1680px] p-0 gap-0 overflow-hidden rounded-2xl flex flex-col md:flex-row h-[92dvh] max-h-[92dvh] md:h-[90vh] md:max-h-[90vh]">
          <DialogTitle className="sr-only">
            {t("settingsDialog.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("settingsDialog.description")}
          </DialogDescription>
          <SidebarProvider
            className="items-start h-full w-full min-h-0"
            style={{ minHeight: "100%" }}
          >
            {/* Desktop Left Sidebar */}
            <Sidebar
              collapsible="none"
              className="hidden md:flex border-r h-full bg-card min-w-55"
            >
              <SidebarContent>
                <SidebarGroup>
                  <div className="px-3 py-2 mb-2 text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider">
                    {t("settingsDialog.dashboard")}
                  </div>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={activeCategory === item.id}
                            onClick={() => {
                              if (item.id === "constellation") {
                                setIsConstellationBuilderOpen(true);
                              } else {
                                setActiveCategory(item.id);
                              }
                            }}
                            className="cursor-pointer"
                          >
                            <button
                              type="button"
                              className="w-full flex items-center gap-2"
                            >
                              <item.icon className="size-4" />
                              <span>
                                {item.name || t("settingsDialog." + item.id)}
                              </span>
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            {/* Right Content Area */}
            <main className="flex flex-1 flex-col h-full overflow-hidden bg-background">
              <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between gap-2 px-4 sm:px-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="#">
                          {t("settingsDialog.title")}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>
                          {navItems.find((n) => n.id === activeCategory)
                            ?.name || t("settingsDialog." + activeCategory)}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </header>

              {/* Tab Panel Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-4 md:pb-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2 }}
                    className="min-h-full"
                  >
                    {activeCategory === "account" && (
                      <RrAccountSettingsTab onOpenChange={onOpenChange} />
                    )}
                    {activeCategory === "security" && (
                      <RrSecuritySettingsTab onOpenChange={onOpenChange} />
                    )}
                    {activeCategory === "privacy" && (
                      <RrPrivacySettingsTab onOpenChange={onOpenChange} />
                    )}
                    {activeCategory === "connections" && (
                      <RrConnectionsTab onOpenChange={onOpenChange} />
                    )}
                    {activeCategory === "sidebar" && (
                      <RrSidebarSettingsTab onOpenChange={onOpenChange} />
                    )}
                    {activeCategory === "mailAccounts" && isPegasus && (
                      <RrMailSettingsTab onOpenChange={onOpenChange} />
                    )}
                    {activeCategory === "apiKeys" && (
                      <RrApiKeysTab onOpenChange={onOpenChange} />
                    )}
                    {activeCategory === "lists" && (
                      <RrListsTab
                        onOpenChange={onOpenChange}
                        setActiveCategory={setActiveCategory}
                      />
                    )}
                    {activeCategory === "arrServices" && (
                      <RrArrSettingsTab
                        onOpenChange={onOpenChange}
                        setFooterContent={setFooterContent}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Modal Footer (pinned at absolute bottom of main) */}
              {footerContent && (
                <DialogFooter className="border-t border-border px-4 sm:px-6 py-3 bg-card shrink-0 flex items-center justify-between sm:justify-between gap-3 w-full">
                  {footerContent}
                </DialogFooter>
              )}
            </main>
          </SidebarProvider>

          {/* Mobile Bottom Dock Tabs Switcher */}
          <div className="md:hidden">
            <RrBottomDock pathname="" items={mobileDockItems} />
          </div>
        </DialogContent>
      </Dialog>
      <RrConstellationBuilderModal
        open={isConstellationBuilderOpen}
        onOpenChange={setIsConstellationBuilderOpen}
        mode="device"
      />
    </>
  );
}
