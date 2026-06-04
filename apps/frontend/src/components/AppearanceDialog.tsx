"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Sun, Moon, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { THEMES, type ThemeConfig } from "@/config/themes";

interface AppearanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export function AppearanceDialog({
  open,
  onOpenChange,
}: AppearanceDialogProps): React.JSX.Element | null {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [baseTheme, setBaseTheme] = useState<string>("default");
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    setMounted(true);

    const currentTheme = theme === "system" ? resolvedTheme : theme;
    if (!currentTheme) return;

    // Detect dark mode based on whether theme ends with -light OR is literally "light"
    const isLight = currentTheme.endsWith("-light") || currentTheme === "light";
    setIsDark(!isLight);

    // Extract base theme part (the part before the dash)
    const base = currentTheme.includes("-")
      ? currentTheme.split("-")[0]
      : "default";

    // Validate that the base is one of our supported themes
    if (THEMES.some((t) => t.id === base)) {
      setBaseTheme(base);
    } else {
      setBaseTheme("default");
    }
  }, [theme, resolvedTheme]);

  if (!mounted) return null;

  const handleSave = () => {
    let newTheme = `${baseTheme}-${isDark ? "dark" : "light"}`;
    if (baseTheme === "default") {
      newTheme = isDark ? "dark" : "light";
    }

    setTheme(newTheme);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-xl lg:max-w-2xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-0 gap-0 overflow-hidden rounded-2xl flex flex-col">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 sm:pb-5 border-b border-zinc-800/40 flex flex-row items-center gap-3.5 shrink-0">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hidden sm:block shrink-0">
            <Palette className="size-5" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              Appearance Settings
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tailor the theme, modes, and colors of your Runa desktop dashboard.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Content with Staggered Entrance */}
        <div className="flex-1 overflow-y-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="p-5 sm:p-6 space-y-6"
          >
            {/* Theme Selector Section */}
            <motion.div variants={itemVariants} className="space-y-3">
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                  Interface Theme
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Select a color profile for the main workspace panels
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                {THEMES.map((t) => {
                  const currentColors = isDark ? t.colors.dark : t.colors.light;
                  return (
                    <ThemeButton
                      key={t.id}
                      themeConfig={t}
                      colors={currentColors}
                      isSelected={baseTheme === t.id}
                      onClick={() => setBaseTheme(t.id)}
                    />
                  );
                })}
              </div>
            </motion.div>

            <motion.hr variants={itemVariants} className="border-zinc-800/40" />

            {/* Segmented Light/Dark Selection Cards */}
            <motion.div variants={itemVariants} className="space-y-3">
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                  Theme Mode
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Toggle between light and dark variants of your selected workspace theme
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                {/* Light Mode Selector Card */}
                <motion.button
                  type="button"
                  onClick={() => setIsDark(false)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative flex flex-col items-center gap-3.5 p-4 sm:p-5 rounded-2xl border-2 text-center transition-colors duration-200 cursor-pointer ${
                    !isDark
                      ? "border-transparent bg-primary/5"
                      : "border-zinc-800/50 hover:bg-zinc-900/30"
                  }`}
                >
                  {!isDark && (
                    <motion.div
                      layoutId="activeModeOutline"
                      className="absolute inset-0 border-2 border-primary rounded-2xl shadow-[0_0_15px_rgba(var(--primary),0.05)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  <div className="p-3 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 group-hover:scale-110 transition-transform duration-200">
                    <Sun className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-foreground">
                      Light Mode
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      Crisp, high-contrast display
                    </span>
                  </div>
                </motion.button>

                {/* Dark Mode Selector Card */}
                <motion.button
                  type="button"
                  onClick={() => setIsDark(true)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative flex flex-col items-center gap-3.5 p-4 sm:p-5 rounded-2xl border-2 text-center transition-colors duration-200 cursor-pointer ${
                    isDark
                      ? "border-transparent bg-primary/5"
                      : "border-zinc-800/50 hover:bg-zinc-900/30"
                  }`}
                >
                  {isDark && (
                    <motion.div
                      layoutId="activeModeOutline"
                      className="absolute inset-0 border-2 border-primary rounded-2xl shadow-[0_0_15px_rgba(var(--primary),0.05)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      style={{ pointerEvents: "none" }}
                    />
                  )}
                  <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform duration-200">
                    <Moon className="size-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-foreground">
                      Dark Mode
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      Low-light, battery-friendly
                    </span>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-zinc-800/40 flex justify-end gap-3 bg-zinc-900/20 shrink-0">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 rounded-xl h-9 cursor-pointer"
            >
              Cancel
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer"
            >
              Save Preferences
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemeButton({
  themeConfig,
  colors,
  isSelected,
  onClick,
}: {
  themeConfig: ThemeConfig;
  colors: ThemeConfig["colors"]["dark"];
  isSelected: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      className={`group relative rounded-2xl border-2 p-2.5 sm:p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex flex-col items-center w-full transition-colors duration-200 cursor-pointer ${
        isSelected ? "border-transparent bg-primary/5" : "border-zinc-800/60 hover:bg-zinc-900/20"
      }`}
    >
      {isSelected && (
        <motion.div
          layoutId="activeThemeOutline"
          className="absolute inset-0 border-2 border-primary rounded-2xl shadow-[0_0_15px_rgba(var(--primary),0.08)]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Structured Dashboard Mockup Preview */}
      <div
        className="w-full aspect-16/10 rounded-lg border border-white/5 shadow-sm mb-3 overflow-hidden flex transition-all duration-300 group-hover:shadow-md"
        style={{ backgroundColor: colors.background }}
      >
        {/* Mockup Sidebar panel */}
        <div
          className="w-1/4 border-r border-white/5 flex flex-col p-1 sm:p-1.5 gap-1 sm:gap-1.5 shrink-0"
          style={{ backgroundColor: colors.sidebar }}
        >
          <div className="flex gap-0.5 shrink-0">
            <div className="size-1 rounded-full bg-red-400/80" />
            <div className="size-1 rounded-full bg-yellow-400/80" />
            <div className="size-1 rounded-full bg-green-400/80" />
          </div>
          <div className="space-y-1">
            <div
              className="h-1 w-full rounded-xs"
              style={{ backgroundColor: colors.primary, opacity: 0.8 }}
            />
            <div
              className="h-1 w-4/5 rounded-xs"
              style={{ backgroundColor: colors.accent, opacity: 0.5 }}
            />
            <div
              className="h-1 w-2/3 rounded-xs"
              style={{ backgroundColor: colors.accent, opacity: 0.5 }}
            />
          </div>
        </div>

        {/* Mockup Content area */}
        <div className="flex-1 flex flex-col p-1 sm:p-1.5 gap-1 sm:gap-1.5 overflow-hidden">
          {/* Mockup Navbar */}
          <div className="flex justify-between items-center pb-0.5 border-b border-white/5 shrink-0">
            <div
              className="h-1.5 w-12 rounded-sm"
              style={{ backgroundColor: colors.primary }}
            />
            <div
              className="size-1.5 rounded-full"
              style={{ backgroundColor: colors.accent }}
            />
          </div>
          {/* Mockup Grid cards */}
          <div className="grid grid-cols-2 gap-1 flex-1 overflow-hidden">
            <div
              className="rounded-xs border border-white/5 p-1 flex flex-col gap-0.5 justify-center"
              style={{ backgroundColor: colors.accent, opacity: 0.08 }}
            >
              <div
                className="h-0.5 w-2/3 rounded-xxs"
                style={{ backgroundColor: colors.primary }}
              />
              <div
                className="h-0.5 w-full rounded-xxs"
                style={{ backgroundColor: colors.primary, opacity: 0.4 }}
              />
            </div>
            <div
              className="rounded-xs border border-white/5 p-1 flex flex-col gap-0.5 justify-center"
              style={{ backgroundColor: colors.accent, opacity: 0.08 }}
            >
              <div
                className="h-0.5 w-2/3 rounded-xxs"
                style={{ backgroundColor: colors.primary }}
              />
              <div
                className="h-0.5 w-full rounded-xxs"
                style={{ backgroundColor: colors.primary, opacity: 0.4 }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex items-center justify-between px-0.5 font-sans shrink-0">
        <span className="text-[10px] sm:text-xs font-semibold leading-tight truncate mr-2 text-foreground">
          {themeConfig.name}
        </span>
        <AnimatePresence mode="popLayout">
          {isSelected ? (
            <motion.div
              key="selected"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 shadow-sm"
            >
              <Check className="size-2.5 stroke-3" />
            </motion.div>
          ) : (
            <div key="unselected" className="size-4 rounded-full border-2 border-zinc-800 shrink-0" />
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
