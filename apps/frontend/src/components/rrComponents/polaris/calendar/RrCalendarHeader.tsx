"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Radio,
  Calendar as CalendarIcon,
  Settings2,
  Check,
  RotateCw,
} from "lucide-react";
import type { CalendarViewMode } from "@/hooks/usePolarisCalendar";

interface RrCalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onOpenNewEventModal: () => void;
  onOpenSourcesModal: () => void;
  selectedHolidayCountry: string;
  onSelectHolidayCountry: (country: string) => void;
  showJapaneseEra: boolean;
  onToggleJapaneseEra: () => void;
  showLunarCalendar: boolean;
  onToggleLunarCalendar: () => void;
  isSyncing?: boolean;
}

export function RrCalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigate,
  onOpenNewEventModal,
  onOpenSourcesModal,
  selectedHolidayCountry,
  onSelectHolidayCountry,
  showJapaneseEra,
  onToggleJapaneseEra,
  showLunarCalendar,
  onToggleLunarCalendar,
  isSyncing,
}: RrCalendarHeaderProps) {
  const { t } = useTranslation();

  const formattedMonthYear = currentDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const countryOptions = [
    { code: "ALL", label: t("polaris.calendar.allHolidays") },
    { code: "US", label: t("polaris.calendar.countryUS") },
    { code: "JP", label: t("polaris.calendar.countryJP") },
    { code: "CN", label: t("polaris.calendar.countryCN") },
    { code: "DE", label: t("polaris.calendar.countryDE") },
    { code: "UK", label: t("polaris.calendar.countryUK") },
  ];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 bg-card/60 border-b border-border backdrop-blur-md">
      {/* Left Navigation Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-background/50 border border-border rounded-xl p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("prev")}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("today")}
            className="h-8 px-3 rounded-lg font-medium text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            {t("polaris.calendar.today")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("next")}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CalendarIcon className="size-5 text-primary" />
          {formattedMonthYear}
        </h2>
      </div>

      {/* Center View Mode Switcher */}
      <div className="flex items-center bg-background/50 border border-border rounded-xl p-1 gap-1">
        <Button
          variant={viewMode === "month" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("month")}
          className="h-8 px-3 rounded-lg text-xs font-medium"
        >
          {t("polaris.calendar.viewMonth")}
        </Button>
        <Button
          variant={viewMode === "week" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("week")}
          className="h-8 px-3 rounded-lg text-xs font-medium"
        >
          {t("polaris.calendar.viewWeek")}
        </Button>
        <Button
          variant={viewMode === "day" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("day")}
          className="h-8 px-3 rounded-lg text-xs font-medium"
        >
          {t("polaris.calendar.viewDay")}
        </Button>
        <Button
          variant={viewMode === "agenda" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewModeChange("agenda")}
          className="h-8 px-3 rounded-lg text-xs font-medium"
        >
          {t("polaris.calendar.viewAgenda")}
        </Button>
      </div>

      {/* Right Action Buttons & Settings */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-border text-xs">
              <Settings2 className="size-4 text-muted-foreground" />
              {t("polaris.calendar.displayOptions")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-popover text-popover-foreground">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              {t("polaris.calendar.holidaysFilter")}
            </DropdownMenuLabel>
            {countryOptions.map((c) => (
              <DropdownMenuItem
                key={c.code}
                onClick={() => onSelectHolidayCountry(c.code)}
                className="flex items-center justify-between text-xs cursor-pointer"
              >
                <span>{c.label}</span>
                {selectedHolidayCountry === c.code && <Check className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              {t("polaris.calendar.specialCalendars")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={onToggleJapaneseEra}
              className="flex items-center justify-between text-xs cursor-pointer"
            >
              <span>{t("polaris.calendar.japaneseEra")}</span>
              {showJapaneseEra && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onToggleLunarCalendar}
              className="flex items-center justify-between text-xs cursor-pointer"
            >
              <span>{t("polaris.calendar.lunarCalendar")}</span>
              {showLunarCalendar && <Check className="size-3.5 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSourcesModal}
          className="h-9 gap-2 rounded-xl border-border text-xs"
        >
          <Radio className="size-4 text-primary" />
          {t("polaris.calendar.manageSources")}
          {isSyncing && <RotateCw className="size-3 text-primary animate-spin" />}
        </Button>

        <Button
          size="sm"
          onClick={onOpenNewEventModal}
          className="h-9 gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
        >
          <Plus className="size-4" />
          {t("polaris.calendar.newEvent")}
        </Button>
      </div>
    </div>
  );
}
