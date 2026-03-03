import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class GetEventApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/events/getEvent/:name",
      docs: `### Endpoint
\`GET /events/getEvent/:name\`

### Summary
Returns info about a specific event listener.

### Parameters
- \`name\`: The name of the event.`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    const event = this.client.events.get(req.params.name);
    if (!event) return res.status(404).json({ error: "Event not found" });
    return res.json({
      name: event.name,
      enabled: event.enabled,
      description: event.description,
      type: event.type,
      once: event.once,
      docs: event.docs,
    });
  };
}
