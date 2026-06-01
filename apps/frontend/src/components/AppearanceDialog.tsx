"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { THEMES, type ThemeConfig } from "@/config/themes";

interface AppearanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppearanceDialog({
  open,
  onOpenChange,
}: AppearanceDialogProps) {
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
      <DialogContent className="max-w-[90vw] sm:max-w-md md:max-w-xl lg:max-w-2xl bg-card border border-border shadow-2xl p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/50">
          <DialogTitle className="text-base sm:text-lg font-bold">Appearance</DialogTitle>
          <DialogDescription className="sr-only">
            Customize the interface theme
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                Interface theme
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Customize your workspace theme
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
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
            </div>

            <hr className="border-border/50" />

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 sm:space-y-1 pr-4">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground">
                  Dark Mode
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Toggle between light and dark variants of your selected theme
                </p>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={setIsDark}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-border/50 flex justify-end gap-3 bg-muted/30 rounded-bl-2xl rounded-br-2xl overflow-hidden">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 sm:px-5 shadow-md text-xs sm:text-sm h-9"
          >
            Save preferences
          </Button>
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
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative rounded-xl border-2 p-2 sm:p-3 text-left transition-all hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] flex flex-col items-center ${
        isSelected ? "border-primary bg-primary/5" : "border-border/50"
      }`}
    >
      <div
        className="w-full aspect-4/3 rounded-lg border border-border/20 shadow-sm mb-2 sm:mb-3 overflow-hidden flex flex-col transition-all duration-300 group-hover:shadow-md"
        style={{ backgroundColor: colors.background }}
      >
        {/* Mockup header */}
        <div
          className="h-4 sm:h-5 border-b border-white/5 flex items-center px-2 gap-1"
          style={{ backgroundColor: colors.sidebar }}
        >
          <div className="size-1 sm:size-1.5 rounded-full bg-red-400" />
          <div className="size-1 sm:size-1.5 rounded-full bg-yellow-400" />
          <div className="size-1 sm:size-1.5 rounded-full bg-green-400" />
        </div>
        {/* Mockup body */}
        <div className="flex-1 flex flex-col justify-center items-center gap-1 sm:gap-2 p-1.5 sm:p-2">
          <div className="flex items-center gap-1.5 sm:gap-2 w-full max-w-[85%]">
            <div
              className="size-2 sm:size-3 rounded-full shrink-0"
              style={{ backgroundColor: colors.primary }}
            />
            <div
              className="h-1.5 sm:h-2 flex-1 rounded-sm"
              style={{ backgroundColor: colors.primary }}
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 w-full max-w-[85%]">
            <div
              className="size-2 sm:size-3 rounded-full shrink-0"
              style={{ backgroundColor: colors.primary }}
            />
            <div
              className="h-1.5 sm:h-2 flex-1 rounded-sm"
              style={{ backgroundColor: colors.accent }}
            />
          </div>
        </div>
      </div>

      <div className="w-full flex items-center justify-between px-0.5">
        <span className="text-[10px] sm:text-xs font-semibold leading-tight truncate mr-2">
          {themeConfig.name}
        </span>
        {isSelected ? (
          <div className="flex size-3.5 sm:size-4 items-center justify-center rounded-full bg-transparent border-2 border-primary shrink-0">
            <div className="size-1.5 sm:size-2 rounded-full bg-primary" />
          </div>
        ) : (
          <div className="size-3.5 sm:size-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
        )}
      </div>
    </button>
  );
}
