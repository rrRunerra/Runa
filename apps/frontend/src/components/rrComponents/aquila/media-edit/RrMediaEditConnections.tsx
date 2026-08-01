"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
  Link2,
  Search,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConnectionProvider {
  key: string;
  name: string;
}

interface RrMediaEditConnectionsProps {
  mediaType: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  updateConnection: boolean;
  onUpdateConnectionChange: (checked: boolean) => void;
  connections: Record<string, any>;
  onConnectionsChange: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  userConnections: string[];
  connectionProviders: ConnectionProvider[];
  onOpenSearchModal: (provider: string) => void;
  listStatus: string;
  progress: string;
  volumes: string;
  startDate: Date | undefined;
  finishDate: Date | undefined;
}

export function RrMediaEditConnections({
  mediaType,
  updateConnection,
  onUpdateConnectionChange,
  connections,
  onConnectionsChange,
  userConnections,
  connectionProviders,
  onOpenSearchModal,
  listStatus,
  progress,
  volumes,
  startDate,
  finishDate,
}: RrMediaEditConnectionsProps): React.JSX.Element {
  const { t } = useTranslation();
  const [expandedConnections, setExpandedConnections] = useState<
    Record<string, boolean>
  >({});

  const toggleConnectionExpand = (provider: string): void => {
    setExpandedConnections((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const getListNameTranslation = (name: string) => {
    switch (name.toUpperCase()) {
      case "WATCHING":
        return t("aquila.watching");
      case "READING":
        return t("aquila.reading");
      case "PLAYING":
        return t("aquila.playing");
      case "PLANNING":
      case "PLAN TO WATCH":
        return t("aquila.planToWatch");
      case "PLAN TO READ":
        return t("aquila.planToRead");
      case "PLAN TO PLAY":
        return t("aquila.planToPlay");
      case "ON_HOLD":
      case "ON HOLD":
        return t("aquila.onHold");
      case "COMPLETED":
        return t("aquila.completed");
      case "DROPPED":
        return t("aquila.dropped");
      default:
        return name;
    }
  };

  const getStatusOptions = (): { value: string; label: string }[] => {
    switch (mediaType) {
      case "anime":
        return [
          { value: "WATCHING", label: t("aquila.watching") },
          { value: "ON_HOLD", label: t("aquila.onHold") },
          { value: "COMPLETED", label: t("aquila.completed") },
          { value: "DROPPED", label: t("aquila.dropped") },
          { value: "PLANNING", label: t("aquila.planToWatch") },
        ];
      case "manga":
        return [
          { value: "READING", label: t("aquila.reading") },
          { value: "ON_HOLD", label: t("aquila.onHold") },
          { value: "COMPLETED", label: t("aquila.completed") },
          { value: "DROPPED", label: t("aquila.dropped") },
          { value: "PLANNING", label: t("aquila.planToRead") },
        ];
      case "tv":
        return [
          { value: "WATCHING", label: t("aquila.watching") },
          { value: "ON_HOLD", label: t("aquila.onHold") },
          { value: "COMPLETED", label: t("aquila.completed") },
          { value: "DROPPED", label: t("aquila.dropped") },
          { value: "PLANNING", label: t("aquila.planToWatch") },
        ];
      case "movie":
        return [
          { value: "COMPLETED", label: t("aquila.completed") },
          { value: "DROPPED", label: t("aquila.dropped") },
          { value: "PLANNING", label: t("aquila.planToWatch") },
        ];
      case "game":
        return [
          { value: "PLAYING", label: t("aquila.playing") },
          { value: "ON_HOLD", label: t("aquila.onHold") },
          { value: "COMPLETED", label: t("aquila.completed") },
          { value: "DROPPED", label: t("aquila.dropped") },
          { value: "PLANNING", label: t("aquila.planToPlay") },
        ];
      case "book":
        return [
          { value: "READING", label: t("aquila.reading") },
          { value: "ON_HOLD", label: t("aquila.onHold") },
          { value: "COMPLETED", label: t("aquila.completed") },
          { value: "DROPPED", label: t("aquila.dropped") },
          { value: "PLANNING", label: t("aquila.planToRead") },
        ];
      default:
        return [];
    }
  };

  const toggleStatusOverride = (provider: string): void => {
    onConnectionsChange((prev) => {
      const current = prev[provider];
      const id = typeof current === "object" ? current.id : current;
      const currentDetails = typeof current === "object" ? current : {};
      const nextDetails = { ...currentDetails, id };
      if (typeof current === "object" && current.status !== undefined) {
        delete (nextDetails as any).status;
      } else {
        (nextDetails as any).status = listStatus;
      }
      return { ...prev, [provider]: nextDetails };
    });
  };

  const toggleProgressOverride = (provider: string): void => {
    onConnectionsChange((prev) => {
      const current = prev[provider];
      const id = typeof current === "object" ? current.id : current;
      const currentDetails = typeof current === "object" ? current : {};
      const nextDetails = { ...currentDetails, id };
      if (
        typeof current === "object" &&
        (current.progress !== undefined || current.chapters !== undefined)
      ) {
        delete (nextDetails as any).progress;
        delete (nextDetails as any).chapters;
      } else {
        (nextDetails as any).progress = progress || "0";
      }
      return { ...prev, [provider]: nextDetails };
    });
  };

  const toggleVolumesOverride = (provider: string): void => {
    onConnectionsChange((prev) => {
      const current = prev[provider];
      const id = typeof current === "object" ? current.id : current;
      const currentDetails = typeof current === "object" ? current : {};
      const nextDetails = { ...currentDetails, id };
      if (typeof current === "object" && current.volumes !== undefined) {
        delete (nextDetails as any).volumes;
      } else {
        (nextDetails as any).volumes = volumes || "0";
      }
      return { ...prev, [provider]: nextDetails };
    });
  };

  const toggleDatesOverride = (provider: string): void => {
    onConnectionsChange((prev) => {
      const current = prev[provider];
      const id = typeof current === "object" ? current.id : current;
      const currentDetails = typeof current === "object" ? current : {};
      const nextDetails = { ...currentDetails, id };
      if (
        typeof current === "object" &&
        (current.startDate !== undefined || current.endDate !== undefined)
      ) {
        delete (nextDetails as any).startDate;
        delete (nextDetails as any).endDate;
      } else {
        (nextDetails as any).startDate = startDate;
        (nextDetails as any).endDate = finishDate;
      }
      return { ...prev, [provider]: nextDetails };
    });
  };

  const handleStatusOverrideChange = (provider: string, val: string): void => {
    onConnectionsChange((prev) => {
      const current = prev[provider];
      const id = typeof current === "object" ? current.id : current;
      const currentDetails = typeof current === "object" ? current : {};
      return {
        ...prev,
        [provider]: { ...currentDetails, id, status: val },
      };
    });
  };

  const handleProgressOverrideChange = (
    provider: string,
    val: string,
  ): void => {
    onConnectionsChange((prev) => {
      const current = prev[provider];
      const id = typeof current === "object" ? current.id : current;
      const currentDetails = typeof current === "object" ? current : {};
      return {
        ...prev,
        [provider]: { ...currentDetails, id, progress: val },
      };
    });
  };

  const handleVolumesOverrideChange = (
    provider: string,
    val: string,
  ): void => {
    onConnectionsChange((prev) => {
      const current = prev[provider];
      const id = typeof current === "object" ? current.id : current;
      const currentDetails = typeof current === "object" ? current : {};
      return {
        ...prev,
        [provider]: { ...currentDetails, id, volumes: val },
      };
    });
  };

  const handleDateOverrideChange = (
    provider: string,
    field: "startDate" | "endDate",
    val: Date | undefined,
  ): void => {
    onConnectionsChange((prev) => {
      const current = prev[provider];
      const id = typeof current === "object" ? current.id : current;
      const currentDetails = typeof current === "object" ? current : {};
      return {
        ...prev,
        [provider]: { ...currentDetails, id, [field]: val },
      };
    });
  };

  const renderConnectionCard = (provider: string, label: string) => {
    const conn = connections[provider];
    const linkedId = typeof conn === "object" ? conn?.id : conn;
    const isLinked = !!linkedId;
    const isExpanded = expandedConnections[provider];

    if (!isLinked) {
      return (
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenSearchModal(provider)}
          className="w-full justify-between bg-background/70 border border-dashed border-border/70 hover:border-primary/50 text-foreground h-11 px-3.5 rounded-xl transition-all hover:bg-primary/5 text-xs font-semibold group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5 text-primary/70 group-hover:scale-110 transition-transform" />
            <span className="uppercase text-[11px] font-bold tracking-wider">{label}</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Plus className="size-3" />
            {t("aquila.connect")}
          </span>
        </Button>
      );
    }

    const connDetails = typeof conn === "object" ? conn : {};
    const connStatus = connDetails.status;
    const connProgress = connDetails.progress;
    const connVolumes = connDetails.volumes;
    const connStartDate = connDetails.startDate;
    const connEndDate = connDetails.endDate;

    const hasStatusOverride = connDetails.status !== undefined;
    const hasProgressOverride = connDetails.progress !== undefined;
    const hasVolumesOverride = connDetails.volumes !== undefined;
    const hasDatesOverride =
      connDetails.startDate !== undefined || connDetails.endDate !== undefined;

    return (
      <div className="flex flex-col border border-border/60 rounded-xl overflow-hidden bg-background/80 w-full transition-all duration-200 text-foreground shadow-2xs">
        <div
          className="flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer select-none transition-colors"
          onClick={() => toggleConnectionExpand(provider)}
        >
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-[10px] tracking-wider uppercase text-foreground">
              {label}
            </span>
            <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-md">
              #{linkedId}
            </span>
            {isExpanded ? (
              <ChevronUp className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onConnectionsChange((prev) => {
                const copy = { ...prev };
                delete copy[provider];
                return copy;
              });
            }}
          >
            <X className="size-3.5" />
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="border-t border-border/50 bg-muted/15 overflow-hidden"
            >
              <div className="p-3.5 flex flex-col gap-3">
                {/* Status Override */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${provider}-override-status`}
                      checked={hasStatusOverride}
                      onCheckedChange={() => toggleStatusOverride(provider)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor={`${provider}-override-status`}
                      className="text-xs font-semibold text-foreground cursor-pointer select-none"
                    >
                      {t("aquila.overrideStatus")}
                    </Label>
                  </div>
                  {hasStatusOverride ? (
                    <Select
                      value={connStatus || listStatus}
                      onValueChange={(val) =>
                        handleStatusOverrideChange(provider, val)
                      }
                    >
                      <SelectTrigger className="w-full bg-background border border-border/70 text-foreground h-9 mt-0.5 px-3 text-xs font-normal hover:bg-muted/50 focus:ring-1 focus:ring-primary/30 rounded-xl transition-all">
                        <SelectValue placeholder={t("aquila.selectStatus")} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border/70 rounded-xl text-foreground">
                        {getStatusOptions().map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/70 pl-6 italic">
                      {t("aquila.inheritedStatus", { status: getListNameTranslation(listStatus) })}
                    </span>
                  )}
                </div>

                {/* Progress Override (For Anime/Manga) */}
                {(mediaType === "anime" || mediaType === "manga") && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${provider}-override-progress`}
                        checked={hasProgressOverride}
                        onCheckedChange={() => toggleProgressOverride(provider)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`${provider}-override-progress`}
                        className="text-xs font-semibold text-foreground cursor-pointer select-none"
                      >
                        {t("aquila.overrideProgress", { type: mediaType === "anime" ? t("aquila.episodeShort") : t("aquila.chapterShort") })}
                      </Label>
                    </div>
                    {hasProgressOverride ? (
                      <div className="flex bg-background border border-border/70 rounded-xl overflow-hidden focus-within:border-primary/50 transition-all h-9 mt-0.5">
                        <Input
                          type="number"
                          min="0"
                          value={connProgress !== undefined ? connProgress : ""}
                          onChange={(e) =>
                            handleProgressOverrideChange(
                              provider,
                              e.target.value,
                            )
                          }
                          className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs font-medium"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/70 pl-6 italic">
                        {t("aquila.inheritedProgress", { progress: progress || "0" })}
                      </span>
                    )}
                  </div>
                )}

                {/* Volumes Override (For Manga) */}
                {mediaType === "manga" && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${provider}-override-volumes`}
                        checked={hasVolumesOverride}
                        onCheckedChange={() => toggleVolumesOverride(provider)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`${provider}-override-volumes`}
                        className="text-xs font-semibold text-foreground cursor-pointer select-none"
                      >
                        {t("aquila.overrideVolume")}
                      </Label>
                    </div>
                    {hasVolumesOverride ? (
                      <div className="flex bg-background border border-border/70 rounded-xl overflow-hidden focus-within:border-primary/50 transition-all h-9 mt-0.5">
                        <Input
                          type="number"
                          min="0"
                          value={connVolumes !== undefined ? connVolumes : ""}
                          onChange={(e) =>
                            handleVolumesOverrideChange(
                              provider,
                              e.target.value,
                            )
                          }
                          className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs font-medium"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/70 pl-6 italic">
                        {t("aquila.inheritedVolume", { volume: volumes || "0" })}
                      </span>
                    )}
                  </div>
                )}

                {/* Dates Override */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${provider}-override-dates`}
                      checked={hasDatesOverride}
                      onCheckedChange={() => toggleDatesOverride(provider)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor={`${provider}-override-dates`}
                      className="text-xs font-semibold text-foreground cursor-pointer select-none"
                    >
                      {t("aquila.overrideDates")}
                    </Label>
                  </div>
                  {hasDatesOverride ? (
                    <div className="grid grid-cols-2 gap-2 mt-0.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("aquila.startDate")}
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-background border border-border/70 text-foreground h-9 hover:bg-muted/50 text-xs rounded-xl transition-all",
                                !connStartDate && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-1 size-3 text-muted-foreground" />
                              {connStartDate ? (
                                format(connStartDate, "yyyy-MM-dd")
                              ) : (
                                <span>{t("aquila.pickDate")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-auto p-0 bg-popover border border-border/70 rounded-xl z-60 shadow-xl"
                          >
                            <Calendar
                              mode="single"
                              selected={connStartDate}
                              onSelect={(date) =>
                                handleDateOverrideChange(
                                  provider,
                                  "startDate",
                                  date,
                                )
                              }
                              className="bg-transparent text-foreground"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("aquila.finishDate")}
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-background border border-border/70 text-foreground h-9 hover:bg-muted/50 text-xs rounded-xl transition-all",
                                !connEndDate && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-1 size-3 text-muted-foreground" />
                              {connEndDate ? (
                                format(connEndDate, "yyyy-MM-dd")
                              ) : (
                                <span>{t("aquila.pickDate")}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-auto p-0 bg-popover border border-border/70 rounded-xl z-60 shadow-xl"
                          >
                            <Calendar
                              mode="single"
                              selected={connEndDate}
                              onSelect={(date) =>
                                handleDateOverrideChange(
                                  provider,
                                  "endDate",
                                  date,
                                )
                              }
                              className="bg-transparent text-foreground"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/70 pl-6 italic">
                      {t("aquila.inheritedDates", {
                        start: startDate ? format(startDate, "yyyy-MM-dd") : t("aquila.noStartDate"),
                        finish: finishDate ? format(finishDate, "yyyy-MM-dd") : t("aquila.noFinishDate")
                      })}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const CONNECTION_PROVIDERS = connectionProviders.filter(
    (prov) => userConnections.includes(prov.key) || !!connections[prov.key]
  );

  return (
    <div className="bg-card/40 border border-border/60 backdrop-blur-xs rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center gap-2">
        <Checkbox
          id="media-update-connection"
          checked={updateConnection}
          onCheckedChange={(checked) =>
            onUpdateConnectionChange(checked as boolean)
          }
          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <Label
          htmlFor="media-update-connection"
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 cursor-pointer select-none"
        >
          <Link2 className="size-3.5 text-primary" />
          {t("aquila.updateListFromConnection")}
        </Label>
      </div>

      {updateConnection && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 w-full">
          {CONNECTION_PROVIDERS.length > 0 ? (
            CONNECTION_PROVIDERS.map((prov) => (
              <div key={prov.key} className="w-full">
                {renderConnectionCard(prov.key, prov.name)}
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-5 text-xs text-muted-foreground bg-background/50 border border-dashed border-border/70 rounded-xl flex items-center justify-center gap-2 font-medium">
              <ExternalLink className="size-3.5 text-muted-foreground/70" />
              {t("aquila.noActiveConnections")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
