"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AnimeStaffV2Entity } from "@/types/anime.entities";

interface RrMediaStaffProps {
  staff?: AnimeStaffV2Entity[] | null;
  showAllInitial?: boolean;
  limit?: number;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export function RrMediaStaff({
  staff,
  showAllInitial = false,
  limit = 6,
}: RrMediaStaffProps): React.JSX.Element {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState<boolean>(showAllInitial);

  if (!staff || staff.length === 0) {
    return <></>;
  }

  const displayedStaff = showAll ? staff : staff.slice(0, limit);

  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <span>{t("aquila.staff", "Staff & Production")}</span>
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {displayedStaff.map((item) => {
          const person = item.staff;
          if (!person) return null;
          const staffId = item.staffId || person.id;
          const displayName = person.namePrimary || person.nameNative || t("aquila.unknown", "Unknown");

          return (
            <Link
              key={item.id}
              href={`/aquila/staff/${staffId}`}
              className="flex items-center gap-2.5 p-2.5 bg-card/45 border border-border/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-xs hover:border-border/50 hover:bg-accent/10 transition-all duration-300 group/staff cursor-pointer"
            >
              <div className="relative size-10 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/20">
                {person.image ? (
                  <Image
                    src={person.image}
                    alt={displayName}
                    fill
                    sizes="40px"
                    className="object-cover group-hover/staff:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                    ?
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-bold text-foreground group-hover/staff:text-primary transition-colors duration-150 truncate"
                  title={displayName}
                >
                  {displayName}
                </p>
                <p
                  className="text-[10px] text-muted-foreground truncate capitalize mt-0.5"
                  title={item.role}
                >
                  {item.role}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
