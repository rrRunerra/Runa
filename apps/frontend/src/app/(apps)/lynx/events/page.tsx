"use client";

import { ChevronRight, Activity } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRRSidebar } from "@/hooks/useRRSidebar";
import { useTranslation } from "react-i18next";

export default function EventsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { getItem } = useRRSidebar();
  const eventsItem = getItem("Structures", "Events");

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 350, damping: 26 },
    },
  } as const;

  return (
    <div className="container mx-auto p-6 md:p-8 flex flex-col gap-6 md:gap-8 select-none">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Activity className="size-8 text-primary" />
          {t("botEvents")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("botEventsDesc")}
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {eventsItem?.children && eventsItem.children.length > 0 ? (
          eventsItem.children.map((category, idx) => (
            <Link
              key={idx}
              href={category.href || "#"}
              className="block h-full"
            >
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="h-full relative overflow-hidden rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-border/60 hover:bg-accent/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate transform-[translate3d(0,0,0)]"
              >
                {/* Accent glow on hover */}
                <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl border border-border bg-muted/50 text-primary flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                        {eventsItem?.icon || <Activity className="size-5" />}
                      </div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {category.label}
                      </h3>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                    {category.subtitle || t("monitorEventSettings")}
                  </p>
                </div>
              </motion.div>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-16 italic border-2 border-dashed border-border/40 rounded-2xl bg-muted/10">
            {t("noEvents")}
          </div>
        )}
      </motion.div>
    </div>
  );
}
