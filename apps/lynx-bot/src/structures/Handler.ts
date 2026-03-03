import { ConsoleLogger } from "@nestjs/common";
import { LynxClient } from "../client/client";
import { createLogger } from "../utils/logger";

export class Handler {
  public name: string;
  public logger: ConsoleLogger;
  public client: LynxClient;

  constructor(client: LynxClient, name: string) {
    this.client = client;
    this.name = name;
    this.logger = createLogger(this.name);
  }
}
