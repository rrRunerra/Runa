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
import { BitField, LynxFlags } from "@runa/permissions";
import type { SidebarConfig } from "@/types/SidebarConfig";

interface LynxData {
  commands: { name: string }[];
  events: { name: string }[];
  crons: { name: string }[];
  apis: { name: string }[];
  databases: string[];
}

export function getLynxSidebarConfig(data: Partial<LynxData>): SidebarConfig {
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
          label: "Commands",
          href: "/lynx/commands",
          preventRedirect: false,
          icon: <Command className="h-4 w-4" />,
          subtitle: "Commands list",
          position: 1,
        },
        {
          label: "Events",
          href: "/lynx/events",
          preventRedirect: false,
          icon: <Logs className="h-4 w-4" />,
          subtitle: "Events list",
          position: 2,
        },
        {
          label: "Logs",
          href: "/lynx/logs",
          preventRedirect: false,
          icon: <ScrollText className="h-4 w-4" />,
          subtitle: "Logs list",
          position: 3,
        },
        {
          label: "Config",
          href: "/lynx/config",
          preventRedirect: false,
          icon: <Settings className="h-4 w-4" />,
          subtitle: "Config list",
          position: 4,
        },
      ],
    },
    {
      section: "",
      items: [
        {
          label: "Home",
          href: "/lynx",
          preventRedirect: false,
          icon: <Home className="h-4 w-4" />,
          subtitle: "Home",
        },
      ],
    },
    {
      section: "Structures",
      items: [
        {
          label: "Commands",
          href: "/lynx/commands",
          preventRedirect: false,
          icon: <Command className="h-4 w-4" />,
          subtitle: "List of all commands",
          children:
            commands.length > 0
              ? commands?.map((c) => ({
                  label: c.name,
                  href: `/lynx/commands/${c.name}`,
                  preventRedirect: false,
                  subtitle: `View details for ${c.name}`,
                }))
              : [],
        },
        {
          label: "Events",
          href: "/lynx/events",
          icon: <Logs className="h-4 w-4" />,
          preventRedirect: false,
          subtitle: "List of all events",
          children:
            events.length > 0
              ? events?.map((e) => ({
                  label: e.name,
                  href: `/lynx/events/${e.name}`,
                  preventRedirect: false,
                  subtitle: `View details for ${e.name}`,
                }))
              : [],
        },
        {
          label: "Crons",
          href: "/lynx/crons",
          icon: <ScrollText className="h-4 w-4" />,
          preventRedirect: false,
          subtitle: "List of all crons",
          children:
            crons.length > 0
              ? crons?.map((c) => ({
                  label: c.name,
                  href: `/lynx/crons/${c.name}`,
                  preventRedirect: false,
                  subtitle: `View details for ${c.name}`,
                }))
              : [],
        },
        {
          label: "APIs",
          href: "/lynx/apis",
          icon: <Key className="h-4 w-4" />,
          preventRedirect: false,
          subtitle: "List of all registered APIs",
          children:
            apis.length > 0
              ? apis?.map((a) => ({
                  label: a.name,
                  href: `/lynx/apis/${encodeURIComponent(a.name)}`,
                  preventRedirect: false,
                  subtitle: `View details for ${a.name}`,
                }))
              : [],
        },
      ],
    },
    {
      section: "Administration",
      items: [
        {
          label: "Logs",
          href: "/lynx/logs",
          icon: <Logs className="h-4 w-4" />,
          preventRedirect: false,
          subtitle: "List of all log types",
          permissions: LynxFlags.VIEW_LOGS,
          children: [
            {
              label: "All",
              href: "/lynx/logs/all",
              subtitle: "All logs",
              preventRedirect: false,

              icon: <ScrollText className="h-4 w-4" />,
            },
            {
              label: "Errors",
              href: "/lynx/logs/error",
              preventRedirect: false,
              subtitle: "Error logs",
              icon: <CircleX className="h-4 w-4" />,
            },
            {
              label: "Warnings",
              href: "/lynx/logs/warn",
              preventRedirect: false,
              subtitle: "Warn logs",
              icon: <AlertTriangle className="h-4 w-4" />,
            },
            {
              label: "Info",
              href: "/lynx/logs/info",
              preventRedirect: false,
              subtitle: "Info logs",
              icon: <Info className="h-4 w-4" />,
            },
            {
              label: "Debug",
              href: "/lynx/logs/debug",
              preventRedirect: false,
              subtitle: "Debug logs",
              icon: <Bug className="h-4 w-4" />,
            },
            {
              label: "Verbose",
              href: "/lynx/logs/verbose",
              preventRedirect: false,
              subtitle: "Verbose logs",
              icon: <List className="h-4 w-4" />,
            },
          ],
        },
        {
          label: "Databases",
          subtitle: "List of all lynx databases",
          href: "/lynx/databases",
          icon: <Database className="h-4 w-4" />,
          preventRedirect: false,
          permissions: LynxFlags.MANAGE_DATABASE,
          children: databases.map((db) => ({
            label: db,
            href: `/lynx/databases/${db}`,
            preventRedirect: false,
            subtitle: `Manage ${db} database`,
          })),
        },
        {
          label: "Configuration",
          href: "/lynx/config",
          icon: <Settings className="h-4 w-4" />,
          subtitle: "Lynx configuration",
          preventRedirect: false,
          permissions: LynxFlags.MANAGE_CONFIG,
          children: [
            {
              label: "Homework",
              href: "/lynx/config/homework",
              icon: <ScrollText className="h-4 w-4" />,
              subtitle: "Configure homework channels",
              preventRedirect: false,
            },
          ],
        },
      ],
    },
    {
      section: "General",
      items: [
        {
          label: "Chat",
          href: "/lynx/chat",
          icon: <MessageSquare className="h-4 w-4" />,
          subtitle: "Send messages in guilds",
          preventRedirect: false,
          children: [
            {
              label: "Guilds",
              href: "/lynx/chat/guilds",
              subtitle: "Chat in discord guilds",
              preventRedirect: false,
              icon: <Dice1 className="h-4 w-4" />,
              permissions: LynxFlags.GUILD_CHAT,
            },
            {
              label: "Direct Messages",
              href: "/lynx/chat/dms",
              subtitle: "Chat in discord dms",
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
