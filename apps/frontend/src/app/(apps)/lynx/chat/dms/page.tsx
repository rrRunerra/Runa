import { auth } from "@runa/auth";
import { ChevronRight, MessageSquare, User as UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

import { DMChannel } from "@/types/lynx";

async function getActiveDms(): Promise<DMChannel[]> {
  const res = await fetch(`${process.env.LYNX_API_URL}/dms/getDms`, {
    cache: "force-cache",
        next: {
          revalidate: 10, // revalidate every 10 seconds
          tags: ["dms"]
        }
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function DmListPage() {
  const dms = await getActiveDms();

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      <PageHeader
        title="Direct Messages"
        description="Your recent conversations and active DM channels."
        backHref="/lynx/chat"
        backLabel="Back to Chat"
      >
        <Link href="/lynx/chat/guilds?intent=dm">
          <Button className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-lg shadow-primary/10">
            <span className="flex items-center gap-2">New Message</span>
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {dms && dms.length > 0 ? (
          dms.map((dm) => (
            <Link key={dm.id} href={`/lynx/chat/dms/${dm.id}`} className="block h-full">
              <div className="h-full relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-zinc-700/50 hover:bg-zinc-800/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate [transform:translate3d(0,0,0)]">
                {/* Accent glow on hover */}
                <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

                <div className="flex items-center justify-between relative z-10 w-full mb-4">
                  <div className="size-12 rounded-full overflow-hidden border border-zinc-800/80 bg-zinc-900/50 shadow-inner group-hover:scale-105 transition-transform duration-300 shrink-0 flex items-center justify-center">
                    {dm.recipient.avatarURL ? (
                      <Image
                        src={dm.recipient.avatarURL}
                        alt=""
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="relative z-10">
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {dm.recipient.globalName || dm.recipient.username}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    @{dm.recipient.username}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-16 text-center space-y-4 rounded-2xl border-2 border-dashed border-zinc-800/40 bg-zinc-900/10">
            <div className="size-12 rounded-xl bg-zinc-900/50 border border-zinc-800 mx-auto flex items-center justify-center text-primary shadow-inner">
              <MessageSquare className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                No active DM conversations found
              </p>
              <p className="text-xs text-muted-foreground">
                Start a conversation from a guild member list
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
