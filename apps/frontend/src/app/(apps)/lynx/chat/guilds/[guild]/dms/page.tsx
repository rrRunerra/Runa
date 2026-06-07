import { auth } from "@runa/auth";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { cn } from "@/lib/utils";

import { GuildMember } from "@/types/lynx";

async function getGuildUsers(guildId: string): Promise<GuildMember[]> {
  const res = await fetch(
    `${process.env.LYNX_API_URL}/guilds/${guildId}/getUsers`,
    {
      cache: "force-cache",
        next: {
          revalidate: 30, // revalidate every 30 seconds
          tags: ["guilds"]
        }
    },
  );
  if (!res.ok) return [];
  return res.json();
}

export default async function MemberGridPage({
  params,
}: {
  params: Promise<{ guild: string }>;
}) {
  const { guild } = await params;
  const members = await getGuildUsers(guild);

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      <PageHeader
        title="Choose a Member"
        description="Select a member from this guild to start a Direct Message conversation."
        backHref={`/lynx/chat/guilds/${guild}`}
        backLabel="Back to Channels"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {members && members.length > 0 ? (
          members.map((member) => (
            <Link
              key={member.id}
              href={`/lynx/chat/dms/start?userId=${member.id}`}
              className="block h-full"
            >
              <div className="h-full relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-zinc-700/50 hover:bg-zinc-800/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate [transform:translate3d(0,0,0)]">
                {/* Accent glow on hover */}
                <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

                <div className="flex items-center justify-between relative z-10 w-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="size-12 rounded-full overflow-hidden border border-zinc-800/80 bg-zinc-900/50 shadow-inner group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                        <Image
                          src={member.avatarURL}
                          alt=""
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className={cn(
                          "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-zinc-950",
                          member.status === "online"
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"
                            : member.status === "idle"
                              ? "bg-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                              : member.status === "dnd"
                                ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                : "bg-zinc-500",
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
          <div className="col-span-full py-16 text-center rounded-2xl border-2 border-dashed border-zinc-800/40 bg-zinc-900/10 italic text-muted-foreground text-sm">
            No members found in this guild
          </div>
        )}
      </div>
    </div>
  );
}
