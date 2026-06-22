import { StarIcon } from "@/components/icons/StarIcon";
import { Bot, List, Mail } from "lucide-react";
import React from "react";

export const apps: App[] = [
  {
    name: "Lynx",
    logo: <Bot className="size-4" />,
    description: "Discord bot management",
    connectionDescription:
      "Connect with your Discord account for bot companion features.",
    href: `/lynx`,
    color: "bg-purple-800",
    hoverBorderClass:
      "hover:border-purple-500/40 hover:bg-purple-950/10 hover:shadow-purple-500/5",
    logoWrapperClass:
      "bg-purple-500/10 text-purple-500 border border-purple-500/20 group-hover:bg-purple-500 group-hover:text-white",
    badgeText: "Bot",
    badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
  {
    name: "Aquila",
    logo: <List className="size-4" />,
    description: "Media tracker",
    connectionDescription:
      "Link third-party trackers to synchronize your media watch history.",
    href: `/aquila`,
    color: "bg-blue-800",
    hoverBorderClass:
      "hover:border-blue-500/40 hover:bg-blue-950/10 hover:shadow-blue-500/5",
    logoWrapperClass:
      "bg-blue-500/10 text-blue-500 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white",
    badgeText: "Tracker",
    badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  },
  {
    name: "Pegasus",
    logo: <Mail className="size-4" />,
    href: "/pegasus",
    color: "bg-green-800",
    description: "Mail client.",
    hoverBorderClass:
      "hover:border-emerald-500/40 hover:bg-emerald-950/10 hover:shadow-emerald-500/5",
    logoWrapperClass:
      "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white",
    badgeText: "Beta",
    badgeColor:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  {
    name: "Polaris",
    logo: <StarIcon className="size-4" />,
    description: "Landing page",
    href: `/polaris/dash`,
    color: "bg-indigo-800",
    hoverBorderClass:
      "hover:border-indigo-500/40 hover:bg-indigo-950/10 hover:shadow-indigo-500/5",
    logoWrapperClass:
      "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white",
    badgeText: "Core",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
  },
];

export interface App {
  name: string;
  logo: React.ReactNode;
  description: string;
  connectionDescription?: string;
  href: string;
  color: string;
  hoverBorderClass?: string;
  logoWrapperClass?: string;
  badgeText?: string;
  badgeColor?: string;
}
