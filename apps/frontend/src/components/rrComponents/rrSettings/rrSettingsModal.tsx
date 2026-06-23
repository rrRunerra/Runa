"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  Mail,
  LinkIcon,
  Lock,
  Smartphone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

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

type Category = "account" | "connections" | "privacy" | "sidebar" | "security" | "mailAccounts";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navConfig?: any;
}

export function SettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<Category>("account");
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const isPegasus = pathname.startsWith("/pegasus");

  useEffect(() => {
    if (open) {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category") || params.get("settings");
      if (cat === "connections") {
        setActiveCategory("connections");
      } else if (cat === "privacy") {
        setActiveCategory("privacy");
      } else if (cat === "security") {
        setActiveCategory("security");
      } else if (cat === "sidebar") {
        setActiveCategory("sidebar");
      } else if (cat === "mailAccounts" && isPegasus) {
        setActiveCategory("mailAccounts");
      } else {
        setActiveCategory("account");
      }
    }
  }, [open, isPegasus]);

  const navItems = [
    { id: "account" as Category, name: "Account", icon: User },
    { id: "security" as Category, name: "Security", icon: ShieldCheck },
    ...(isPegasus ? [{ id: "mailAccounts" as Category, name: "Mail Accounts", icon: Mail }] : []),
    { id: "connections" as Category, name: "Connections", icon: LinkIcon },
    { id: "privacy" as Category, name: "Privacy", icon: Lock },
    ...(isMobile ? [{ id: "sidebar" as Category, name: "Sidebar Shortcuts", icon: Smartphone }] : []),
  ];

  const mobileDockItems = navItems.map((item) => ({
    label: item.name,
    icon: <item.icon className="size-4" />,
    isActive: activeCategory === item.id,
    onClick: () => setActiveCategory(item.id),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl p-0 gap-0 overflow-hidden rounded-2xl flex flex-col md:flex-row h-[92vh] md:h-[720px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start h-full w-full min-h-0" style={{ minHeight: "100%" }}>
          {/* Desktop Left Sidebar */}
          <Sidebar collapsible="none" className="hidden md:flex border-r h-full bg-card">
            <SidebarContent>
              <SidebarGroup>
                <div className="px-3 py-2 mb-2 text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider">
                  Settings Dashboard
                </div>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={activeCategory === item.id}
                          onClick={() => setActiveCategory(item.id)}
                          className="cursor-pointer"
                        >
                          <button type="button" className="w-full flex items-center gap-2">
                            <item.icon className="size-4" />
                            <span>{item.name}</span>
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
            <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {navItems.find((n) => n.id === activeCategory)?.name || "Account"}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>

            {/* Tab Panel Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-24 md:pb-12">
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
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </SidebarProvider>

        {/* Mobile Bottom Dock Tabs Switcher */}
        <div className="md:hidden">
          <RrBottomDock
            pathname=""
            items={mobileDockItems}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
