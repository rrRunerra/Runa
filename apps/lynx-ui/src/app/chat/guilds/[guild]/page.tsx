import { Card, CardHeader, CardTitle, Badge, cn } from "@astral/ui";
import { ChevronRight, ChevronLeft, Hash, Volume2 } from "lucide-react";
import Link from "next/link";

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

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      {/* Header */}
      <div className="relative z-10 flex flex-col gap-4">
        <Link
          href="/lynx/chat/guilds"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Guilds
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Channels
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a channel in Guild {guild} to send messages
          </p>
        </div>
      </div>

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
                >
                  <Card className="h-full hover:scale-[1.02] transition-transform duration-300 cursor-pointer group overflow-hidden bg-card border-border shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div
                          className={cn(
                            "p-2.5 rounded-lg border relative overflow-hidden transition-colors",
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
                      <CardTitle className="mt-4 text-xl text-foreground flex items-center gap-2 truncate">
                        {channel.name}
                      </CardTitle>
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
