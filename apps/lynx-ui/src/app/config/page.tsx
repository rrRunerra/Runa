"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@runa/ui";
import { ChevronRight, ScrollText, Dice1 } from "lucide-react";
import Link from "next/link";

export default function ConfigPage() {
  const configs = [
    {
      title: "Homework Channels",
      description:
        "Configure subject-specific channels for homework assignments.",
      href: "/config/homework",
      icon: <ScrollText className="w-5 h-5" />,
    },
    {
      title: "RNG Rig",
      description: "Manage ignored numbers for the random generator command.",
      href: "/config/rng",
      icon: <Dice1 className="w-5 h-5" />,
    },
  ];

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Configuration
        </h1>
        <p className="text-muted-foreground">
          Central hub for Lynx bot settings and configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configs.map((config) => (
          <Link key={config.href} href={config.href}>
            <Card className="h-full hover:scale-[1.02] transition-transform duration-300 cursor-pointer group bg-card border-border shadow-sm">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg border border-border bg-accent/10 text-primary flex items-center justify-center">
                      {config.icon}
                    </div>
                    <CardTitle className="text-xl text-foreground">
                      {config.title}
                    </CardTitle>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <CardDescription className="text-muted-foreground mt-2 pl-14">
                  {config.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
