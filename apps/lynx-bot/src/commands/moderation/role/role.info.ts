import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Role,
  PermissionFlagsBits,
} from "discord.js";
import { SubCommand } from "../../../structures/SubCommand";
import { client } from "../../../index";

export default class RoleInfoSubCommand extends SubCommand {
  constructor() {
    super(client, {
      name: "role.info",
      enabled: true,
      docs: `### Summary
View detailed information about a role.

### Usage
\`/role info <role>\`

### Details
- Displays role ID, color, permissions, and member count.`,
    });
  }

  public async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const role = interaction.options.getRole("role") as Role;

    const embed = new EmbedBuilder()
      .setColor(role.color || "Random")
      .setTitle(`Role Info: ${role.name}`)
      .addFields(
        { name: "ID", value: role.id, inline: true },
        { name: "Color", value: role.hexColor, inline: true },
        { name: "Position", value: role.position.toString(), inline: true },
        { name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true },
        {
          name: "Mentionable",
          value: role.mentionable ? "Yes" : "No",
          inline: true,
        },
        { name: "Members", value: role.members.size.toString(), inline: true },
        {
          name: "Created At",
          value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
      )
      .setTimestamp();

    // Key Permissions
    const keyPermissions = [
      "Administrator",
      "ManageGuild",
      "ManageRoles",
      "ManageChannels",
      "KickMembers",
      "BanMembers",
      "ManageMessages",
      "MentionEveryone",
    ];

    const perms = role.permissions.toArray();
    const notablePerms = perms.filter((p) => keyPermissions.includes(p));

    if (role.permissions.has(PermissionFlagsBits.Administrator)) {
      embed.addFields({
        name: "Key Permissions",
        value: "Administrator (All Permissions)",
      });
    } else if (notablePerms.length > 0) {
      embed.addFields({
        name: "Key Permissions",
        value: notablePerms.join(", "),
      });
    }

    return interaction.reply({ embeds: [embed] });
  }
}
