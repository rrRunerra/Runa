import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class GetSubCommandApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/subCommands/getSubCommand/:name",
      docs: `### Endpoint
\`GET /subCommands/getSubCommand/:name\`

### Summary
Returns info about a specific subcommand.

### Parameters
- \`name\`: The name of the subcommand (e.g., \`edu.sync\`).`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    const subCommand = this.client.subCommands.get(req.params.name);
    if (!subCommand)
      return res.status(404).json({ error: "SubCommand not found" });
    return res.json({
      name: subCommand.name,
      enabled: subCommand.enabled,
      docs: subCommand.docs,
    });
  };
}
