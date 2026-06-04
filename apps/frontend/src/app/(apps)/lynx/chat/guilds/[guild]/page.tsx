import { auth } from "@runa/auth";
import { ChevronRight, Hash, Volume2 } from "lucide-react";
import Link from "next/link";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { Badge } from "@/components/ui/badge";
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
      cache: "force-cache",
        next: {
          revalidate: 60, // revalidate every 60 seconds
          tags: ["guilds"]
        }
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
                  <div className="h-full relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-zinc-700/50 hover:bg-zinc-800/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate [transform:translate3d(0,0,0)]">
                    {/* Accent glow on hover */}
                    <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

                    <div className="flex items-center justify-between relative z-10 w-full">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "size-10 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-inner shrink-0",
                            isVoice
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-primary/10 border-primary/20 text-primary",
                            channel.nsfw &&
                              "bg-destructive/10 border-destructive/20 text-destructive",
                          )}
                        >
                          {isVoice ? (
                            <Volume2 className="size-5" />
                          ) : (
                            <Hash className="size-5" />
                          )}
                        </div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[170px]" title={channel.name}>
                          {channel.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {channel.nsfw && (
                          <Badge
                            variant="destructive"
                            className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase px-1.5 h-5 shadow-[0_0_8px_rgba(239,68,68,0.08)]"
                          >
                            NSFW
                          </Badge>
                        )}
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
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
