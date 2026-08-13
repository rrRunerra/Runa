"use client";

import { Home } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export const getAndromedaSidebarConfig = (
  t: TranslateFn = (key) => key,
): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: t("sidebarHome"),
        href: "/andromeda",
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
        href: "/andromeda",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("sidebarHomeSubtitle"),
      },
    ],
  },
];
