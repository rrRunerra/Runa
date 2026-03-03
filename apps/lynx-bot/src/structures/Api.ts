import { Request, Response } from "express";
import { createLogger } from "../utils/logger";
import { ConsoleLogger } from "@nestjs/common";

export class API {
  public route?: string;
  public enabled: boolean;
  public docs: string;
  public logger: ConsoleLogger;

  constructor(options: { route?: string; enabled: boolean; docs: string }) {
    this.route = options.route;
    this.enabled = options.enabled;
    this.docs = options.docs;
    this.logger = createLogger(this.route || "Automatic Route");
  }

  public GET(req: Request, res: Response): any {
    return res.status(405).send("Method Not Allowed");
  }

  public POST(req: Request, res: Response): any {
    return res.status(405).send("Method Not Allowed");
  }

  public PUT(req: Request, res: Response): any {
    return res.status(405).send("Method Not Allowed");
  }

  public DELETE(req: Request, res: Response): any {
    return res.status(405).send("Method Not Allowed");
  }

  public PATCH(req: Request, res: Response): any {
    return res.status(405).send("Method Not Allowed");
  }
}
