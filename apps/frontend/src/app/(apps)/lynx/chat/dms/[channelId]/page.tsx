import { auth } from "@runa/auth";
import { hasPermission, LynxFlags } from "@runa/permissions";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import AccessDenied from "@/components/lynx/AccessDenied";
import LiveMessageList from "../../guilds/[guild]/[guild_channel]/LiveMessageList";
import MessageInput from "../../guilds/[guild]/[guild_channel]/MessageInput";
import { getServerTranslation } from "@/lib/serverTranslation";

async function getDmContext(
  channelId: string,
): Promise<{ recipientName: string; recipientId: string | null }> {
  const token = process.env.LYNX_TOKEN!;
  try {
    const res = await fetch(`https://discord.com/api/channels/${channelId}`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    const recipient = data.recipients?.[0];

    return {
      recipientName:
        recipient?.global_name || recipient?.username || "Unknown User",
      recipientId: recipient?.id || null,
    };
  } catch (err) {
    console.error("DM Context fetch error:", err);
    return { recipientName: "Unknown User", recipientId: null };
  }
}

export default async function DmChatPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}): Promise<React.JSX.Element> {
  const { channelId } = await params;
  let data: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  let error: string | null = null;

  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, LynxFlags.DM_CHAT)) {
    return <AccessDenied />;
  }

  const [context, messagesRes] = await Promise.all([
    getDmContext(channelId),
    fetch(
      `${process.env.LYNX_API_URL}/dms/getMessages?channelId=${channelId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 0 },
      },
    ),
  ]);

  try {
    if (!messagesRes.ok) {
      const errData = await messagesRes.json().catch(() => ({}));
      throw new Error(
        errData.error || `HTTP error! status: ${messagesRes.status}`,
      );
    }
    data = await messagesRes.json();
  } catch (err: any) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Fetch error:", err);
    error = err.message;
  }

  const { t } = await getServerTranslation();

  if (error) {
    return (
      <div className="container mx-auto p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-destructive">{t("error")}</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 flex flex-col gap-4 max-w-4xl relative min-h-screen pb-20 select-none">
      {/* Header and Navigation */}
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <Link
          href="/lynx/chat/dms"
          className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors w-fit -ml-1"
        >
          <ChevronLeft className="size-3.5 mr-1" />
          {t("backToDms")}
        </Link>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium overflow-hidden whitespace-nowrap">
            <span className="text-foreground font-semibold flex items-center gap-1">
              <span className="text-muted-foreground font-normal">@</span>
              {context.recipientName}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="text-muted-foreground font-light opacity-50">@</span>
            {context.recipientName}
          </h1>
        </div>
      </div>

      {/* Message Input at top */}
      <MessageInput guildId="" channelId={channelId} />

      {/* Real-time Message List */}
      <LiveMessageList
        initialMessages={data}
        guildId=""
        channelId={channelId}
      />
    </div>
  );
}
