import { Card, CardHeader, CardTitle, cn } from "@runa/ui";
import { ChevronRight, ChevronLeft, User as UserIcon } from "lucide-react";
import Link from "next/link";

interface GuildMember {
  id: string;
  username: string;
  globalName: string | null;
  avatarURL: string;
  status: string;
}

async function getGuildUsers(guildId: string): Promise<GuildMember[]> {
  const res = await fetch(
    `${process.env.LYNX_API_URL}/guilds/${guildId}/getUsers`,
    {
      next: { revalidate: 0 },
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

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      <div className="relative z-10 flex flex-col gap-4">
        <Link
          href={`/chat/guilds/${guild}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Channels
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Choose a Member
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a member from this guild to start a Direct Message
            conversation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {members && members.length > 0 ? (
          members.map((member) => (
            <Link key={member.id} href={`/chat/dms/start?userId=${member.id}`}>
              <Card className="h-full hover:scale-[1.02] transition-transform duration-300 cursor-pointer group overflow-hidden bg-card border-border shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border border-border overflow-hidden bg-accent/10">
                        <img
                          src={member.avatarURL}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className={cn(
                          "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card",
                          member.status === "online"
                            ? "bg-emerald-500"
                            : member.status === "idle"
                              ? "bg-yellow-500"
                              : member.status === "dnd"
                                ? "bg-rose-500"
                                : "bg-zinc-500",
                        )}
                      />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <CardTitle className="mt-4 text-xl text-foreground truncate">
                    {member.globalName || member.username}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    @{member.username}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-20 text-center opacity-70">
            <p className="text-muted-foreground italic">
              No members found in this guild
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
