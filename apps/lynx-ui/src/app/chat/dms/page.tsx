import { Card, CardHeader, CardTitle, cn } from "@astral/ui";
import {
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  User as UserIcon,
  Plus,
} from "lucide-react";
import Link from "next/link";

interface DMChannel {
  id: string;
  recipient: {
    id: string;
    username: string;
    globalName: string | null;
    avatarURL: string;
  };
  lastMessageId: string | null;
}

async function getActiveDms(): Promise<DMChannel[]> {
  const res = await fetch(`${process.env.LYNX_API_URL}/dms/getDms`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function DmListPage() {
  const dms = await getActiveDms();

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      <div className="relative z-10 flex flex-col gap-4">
        <Link
          href="/lynx/chat"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Chat
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Direct Messages
            </h1>
            <p className="text-muted-foreground mt-1">
              Your recent conversations and active DM channels.
            </p>
          </div>
          <Link href="/lynx/chat/guilds?intent=dm">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all shadow-lg shadow-primary/20 active:scale-95">
              <Plus className="w-4 h-4" />
              New Message
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {dms && dms.length > 0 ? (
          dms.map((dm) => (
            <Link key={dm.id} href={`/lynx/chat/dms/${dm.id}`}>
              <Card className="h-full hover:scale-[1.02] transition-transform duration-300 cursor-pointer group overflow-hidden bg-card border-border shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-full border border-border overflow-hidden bg-accent/10">
                      {dm.recipient.avatarURL ? (
                        <img
                          src={dm.recipient.avatarURL}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <UserIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <CardTitle className="mt-4 text-xl text-foreground truncate">
                    {dm.recipient.globalName || dm.recipient.username}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    @{dm.recipient.username}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-20 text-center space-y-4 opacity-70">
            <div className="w-12 h-12 rounded-full bg-accent/10 mx-auto flex items-center justify-center text-muted-foreground border border-border">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground italic">
                No active DM conversations found
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Start a conversation from a guild member list
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
