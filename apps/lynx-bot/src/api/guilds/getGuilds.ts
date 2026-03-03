import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class GetGuildsApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/guilds",
      docs: `### Endpoint
\`GET /guilds\`

### Summary
Gets all guilds the bot is in.

`,
    });
    this.client = client;
  }

  public GET = async (req: Request, res: Response) => {
    const guilds = this.client.guilds.cache.map((guild) => {
      return {
        id: guild.id,
        name: guild.name,
        iconUrl: guild.iconURL(),
      };
    });
    if (!guilds) return res.status(404).json({ error: "Guilds not found" });

    res.json({
      guilds: guilds,
    });
  };
}
