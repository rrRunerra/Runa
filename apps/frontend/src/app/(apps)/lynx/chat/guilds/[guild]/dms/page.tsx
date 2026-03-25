import { auth } from "@runa/auth";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <PageHeader
        title="Choose a Member"
        description="Select a member from this guild to start a Direct Message conversation."
        backHref={`/lynx/chat/guilds/${guild}`}
        backLabel="Back to Channels"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members && members.length > 0 ? (
          members.map((member) => (
            <Link
              key={member.id}
              href={`/lynx/chat/dms/start?userId=${member.id}`}
              className="block h-full"
            >
              <Card className="h-full hover:scale-[1.02] transform-gpu backface-visibility-hidden transition-all duration-300 cursor-pointer group shadow-sm overflow-hidden bg-card border-border">
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border border-border overflow-hidden flex items-center justify-center bg-accent/10">
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
                      <CardTitle className="text-xl text-foreground truncate">
                        {member.globalName || member.username}
                      </CardTitle>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
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
