import { readFileSync } from "node:fs";

export interface InputReadFault {
  readonly path: string;
  readonly reason: string;
}

export interface ReadFault {
  readonly kind: "read-fault";
  readonly fault: InputReadFault;
}

function readFaultOf(err: unknown, path: string): InputReadFault | null {
  const errno = err as NodeJS.ErrnoException;
  if (!(err instanceof Error) || typeof errno.code !== "string") return null;
  return { path: errno.path ?? path, reason: err.message };
}

// A read the file system refuses is the input's fault, returned as data; any other throw is spec-controller's own.
export function readingOf<S, R>(path: string, read: () => S, parse: (sources: S) => R): R | ReadFault {
  let sources: S;
  try {
    sources = read();
  } catch (err) {
    const fault = readFaultOf(err, path);
    if (fault === null) throw err;
    return { kind: "read-fault", fault };
  }
  return parse(sources);
}

export function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

export function reasonOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
