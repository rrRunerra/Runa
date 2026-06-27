import React from "react";
import {
  Bot,
  List,
  Mail,
  Music2,
  Star,
  Archive,
  GlassWater,
} from "lucide-react";
import {
  PolarisFlags,
  LynxFlags,
  AquilaFlags,
  PegasusFlags,
  AquariusFlags,
  LacertaFlags,
  LyraFlags,
  MonocerosFlags,
} from "@runa/permissions";

// https://sleepopolis.com/education/constellations-stars/

export const rrApps: rrApp[] = [
  {
    name: "Polaris",
    href: "/polaris",
    icon: <Star className="size-4" />,
    description: "Landing page",
    descriptionShort: "Account",
  },
  {
    name: "Aquarius",
    href: "/aquarius",
    icon: <GlassWater className="size-4" />,
    description: "Social features",
    descriptionShort: "Social",
    permissions: [AquariusFlags.VIEW],
  },
  {
    name: "Pegasus",
    href: "/pegasus",
    icon: <Mail className="size-4" />,
    description: "Email client.",
    descriptionShort: "Email",
  },
  {
    name: "Lacerta",
    href: "/lacerta",
    icon: <Archive className="size-4" />,
    description: "Cloud storage",
    descriptionShort: "Storage",
    permissions: [LacertaFlags.VIEW],
  },

  {
    name: "Aquila",
    href: "/aquila",
    icon: <List className="size-4" />,
    description: "Media tracker",
    descriptionShort: "Media",
  },
  {
    name: "Lyra",
    href: "/lyra",
    icon: <Music2 className="size-4" />,
    description: "Music player",
    descriptionShort: "Music",
    permissions: [LyraFlags.VIEW],
  },
  {
    name: "Monoceros",
    href: "/monoceros",
    icon: <Archive className="size-4" />,
    description: "Admin panel for Runa",
    descriptionShort: "Admin",
    permissions: [MonocerosFlags.VIEW],
  },

  {
    name: "Lynx",
    href: "/lynx",
    icon: <Bot className="size-4" />,
    description: "Discord bot management",
    descriptionShort: "Discord bot",
  },
];

export interface rrApp {
  name: string;
  href: string;
  icon: React.ReactNode | string;
  description: string;
  descriptionShort: string;
  permissions?: bigint[];
}
