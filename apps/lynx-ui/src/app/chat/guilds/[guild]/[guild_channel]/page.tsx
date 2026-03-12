import { auth } from "@runa/auth";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import AccessDenied from "@/components/AccessDenied";
import LiveMessageList from "./LiveMessageList";
import MessageInput from "./MessageInput";

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

  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

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
          href={`/chat/guilds/${guild}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Channels
        </Link>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium overflow-hidden whitespace-nowrap">
            <span className="hover:text-foreground cursor-pointer transition-colors truncate">
              {context.guildName}
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground font-semibold flex items-center gap-1">
              <span className="text-muted-foreground font-normal">#</span>
              {context.channelName}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <span className="text-muted-foreground font-light opacity-50">
              #
            </span>
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
