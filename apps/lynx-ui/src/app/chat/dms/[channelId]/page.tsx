import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import MessageInput from "../../guilds/[guild]/[guild_channel]/MessageInput";
import LiveMessageList from "../../guilds/[guild]/[guild_channel]/LiveMessageList";

async function getDmContext(channelId: string) {
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
      recipientId: recipient?.id,
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
}) {
  const { channelId } = await params;
  let data: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  let error: string | null = null;

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

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold text-rose-500">Error</h1>
        <p className="text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4 max-w-4xl relative min-h-screen pb-20">
      {/* Header and Navigation */}
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5">
        <Link
          href="/lynx/chat/dms"
          className="flex items-center text-xs text-zinc-500 hover:text-white transition-colors w-fit -ml-1"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          Back to DMs
        </Link>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium overflow-hidden whitespace-nowrap">
            <span className="text-white font-semibold flex items-center gap-1">
              <span className="text-zinc-500 font-normal">@</span>
              {context.recipientName}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-zinc-500 font-light opacity-50">@</span>
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
