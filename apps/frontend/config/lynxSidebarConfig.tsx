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
import type { NavbarConfig } from "@/components/Providers/NavigationProvider";
import { BitField, LynxFlags } from "@runa/permissions";

interface LynxData {
  commands: { name: string }[];
  events: { name: string }[];
  crons: { name: string }[];
  apis: { name: string }[];
  databases: string[];
}

export function getLynxSidebarConfig(data: Partial<LynxData>): NavbarConfig {
  const {
    commands = [],
    events = [],
    crons = [],
    apis = [],
    databases = [],
  } = data;

  return [
    {
      section: "Phone",
      items: [
        {
          label: "Commands",
          href: "/lynx/commands",
          icon: <Command className="h-4 w-4" />,
          subtitle: "Commands list",
          position: 1,
        },
        {
          label: "Events",
          href: "/lynx/events",
          icon: <Logs className="h-4 w-4" />,
          subtitle: "Events list",
          position: 2,
        },
        {
          label: "Logs",
          href: "/lynx/logs",
          icon: <ScrollText className="h-4 w-4" />,
          subtitle: "Logs list",
          position: 3,
        },
        {
          label: "Config",
          href: "/lynx/config",
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
          icon: <Command className="h-4 w-4" />,
          subtitle: "List of all commands",
          children:
            commands.length > 0
              ? commands?.map((c) => ({
                  label: c.name,
                  href: `/lynx/commands/${c.name}`,
                  subtitle: `View details for ${c.name}`,
                }))
              : [],
        },
        {
          label: "Events",
          href: "/lynx/events",
          icon: <Logs className="h-4 w-4" />,
          subtitle: "List of all events",
          children:
            events.length > 0
              ? events?.map((e) => ({
                  label: e.name,
                  href: `/lynx/events/${e.name}`,
                  subtitle: `View details for ${e.name}`,
                }))
              : [],
        },
        {
          label: "Crons",
          href: "/lynx/crons",
          icon: <ScrollText className="h-4 w-4" />,
          subtitle: "List of all crons",
          children:
            crons.length > 0
              ? crons?.map((c) => ({
                  label: c.name,
                  href: `/lynx/crons/${c.name}`,
                  subtitle: `View details for ${c.name}`,
                }))
              : [],
        },
        {
          label: "APIs",
          href: "/lynx/apis",
          icon: <Key className="h-4 w-4" />,
          subtitle: "List of all registered APIs",
          children:
            apis.length > 0
              ? apis?.map((a) => ({
                  label: a.name,
                  href: `/lynx/apis/${encodeURIComponent(a.name)}`,
                  subtitle: `View details for ${a.name}`,
                }))
              : [],
        },
      ],
    },
    {
      section: "Administration",
      permission: [LynxFlags.VIEW_LOGS, LynxFlags.MANAGE_DATABASE, LynxFlags.MANAGE_CONFIG ],
      permissionOperator: "any",
      items: [
        {
          label: "Logs",
          href: "/lynx/logs",
          icon: <Logs className="h-4 w-4" />,
          subtitle: "List of all logs",
          permission: LynxFlags.VIEW_LOGS,
          children: [
            {
              label: "All",
              href: "/lynx/logs/all",
              icon: <ScrollText className="h-4 w-4" />,
            },
            {
              label: "Errors",
              href: "/lynx/logs/error",
              icon: <CircleX className="h-4 w-4" />,
            },
            {
              label: "Warnings",
              href: "/lynx/logs/warn",
              icon: <AlertTriangle className="h-4 w-4" />,
            },
            {
              label: "Info",
              href: "/lynx/logs/info",
              icon: <Info className="h-4 w-4" />,
            },
            {
              label: "Debug",
              href: "/lynx/logs/debug",
              icon: <Bug className="h-4 w-4" />,
            },
            {
              label: "Verbose",
              href: "/lynx/logs/verbose",
              icon: <List className="h-4 w-4" />,
            },
          ],
        },
        {
          label: "Databases",
          href: "/lynx/databases",
          icon: <Database className="h-4 w-4" />,
          permission: LynxFlags.MANAGE_DATABASE,
          children: databases.map((db) => ({
            label: db,
            href: `/lynx/databases/${db}`,
            subtitle: `Manage ${db} database`,
          })),
        },
        {
          label: "Configuration",
          href: "/lynx/config",
          icon: <Settings className="h-4 w-4" />,
          subtitle: "Lynx configuration",
          permission: LynxFlags.MANAGE_CONFIG,
          children: [
            {
              label: "Homework",
              href: "/lynx/config/homework",
              icon: <ScrollText className="h-4 w-4" />,
              subtitle: "Configure homework channels",
            },
          ],
        },
      ],
    },
    {
      section: "General",
      permission: [LynxFlags.LOGGED_IN, LynxFlags.GUILD_CHAT, LynxFlags.DM_CHAT],
      permissionOperator: "any",
      items: [
        {
          label: "Chat",
          href: "/lynx/chat",
          icon: <MessageSquare className="h-4 w-4" />,
          subtitle: "Send messages in guilds",
          permission: LynxFlags.LOGGED_IN,
          children: [
            {
              label: "Guilds",
              href: "/lynx/chat/guilds",
              icon: <Dice1 className="h-4 w-4" />,
              permission: LynxFlags.GUILD_CHAT,
            },
            {
              label: "Direct Messages",
              href: "/lynx/chat/dms",
              icon: <Dice1 className="h-4 w-4" />,
              permission: LynxFlags.DM_CHAT,
            },
          ],
        },
      ],
    },
  ];
}
