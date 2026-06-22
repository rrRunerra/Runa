import React from "react";
import { Bot, List, Mail, Star } from "lucide-react";

export const rrApps: rrApp[] = [
  {
    name: "Lynx",
    href: "/lynx",
    icon: <Bot className="size-4" />,
    description: "Discord bot management",
    descriptionShort: "Discord bot UI",
  },
  {
    name: "Aquila",
    href: "/aquila",
    icon: <List className="size-4" />,
    description: "Media tracker",
    descriptionShort: "Media tracker",
  },
  {
    name: "Pegasus",
    href: "/pegasus",
    icon: <Mail className="size-4" />,
    description: "Mail client.",
    descriptionShort: "Email Client",
  },
  {
    name: "Polaris",
    href: "/polaris",
    icon: <Star className="size-4" />,
    description: "Landing page",
    descriptionShort: "Account features",
  },
];

export interface rrApp {
  name: string;
  href: string;
  icon: React.ReactNode | string;
  description: string;
  descriptionShort: string;
}
