import { client } from "../../index";
import { Command } from "../../structures/Command";
import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
} from "discord.js";

export default class EduCommand extends Command {
  constructor() {
    super({
      name: "edu",
      description: "Edupage Utils",
      category: "edu",
      allowDm: true,
      serverOnly: [],
      dev: client.mode,
      clientPermissions: [
        "ManageChannels",
        "ManageMessages",
        "EmbedLinks",
        "SendMessages",
        "SendMessagesInThreads",
        "ManageThreads",
      ],
      userPermissions: [
        "ManageChannels",
        "ManageMessages",
        "EmbedLinks",
        "SendMessages",
        "SendMessagesInThreads",
        "ManageThreads",
      ],
      enabled: true,
      cooldown: 60,
      cooldownFilteredUsers: [],
      nsfw: false,
      options: [
        {
          name: "sync",
          description: "Sync homework from Edupage to Discord",
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: "list-teachers",
          description: "List all teachers from Edupage",
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: "remove",
          description: "Remove homework using superID",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "superid",
              description: "The superID of the homework to remove",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "fill-db",
          description: "Fill database with existing homework (without posting)",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
      userOnly: [],
      docs: `### Summary
Main command for Edupage utilities.

### Usage
\`/edu <subcommand> [options]\`

### Details
- **sync**: Sync homework to Discord.
- **list-teachers**: List registered teachers.
- **fill-db**: Populate database without posting.
- **remove**: Delete homework by ID.`,
    });
  }

  public async slashCommandExecute(interaction: ChatInputCommandInteraction) {}
}
