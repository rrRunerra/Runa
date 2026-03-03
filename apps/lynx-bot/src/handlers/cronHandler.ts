import { glob } from "glob";
import { LynxClient } from "../client/client";
import path from "path";
import { pathToFileURL } from "url";
import { Cron } from "../structures/Cron";
import { Handler } from "../structures/Handler";

export class CronHandler extends Handler {
  constructor(client: LynxClient) {
    super(client, "Cron Handler");
  }

  public async runCrons() {
    const files = (await glob("src/crons/**/*.{js,ts}")).map((filepath) =>
      path.resolve(filepath),
    );

    files.map(async (file: string) => {
      const { default: CronClass } = await import(pathToFileURL(file).href);
      const cron: Cron = new CronClass(this.client);
      this.client.crons.set(cron.name, cron as Cron);

      if (!cron.name) {
        this.logger.error(
          `Cron: ${file.split(path.sep).pop()} does not have a name`,
        );
        return;
      }

      if (!cron.repeatTime) {
        this.logger.error(
          `Cron: ${file.split(path.sep).pop()} does not have a repeat time)`,
        );
        return;
      }

      if (!cron.excludeRunOnStart) {
        await cron.cronExecute();
      }

      this.logger.log(`Loaded cron: ${cron.name}`);

      setInterval((a) => {
        this.logger.log(`Running cron: ${cron.name}`);
        cron.cronExecute();
      }, cron.repeatTime);
    });
    this.client.areCronsLoaded = true;
    this.logger.log("All crons loaded");
  }
}
