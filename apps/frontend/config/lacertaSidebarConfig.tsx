"use client";

import { Folder, Lock, Share2, Trash2 } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";
import { RunaFlags } from "@runa/permissions";

export const getLacertaSidebarConfig = (): SidebarConfig => [
  {
    section: "#$Phone",
    permissions: [RunaFlags.LOGGED_IN],
    items: [
      {
        label: "My Files",
        href: "/lacerta",
        preventRedirect: false,
        icon: <Folder className="h-4 w-4" />,
        subtitle: "My Files",
        position: 1,
      },
      {
        label: "Secure Vault",
        href: "/lacerta/vault",
        preventRedirect: false,
        icon: <Lock className="h-4 w-4" />,
        subtitle: "Secure Vault",
        position: 2,
      },
      {
        label: "Shared with Me",
        href: "/lacerta/shared",
        preventRedirect: false,
        icon: <Share2 className="h-4 w-4" />,
        subtitle: "Shared with Me",
        position: 3,
      },
      {
        label: "Recycle Bin",
        href: "/lacerta/trash",
        preventRedirect: false,
        icon: <Trash2 className="h-4 w-4" />,
        subtitle: "Recycle Bin",
        position: 4,
      },
    ],
  },
  {
    section: "Storage",
    permissions: [RunaFlags.LOGGED_IN],
    items: [
      {
        label: "My Files",
        href: "/lacerta",
        icon: <Folder className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "My Files",
      },
      {
        label: "Secure Vault",
        href: "/lacerta/vault",
        icon: <Lock className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Secure Vault",
      },
      {
        label: "Shared with Me",
        href: "/lacerta/shared",
        icon: <Share2 className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Shared with Me",
      },
      {
        label: "Recycle Bin",
        href: "/lacerta/trash",
        icon: <Trash2 className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Recycle Bin",
      },
    ],
  },
];
