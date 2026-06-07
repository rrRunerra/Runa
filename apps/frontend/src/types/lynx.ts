export interface PermissionOverwrite {
  id: string;
  type: string;
  allow: number;
  deny: number;
  allow_new: string;
  deny_new: string;
}

export interface Channel {
  id: string;
  type: number;
  last_message_id: string;
  flags: number;
  guild_id: string;
  name: string;
  parent_id: string;
  rate_limit_per_user: number;
  topic: string;
  position: number;
  permission_overwrites: PermissionOverwrite[];
  nsfw: boolean;
}

export interface GuildMember {
  id: string;
  username: string;
  globalName: string | null;
  avatarURL: string;
  status: string;
}

export interface Attachment {
  url: string;
  name: string;
  contentType?: string;
}

export interface Embed {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  video?: { url: string };
  image?: { url: string };
  thumbnail?: { url: string };
  footer?: { text: string; icon_url?: string };
}

export interface Message {
  id: string;
  author: {
    avatarURL?: string;
    globalName?: string;
    username: string;
  };
  createdTimestamp: number;
  cleanContent?: string;
  attachments?: Attachment[];
  embeds?: Embed[];
}

export interface DMChannel {
  id: string;
  recipient: {
    id: string;
    username: string;
    globalName: string | null;
    avatarURL: string;
  };
  lastMessageId: string | null;
}
