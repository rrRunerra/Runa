import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class GetApiApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/apis/getApi/:name",
      docs: `### Endpoint
\`GET /apis/getApi/:name\`

### Summary
Returns detailed information about a specific API endpoint.

### Parameters
- \`name\`: The route/name of the API.

### Response
Detailed API metadata or error.`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    const { name } = req.params;
    const api = this.client.apis.get(name);

    if (!api) {
      return res.status(404).json({ error: "API not found" });
    }

    return res.json({
      name,
      enabled: api.enabled,
      docs: api.docs,
    });
  };
}
