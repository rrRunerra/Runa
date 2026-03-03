import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class DmStreamApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/dms/:channelId/stream",
      docs: `### Endpoint
\`GET /dms/:channelId/stream\`

### Summary
Opens an SSE stream for real-time messages in a specific DM channel.`,
    });
    this.client = client;
  }

  public GET = async (req: Request, res: Response) => {
    const { channelId } = req.params;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const onMessage = (data: any) => {
      if (data.channelId === channelId) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    this.client.on("message_create_socket", onMessage);

    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      this.client.off("message_create_socket", onMessage);
    });
  };
}
