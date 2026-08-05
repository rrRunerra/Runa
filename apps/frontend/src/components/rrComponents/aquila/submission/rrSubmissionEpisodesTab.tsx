"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar, Plus, Trash2, Edit3, Clock, Tv, Sparkles, PlayCircle } from "lucide-react";

export interface RrSubmissionEpisodesTabProps {
  mediaType: string;
  formData: Record<string, any>;
  onChange: (field: string, value: any) => void;
  episodesList: any[];
  setEpisodesList: React.Dispatch<React.SetStateAction<any[]>>;
}

export function RrSubmissionEpisodesTab({
  mediaType,
  formData,
  onChange,
  episodesList,
  setEpisodesList,
}: RrSubmissionEpisodesTabProps): React.JSX.Element {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [epFormData, setEpFormData] = useState({
    number: episodesList.length + 1,
    type: "REGULAR",
    titlePrimary: "",
    titleSecondary: "",
    titleNative: "",
    description: "",
    duration: "",
    airDate: "",
    thumbnail: "",
    isFiller: false,
    isRecap: false,
    opStart: "",
    opEnd: "",
    edStart: "",
    edEnd: "",
    recapStart: "",
    recapEnd: "",
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setEpFormData({
      number: episodesList.length + 1,
      type: "REGULAR",
      titlePrimary: "",
      titleSecondary: "",
      titleNative: "",
      description: "",
      duration: "",
      airDate: "",
      thumbnail: "",
      isFiller: false,
      isRecap: false,
      opStart: "",
      opEnd: "",
      edStart: "",
      edEnd: "",
      recapStart: "",
      recapEnd: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = episodesList[index];
    setEditingIndex(index);
    setEpFormData({
      number: item.number ?? item.episodeNumber ?? index + 1,
      type: item.type || item.episodeType || "REGULAR",
      titlePrimary: item.titlePrimary || item.title || "",
      titleSecondary: item.titleSecondary || "",
      titleNative: item.titleNative || "",
      description: item.description || item.overview || "",
      duration: item.duration ? item.duration.toString() : "",
      airDate: item.airDate ? item.airDate.slice(0, 10) : "",
      thumbnail: item.thumbnail || item.image || "",
      isFiller: !!item.isFiller,
      isRecap: !!item.isRecap,
      opStart: item.opStart != null ? item.opStart.toString() : "",
      opEnd: item.opEnd != null ? item.opEnd.toString() : "",
      edStart: item.edStart != null ? item.edStart.toString() : "",
      edEnd: item.edEnd != null ? item.edEnd.toString() : "",
      recapStart: item.recapStart != null ? item.recapStart.toString() : "",
      recapEnd: item.recapEnd != null ? item.recapEnd.toString() : "",
    });
    setIsDialogOpen(true);
  };

  const handleSaveEpisode = () => {
    if (!epFormData.titlePrimary.trim() && !epFormData.number) return;

    const payload = {
      number: Number(epFormData.number) || episodesList.length + 1,
      type: epFormData.type,
      titlePrimary: epFormData.titlePrimary.trim() || `Episode ${epFormData.number}`,
      titleSecondary: epFormData.titleSecondary.trim() || null,
      titleNative: epFormData.titleNative.trim() || null,
      description: epFormData.description.trim() || null,
      duration: epFormData.duration ? Number(epFormData.duration) : null,
      airDate: epFormData.airDate ? epFormData.airDate : null,
      thumbnail: epFormData.thumbnail.trim() || null,
      isFiller: epFormData.isFiller,
      isRecap: epFormData.isRecap,
      opStart: epFormData.opStart !== "" ? Number(epFormData.opStart) : null,
      opEnd: epFormData.opEnd !== "" ? Number(epFormData.opEnd) : null,
      edStart: epFormData.edStart !== "" ? Number(epFormData.edStart) : null,
      edEnd: epFormData.edEnd !== "" ? Number(epFormData.edEnd) : null,
      recapStart: epFormData.recapStart !== "" ? Number(epFormData.recapStart) : null,
      recapEnd: epFormData.recapEnd !== "" ? Number(epFormData.recapEnd) : null,
    };

    if (editingIndex !== null) {
      setEpisodesList((prev) => {
        const next = [...prev];
        next[editingIndex] = payload;
        return next;
      });
    } else {
      setEpisodesList((prev) => [...prev, payload]);
    }

    setIsDialogOpen(false);
  };

  const handleDeleteEpisode = (index: number) => {
    setEpisodesList((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 m-0">
      {/* Airing Schedule Section */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Calendar className="size-4 text-primary" />
          Airing Schedule & Next Airing Episode
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Next Airing Episode #
            </Label>
            <Input
              type="number"
              placeholder="e.g. 12"
              value={formData.nextAiringEpisodeNumber ?? ""}
              onChange={(e) => onChange("nextAiringEpisodeNumber", e.target.value ? Number(e.target.value) : null)}
              className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Next Airing Timestamp (Date & Time)
            </Label>
            <Input
              type="datetime-local"
              value={
                formData.nextAiringAt
                  ? new Date(formData.nextAiringAt).toISOString().slice(0, 16)
                  : ""
              }
              onChange={(e) => onChange("nextAiringAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
              className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Episodes List Section */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Tv className="size-4 text-primary" />
            Episodes ({episodesList.length})
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            Add Episode
          </Button>
        </div>

        {episodesList.length === 0 ? (
          <div className="text-center p-6 border border-dashed border-border/60 rounded-xl text-muted-foreground text-xs font-medium">
            No episodes added yet. Click &quot;Add Episode&quot; above to create episode entries.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {episodesList.map((ep, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-3 bg-background/80 border border-border/60 rounded-xl hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className="text-xs font-bold shrink-0">
                    Ep {ep.number ?? ep.episodeNumber ?? idx + 1}
                  </Badge>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate text-foreground flex items-center gap-2">
                      {ep.titlePrimary || ep.title || `Episode ${idx + 1}`}
                      {ep.isFiller && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 text-amber-500 bg-amber-500/10">
                          Filler
                        </Badge>
                      )}
                      {ep.isRecap && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 text-blue-500 bg-blue-500/10">
                          Recap
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2">
                      {ep.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> {ep.duration}m
                        </span>
                      )}
                      {ep.airDate && <span>• Aired: {ep.airDate.slice(0, 10)}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(idx)}
                    className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted"
                  >
                    <Edit3 className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEpisode(idx)}
                    className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Episode Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl bg-background border border-border/80 rounded-2xl shadow-2xl p-6 text-foreground [&>button]:text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              {editingIndex !== null ? "Edit Episode Metadata" : "Add Episode"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide titles, runtime, air date, thumbnail URL, and automated skip timestamps.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Episode Number *</Label>
                <Input
                  type="number"
                  value={epFormData.number}
                  onChange={(e) => setEpFormData((p) => ({ ...p, number: Number(e.target.value) }))}
                  className="bg-background/80 border-border/70 rounded-xl h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Type</Label>
                <Select
                  value={epFormData.type}
                  onValueChange={(v) => setEpFormData((p) => ({ ...p, type: v }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background/80 border-border/70 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/70 rounded-xl">
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="SPECIAL">Special</SelectItem>
                    <SelectItem value="OVA">OVA</SelectItem>
                    <SelectItem value="ONA">ONA</SelectItem>
                    <SelectItem value="MOVIE">Movie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Primary Title (English) *</Label>
              <Input
                placeholder="Episode title..."
                value={epFormData.titlePrimary}
                onChange={(e) => setEpFormData((p) => ({ ...p, titlePrimary: e.target.value }))}
                className="bg-background/80 border-border/70 rounded-xl h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Title (Romaji / Secondary)</Label>
                <Input
                  placeholder="Secondary title..."
                  value={epFormData.titleSecondary}
                  onChange={(e) => setEpFormData((p) => ({ ...p, titleSecondary: e.target.value }))}
                  className="bg-background/80 border-border/70 rounded-xl h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Title (Native)</Label>
                <Input
                  placeholder="Native title..."
                  value={epFormData.titleNative}
                  onChange={(e) => setEpFormData((p) => ({ ...p, titleNative: e.target.value }))}
                  className="bg-background/80 border-border/70 rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description / Synopsis</Label>
              <Textarea
                rows={3}
                placeholder="Episode summary..."
                value={epFormData.description}
                onChange={(e) => setEpFormData((p) => ({ ...p, description: e.target.value }))}
                className="bg-background/80 border-border/70 rounded-xl text-xs resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Duration (minutes)</Label>
                <Input
                  type="number"
                  placeholder="24"
                  value={epFormData.duration}
                  onChange={(e) => setEpFormData((p) => ({ ...p, duration: e.target.value }))}
                  className="bg-background/80 border-border/70 rounded-xl h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Air Date</Label>
                <Input
                  type="date"
                  value={epFormData.airDate}
                  onChange={(e) => setEpFormData((p) => ({ ...p, airDate: e.target.value }))}
                  className="bg-background/80 border-border/70 rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Thumbnail Image URL</Label>
              <Input
                placeholder="https://..."
                value={epFormData.thumbnail}
                onChange={(e) => setEpFormData((p) => ({ ...p, thumbnail: e.target.value }))}
                className="bg-background/80 border-border/70 rounded-xl h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input
                  type="checkbox"
                  checked={epFormData.isFiller}
                  onChange={(e) => setEpFormData((p) => ({ ...p, isFiller: e.target.checked }))}
                  className="rounded border-border"
                />
                Is Filler
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input
                  type="checkbox"
                  checked={epFormData.isRecap}
                  onChange={(e) => setEpFormData((p) => ({ ...p, isRecap: e.target.checked }))}
                  className="rounded border-border"
                />
                Is Recap
              </label>
            </div>

            {/* Skip Timestamps Section */}
            <div className="border-t border-border/50 pt-3 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <PlayCircle className="size-3.5 text-primary" /> Skip Timestamps (seconds)
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">OP Start (s)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 90"
                    value={epFormData.opStart}
                    onChange={(e) => setEpFormData((p) => ({ ...p, opStart: e.target.value }))}
                    className="h-8 text-xs bg-background/80 border-border/70 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">OP End (s)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 180"
                    value={epFormData.opEnd}
                    onChange={(e) => setEpFormData((p) => ({ ...p, opEnd: e.target.value }))}
                    className="h-8 text-xs bg-background/80 border-border/70 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">ED Start (s)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1320"
                    value={epFormData.edStart}
                    onChange={(e) => setEpFormData((p) => ({ ...p, edStart: e.target.value }))}
                    className="h-8 text-xs bg-background/80 border-border/70 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">ED End (s)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1410"
                    value={epFormData.edEnd}
                    onChange={(e) => setEpFormData((p) => ({ ...p, edEnd: e.target.value }))}
                    className="h-8 text-xs bg-background/80 border-border/70 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Recap Start (s)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 0"
                    value={epFormData.recapStart}
                    onChange={(e) => setEpFormData((p) => ({ ...p, recapStart: e.target.value }))}
                    className="h-8 text-xs bg-background/80 border-border/70 rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Recap End (s)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 60"
                    value={epFormData.recapEnd}
                    onChange={(e) => setEpFormData((p) => ({ ...p, recapEnd: e.target.value }))}
                    className="h-8 text-xs bg-background/80 border-border/70 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="h-9 px-4 rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEpisode}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {editingIndex !== null ? "Save Changes" : "Add Episode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
