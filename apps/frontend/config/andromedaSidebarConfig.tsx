"use client";

import { Home } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";
import { AndromedaFlags } from "@runa/permissions";

export const getAndromedaSidebarConfig = (): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: "Home",
        href: "/andromeda",
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
        href: "/andromeda",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Home",
      },
    ],
  },
];
