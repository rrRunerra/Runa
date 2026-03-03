"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@astral/ui";
import { useNavigation } from "@/hooks/useNavigation";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ApisPage() {
  const { getItem } = useNavigation();
  const apisItem = getItem("Structures", "APIs");

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      <div className="flex flex-col gap-2 relative z-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          APIs
        </h1>
        <p className="text-muted-foreground">Manage registered API endpoints</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {apisItem?.children && apisItem.children.length > 0 ? (
          apisItem.children.map((category) => (
            <Link key={category.href} href={category.href}>
              <Card className="h-full hover:scale-[1.02] transition-transform duration-300 cursor-pointer group bg-card border-border shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-lg border border-border bg-accent/10 text-primary relative overflow-hidden">
                      <div className="relative z-10">{apisItem.icon}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <CardTitle className="mt-4 text-xl text-foreground">
                    {category.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {category.subtitle}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-10">
            No APIs found.
          </div>
        )}
      </div>
    </div>
  );
}
