"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Radio,
  Plus,
  RotateCw,
  Trash2,
  Copy,
  Check,
  Globe,
  ExternalLink,
} from "lucide-react";
import type { CalendarSource } from "@/hooks/usePolarisCalendar";

interface RrCalendarSourcesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: CalendarSource[];
  exportToken: string | null;
  onCreateSource: (payload: { name: string; type: string; url?: string; color?: string }) => Promise<void>;
  onUpdateSource: (id: string, payload: Partial<CalendarSource>) => Promise<void>;
  onSyncSource: (id: string) => Promise<void>;
  onDeleteSource: (id: string) => Promise<void>;
  onRegenerateExportToken: () => Promise<string>;
}

export function RrCalendarSourcesModal({
  open,
  onOpenChange,
  sources,
  exportToken,
  onCreateSource,
  onUpdateSource,
  onSyncSource,
  onDeleteSource,
  onRegenerateExportToken,
}: RrCalendarSourcesModalProps) {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"list" | "add" | "export">("list");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [selectedPresetType, setSelectedPresetType] = useState<string>("ICAL_FEED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [copiedExportUrl, setCopiedExportUrl] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const presets = [
    {
      type: "GOOGLE",
      name: "Google",
      icon: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
      color: "#4285f4",
      desc: t("polaris.calendar.presetGoogleDesc"),
    },
    {
      type: "APPLE",
      name: "Apple",
      icon: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
      color: "#0070c9",
      desc: t("polaris.calendar.presetAppleDesc"),
    },
    {
      type: "XIAOMI",
      name: "Xiaomi",
      icon: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg",
      color: "#ff6900",
      desc: t("polaris.calendar.presetXiaomiDesc"),
    },
    {
      type: "ICAL_FEED",
      name: "Custom .ics Feed",
      icon: "https://cdn-icons-png.flaticon.com/512/2693/2693507.png",
      color: "#a855f7",
      desc: t("polaris.calendar.presetICalDesc"),
    },
  ];

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSelectedPresetType(preset.type);
    setName(preset.name);
    setColor(preset.color);
    setActiveTab("add");
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setErrorMsg(t("polaris.calendar.sourceFieldsRequired"));
      return;
    }
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await onCreateSource({
        name,
        type: selectedPresetType,
        url,
        color,
      });
      setName("");
      setUrl("");
      setActiveTab("list");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add source");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      await onSyncSource(id);
    } catch (err: any) {
      setErrorMsg(err.message || "Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const exportUrl = exportToken
    ? `${backendUrl}/polaris/calendar/export/${exportToken}.ics`
    : "";

  const handleCopyExportUrl = async () => {
    if (!exportUrl) return;
    await navigator.clipboard.writeText(exportUrl);
    setCopiedExportUrl(true);
    setTimeout(() => setCopiedExportUrl(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-2xl border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Radio className="size-5 text-primary" />
            {t("polaris.calendar.manageSourcesTitle")}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex border-b border-border gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("list")}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === "list"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("polaris.calendar.tabActiveFeeds")} ({sources.length})
          </button>

          <button
            onClick={() => setActiveTab("add")}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === "add"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            + {t("polaris.calendar.tabAddFeed")}
          </button>

          <button
            onClick={() => setActiveTab("export")}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === "export"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("polaris.calendar.tabExportFeed")}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/20 text-destructive text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Active Feeds List */}
        {activeTab === "list" && (
          <div className="space-y-4 py-2">
            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.type}
                  onClick={() => handleSelectPreset(preset)}
                  className="p-3 rounded-xl border border-border bg-background/50 hover:bg-accent/40 text-left transition-all duration-200 flex flex-col gap-1 group"
                >
                  <div className="flex items-center gap-2">
                    <img src={preset.icon} alt={preset.name} className="size-4 object-contain" />
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {preset.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.desc}</span>
                </button>
              ))}
            </div>

            {/* Configured Sources List */}
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pt-2">
              {sources.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  {t("polaris.calendar.noSourcesConfigured")}
                </div>
              ) : (
                sources.map((source) => (
                  <div
                    key={source.id}
                    className="p-3 rounded-xl border border-border bg-background flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="size-3 rounded-full shrink-0"
                        style={{ backgroundColor: source.color || "#3b82f6" }}
                      />
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-foreground truncate">{source.name}</h5>
                        <p className="text-[10px] text-muted-foreground truncate">{source.url || source.type}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={source.enabled}
                        onCheckedChange={(enabled) => onUpdateSource(source.id, { enabled })}
                      />
                      {source.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSync(source.id)}
                          disabled={syncingId === source.id}
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                          <RotateCw
                            className={`size-3.5 ${syncingId === source.id ? "animate-spin text-primary" : ""}`}
                          />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteSource(source.id)}
                        className="size-7 rounded-lg text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Add Custom iCal Feed Form */}
        {activeTab === "add" && (
          <form onSubmit={handleAddSource} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="source-name" className="text-xs font-medium">
                {t("polaris.calendar.feedName")}
              </Label>
              <Input
                id="source-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Work Google Calendar"
                className="rounded-xl border-border text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source-url" className="text-xs font-medium">
                {t("polaris.calendar.iCalFeedUrl")}
              </Label>
              <Input
                id="source-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                className="rounded-xl border-border text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source-color" className="text-xs font-medium">
                {t("polaris.calendar.feedColor")}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="source-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-10 rounded-xl p-1 border-border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-mono">{color}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("list")}
                className="rounded-xl border-border text-xs"
              >
                {t("polaris.calendar.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
              >
                {isSubmitting ? t("polaris.calendar.adding") : t("polaris.calendar.addFeed")}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 3: Export iCal Feed URL */}
        {activeTab === "export" && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              {t("polaris.calendar.exportDescription")}
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("polaris.calendar.exportFeedUrl")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={exportUrl}
                  readOnly
                  className="rounded-xl border-border text-xs font-mono select-all"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyExportUrl}
                  className="rounded-xl gap-1.5 text-xs shrink-0"
                >
                  {copiedExportUrl ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  {copiedExportUrl ? t("polaris.calendar.copied") : t("polaris.calendar.copyUrl")}
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRegenerateExportToken}
              className="rounded-xl text-xs border-border"
            >
              {t("polaris.calendar.regenerateExportToken")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
