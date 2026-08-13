"use client";

import { Home } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export const getAquariusSidebarConfig = (
  t: TranslateFn = (key) => key,
): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: t("sidebarHome"),
        href: "/aquarius",
        preventRedirect: false,
        icon: <Home className="h-4 w-4" />,
        subtitle: t("sidebarHomeSubtitle"),
        position: 1,
      },
    ],
  },
  {
    section: "",
    items: [
      {
        dataKey: "Home",
        label: t("sidebarHome"),
        href: "/aquarius",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("sidebarHomeSubtitle"),
      },
    ],
  },
];
