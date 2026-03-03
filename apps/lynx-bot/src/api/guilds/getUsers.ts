import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class GetUsersApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/guilds/:guildId/getUsers",
      docs: `### Endpoint
\`GET /guilds/:guildId/getUsers\`

### Summary
Returns a list of members in the specified guild.`,
    });
    this.client = client;
  }

  public GET = async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;

    try {
      const guild =
        this.client.guilds.cache.get(guildId) ||
        (await this.client.guilds.fetch(guildId));

      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      // Fetch all members to ensure they are available
      const members = await guild.members.fetch();

      const userData = members.map((m) => ({
        id: m.id,
        username: m.user.username,
        globalName: m.user.globalName,
        avatarURL: m.user.displayAvatarURL(),
        status: m.presence?.status || "offline",
        joinedTimestamp: m.joinedTimestamp,
      }));

      res.json(userData);
    } catch (error) {
      this.logger.error(error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  };
}
