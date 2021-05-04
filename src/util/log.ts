import debug, { Debugger } from "debug";

interface MarvinLogger extends Debugger {
    time(format: (duration: number) => string): () => void;
}

/**
 * Constructs a logging object with the given namespace
 * @param name namespace of the log
 * @constructor
 */
export function ERLog (name: string): MarvinLogger {
  return Object.assign(RootLog.extend(name), {
      time(this: MarvinLogger, format: (duration: number) => string) {
          const start = Date.now();



          return () => {
              this(format(Date.now() - start));
          };
      }
  });
}

/**
 * Shared logging object. Use this for one-off situations only, please.
 */
export const RootLog = debug("BotKit");