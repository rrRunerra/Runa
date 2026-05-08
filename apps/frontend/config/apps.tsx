import { StarIcon } from "@/components/icons/StarIcon";
import { Bot, List } from "lucide-react";
import React from "react";

export const apps: App[] = [
  {
    name: "Lynx",
    logo: <Bot className="size-4" />,
    description: "Discord bot management",
    href: `/lynx`,
    color: "bg-purple-800",
  },
  {
    name: "Aquila",
    logo: <List className="size-4" />,
    description: "Media tracker",
    href: `/aquila`,
    color: "bg-blue-800",
  },
  {
    name: "Polaris",
    logo: <StarIcon className="size-4" />,
    description: "Landing page",
    href: `/polaris/dash`,
    color: "bg-indigo-800",
  },
];

interface App {
  name: string;
  logo: React.ReactNode;
  description: string;
  href: string;
  color: string;
}
