import { auth } from "@runa/auth";
import { ChevronRight, Hash, Volume2 } from "lucide-react";
import Link from "next/link";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// TYPE 2 = VOICE
// TYPE 0 = TEXT
// TYPE 15 = FORUM   IGNORE
// TYPE 4 = CATEGORY  IGNORE

interface Channel {
  id: string;
  type: number;
  last_message_id: string;
  flags: number;
  guild_id: string;
  name: string;
  parent_id: string;
  rate_limit_per_user: number;
  topic: string;
  position: number;
  permission_overwrites: PermissionOverwrite[];
  nsfw: boolean;
}

interface PermissionOverwrite {
  id: string;
  type: string;
  allow: number;
  deny: number;
  allow_new: string;
  deny_new: string;
}

async function getChannels(guild: string): Promise<Channel[]> {
  const token = process.env.LYNX_TOKEN!;
  const res = await fetch(
    `https://discord.com/api/guilds/${guild}/channels?limit=500`,
    {
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 }, // Ensure fresh data on every load
    },
  );
  if (!res.ok) return [];
  return res.json();
}

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ guild: string }>;
}) {
  const { guild } = await params;
  const channels: Channel[] = await getChannels(guild);

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      <PageHeader
        title="Channels"
        description={`Select a channel in Guild ${guild} to send messages`}
        backHref="/lynx/chat/guilds"
        backLabel="Back to Guilds"
        className="relative z-10"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {channels && channels.length > 0 ? (
          channels
            .filter((c) => c.type !== 4 && c.type !== 15 && c.type !== 2) // Ignore Categories and Forums
            .map((channel) => {
              const isVoice = channel.type === 2;

              return (
                <Link
                  key={channel.id}
                  href={`/lynx/chat/guilds/${guild}/${channel.id}`}
                  className="block h-full"
                >
                  <Card className="h-full hover:scale-[1.02] transform-gpu backface-visibility-hidden transition-all duration-300 cursor-pointer group shadow-sm overflow-hidden bg-card border-border">
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-2.5 rounded-lg border flex items-center justify-center transition-colors",
                              isVoice
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                : "bg-primary/10 border-primary/20 text-primary",
                              channel.nsfw &&
                                "bg-destructive/10 border-destructive/20 text-destructive",
                            )}
                          >
                            <div className="relative z-10">
                              {isVoice ? (
                                <Volume2 className="w-5 h-5" />
                              ) : (
                                <Hash className="w-5 h-5" />
                              )}
                            </div>
                          </div>
                          <CardTitle className="text-xl text-foreground flex items-center gap-2 truncate">
                            {channel.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {channel.nsfw && (
                            <Badge
                              variant="destructive"
                              className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] uppercase px-1.5 h-5"
                            >
                              NSFW
                            </Badge>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })
        ) : (
          <div>No channels found</div>
        )}
      </div>
    </div>
  );
}
