import { auth } from "@runa/auth";
import { hasPermission, LynxFlags } from "@runa/permissions";
import { ChevronRight, Hash, Volume2 } from "lucide-react";
import Link from "next/link";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getServerTranslation } from "@/lib/serverTranslation";

// TYPE 2 = VOICE
// TYPE 0 = TEXT
// TYPE 15 = FORUM   IGNORE
// TYPE 4 = CATEGORY  IGNORE

import { Channel } from "@/types/lynx";

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
        tags: ["guilds"],
      },
    },
  );
  if (!res.ok) return [];
  return res.json();
}

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ guild: string }>;
}): Promise<React.JSX.Element> {
  const { guild } = await params;
  const session = await auth();
  if (
    !session ||
    !hasPermission(session.user.permissions, LynxFlags.GUILD_CHAT)
  ) {
    return <AccessDenied />;
  }
  const channels: Channel[] = await getChannels(guild);
  const { t } = await getServerTranslation();

  return (
    <div className="container mx-auto p-8 flex flex-col gap-8 relative">
      <PageHeader
        title={t("discordChannels")}
        description={t("selectGuildMessages")}
        backHref="/lynx/chat/guilds"
        backLabel={t("chooseGuild")}
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
                  <div className="h-full relative overflow-hidden rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-border/60 hover:bg-accent/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate transform-[translate3d(0,0,0)]">
                    {/* Accent glow on hover */}
                    <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

                    <div className="flex items-center justify-between relative z-10 w-full">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "size-10 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-inner shrink-0",
                            isVoice
                              ? "bg-success/10 border-success/20 text-success"
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
                        <h3
                          className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[170px]"
                          title={channel.name}
                        >
                          {channel.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {channel.nsfw && (
                          <Badge
                            variant="destructive"
                            className="bg-destructive/10 text-destructive border border-destructive/20 text-[9px] font-bold uppercase px-1.5 h-5 shadow-[0_0_8px_rgba(239,68,68,0.08)]"
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
          <div>{t("noChannelsLinked")}</div>
        )}
      </div>
    </div>
  );
}
