import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { Request, Response } from "express";
export default class ListDatabasesApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      docs: `### Endpoint
\`GET /database/list\`

### Summary
Returns status or statistics from the Prisma database.`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    const databases = Object.keys(this.client.prisma).filter(
      (key) =>
        !key.startsWith("$") &&
        !key.startsWith("_") &&
        key != "constructor" &&
        key.startsWith("lynx"),
    );
    return res.json(databases);
  };
}
