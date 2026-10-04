import { APP_MESSAGES, AppMessage, UNREADABLE_SUBJECTS, type Unreadable } from "../messages.js";

export class UnreadableInput extends Error {
  override readonly name = "UnreadableInput";
  readonly subject: string;

  constructor(
    what: Unreadable,
    readonly path: string,
    readonly reason: string,
  ) {
    const subject = UNREADABLE_SUBJECTS[what];
    super(
      path === ""
        ? APP_MESSAGES[AppMessage.CouldNotBeRead](subject, reason)
        : APP_MESSAGES[AppMessage.CouldNotBeReadAt](subject, path, reason),
    );
    this.subject = subject;
  }
}

export function readOrRefuse<T>(what: Unreadable, path: string, read: () => T): T {
  try {
    return read();
  } catch (err) {
    return refuse(what, path, err);
  }
}

export function refuse(what: Unreadable, path: string, err: unknown): never {
  const errno = err as NodeJS.ErrnoException;
  if (!(err instanceof Error) || typeof errno.code !== "string") throw err;
  throw new UnreadableInput(what, errno.path ?? path, err.message);
}

export function refusalLine(refusal: UnreadableInput): string {
  return APP_MESSAGES[AppMessage.UsageError]("allocate", refusal.message);
}

export function firstLine(text: string): string {
  return text.split("\n")[0] ?? "";
}
