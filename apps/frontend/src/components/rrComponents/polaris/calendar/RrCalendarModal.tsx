"use client";

import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RrCalendarContainer } from "./RrCalendarContainer";
import { Calendar as CalendarIcon } from "lucide-react";

interface RrCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RrCalendarModal({ open, onOpenChange }: RrCalendarModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] sm:w-[95vw] w-[95vw] max-w-[95vw] h-[92vh] p-0 rounded-2xl border-border bg-background overflow-hidden flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("polaris.calendar.modalTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 w-full h-full p-2 bg-background">
          <RrCalendarContainer className="h-full border-none shadow-none" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
