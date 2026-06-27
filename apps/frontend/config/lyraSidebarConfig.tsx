"use client";

import { Home } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";

export const getLyraSidebarConfig = (): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: "Home",
        href: "/lyra",
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
        href: "/lyra",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Home",
      },
    ],
  },
];
