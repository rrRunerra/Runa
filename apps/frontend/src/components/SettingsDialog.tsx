"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { User, LinkIcon, Lock, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
      <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-0 gap-0 overflow-hidden rounded-2xl flex flex-col md:flex-row h-[92vh] md:h-[720px]">
        {/* Left Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800/40 bg-zinc-900/10 p-4 flex flex-row md:flex-col gap-1.5 shrink-0 overflow-x-auto md:overflow-x-visible no-scrollbar">
          <div className="hidden md:block px-3 py-2 mb-2 text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider">
            Settings Dashboard
          </div>
          
          {/* Account Settings Tab Button */}
          <button
            type="button"
            onClick={() => setActiveCategory("account")}
            className={`relative flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 whitespace-nowrap outline-hidden cursor-pointer ${
              activeCategory === "account"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeCategory === "account" && (
              <>
                <motion.div
                  layoutId="activeSettingsIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
                <motion.div
                  layoutId="activeSettingsHighlight"
                  className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  style={{ pointerEvents: "none" }}
                />
              </>
            )}
            <span className="relative z-10 flex items-center gap-2.5">
              <User className="size-4" />
              Account
            </span>
          </button>

          {/* Connections Settings Tab Button */}
          <button
            type="button"
            onClick={() => setActiveCategory("connections")}
            className={`relative flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 whitespace-nowrap outline-hidden cursor-pointer ${
              activeCategory === "connections"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeCategory === "connections" && (
              <>
                <motion.div
                  layoutId="activeSettingsIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
                <motion.div
                  layoutId="activeSettingsHighlight"
                  className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  style={{ pointerEvents: "none" }}
                />
              </>
            )}
            <span className="relative z-10 flex items-center gap-2.5">
              <LinkIcon className="size-4" />
              Connections
            </span>
          </button>

          {/* Privacy Settings Tab Button */}
          <button
            type="button"
            onClick={() => setActiveCategory("privacy")}
            className={`relative flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 whitespace-nowrap outline-hidden cursor-pointer ${
              activeCategory === "privacy"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeCategory === "privacy" && (
              <>
                <motion.div
                  layoutId="activeSettingsIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
                <motion.div
                  layoutId="activeSettingsHighlight"
                  className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  style={{ pointerEvents: "none" }}
                />
              </>
            )}
            <span className="relative z-10 flex items-center gap-2.5">
              <Lock className="size-4" />
              Privacy
            </span>
          </button>

          {/* Sidebar Settings Tab Button */}
          <button
            type="button"
            onClick={() => setActiveCategory("sidebar")}
            className={`relative flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 whitespace-nowrap outline-hidden cursor-pointer ${
              activeCategory === "sidebar"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeCategory === "sidebar" && (
              <>
                <motion.div
                  layoutId="activeSettingsIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
                <motion.div
                  layoutId="activeSettingsHighlight"
                  className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  style={{ pointerEvents: "none" }}
                />
              </>
            )}
            <span className="relative z-10 flex items-center gap-2.5">
              <Smartphone className="size-4" />
              Sidebar Shortcuts
            </span>
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-5 sm:p-6 pb-4 sm:pb-5 border-b border-zinc-800/40 flex flex-row items-center gap-3.5 shrink-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hidden sm:block shrink-0">
              {activeCategory === "account" && <User className="size-5" />}
              {activeCategory === "connections" && <LinkIcon className="size-5" />}
              {activeCategory === "privacy" && <Lock className="size-5" />}
              {activeCategory === "sidebar" && <Smartphone className="size-5" />}
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                {activeCategory === "account"
                  ? "Account Settings"
                  : activeCategory === "connections"
                    ? "Connections & Apps"
                    : activeCategory === "privacy"
                      ? "Privacy Preferences"
                      : "Sidebar Customizer"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {activeCategory === "account"
                  ? "Manage your display credentials, public-facing avatar, banner, and security passwords."
                  : activeCategory === "connections"
                    ? "Link and authorize third-party services and APIs to fetch tracker data automatically."
                    : activeCategory === "privacy"
                      ? "Configure who is allowed to view your profile statistics, logs, and tracking lists."
                      : "Arrange and sort the shortcut options available on your mobile phone dashboard view."}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Tab Contents Content Area */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
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
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="px-5 sm:px-6 py-4 border-t border-zinc-800/40 flex justify-end gap-3 bg-zinc-900/20 shrink-0">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 rounded-xl h-9 cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {activeCategory === "account" && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => accountTabRef.current?.handleSave()}
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </motion.div>
            )}
            {activeCategory === "privacy" && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => privacyTabRef.current?.handleSave()}
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </motion.div>
            )}
            {activeCategory === "sidebar" && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => sidebarTabRef.current?.handleSave()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer"
                >
                  Save Changes
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
