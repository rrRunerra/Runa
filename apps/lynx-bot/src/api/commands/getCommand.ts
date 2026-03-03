import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class GetCommandApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/commands/getCommand/:name",
      docs: `### Endpoint
\`GET /commands/getCommand/:name\`

### Summary
Returns detailed information about a specific command.

### Parameters
- \`name\`: The name of the command to fetch.

### Response
Detailed command object or error.`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    const command = this.client.commands.get(req.params.name);
    if (!command) return res.status(404).json({ error: "Command not found" });

    const subCommands = Array.from(this.client.subCommands.values())
      .filter((sub) => sub.name.startsWith(`${command.name}.`))
      .map((sub) => ({
        name: sub.name,
        enabled: sub.enabled,
        docs: sub.docs,
      }));

    return res.json({
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
      subCommands,
    });
  };
}
