"use client";

import { Home } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";

export const getLacertaSidebarConfig = (): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: "Home",
        href: "/lacerta",
        preventRedirect: false,
        icon: <Home className="h-4 w-4" />,
        subtitle: "Home",
        position: 1,
      },
    ],
  },
  {
    section: "",
    items: [
      {
        label: "Home",
        href: "/lacerta",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Home",
      },
    ],
  },
];
