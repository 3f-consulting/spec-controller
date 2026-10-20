import { EventEmitter } from "node:events";

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
