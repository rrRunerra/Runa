"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { User, LinkIcon, Lock, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AccountSettingsTab } from "./AccountSettingsTab";
import { ConnectionsTab } from "./ConnectionsTab";
import { PrivacySettingsTab } from "./PrivacySettingsTab";
import { SidebarSettingsTab } from "./SidebarSettingsTab";
import type { AccountSettingsTabRef } from "./AccountSettingsTab";
import type { PrivacySettingsTabRef } from "./PrivacySettingsTab";
import type { SidebarSettingsTabRef } from "./SidebarSettingsTab";
import type { NavbarConfig } from "@/components/Providers/NavigationProvider";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navConfig?: NavbarConfig;
}

type Category = "account" | "connections" | "privacy" | "sidebar";

export function SettingsDialog({
  open,
  onOpenChange,
  navConfig,
}: SettingsDialogProps): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<Category>("account");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const accountTabRef = useRef<AccountSettingsTabRef>(null);
  const privacyTabRef = useRef<PrivacySettingsTabRef>(null);
  const sidebarTabRef = useRef<SidebarSettingsTabRef>(null);

  useEffect(() => {
    if (open) {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category") || params.get("settings");
      if (cat === "connections") {
        setActiveCategory("connections");
      } else if (cat === "privacy") {
        setActiveCategory("privacy");
      } else if (cat === "sidebar") {
        setActiveCategory("sidebar");
      } else {
        setActiveCategory("account");
      }
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl bg-card border border-border shadow-2xl p-0 gap-0 overflow-hidden rounded-2xl flex flex-col md:flex-row h-[92vh] md:h-[720px]">
        {/* Left Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/50 bg-muted/20 p-4 flex flex-row md:flex-col gap-1.5 shrink-0 overflow-x-auto md:overflow-x-visible no-scrollbar">
          <div className="hidden md:block px-2 py-1.5 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Settings
          </div>
          <button
            type="button"
            onClick={() => setActiveCategory("account")}
            className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
              activeCategory === "account"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <User className="size-4" />
            Account
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("connections")}
            className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
              activeCategory === "connections"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <LinkIcon className="size-4" />
            Connections
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("privacy")}
            className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
              activeCategory === "privacy"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Lock className="size-4" />
            Privacy
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("sidebar")}
            className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
              activeCategory === "sidebar"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Smartphone className="size-4" />
            Sidebar
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <DialogTitle className="text-lg font-bold">
              {activeCategory === "account"
                ? "Account Settings"
                : activeCategory === "connections"
                  ? "Connections"
                  : activeCategory === "privacy"
                    ? "Privacy Settings"
                    : "Sidebar Settings"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Customize your Settings
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {activeCategory === "account" && (
              <AccountSettingsTab
                ref={accountTabRef}
                onOpenChange={onOpenChange}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
              />
            )}
            {activeCategory === "connections" && <ConnectionsTab />}
            {activeCategory === "privacy" && (
              <PrivacySettingsTab
                ref={privacyTabRef}
                onOpenChange={onOpenChange}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
              />
            )}
            {activeCategory === "sidebar" && (
              <SidebarSettingsTab
                ref={sidebarTabRef}
                onOpenChange={onOpenChange}
                navConfig={navConfig}
              />
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3 bg-muted/10">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {activeCategory === "account" && (
              <Button
                onClick={() => accountTabRef.current?.handleSave()}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-5 shadow-sm text-sm"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            )}
            {activeCategory === "privacy" && (
              <Button
                onClick={() => privacyTabRef.current?.handleSave()}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-5 shadow-sm text-sm"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            )}
            {activeCategory === "sidebar" && (
              <Button
                onClick={() => sidebarTabRef.current?.handleSave()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-5 shadow-sm text-sm"
              >
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
