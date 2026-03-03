import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { Event } from "../../structures/Event";

export default class ListEventsApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      docs: `### Endpoint
\`GET /events/list\`

### Summary
Lists all active bot event listeners.

### Response
JSON array of event metadata.`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    const events = this.client.events.map((event: Event) => {
      return {
        name: event.name,
        enabled: event.enabled,
        description: event.description,
        type: event.type,
        once: event.once,
        docs: event.docs,
      };
    });

    if (events.length <= 0)
      return res.status(404).json({ error: "No events found" });

    return res.json(events);
  };
}
