import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
  Role,
} from "discord.js";
import { SubCommand } from "../../../structures/SubCommand";
import { client } from "../../../index";

const errorEmbed = new EmbedBuilder()
  .setColor("Red")
  .setTimestamp()
  .setTitle("Error");

const successEmbed = new EmbedBuilder()
  .setColor("Green")
  .setTimestamp()
  .setTitle("Success");

export default class RoleAddSubCommand extends SubCommand {
  constructor() {
    super(client, {
      name: "role.add",
      enabled: true,
      docs: `### Summary
Add a role to a member.

### Usage
\`/role add <user> <role>\`

### Details
- Performs hierarchy checks for the bot and the invoker.
- Requires 'Manage Roles' permission.`,
    });
  }

  public async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getMember("user") as GuildMember;
    const role = interaction.options.getRole("role") as Role;

    if (!user) {
      errorEmbed.setDescription("Could not resolve user.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (user.roles.cache.has(role.id)) {
      errorEmbed.setDescription(`${user} already has the role ${role}.`);
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (
      role.position >= interaction.guild!.members.me!.roles.highest.position
    ) {
      errorEmbed.setDescription(
        "I cannot add this role because it is higher than or equal to my highest role.",
      );
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const executor = interaction.member as GuildMember;
    if (
      role.position >= executor.roles.highest.position &&
      interaction.user.id !== interaction.guild!.ownerId
    ) {
      errorEmbed.setDescription(
        "You cannot add this role because it is higher than or equal to your highest role.",
      );
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await user.roles.add(role);
      successEmbed.setDescription(`Successfully added ${role} to ${user}.`);
      return interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error(error);
      errorEmbed.setDescription("An error occurred while adding the role.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
