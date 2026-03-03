import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { SubCommand } from "../../structures/SubCommand";

export default class ListCommandsApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      docs: `### Endpoint
\`GET /subCommands/list\`

### Summary
Lists all registered subcommands.

### Response
JSON array of subcommand metadata.`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    const subCommands = this.client.subCommands.map((command: SubCommand) => {
      return {
        name: command.name,
        enabled: command.enabled,
        docs: command.docs,
      };
    });

    if (subCommands.length <= 0)
      return res.status(404).json({ error: "No subcommands found" });

    return res.json(subCommands);
  };
}
