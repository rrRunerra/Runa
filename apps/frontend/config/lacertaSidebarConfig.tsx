"use client";

import { Folder, Lock, Share2, Trash2, Radio } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";
import { RunaFlags } from "@runa/permissions";

import RrLacertaStorageBar from "@/components/rrComponents/lacerta/RrLacertaStorageBar";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export const getLacertaSidebarConfig = (
  t: TranslateFn = (key) => key,
): SidebarConfig => [
  {
    section: "#$Phone",
    permissions: [RunaFlags.LOGGED_IN],
    items: [
      {
        label: t("lacerta.sidebarMyFiles"),
        href: "/lacerta",
        preventRedirect: false,
        icon: <Folder className="h-4 w-4" />,
        subtitle: t("lacerta.sidebarMyFiles"),
        position: 1,
      },
      {
        label: t("lacerta.sidebarSecureVault"),
        href: "/lacerta/vault",
        preventRedirect: false,
        icon: <Lock className="h-4 w-4" />,
        subtitle: t("lacerta.sidebarSecureVault"),
        position: 2,
      },
      {
        label: t("lacerta.sidebarSharedWithMe"),
        href: "/lacerta/shared",
        preventRedirect: false,
        icon: <Share2 className="h-4 w-4" />,
        subtitle: t("lacerta.sidebarSharedWithMe"),
        position: 3,
      },
      {
        label: t("lacerta.sidebarRecycleBin"),
        href: "/lacerta/trash",
        preventRedirect: false,
        icon: <Trash2 className="h-4 w-4" />,
        subtitle: t("lacerta.sidebarRecycleBin"),
        position: 4,
      },
      {
        label: t("lacerta.sidebarLacertaDrop"),
        href: "/lacerta/drop",
        preventRedirect: false,
        icon: <Radio className="h-4 w-4" />,
        subtitle: t("lacerta.sidebarDirectSharing"),
        position: 5,
      },
    ],
  },
  {
    section: t("lacerta.sidebarStorage"),
    dataKey: "Storage",
    permissions: [RunaFlags.LOGGED_IN],
    items: [
      {
        dataKey: "MyFiles",
        label: t("lacerta.sidebarMyFiles"),
        href: "/lacerta",
        icon: <Folder className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("lacerta.sidebarMyFiles"),
      },
      {
        dataKey: "SecureVault",
        label: t("lacerta.sidebarSecureVault"),
        href: "/lacerta/vault",
        icon: <Lock className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("lacerta.sidebarSecureVault"),
      },
      {
        dataKey: "SharedWithMe",
        label: t("lacerta.sidebarSharedWithMe"),
        href: "/lacerta/shared",
        icon: <Share2 className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("lacerta.sidebarSharedWithMe"),
      },
      {
        dataKey: "RecycleBin",
        label: t("lacerta.sidebarRecycleBin"),
        href: "/lacerta/trash",
        icon: <Trash2 className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("lacerta.sidebarRecycleBin"),
      },
      {
        dataKey: "LacertaDrop",
        label: t("lacerta.sidebarLacertaDrop"),
        href: "/lacerta/drop",
        icon: <Radio className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("lacerta.sidebarDirectSharing"),
      },
      {
        dataKey: "StorageUsageBar",
        label: t("lacerta.sidebarStorageUsage"),
        component: <RrLacertaStorageBar />,
        subtitle: t("lacerta.sidebarStorageUsage"),
        position: -1,
      },
    ],
  },
];
