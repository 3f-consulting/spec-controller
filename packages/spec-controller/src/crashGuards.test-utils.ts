import { EventEmitter } from "node:events";
import { APP_MESSAGES, AppError } from "./messages.js";

export interface StandInStream extends EventEmitter {
  readonly written: string[];
  write(chunk: string): boolean;
}

export function standInStream(): StandInStream {
  const written: string[] = [];
  const write = (chunk: string): boolean => {
    written.push(chunk);
    return true;
  };
  return Object.assign(new EventEmitter(), { written, write });
}

export const FIRST_LINE = "write EPIPE";

export function closedPipe(): Error {
  return Object.assign(new Error(`${FIRST_LINE}\nthe reader closed its end of the pipe`), { code: "EPIPE" });
}

export const crashLine = (name: string, firstLine: string, afterVerdict: boolean): string =>
  APP_MESSAGES[afterVerdict ? AppError.UnexpectedErrorAfterVerdict : AppError.UnexpectedError](name, firstLine);

export const noVerdictLine = (): string => `${crashLine("Error", FIRST_LINE, false)}\n`;

interface Raised {
  proc: EventEmitter;
  stdout: EventEmitter;
}

export const ARRIVALS = [
  { arrival: "an 'error' event on stdout", raise: (g: Raised): boolean => g.stdout.emit("error", closedPipe()) },
  { arrival: "an uncaught exception", raise: (g: Raised): boolean => g.proc.emit("uncaughtException", closedPipe(), "uncaughtException") },
  { arrival: "an unhandled rejection", raise: (g: Raised): boolean => g.proc.emit("unhandledRejection", closedPipe(), Promise.resolve()) },
];
