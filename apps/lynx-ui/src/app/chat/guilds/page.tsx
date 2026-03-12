"use client";

import { Card, CardHeader, CardTitle } from "@runa/ui";
import { ChevronRight, Server } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import AccessDenied from "@/components/AccessDenied";
import { PageHeader } from "@/components/PageHeader";

function GuildsContent() {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const [guilds, setGuilds] = useState<
    { id: string; name: string; iconUrl: string }[]
  >([]);

  const { data: session, status } = useSession();
  if (status === "unauthenticated" || session?.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  useEffect(() => {
    async function getGuilds() {
      const res = await fetch("/api/chat/getGuilds");
      const data = await res.json();
      setGuilds(data.guilds);
    }
    getGuilds();
  }, []);

  return (
    <div className="container mx-auto p-8 space-y-8">
      <PageHeader
        title={intent === "dm" ? "Choose a Guild" : "Guilds"}
        description={
          intent === "dm"
            ? "Select a guild to find members to message"
            : "Select a guild to send messages"
        }
        backHref="/chat"
        backLabel="Back to Chat"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guilds.map((guild) => (
          <Link
            key={guild.id}
            href={`/chat/guilds/${guild.id}${intent === "dm" ? "/dms" : ""}`}
            className="block h-full"
          >
            <Card className="h-full hover:scale-[1.02] transform-gpu backface-visibility-hidden transition-all duration-300 cursor-pointer group shadow-sm">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg border border-border bg-accent/10 text-primary flex items-center justify-center">
                      <Server className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-xl text-foreground">
                      {guild.name}
                    </CardTitle>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
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
