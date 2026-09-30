export class UnreadableInput extends Error {
  override readonly name = "UnreadableInput";

  constructor(
    readonly subject: string,
    readonly path: string,
    readonly reason: string,
  ) {
    super(path === "" ? `${subject} could not be read (${reason})` : `${subject} could not be read: ${path} (${reason})`);
  }
}

export function readOrRefuse<T>(subject: string, path: string, read: () => T): T {
  try {
    return read();
  } catch (err) {
    return refuse(subject, path, err);
  }
}

export function refuse(subject: string, path: string, err: unknown): never {
  const errno = err as NodeJS.ErrnoException;
  if (!(err instanceof Error) || typeof errno.code !== "string") throw err;
  throw new UnreadableInput(subject, errno.path ?? path, err.message);
}

export function refusalLine(refusal: UnreadableInput): string {
  return `spec-controller allocate: usage error — ${refusal.message}`;
}
