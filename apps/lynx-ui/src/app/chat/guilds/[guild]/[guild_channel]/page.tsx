import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import MessageInput from "./MessageInput";
import LiveMessageList from "./LiveMessageList";

async function getChatContext(guildId: string, channelId: string) {
  const token = process.env.LYNX_TOKEN!;
  try {
    const [guildRes, channelsRes] = await Promise.all([
      fetch(`https://discord.com/api/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${token}` },
        next: { revalidate: 3600 },
      }),
      fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${token}` },
        next: { revalidate: 3600 },
      }),
    ]);

    const guildData = await guildRes.json();
    const channelsData = await channelsRes.json();
    const channelData = Array.isArray(channelsData)
      ? channelsData.find((c: any) => c.id === channelId) // eslint-disable-line @typescript-eslint/no-explicit-any
      : null;

    return {
      guildName: guildData.name || "Unknown Guild",
      channelName: channelData?.name || "unknown-channel",
    };
  } catch (err) {
    console.error("Context fetch error:", err);
    return { guildName: "Unknown Guild", channelName: "unknown-channel" };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ guild: string; guild_channel: string }>;
}) {
  const { guild, guild_channel } = await params;
  let data: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  let error: string | null = null;

  const [context, messagesRes] = await Promise.all([
    getChatContext(guild, guild_channel),
    fetch(
      `${process.env.LYNX_API_URL}/guilds/${guild}/channels/${guild_channel}/getMessages`,
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
          href={`/lynx/chat/guilds/${guild}`}
          className="flex items-center text-xs text-zinc-500 hover:text-white transition-colors w-fit -ml-1"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          Back to Channels
        </Link>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium overflow-hidden whitespace-nowrap">
            <span className="hover:text-zinc-300 cursor-pointer transition-colors truncate">
              {context.guildName}
            </span>
            <span className="text-zinc-700">/</span>
            <span className="text-white font-semibold flex items-center gap-1">
              <span className="text-zinc-500 font-normal">#</span>
              {context.channelName}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-zinc-500 font-light opacity-50">#</span>
            {context.channelName}
          </h1>
        </div>
      </div>

      {/* Message Input at top */}
      <MessageInput guildId={guild} channelId={guild_channel} />

      {/* Real-time Message List */}
      <LiveMessageList
        initialMessages={data}
        guildId={guild}
        channelId={guild_channel}
      />
    </div>
  );
}
