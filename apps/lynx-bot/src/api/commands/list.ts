import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { Command } from "../../structures/Command";

export default class ListCommandsApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      docs: `### Endpoint
\`GET /commands/list\`

### Summary
Returns a list of all bot commands and their metadata.

### Response
JSON array of command objects.`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    const commands = this.client.commands.map((command: Command) => {
      return {
        name: command.name,
        description: command.description,
        category: command.category,
        options: command.options,
        cooldown: command.cooldown,
        userPermissions: command.userPermissions,
        clientPermissions: command.clientPermissions,
        dev: command.dev,
        serverOnly: command.serverOnly,
        userOnly: command.userOnly,
        enabled: command.enabled,
        nsfw: command.nsfw,
        cooldownFilteredUsers: command.cooldownFilteredUsers,
        allowDm: command.allowDm,
        docs: command.docs,
      };
    });

    if (commands.length <= 0)
      return res.status(404).json({ error: "No commands found" });

    return res.json(commands);
  };
}
