import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Globe,
  RefreshCw,
  Search,
  Check,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface RrMailLinkWizardStep3Props {
  senderName: string;
  onChangeSenderName: (val: string) => void;
  emailAddress: string;
  replyTo: string;
  onChangeReplyTo: (val: string) => void;
  organization: string;
  onChangeOrganization: (val: string) => void;
  emailColor: string;
  onChangeEmailColor: (val: string) => void;
  signature: string;
  onChangeSignature: (val: string) => void;
  useHtmlSig: boolean;
  onChangeUseHtmlSig: (val: boolean) => void;

  // Background Sync Schedule Props
  syncEnabled: boolean;
  onChangeSyncEnabled: (val: boolean) => void;
  syncTimeRangeEnabled: boolean;
  onChangeSyncTimeRangeEnabled: (val: boolean) => void;
  syncStartTime: string;
  onChangeSyncStartTime: (val: string) => void;
  syncEndTime: string;
  onChangeSyncEndTime: (val: string) => void;
  syncDays: number[];
  onChangeSyncDays: (val: number[]) => void;
  syncTimezone: string;
  onChangeSyncTimezone: (val: string) => void;
  syncIntervalMinutes: number;
  onChangeSyncIntervalMinutes: (val: number) => void;
}

const DAYS_OF_WEEK = [
  { id: 1, label: "Mon", full: "Monday" },
  { id: 2, label: "Tue", full: "Tuesday" },
  { id: 3, label: "Wed", full: "Wednesday" },
  { id: 4, label: "Thu", full: "Thursday" },
  { id: 5, label: "Fri", full: "Friday" },
  { id: 6, label: "Sat", full: "Saturday" },
  { id: 0, label: "Sun", full: "Sunday" },
];

const COMMON_INTERVALS = [
  { val: 5, label: "5 min (Recommended)" },
  { val: 10, label: "10 min" },
  { val: 15, label: "15 min" },
  { val: 30, label: "30 min" },
  { val: 60, label: "1 hour" },
];

export function RrMailLinkWizardStep3({
  senderName,
  onChangeSenderName,
  emailAddress,
  replyTo,
  onChangeReplyTo,
  organization,
  onChangeOrganization,
  emailColor,
  onChangeEmailColor,
  signature,
  onChangeSignature,
  useHtmlSig,
  onChangeUseHtmlSig,
  syncEnabled,
  onChangeSyncEnabled,
  syncTimeRangeEnabled,
  onChangeSyncTimeRangeEnabled,
  syncStartTime,
  onChangeSyncStartTime,
  syncEndTime,
  onChangeSyncEndTime,
  syncDays,
  onChangeSyncDays,
  syncTimezone,
  onChangeSyncTimezone,
  syncIntervalMinutes,
  onChangeSyncIntervalMinutes,
}: RrMailLinkWizardStep3Props): React.JSX.Element {
  const { t } = useTranslation();
  const [tzSearch, setTzSearch] = useState("");
  const [showAllTz, setShowAllTz] = useState(false);

  // All supported IANA timezones
  const allTimezones = useMemo(() => {
    try {
      if (typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function") {
        return (Intl as any).supportedValuesOf("timeZone") as string[];
      }
    } catch {}
    return [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Toronto",
      "America/Sao_Paulo",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Rome",
      "Europe/Madrid",
      "Europe/Kyiv",
      "Europe/Moscow",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Hong_Kong",
      "Asia/Singapore",
      "Asia/Seoul",
      "Asia/Dubai",
      "Asia/Kolkata",
      "Australia/Sydney",
      "Australia/Melbourne",
      "Pacific/Auckland",
    ];
  }, []);

  const localTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const filteredTimezones = useMemo(() => {
    if (!tzSearch.trim()) {
      return showAllTz ? allTimezones : allTimezones.slice(0, 30);
    }
    const q = tzSearch.toLowerCase().trim();
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q));
  }, [allTimezones, tzSearch, showAllTz]);

  const toggleDay = (dayId: number) => {
    if (syncDays.includes(dayId)) {
      if (syncDays.length === 1) return; // Must keep at least 1 day
      onChangeSyncDays(syncDays.filter((d) => d !== dayId));
    } else {
      onChangeSyncDays([...syncDays, dayId]);
    }
  };

  const selectAllDays = () => {
    onChangeSyncDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const selectWeekdays = () => {
    onChangeSyncDays([1, 2, 3, 4, 5]);
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* SECTION 1: Identity & Visuals */}
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t("mailSettings.wizard.identitySignatureHeading", "Identity & Signature")}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sender-name-input">
              {t("mailSettings.wizard.senderNameLabel", "Sender Name")}
            </Label>
            <Input
              id="sender-name-input"
              value={senderName}
              onChange={(e) => onChangeSenderName(e.target.value)}
              placeholder={emailAddress ? emailAddress.split("@")[0] : "Your Name"}
              className="h-9 px-3"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reply-to-input">
              {t("mailSettings.wizard.replyToLabel", "Reply-To Address")}
            </Label>
            <Input
              id="reply-to-input"
              type="email"
              value={replyTo}
              onChange={(e) => onChangeReplyTo(e.target.value)}
              placeholder="Optional reply-to email"
              className="h-9 px-3"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="organization-input">
              {t("mailSettings.wizard.organizationLabel", "Organization")}
            </Label>
            <Input
              id="organization-input"
              value={organization}
              onChange={(e) => onChangeOrganization(e.target.value)}
              placeholder="Optional company or org"
              className="h-9 px-3"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-color-input">
              {t("mailSettings.wizard.colorBadgeLabel", "Account Color")}
            </Label>
            <div className="flex items-center gap-2">
              <input
                id="account-color-input"
                type="color"
                value={emailColor}
                onChange={(e) => onChangeEmailColor(e.target.value)}
                className="size-9 rounded-lg border-0 bg-transparent cursor-pointer p-0 shrink-0"
              />
              <Input
                value={emailColor}
                onChange={(e) => onChangeEmailColor(e.target.value)}
                placeholder="#8B00FF"
                className="h-9 px-3 font-mono uppercase text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="signature-input">
              {t("mailSettings.wizard.signatureLabel", "Email Signature")}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t("mailSettings.wizard.htmlSignatureLabel", "HTML Signature")}
              </span>
              <Switch checked={useHtmlSig} onCheckedChange={onChangeUseHtmlSig} />
            </div>
          </div>
          <Textarea
            id="signature-input"
            value={signature}
            onChange={(e) => onChangeSignature(e.target.value)}
            placeholder="Best regards,..."
            rows={2}
            className="text-xs font-sans resize-none p-3"
          />
        </div>
      </div>

      {/* SECTION 2: Background Refresh & Time Range Settings */}
      <div className="flex flex-col gap-4 pt-3 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-4 text-primary" />
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {t("mailSettings.wizard.syncScheduleHeading", "Sync Schedule & Active Hours")}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {syncEnabled ? t("active", "Active") : t("disabled", "Disabled")}
            </span>
            <Switch checked={syncEnabled} onCheckedChange={onChangeSyncEnabled} />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground -mt-2 leading-relaxed">
          {t(
            "mailSettings.wizard.syncScheduleDesc",
            "Configure when and how often Pegasus automatically checks for new emails in the background."
          )}
        </p>

        {syncEnabled && (
          <div className="flex flex-col gap-4 bg-muted/20 border border-border/50 rounded-2xl p-4 transition-all">
            {/* Sync Interval Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
              <div>
                <Label className="text-xs font-bold text-foreground">
                  {t("mailSettings.wizard.syncIntervalLabel", "Sync Interval")}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {t("mailSettings.wizard.syncIntervalDesc", "How frequently Pegasus checks your IMAP server")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COMMON_INTERVALS.map((item) => {
                  const isSelected = syncIntervalMinutes === item.val;
                  return (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => onChangeSyncIntervalMinutes(item.val)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {item.val >= 60 ? "1h" : `${item.val}m`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Range Active Hours Switch */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-foreground">
                  {t("mailSettings.wizard.timeRangeEnabledLabel", "Limit Sync to Active Hours")}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "mailSettings.wizard.timeRangeEnabledDesc",
                    "Prevent background refresh from running overnight or when unused."
                  )}
                </p>
              </div>
              <Switch
                checked={syncTimeRangeEnabled}
                onCheckedChange={onChangeSyncTimeRangeEnabled}
              />
            </div>

            {syncTimeRangeEnabled && (
              <div className="flex flex-col gap-4 pt-2 border-t border-border/40 animate-in fade-in-50 duration-200">
                {/* Timezone Selector with Full IANA Timezone Support */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Globe className="size-3.5 text-primary" />
                      {t("mailSettings.wizard.timezoneLabel", "Timezone")}
                    </Label>
                    {syncTimezone !== localTz && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => onChangeSyncTimezone(localTz)}
                        className="text-[10px] h-6 px-2 text-primary hover:text-primary gap-1"
                      >
                        <Sparkles className="size-3" />
                        {t("mailSettings.wizard.useLocalTimezone", "Use Local Timezone")} ({localTz})
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        value={tzSearch}
                        onChange={(e) => setTzSearch(e.target.value)}
                        placeholder="Search timezone (e.g. Berlin, New_York)..."
                        className="h-8.5 pl-8 text-xs"
                      />
                    </div>

                    <select
                      value={syncTimezone}
                      onChange={(e) => onChangeSyncTimezone(e.target.value)}
                      className="h-8.5 px-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                    >
                      {!allTimezones.includes(syncTimezone) && (
                        <option value={syncTimezone}>{syncTimezone}</option>
                      )}
                      {filteredTimezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active Time Window (Start & End Time) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="start-time-input" className="text-xs flex items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground" />
                      {t("mailSettings.wizard.startTimeLabel", "Start Time")}
                    </Label>
                    <Input
                      id="start-time-input"
                      type="time"
                      value={syncStartTime}
                      onChange={(e) => onChangeSyncStartTime(e.target.value)}
                      className="h-9 px-3 text-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="end-time-input" className="text-xs flex items-center gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground" />
                      {t("mailSettings.wizard.endTimeLabel", "End Time")}
                    </Label>
                    <Input
                      id="end-time-input"
                      type="time"
                      value={syncEndTime}
                      onChange={(e) => onChangeSyncEndTime(e.target.value)}
                      className="h-9 px-3 text-xs"
                    />
                  </div>
                </div>

                {/* Active Days */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {t("mailSettings.wizard.activeDaysLabel", "Active Days")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllDays}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                      >
                        {t("mailSettings.wizard.allDays", "All Days")}
                      </button>
                      <span className="text-muted-foreground/40">•</span>
                      <button
                        type="button"
                        onClick={selectWeekdays}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                      >
                        {t("mailSettings.wizard.weekdays", "Weekdays")}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = syncDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={cn(
                            "py-1.5 text-xs rounded-xl font-bold border transition-all cursor-pointer text-center",
                            isSelected
                              ? "bg-primary/15 text-primary border-primary/40 shadow-xs"
                              : "bg-card/60 text-muted-foreground/60 border-border/40 hover:bg-muted"
                          )}
                          title={day.full}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule Summary Banner */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px] px-1.5 bg-primary/10 text-primary border-primary/30">
                    {syncStartTime} - {syncEndTime}
                  </Badge>
                  <span className="truncate">
                    Active in <strong className="text-foreground">{syncTimezone}</strong> ({syncDays.length} days/week)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
