import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Events,
} from "discord.js";
import { prisma } from "@runa/database";
import { Command } from "../structures/Command";
import { SubCommand } from "../structures/SubCommand";
import { Cron } from "../structures/Cron";
import { Event } from "../structures/Event";
import { CommandHandler } from "../handlers/commandHandler";
import { EventHandler } from "../handlers/eventHandler";
import { CronHandler } from "../handlers/cronHandler";
import "dotenv/config";
import { APIHandler } from "../handlers/apiHandler";
import { API } from "../structures/Api";

export class LynxClient extends Client {
  public mode: "development" | "production";
  public prisma = prisma;
  public owner: string = process.env.LYNX_OWNER!;

  public commands: Collection<string, Command>;
  public subCommands: Collection<string, SubCommand>;
  public crons: Collection<string, Cron>;
  public events: Collection<string, Event>;
  public cooldowns: Collection<string, Collection<string, number>>;
  public apis: Collection<string, API>;

  public commandHandler: CommandHandler;
  public eventHandler: EventHandler;
  public cronHandler: CronHandler;
  public apiHandler: APIHandler;

  public areCommandsLoaded: Boolean = false;
  public areEventsLoaded: Boolean = false;
  public areCronsLoaded: Boolean = false;
  public areAPILoaded: Boolean = false;

  public constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildPresences,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
    });

    this.mode = process.argv.slice(2).includes("--dev")
      ? "development"
      : "production";

    this.commands = new Collection();
    this.subCommands = new Collection();
    this.cooldowns = new Collection();
    this.crons = new Collection();
    this.events = new Collection();
    this.apis = new Collection();

    this.commandHandler = new CommandHandler(this);
    this.eventHandler = new EventHandler(this);
    this.cronHandler = new CronHandler(this);
    this.apiHandler = new APIHandler(this);

    this.eventHandler.loadEvents();
  }

  public override async login() {
    let token: string;
    switch (this.mode) {
      case "development": {
        token = process.env.DEV_LYNX_TOKEN!;
        break;
      }
      case "production": {
        token = process.env.PROD_LYNX_TOKEN!;
        break;
      }
      default: {
        throw new Error("Invalid mode");
      }
    }

    if (!token) throw new Error("No token provided");

    return super.login(token);
  }

  public async start() {
    await this.login();

    await new Promise<void>((resolve) =>
      this.once(Events.ClientReady, () => resolve()),
    );

    await this.commandHandler.loadCommands();
    await this.cronHandler.runCrons();
    await this.apiHandler.loadAPI();
  }
}
