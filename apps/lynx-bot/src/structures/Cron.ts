import { LynxClient } from "../client/client";
import { client } from "../index";
import { createLogger } from "../utils/logger";
import { ConsoleLogger } from "@nestjs/common";
import { ICronOptions } from "@astral/types/lynx";

export class Cron {
  public name: string;
  public description: string;
  public enabled: boolean;
  public repeatTime: number; //in miliseconds
  public client: LynxClient = client;
  public excludeRunOnStart: boolean;
  public docs: string;
  public logger: ConsoleLogger;

  constructor(options: ICronOptions) {
    this.name = options.name;
    this.description = options.description;
    this.enabled = options.enabled;
    this.repeatTime = options.repeatTime;
    this.excludeRunOnStart = options.excludeRunOnStart;
    this.docs = options.docs;
    this.logger = createLogger(this.name);
  }

  public async cronExecute() {}
}

export type { ICronOptions } from "@astral/types/lynx";
