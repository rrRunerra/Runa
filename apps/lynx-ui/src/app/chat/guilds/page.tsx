"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@runa/ui";
import { ChevronRight, ChevronLeft, Server } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function GuildsContent() {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const [guilds, setGuilds] = useState<
    { id: string; name: string; iconUrl: string }[]
  >([]);

  useEffect(() => {
    async function getGuilds() {
      const res = await fetch("/api/chat/getGuilds");
      const data = await res.json();
      setGuilds(data.guilds);
    }
    getGuilds();
  }, []);

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      {/* Header */}
      <div className="relative z-10 flex flex-col gap-4">
        <Link
          href="/chat"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Chat
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {intent === "dm" ? "Choose a Guild" : "Guilds"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {intent === "dm"
              ? "Select a guild to find members to message"
              : "Select a guild to send messages"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {guilds.map((guild) => (
          <Link
            key={guild.id}
            href={`/chat/guilds/${guild.id}${intent === "dm" ? "/dms" : ""}`}
          >
            <Card className="h-full hover:scale-[1.02] transition-transform duration-300 cursor-pointer group bg-card border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-lg border border-border bg-accent/10 text-primary relative overflow-hidden">
                    <div className="relative z-10">
                      <Server className="w-5 h-5" />
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <CardTitle className="mt-4 text-xl text-foreground">
                  {guild.name}
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function GuildsPage() {
  return (
    <Suspense>
      <GuildsContent />
    </Suspense>
  );
}
