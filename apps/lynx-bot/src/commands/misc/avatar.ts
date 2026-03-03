import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { Command } from "../../structures/Command";
import { client } from "../../index";

export default class AvatarCommand extends Command {
  constructor() {
    super({
      name: "avatar",
      description: "Get a user's avatar.",
      category: "Misc",
      cooldown: 3,
      nsfw: false,
      clientPermissions: ["SendMessages"],
      userPermissions: ["SendMessages"],
      dev: client.mode,
      enabled: true,
      cooldownFilteredUsers: [],
      serverOnly: [],
      userOnly: [],
      options: [
        {
          name: "user",
          description: "The user to get the avatar of",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
        {
          name: "server",
          description: "Get the server avatar if applicable",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
      allowDm: true,
      docs: `### Summary
View a user's avatar in high resolution.

### Usage
\`/avatar [user] [server]\`

### Details
- \`server\`: If true, shows the member's server-specific avatar.
- Provides direct download links for PNG, JPG, and WEBP formats.`,
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const server = interaction.options.getBoolean("server") || false;
    const member = interaction.guild?.members.cache.get(user.id);

    const embed = new EmbedBuilder()
      .setColor("Random")
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    let avatarUrl: string;
    let description: string;

    if (server && member && member.avatar) {
      avatarUrl = member.displayAvatarURL({ size: 4096 });
      description = `Server Avatar for **${member.displayName}**`;
    } else {
      avatarUrl = user.displayAvatarURL({ size: 4096 });
      description = `Avatar for **${user.username}**`;
    }

    embed.setTitle(description);
    embed.setImage(avatarUrl);

    // Add download link
    const png = avatarUrl.replace("webp", "png");
    const jpg = avatarUrl.replace("webp", "jpg");
    embed.setDescription(
      `[WEBP](${avatarUrl}) | [PNG](${png}) | [JPG](${jpg})`,
    );

    return interaction.reply({ embeds: [embed] });
  }
}
