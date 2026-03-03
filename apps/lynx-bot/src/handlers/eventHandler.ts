import { glob } from "glob";
import { LynxClient } from "../client/client";
import path from "path";
import { Event } from "../structures/Event";
import { pathToFileURL } from "url";
import { Handler } from "../structures/Handler";

export class EventHandler extends Handler {
  constructor(client: LynxClient) {
    super(client, "Event Handler");
  }

  public async loadEvents() {
    const files = (await glob("src/events/**/*.{js,ts}")).map((filepath) =>
      path.resolve(filepath),
    );

    files.map(async (file: string) => {
      try {
        const { default: EventClass } = await import(pathToFileURL(file).href);
        const event: Event = new EventClass(this.client);
        this.client.events.set(event.name, event as Event);
        if (!event.enabled) return;

        if (!event.name) {
          this.logger.error(
            `Event: ${file.split(path.sep).pop()} does not have a name`,
          );
          return;
        }
        const execute = (...args: any) => event.eventExecute(...args);
        if (event.once) this.client.once(event.type as string, execute);
        else this.client.on(event.type as string, execute);

        this.logger.log(`Loaded event: ${event.name}`);
        return;
      } catch (err) {
        this.logger.error(`Error loading ${file}: ${err}`);
      }
    });

    this.client.areEventsLoaded = true;
    this.logger.log("All events loaded");
  }
}
