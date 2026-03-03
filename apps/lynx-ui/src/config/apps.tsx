import { HomeIcon, Bot, Tv, ArchiveX } from "lucide-react";
import Link from "next/link";
import { AppConfig } from "@astral/types/ui";

export const apps: AppConfig[] = [
  {
    name: "Lynx",
    logo: <Bot className="size-4" />,
    description: "Discord bot management",
    href: `${process.env.NEXT_PUBLIC_LYNX}`,
    Card: ({ className }) => (
      <div className="bg-linear-to-br from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 hover:shadow-indigo-500/20 hover:border-indigo-500/50 group h-full transform rounded-2xl border border-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30 group-hover:scale-110 rounded-full p-4 transition-all duration-300">
            <Bot className="size-8" />
          </div>
          <div>
            <h2 className="text-foreground mb-1 text-2xl font-bold tracking-tight">
              Lynx
            </h2>
            <p className="text-muted-foreground text-sm">
              Advanced Discord bot dashboard for Lynx.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];
