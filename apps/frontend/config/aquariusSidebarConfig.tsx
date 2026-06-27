"use client";

import { Home } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";

export const getAquariusSidebarConfig = (): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: "Home",
        href: "/aquarius",
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
        href: "/aquarius",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Home",
      },
    ],
  },
];
