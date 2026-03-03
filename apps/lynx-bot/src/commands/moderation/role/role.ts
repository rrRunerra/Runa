import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../../../structures/Command";
import { client } from "../../../index";

export default class RoleCommand extends Command {
  constructor() {
    super({
      name: "role",
      description: "Manage roles.",
      category: "Moderation",
      cooldown: 3,
      nsfw: false,
      clientPermissions: ["ManageRoles"],
      userPermissions: ["ManageRoles"],
      dev: client.mode,
      enabled: true,
      cooldownFilteredUsers: [],
      serverOnly: [],
      userOnly: [],
      options: [
        {
          name: "add",
          description: "Add a role to a user",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "user",
              description: "The user to add the role to",
              type: ApplicationCommandOptionType.User,
              required: true,
            },
            {
              name: "role",
              description: "The role to add",
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
        },
        {
          name: "remove",
          description: "Remove a role from a user",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "user",
              description: "The user to remove the role from",
              type: ApplicationCommandOptionType.User,
              required: true,
            },
            {
              name: "role",
              description: "The role to remove",
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
        },
        {
          name: "info",
          description: "Get information about a role",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "role",
              description: "The role to get info about",
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
        },
      ],
      allowDm: false,
      docs: `### Summary
Main command for role management.

### Usage
\`/role <subcommand> [options]\`

### Details
- **add**: Assign a role to a member.
- **remove**: Take a role from a member.
- **info**: View detailed role metadata.`,
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    // Logic is handled by subcommands
  }
}
