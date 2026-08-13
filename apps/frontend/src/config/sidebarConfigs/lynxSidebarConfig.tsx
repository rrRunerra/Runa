"use client";

import {
  AlertTriangle,
  Bug,
  CircleX,
  Command,
  Database,
  Dice1,
  Home,
  Info,
  Key,
  List,
  Logs,
  MessageSquare,
  ScrollText,
  Settings,
} from "lucide-react";
import { LynxFlags } from "@runa/permissions";
import type { SidebarConfig } from "@/types/SidebarConfig";

/** Simple translate function shape — compatible with i18next TFunction but
 * also accepts a plain fallback so no import of the branded TFunction is needed. */
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

interface LynxData {
  commands: { name: string }[];
  events: { name: string }[];
  crons: { name: string }[];
  apis: { name: string }[];
  databases: string[];
}

export function getLynxSidebarConfig(
  data: Partial<LynxData>,
  t: TranslateFn = (key) => key,
): SidebarConfig {
  const {
    commands = [],
    events = [],
    crons = [],
    apis = [],
    databases = [],
  } = data;

  return [
    {
      section: "#$Phone",
      items: [
        {
          dataKey: "Commands",
          label: t("sidebarCommands"),
          href: "/lynx/commands",
          preventRedirect: false,
          icon: <Command className="h-4 w-4" />,
          subtitle: t("sidebarCommandsSubtitle"),
          position: 1,
        },
        {
          dataKey: "Events",
          label: t("sidebarEvents"),
          href: "/lynx/events",
          preventRedirect: false,
          icon: <Logs className="h-4 w-4" />,
          subtitle: t("sidebarEventsSubtitle"),
          position: 2,
        },
        {
          dataKey: "Logs",
          label: t("sidebarLogs"),
          href: "/lynx/logs",
          preventRedirect: false,
          icon: <ScrollText className="h-4 w-4" />,
          subtitle: t("sidebarLogsSubtitle"),
          position: 3,
        },
        {
          dataKey: "Configuration",
          label: t("sidebarConfiguration"),
          href: "/lynx/config",
          preventRedirect: false,
          icon: <Settings className="h-4 w-4" />,
          subtitle: t("sidebarConfigurationSubtitle"),
          position: 4,
        },
      ],
    },
    {
      section: "",
      items: [
        {
          dataKey: "Home",
          label: t("sidebarHome"),
          href: "/lynx",
          preventRedirect: false,
          icon: <Home className="h-4 w-4" />,
          subtitle: t("sidebarHomeSubtitle"),
        },
      ],
    },
    {
      section: t("sidebarSectionStructures"),
      dataKey: "Structures",
      items: [
        {
          dataKey: "Commands",
          label: t("sidebarCommands"),
          href: "/lynx/commands",
          preventRedirect: false,
          icon: <Command className="h-4 w-4" />,
          subtitle: t("sidebarCommandsSubtitle"),
          children:
            commands.length > 0
              ? commands?.map((c) => ({
                  label: c.name,
                  href: `/lynx/commands/${c.name}`,
                  preventRedirect: false,
                  subtitle: t("sidebarCommandDetailSubtitle", { name: c.name }),
                }))
              : [],
        },
        {
          dataKey: "Events",
          label: t("sidebarEvents"),
          href: "/lynx/events",
          icon: <Logs className="h-4 w-4" />,
          preventRedirect: false,
          subtitle: t("sidebarEventsSubtitle"),
          children:
            events.length > 0
              ? events?.map((e) => ({
                  label: e.name,
                  href: `/lynx/events/${e.name}`,
                  preventRedirect: false,
                  subtitle: t("sidebarEventDetailSubtitle", { name: e.name }),
                }))
              : [],
        },
        {
          dataKey: "Crons",
          label: t("sidebarCrons"),
          href: "/lynx/crons",
          icon: <ScrollText className="h-4 w-4" />,
          preventRedirect: false,
          subtitle: t("sidebarCronsSubtitle"),
          children:
            crons.length > 0
              ? crons?.map((c) => ({
                  label: c.name,
                  href: `/lynx/crons/${c.name}`,
                  preventRedirect: false,
                  subtitle: t("sidebarCronDetailSubtitle", { name: c.name }),
                }))
              : [],
        },
        {
          dataKey: "APIs",
          label: t("sidebarApis"),
          href: "/lynx/apis",
          icon: <Key className="h-4 w-4" />,
          preventRedirect: false,
          subtitle: t("sidebarApisSubtitle"),
          children:
            apis.length > 0
              ? apis?.map((a) => ({
                  label: a.name,
                  href: `/lynx/apis/${encodeURIComponent(a.name)}`,
                  preventRedirect: false,
                  subtitle: t("sidebarApiDetailSubtitle", { name: a.name }),
                }))
              : [],
        },
      ],
    },
    {
      section: t("sidebarSectionAdministration"),
      dataKey: "Administration",
      items: [
        {
          dataKey: "Logs",
          label: t("sidebarLogs"),
          href: "/lynx/logs",
          icon: <Logs className="h-4 w-4" />,
          preventRedirect: false,
          subtitle: t("sidebarLogsSubtitle"),
          permissions: LynxFlags.VIEW_LOGS,
          children: [
            {
              dataKey: "LogsAll",
              label: t("sidebarLogsAll"),
              href: "/lynx/logs/all",
              subtitle: t("sidebarLogsAllSubtitle"),
              preventRedirect: false,
              icon: <ScrollText className="h-4 w-4" />,
            },
            {
              dataKey: "LogsErrors",
              label: t("sidebarLogsErrors"),
              href: "/lynx/logs/error",
              preventRedirect: false,
              subtitle: t("sidebarLogsErrorsSubtitle"),
              icon: <CircleX className="h-4 w-4" />,
            },
            {
              dataKey: "LogsWarnings",
              label: t("sidebarLogsWarnings"),
              href: "/lynx/logs/warn",
              preventRedirect: false,
              subtitle: t("sidebarLogsWarningsSubtitle"),
              icon: <AlertTriangle className="h-4 w-4" />,
            },
            {
              dataKey: "LogsInfo",
              label: t("sidebarLogsInfo"),
              href: "/lynx/logs/info",
              preventRedirect: false,
              subtitle: t("sidebarLogsInfoSubtitle"),
              icon: <Info className="h-4 w-4" />,
            },
            {
              dataKey: "LogsDebug",
              label: t("sidebarLogsDebug"),
              href: "/lynx/logs/debug",
              preventRedirect: false,
              subtitle: t("sidebarLogsDebugSubtitle"),
              icon: <Bug className="h-4 w-4" />,
            },
            {
              dataKey: "LogsVerbose",
              label: t("sidebarLogsVerbose"),
              href: "/lynx/logs/verbose",
              preventRedirect: false,
              subtitle: t("sidebarLogsVerboseSubtitle"),
              icon: <List className="h-4 w-4" />,
            },
          ],
        },
        {
          dataKey: "Databases",
          label: t("sidebarDatabases"),
          subtitle: t("sidebarDatabasesSubtitle"),
          href: "/lynx/databases",
          icon: <Database className="h-4 w-4" />,
          preventRedirect: false,
          permissions: LynxFlags.MANAGE_DATABASE,
          children: databases.map((db) => ({
            label: db,
            href: `/lynx/databases/${db}`,
            preventRedirect: false,
            subtitle: t("sidebarDatabaseDetailSubtitle", { name: db }),
          })),
        },
        {
          dataKey: "Configuration",
          label: t("sidebarConfiguration"),
          href: "/lynx/config",
          icon: <Settings className="h-4 w-4" />,
          subtitle: t("sidebarConfigurationSubtitle"),
          preventRedirect: false,
          permissions: LynxFlags.MANAGE_CONFIG,
          children: [
            {
              dataKey: "Homework",
              label: t("sidebarHomework"),
              href: "/lynx/config/homework",
              icon: <ScrollText className="h-4 w-4" />,
              subtitle: t("sidebarHomeworkSubtitle"),
              preventRedirect: false,
            },
          ],
        },
      ],
    },
    {
      section: t("sidebarSectionGeneral"),
      dataKey: "General",
      items: [
        {
          dataKey: "Chat",
          label: t("sidebarChat"),
          href: "/lynx/chat",
          icon: <MessageSquare className="h-4 w-4" />,
          subtitle: t("sidebarChatSubtitle"),
          preventRedirect: false,
          children: [
            {
              dataKey: "Guilds",
              label: t("sidebarGuilds"),
              href: "/lynx/chat/guilds",
              subtitle: t("sidebarGuildsSubtitle"),
              preventRedirect: false,
              icon: <Dice1 className="h-4 w-4" />,
              permissions: LynxFlags.GUILD_CHAT,
            },
            {
              dataKey: "DirectMessages",
              label: t("sidebarDirectMessages"),
              href: "/lynx/chat/dms",
              subtitle: t("sidebarDirectMessagesSubtitle"),
              preventRedirect: false,
              icon: <Dice1 className="h-4 w-4" />,
              permissions: LynxFlags.DM_CHAT,
            },
          ],
        },
      ],
    },
  ];
}

