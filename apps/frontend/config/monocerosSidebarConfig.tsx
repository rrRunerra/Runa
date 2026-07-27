"use client";

import { Home, Lock, Database, Zap, FileText } from "lucide-react";
import { SidebarConfig } from "@/types/SidebarConfig";
import { RunaFlags } from "@runa/permissions";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export const getMonocerosSidebarConfig = (
  t: TranslateFn = (key) => key,
): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: t("sidebarHome"),
        href: "/monoceros",
        preventRedirect: false,
        icon: <Home className="h-4 w-4" />,
        subtitle: t("sidebarHomeSubtitle"),
        position: 1,
      },
    ],
  },
  {
    section: "",
    permissions: RunaFlags.ADMINISTRATOR,
    items: [
      {
        dataKey: "Home",
        label: t("sidebarHome"),
        href: "/monoceros",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("sidebarHomeSubtitle"),
      },
      {
        dataKey: "Permissions",
        label: t("sidebarPermissions"),
        href: "/monoceros/permissions",
        icon: <Lock className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("sidebarPermissions"),
      },
      {
        dataKey: "Submissions",
        label: t("sidebarSubmissions", "Submissions"),
        href: "/monoceros/submissions",
        icon: <FileText className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("sidebarSubmissionsSubtitle", "Review Media Submissions"),
      },
      {
        dataKey: "Databases",
        label: t("sidebarDatabases"),
        href: "/monoceros/databases",
        icon: <Database className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("sidebarDatabases"),
      },
      {
        dataKey: "Cache",
        label: t("sidebarCache"),
        href: "/monoceros/cache",
        icon: <Zap className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: t("sidebarCache"),
      },
    ],
  },
];
