import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class StreamApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/guilds/:guildId/channels/:channelId/stream",
      docs: `### Endpoint
\`GET /guilds/:guildId/channels/:channelId/stream\`

### Summary
Opens an SSE stream for real-time message updates in a specific channel.`,
    });
    this.client = client;
  }

  public GET = async (req: Request, res: Response) => {
    const { guildId, channelId } = req.params;

    // Headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const onMessage = (data: any) => {
      // Only push if it's the correct channel
      if (data.channelId === channelId && data.guildId === guildId) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Subscribe to internal message event
    this.client.on("message_create_socket", onMessage);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 15000);

    // Clean up when client disconnects
    req.on("close", () => {
      clearInterval(heartbeat);
      this.client.off("message_create_socket", onMessage);
    });
  };
}
