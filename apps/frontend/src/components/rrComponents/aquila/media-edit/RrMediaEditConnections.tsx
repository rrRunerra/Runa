"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  const [expandedConnections, setExpandedConnections] = useState<
    Record<string, boolean>
  >({});

  const toggleConnectionExpand = (provider: string): void => {
    setExpandedConnections((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const getStatusOptions = (): { value: string; label: string }[] => {
    switch (mediaType) {
      case "anime":
        return [
          { value: "WATCHING", label: "Watching" },
          { value: "PLANNING", label: "Plan to Watch" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "manga":
        return [
          { value: "READING", label: "Reading" },
          { value: "PLANNING", label: "Plan to Read" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "tv":
        return [
          { value: "WATCHING", label: "Watching" },
          { value: "PLANNING", label: "Plan to Watch" },
          { value: "COMPLETED", label: "Completed" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "movie":
        return [
          { value: "PLANNING", label: "Plan to Watch" },
          { value: "COMPLETED", label: "Completed" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "game":
        return [
          { value: "PLAYING", label: "Playing" },
          { value: "PLANNING", label: "Plan to Play" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "book":
        return [
          { value: "READING", label: "Reading" },
          { value: "PLANNING", label: "Plan to Read" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "DROPPED", label: "Dropped" },
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

  const handleVolumesOverrideChange = (provider: string, val: string): void => {
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

  const renderConnectionCard = (
    provider: string,
    label: string,
  ): React.JSX.Element => {
    const conn = connections[provider];
    const isLinked = !!conn;
    const linkedId = conn ? (typeof conn === "object" ? conn.id : conn) : "";
    const isExpanded = !!expandedConnections[provider];

    if (!isLinked) {
      return (
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-300 flex items-center justify-center gap-2 rounded-xl bg-muted/10 text-muted-foreground text-xs font-semibold cursor-pointer"
          onClick={() => onOpenSearchModal(provider)}
        >
          <Plus className="size-4" />
          Link {label}
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
      <div className="flex flex-col border border-border/40 rounded-xl overflow-hidden bg-muted/20 w-full transition-all duration-200 text-foreground">
        <div
          className="flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer select-none transition-colors"
          onClick={() => toggleConnectionExpand(provider)}
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[10px] tracking-wide uppercase text-muted-foreground">
              {label}
            </span>
            <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">
              {linkedId}
            </span>
            {isExpanded ? (
              <ChevronUp className="size-3.5 text-muted-foreground/60" />
            ) : (
              <ChevronDown className="size-3.5 text-muted-foreground/60" />
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
            <X className="size-4" />
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="border-t border-border/40 bg-muted/10 overflow-hidden"
            >
              <div className="p-4 flex flex-col gap-4">
                {/* Status Override */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${provider}-override-status`}
                      checked={hasStatusOverride}
                      onCheckedChange={() => toggleStatusOverride(provider)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor={`${provider}-override-status`}
                      className="text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                    >
                      Override status
                    </Label>
                  </div>
                  {hasStatusOverride ? (
                    <Select
                      value={connStatus || listStatus}
                      onValueChange={(val) =>
                        handleStatusOverrideChange(provider, val)
                      }
                    >
                      <SelectTrigger className="w-full bg-background border border-border text-foreground h-9 mt-1 px-3 text-xs font-normal hover:bg-muted/50 focus:ring-1 focus:ring-primary/30 rounded-xl transition-all">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border rounded-xl text-foreground">
                        {getStatusOptions().map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 pl-6 italic">
                      Inherited: {listStatus}
                    </span>
                  )}
                </div>

                {/* Progress Override (For Anime/Manga) */}
                {(mediaType === "anime" || mediaType === "manga") && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${provider}-override-progress`}
                        checked={hasProgressOverride}
                        onCheckedChange={() => toggleProgressOverride(provider)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`${provider}-override-progress`}
                        className="text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                      >
                        Override {mediaType === "anime" ? "episode" : "chapter"}{" "}
                        progress
                      </Label>
                    </div>
                    {hasProgressOverride ? (
                      <div className="flex bg-background border border-border rounded-xl overflow-hidden focus-within:border-primary/50 transition-all h-9 mt-1">
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
                          className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 pl-6 italic">
                        Inherited: {progress || "0"}
                      </span>
                    )}
                  </div>
                )}

                {/* Volumes Override (For Manga) */}
                {mediaType === "manga" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${provider}-override-volumes`}
                        checked={hasVolumesOverride}
                        onCheckedChange={() => toggleVolumesOverride(provider)}
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`${provider}-override-volumes`}
                        className="text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                      >
                        Override volume progress
                      </Label>
                    </div>
                    {hasVolumesOverride ? (
                      <div className="flex bg-background border border-border rounded-xl overflow-hidden focus-within:border-primary/50 transition-all h-9 mt-1">
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
                          className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs"
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 pl-6 italic">
                        Inherited: {volumes || "0"}
                      </span>
                    )}
                  </div>
                )}

                {/* Dates Override */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${provider}-override-dates`}
                      checked={hasDatesOverride}
                      onCheckedChange={() => toggleDatesOverride(provider)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label
                      htmlFor={`${provider}-override-dates`}
                      className="text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                    >
                      Override dates
                    </Label>
                  </div>
                  {hasDatesOverride ? (
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Start Date
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-background border border-border text-foreground h-9 hover:bg-muted/50 text-xs rounded-xl transition-all",
                                !connStartDate && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-1 size-3.5 text-muted-foreground/60" />
                              {connStartDate ? (
                                format(connStartDate, "yyyy-MM-dd")
                              ) : (
                                <span>Pick date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-auto p-0 bg-popover border border-border rounded-xl z-60"
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
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Finish Date
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-background border border-border text-foreground h-9 hover:bg-muted/50 text-xs rounded-xl transition-all",
                                !connEndDate && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-1 size-3.5 text-muted-foreground/60" />
                              {connEndDate ? (
                                format(connEndDate, "yyyy-MM-dd")
                              ) : (
                                <span>Pick date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-auto p-0 bg-popover border border-border rounded-xl z-60"
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
                    <span className="text-[10px] text-muted-foreground/60 pl-6 italic">
                      Inherited:{" "}
                      {startDate
                        ? format(startDate, "yyyy-MM-dd")
                        : "No Start Date"}{" "}
                      -{" "}
                      {finishDate
                        ? format(finishDate, "yyyy-MM-dd")
                        : "No Finish Date"}
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
    <div className="col-span-6 flex flex-col gap-2 mt-2">
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
          className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
        >
          Update list from connection
        </Label>
      </div>

      {updateConnection && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1 w-full">
          {CONNECTION_PROVIDERS.length > 0 ? (
            CONNECTION_PROVIDERS.map((prov) => (
              <div key={prov.key} className="w-full">
                {renderConnectionCard(prov.key, prov.name)}
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-4 text-xs text-muted-foreground bg-muted/10 border border-dashed border-border rounded-xl">
              No active connections found. Please connect your accounts in
              settings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
