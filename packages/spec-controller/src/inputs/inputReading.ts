import { readFileSync } from "node:fs";

export interface InputReadFault {
  readonly path: string;
  readonly reason: string;
}

export interface ReadFault {
  readonly kind: "read-fault";
  readonly fault: InputReadFault;
}

// A read the file system refuses is the input's fault, returned as data.
export function readingOf<S, R>(path: string, read: () => S, parse: (sources: S) => R): R | ReadFault {
  let sources: S;
  try {
    sources = read();
  } catch (err) {
    return { kind: "read-fault", fault: { path, reason: (err as Error).message } };
  }
  return parse(sources);
}

export function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

export function reasonOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
