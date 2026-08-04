"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Trash2, Bell, MapPin, Link as LinkIcon } from "lucide-react";
import type { CalendarEvent, CalendarSource } from "@/hooks/usePolarisCalendar";

interface RrCalendarEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  selectedDate?: Date | null;
  sources: CalendarSource[];
  onSave: (payload: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function RrCalendarEventModal({
  open,
  onOpenChange,
  event,
  selectedDate,
  sources,
  onSave,
  onDelete,
}: RrCalendarEventModalProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("#3b82f6");
  const [url, setUrl] = useState("");
  const [sourceId, setSourceId] = useState<string>("NATIVE");
  const [reminderMinutes, setReminderMinutes] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isEditing = !!event;

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setLocation(event.location || "");
      setStart(event.start ? toLocalDatetimeString(new Date(event.start)) : "");
      setEnd(event.end ? toLocalDatetimeString(new Date(event.end)) : "");
      setAllDay(event.allDay || false);
      setColor(event.color || "#3b82f6");
      setUrl(event.url || "");
      setSourceId(event.sourceId || "NATIVE");
      setReminderMinutes(event.reminderMinutes ? String(event.reminderMinutes) : "0");
    } else {
      const baseDate = selectedDate || new Date();
      const defaultStart = new Date(baseDate);
      const defaultEnd = new Date(baseDate.getTime() + 60 * 60 * 1000);

      setTitle("");
      setDescription("");
      setLocation("");
      setStart(toLocalDatetimeString(defaultStart));
      setEnd(toLocalDatetimeString(defaultEnd));
      setAllDay(false);
      setColor("#3b82f6");
      setUrl("");
      setSourceId("NATIVE");
      setReminderMinutes("0");
    }
    setErrorMsg("");
  }, [event, selectedDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg(t("polaris.calendar.titleRequired"));
      return;
    }
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      await onSave({
        id: event?.id,
        title,
        description: description || undefined,
        location: location || undefined,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        allDay,
        color,
        url: url || undefined,
        sourceId: sourceId === "NATIVE" ? undefined : sourceId,
        reminderMinutes: reminderMinutes === "0" ? undefined : Number(reminderMinutes),
      });
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    setIsSubmitting(true);
    try {
      await onDelete(event.id);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="size-5 text-primary" />
            {isEditing ? t("polaris.calendar.editEvent") : t("polaris.calendar.newEvent")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/20 text-destructive text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="event-title" className="text-xs font-medium">
              {t("polaris.calendar.eventTitle")}
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("polaris.calendar.eventTitlePlaceholder")}
              className="rounded-xl border-border"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs font-medium">
                {t("polaris.calendar.startDate")}
              </Label>
              <Input
                id="start-date"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="rounded-xl border-border text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="text-xs font-medium">
                {t("polaris.calendar.endDate")}
              </Label>
              <Input
                id="end-date"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="rounded-xl border-border text-xs"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="all-day"
              checked={allDay}
              onCheckedChange={(c) => setAllDay(!!c)}
            />
            <Label htmlFor="all-day" className="text-xs font-medium cursor-pointer">
              {t("polaris.calendar.allDay")}
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-location" className="text-xs font-medium flex items-center gap-1">
                <MapPin className="size-3.5 text-primary" />
                {t("polaris.calendar.location")}
              </Label>
              <Input
                id="event-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("polaris.calendar.locationPlaceholder")}
                className="rounded-xl border-border text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-reminder" className="text-xs font-medium flex items-center gap-1">
                <Bell className="size-3.5 text-primary" />
                {t("polaris.calendar.reminder")}
              </Label>
              <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                <SelectTrigger className="rounded-xl border-border text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-popover">
                  <SelectItem value="0">{t("polaris.calendar.noReminder")}</SelectItem>
                  <SelectItem value="15">{t("polaris.calendar.remind15m")}</SelectItem>
                  <SelectItem value="30">{t("polaris.calendar.remind30m")}</SelectItem>
                  <SelectItem value="60">{t("polaris.calendar.remind1h")}</SelectItem>
                  <SelectItem value="1440">{t("polaris.calendar.remind1d")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-description" className="text-xs font-medium">
              {t("polaris.calendar.description")}
            </Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("polaris.calendar.descriptionPlaceholder")}
              className="rounded-xl border-border text-xs resize-none h-20"
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            {isEditing && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="rounded-xl gap-1.5 text-xs"
              >
                <Trash2 className="size-3.5" />
                {t("polaris.calendar.delete")}
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
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
                {isSubmitting ? t("polaris.calendar.saving") : t("polaris.calendar.save")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
