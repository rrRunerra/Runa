"use client";

import { useEffect } from "react";
import { RrCalendarContainer } from "@/components/rrComponents/polaris/calendar/RrCalendarContainer";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function PolarisCalendarPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = "Polaris > Calendar";
  }, []);

  return (
    <div className="dark w-full min-h-screen bg-black text-foreground flex flex-col p-4 md:p-6 space-y-4">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between bg-card/60 backdrop-blur-md border border-border rounded-2xl px-5 py-3">
        <div className="flex items-center gap-3">
          <Link href="/polaris">
            <Button variant="ghost" size="icon" className="size-9 rounded-xl text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              {t("polaris.calendar.pageTitle")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("polaris.calendar.pageSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Main Full-Screen Calendar Container */}
      <div className="flex-1 w-full h-[calc(100vh-120px)]">
        <RrCalendarContainer className="h-full border-border/80 shadow-2xl" />
      </div>
    </div>
  );
}
