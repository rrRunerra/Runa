"use client";
import { NavbarConfig } from "@runa/ui";
import {
  Key,
  Logs,
  ScrollText,
  Info,
  Bug,
  Database,
  Settings,
  Dice1,
  Command,
  CircleX,
  AlertTriangle,
  List,
  MessageSquare,
} from "lucide-react";
import { EventIcon } from "@runa/ui";
import { CronsIcon } from "@runa/ui";

async function safeFetch(url: string, fallback: Record<string, unknown>) {
  try {
    const res = await fetch(url, {
      cache: "force-cache",
    });
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch from ${url}:`, err);
    return fallback;
  }
}

const commands = await safeFetch(
  `${process.env.NEXT_PUBLIC_LYNX ?? ""}/api/commands/list`,
  {
    error: "No commands found",
  },
);
const events = await safeFetch(
  `${process.env.NEXT_PUBLIC_LYNX ?? ""}/api/events/list`,
  {
    error: "No events found",
  },
);
const crons = await safeFetch(
  `${process.env.NEXT_PUBLIC_LYNX ?? ""}/api/crons/list`,
  {
    error: "No crons found",
  },
);
const apis = await safeFetch(
  `${process.env.NEXT_PUBLIC_LYNX ?? ""}/api/apis/list`,
  {
    error: "No apis found",
  },
);
const databases = await safeFetch(
  `${process.env.NEXT_PUBLIC_LYNX ?? ""}/api/db/list`,
  {
    error: "No databases found",
  },
);

// NO ROLE = PUBLIC
// ROLE = ADMIN = ADMIN ONLY
// ROLE = USER = USER AND ADMIN

export const lynxSidebarConfig: NavbarConfig = [
  {
    section: "Structures",
    items: [
      {
        label: "Commands",
        href: "/commands",
        icon: <Command className="h-4 w-4" />,
        subtitle: "List of all commands",
        children: commands?.error
          ? undefined
          : commands?.map((command: Record<string, string>) => ({
              label: command.name,
              href: `/commands/${command.name}`,
              subtitle: `View details and docs for ${command.name} command`,
            })),
      },
      {
        label: "Events",
        href: "/events",
        icon: <EventIcon className="h-4 w-4" />,
        subtitle: "List of all events",
        children: events?.error
          ? undefined
          : events?.map((event: Record<string, string>) => ({
              label: event.name,
              href: `/events/${event.name}`,
              subtitle: `View details and docs for ${event.name} event`,
            })),
      },
      {
        label: "Crons",
        href: "/crons",
        icon: <CronsIcon className="h-4 w-4" />,
        subtitle: "List of all crons",
        children: crons?.error
          ? undefined
          : crons?.map((cron: Record<string, string>) => ({
              label: cron.name,
              href: `/crons/${cron.name}`,
              subtitle: `View details and docs for ${cron.name} cron`,
            })),
      },
      {
        label: "APIs",
        href: "/apis",
        icon: <Key className="h-4 w-4" />,
        subtitle: "List of all registered APIs",
        children: apis?.error
          ? undefined
          : apis?.map((api: Record<string, string>) => ({
              label: api.name,
              href: `/apis/${encodeURIComponent(api.name)}`,
              subtitle: `View details and docs for ${api.name} API`,
            })),
      },
    ],
  },
  {
    section: "Administration",
    role: "ADMIN",
    items: [
      {
        label: "Logs",
        href: "/logs",
        icon: <Logs className="h-4 w-4" />,
        subtitle: "List of all logs",
        children: [
          {
            label: "All",
            href: "/logs/all",
            icon: <ScrollText className="h-4 w-4" />,
            subtitle: "View all system logs",
          },
          {
            label: "Errors",
            href: "/logs/error",
            icon: <CircleX className="h-4 w-4" />,
            subtitle: "View error logs and exceptions",
          },
          {
            label: "Warnings",
            href: "/logs/warn",
            icon: <AlertTriangle className="h-4 w-4" />,
            subtitle: "View system warnings",
          },
          {
            label: "Info",
            href: "/logs/info",
            icon: <Info className="h-4 w-4" />,
            subtitle: "View informational logs",
          },
          {
            label: "Debug",
            href: "/logs/debug",
            icon: <Bug className="h-4 w-4" />,
            subtitle: "View debug traces",
          },
          {
            label: "Verbose",
            href: "/logs/verbose",
            icon: <List className="h-4 w-4" />,
            subtitle: "View verbose logs",
          },
        ],
      },
      {
        label: "Databases",
        href: "/databases",
        icon: <Database className="h-4 w-4" />,
        children: databases?.error
          ? undefined
          : databases?.map((database: string) => ({
              label: database,
              href: `/databases/${database}`,
              subtitle: `Manage ${database} database`,
            })),
      },
      {
        label: "Configuration",
        href: "/config",
        icon: <Settings className="h-4 w-4" />,
        subtitle: "Lynx configuration",
        children: [
          {
            label: "Homework",
            href: "/config/homework",
            icon: <ScrollText className="h-4 w-4" />,
            subtitle: "Configure homework channels",
          },
        ],
      },
    ],
  },
  {
    section: "General",
    role: "ADMIN",
    items: [
      {
        label: "Chat",
        href: "/chat",
        icon: <MessageSquare className="h-4 w-4" />,
        subtitle: "Send messages in guilds",
        children: [
          {
            label: "Guilds",
            href: "/chat/guilds",
            icon: <Dice1 className="h-4 w-4" />,
            subtitle: "Send messages in guilds",
          },
          {
            label: "Direct Messages",
            href: "/chat/dms",
            icon: <Dice1 className="h-4 w-4" />,
            subtitle: "Send messages in DMs",
          },
        ],
      },
    ],
  },
];
