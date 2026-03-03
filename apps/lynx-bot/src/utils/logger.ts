import { ConsoleLogger } from "@nestjs/common";
import { prisma, LynxLogType } from "@runa/database";

export class CustomLogger extends ConsoleLogger {
  private async saveLog(
    type: LynxLogType,
    message: any,
    ...optionalParams: any[]
  ) {
    try {
      await prisma.lynxLogs.create({
        data: {
          type,
          message:
            typeof message === "string" ? message : JSON.stringify(message),
          metadata:
            optionalParams.length > 0 ? (optionalParams as any) : undefined,
          context: this.context,
        },
      });
    } catch (e) {
      console.error("Failed to save log to DB", e);
    }
  }

  log(message: any, ...optionalParams: any[]) {
    this.saveLog(LynxLogType.INFO, message, ...optionalParams);
    super.log(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.saveLog(LynxLogType.ERROR, message, ...optionalParams);
    super.error(message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.saveLog(LynxLogType.WARN, message, ...optionalParams);
    super.warn(message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.saveLog(LynxLogType.DEBUG, message, ...optionalParams);
    super.debug(message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.saveLog(LynxLogType.VERBOSE, message, ...optionalParams);
    super.verbose(message, ...optionalParams);
  }
}

export const createLogger = (context: string) => {
  return new CustomLogger(context, {
    prefix: "Lynx",
  });
};
