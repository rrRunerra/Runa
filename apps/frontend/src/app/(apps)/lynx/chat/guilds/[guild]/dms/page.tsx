import { auth } from "@runa/auth";
import { hasPermission, LynxFlags } from "@runa/permissions";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { cn } from "@/lib/utils";
import { getServerTranslation } from "@/lib/serverTranslation";

import { GuildMember } from "@/types/lynx";

async function getGuildUsers(guildId: string): Promise<GuildMember[]> {
  const res = await fetch(
    `${process.env.LYNX_API_URL}/guilds/${guildId}/getUsers`,
    {
      cache: "force-cache",
      next: {
        revalidate: 30, // revalidate every 30 seconds
        tags: ["guilds"],
      },
    },
  );
  if (!res.ok) return [];
  return res.json();
}

export default async function MemberGridPage({
  params,
}: {
  params: Promise<{ guild: string }>;
}): Promise<React.JSX.Element> {
  const { guild } = await params;
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session.user?.permissions, LynxFlags.GUILD_CHAT)
  ) {
    return <AccessDenied />;
  }
  const members = await getGuildUsers(guild);
  const { t } = await getServerTranslation();

  return (
    <div className="container mx-auto p-6 md:p-8 flex flex-col gap-6 md:gap-8 select-none">
      <PageHeader
        title={t("chooseMember")}
        description={t("selectMemberDesc")}
        backHref={`/lynx/chat/guilds/${guild}`}
        backLabel={t("backToChannels")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {members && members.length > 0 ? (
          members.map((member) => (
            <Link
              key={member.id}
              href={`/lynx/chat/dms/start?userId=${member.id}`}
              className="block h-full"
            >
              <div className="h-full relative overflow-hidden rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-border/60 hover:bg-accent/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate transform-[translate3d(0,0,0)]">
                {/* Accent glow on hover */}
                <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

                <div className="flex items-center justify-between relative z-10 w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="size-12 rounded-full overflow-hidden border border-border/80 bg-muted/50 shadow-inner group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                        <Image
                          src={member.avatarURL}
                          alt=""
                          width={48}
                          height={48}
                          className="size-full object-cover"
                        />
                      </div>
                      <div
                        className={cn(
                          "absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background",
                          member.status === "online"
                            ? "bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"
                            : member.status === "idle"
                              ? "bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                              : member.status === "dnd"
                                ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                : "bg-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {member.globalName || member.username}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        @{member.username}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-16 text-center rounded-2xl border-2 border-dashed border-border/40 bg-muted/10 italic text-muted-foreground text-sm">
            {t("noMembersFound")}
          </div>
        )}
      </div>
    </div>
  );
}
