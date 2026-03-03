import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class ListApisApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      docs: `### Endpoint
\`GET /apis/list\`

### Summary
Lists all registered API endpoints and their documentation.

### Response
JSON array of API metadata.`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    const apis = this.client.apis.map((api: API, route: string) => {
      return {
        name: route,
        enabled: api.enabled,
        docs: api.docs,
      };
    });

    if (apis.length <= 0)
      return res.status(404).json({ error: "No apis found" });

    return res.json(apis);
  };
}
