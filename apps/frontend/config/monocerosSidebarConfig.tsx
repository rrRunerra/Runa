"use client";

import { Home, Lock } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";
import { RunaFlags } from "@runa/permissions";

export const getMonocerosSidebarConfig = (): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: "Home",
        href: "/monoceros",
        preventRedirect: false,
        icon: <Home className="h-4 w-4" />,
        subtitle: "Home",
        position: 1,
      },
    ],
  },
  {
    section: "",
    permissions: RunaFlags.ADMINISTRATOR,
    items: [
      {
        label: "Home",
        href: "/monoceros",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Home",
      },
      {
        label: "Permissions",
        href: "/monoceros/permissions",
        icon: <Lock className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Permissions",
      },
    ],
  },
];
