"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useNavigation,
} from "@runa/ui";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function CommandsPage() {
  const { getItem } = useNavigation();
  const commandsItem = getItem("Structures", "Commands");

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Commands
        </h1>
        <p className="text-muted-foreground">
          Configure and manage system commands
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {commandsItem?.children && commandsItem.children.length > 0 ? (
          commandsItem.children.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="block h-full"
            >
              <Card className="h-full hover:scale-[1.02] transition-transform duration-300 cursor-pointer group bg-card border-border shadow-sm">
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg border border-border bg-accent/10 text-primary flex items-center justify-center">
                        {commandsItem.icon}
                      </div>
                      <CardTitle className="text-xl text-foreground">
                        {category.label}
                      </CardTitle>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {category.subtitle}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-10">
            No commands found.
          </div>
        )}
      </div>
    </div>
  );
}
