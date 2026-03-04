import { Card, CardHeader, CardTitle, Button } from "@runa/ui";
import { ChevronRight, MessageSquare, User as UserIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";

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
    <div className="container mx-auto p-8 space-y-8">
      <PageHeader
        title="Direct Messages"
        description="Your recent conversations and active DM channels."
        backHref="/chat"
        backLabel="Back to Chat"
      >
        <Link href="/chat/guilds?intent=dm">
          <Button>
            <span className="flex items-center gap-2">New Message</span>
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dms && dms.length > 0 ? (
          dms.map((dm) => (
            <Link key={dm.id} href={`/chat/dms/${dm.id}`}>
              <Card className="h-full hover:scale-[1.02] transition-transform duration-300 cursor-pointer group overflow-hidden bg-card border-border shadow-sm">
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-full border border-border overflow-hidden bg-accent/10 flex items-center justify-center">
                      {dm.recipient.avatarURL ? (
                        <Image
                          src={dm.recipient.avatarURL}
                          alt=""
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-6 h-6 text-muted-foreground" />
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
