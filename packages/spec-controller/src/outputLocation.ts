import { closeSync, constants, fstatSync, lstatSync, openSync, readlinkSync, realpathSync, statSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

import { endRunOn, USAGE_EXIT_CODE, USAGE_REFUSAL } from "./exitCode.js";
import { errorText, standardError, type RefusalLines } from "./standardError.js";
import { refusal, type Refusal } from "./refusal.js";
import { AppError } from "./messages.js";

class UsageRefusal extends Error {
  override readonly name = "UsageRefusal";
  readonly exitCode = USAGE_EXIT_CODE;
}

export interface Unwritable {
  readonly kind: "report";
  readonly format: string;
}

export function unwritableRefusal(what: Unwritable, path: string, err: unknown): Refusal {
  const reason = err instanceof Error ? err.message : String(err);
  return refusal(AppError.ReportNotWritten, { format: what.format, path, reason });
}

export function writeOrRefuse(what: Unwritable, path: string, write: () => void): void {
  try {
    write();
  } catch (err) {
    refuse(unwritableRefusal(what, path, err));
  }
}

// Only balance refuses through here; allocate and the host print their own refusals.
const REFUSING_COMMAND = "balance";

export function refuse(error: RefusalLines): never {
  standardError(process.stderr, REFUSING_COMMAND).error(error);
  throw new UsageRefusal(errorText(error, REFUSING_COMMAND));
}

export function settlingRefusal<T>(run: () => T, refused: T): T {
  try {
    return run();
  } catch (err) {
    if (!(err instanceof UsageRefusal)) throw err;
    endRunOn(USAGE_REFUSAL);
    return refused;
  }
}

export interface RegularFileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

export interface ReadInput {
  readonly subject: string;
  readonly path: string;
}

export interface ProbedDestination {
  readonly identity: RegularFileIdentity | undefined;
  readonly created: string | undefined;
}

export function probeDestination(path: string): ProbedDestination {
  try {
    return { identity: identityOf(openSync(path, constants.O_WRONLY)), created: undefined };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  const identity = identityOf(openSync(path, constants.O_WRONLY | constants.O_CREAT));
  return { identity, created: realpathSync(path) };
}

export function regularFileIdentity(path: string): RegularFileIdentity | undefined {
  try {
    return regularIdentity(statSync(path, { bigint: true }));
  } catch {
    // A path that cannot be stat'd is no file, so it is no input's file either.
  }
  return undefined;
}

function streamIdentity(fd: number): RegularFileIdentity | undefined {
  try {
    return regularIdentity(fstatSync(fd, { bigint: true }));
  } catch {
    // A closed stream has no file for a destination to share.
  }
  return undefined;
}

export function stdoutIdentity(): RegularFileIdentity | undefined {
  return streamIdentity(1);
}

export function stderrIdentity(): RegularFileIdentity | undefined {
  return streamIdentity(2);
}

function identityOf(fd: number): RegularFileIdentity | undefined {
  try {
    return regularIdentity(fstatSync(fd, { bigint: true }));
  } finally {
    closeSync(fd);
  }
}

function regularIdentity(stats: { isFile(): boolean; dev: bigint; ino: bigint }): RegularFileIdentity | undefined {
  return stats.isFile() ? { dev: stats.dev, ino: stats.ino } : undefined;
}

const spellingsOf = (fd: number, name: string): ReadonlySet<string> =>
  new Set([`/dev/${name}`, `/dev/fd/${fd}`, `/proc/self/fd/${fd}`, `/proc/thread-self/fd/${fd}`, `/proc/${process.pid}/fd/${fd}`]);

const STDOUT_SPELLINGS = spellingsOf(1, "stdout");

const STDERR_SPELLINGS = spellingsOf(2, "stderr");

const MAX_LINKS_FOLLOWED = 40;

function namesStream(path: string, spellings: ReadonlySet<string>): boolean {
  let current: string | undefined = resolve(path);
  for (let followed = 0; current !== undefined && followed <= MAX_LINKS_FOLLOWED; followed++) {
    if (spellings.has(current)) return true;
    current = withFirstLinkFollowed(current);
  }
  return false;
}

export function namesStdout(path: string): boolean {
  return namesStream(path, STDOUT_SPELLINGS);
}

// Standard error may be a socket a parent process handed over, which cannot be opened by its path, so a report bound for it is written to the stream.
export function namesStderr(path: string): boolean {
  return namesStream(path, STDERR_SPELLINGS);
}

function withFirstLinkFollowed(path: string): string | undefined {
  const parts = path.split(sep).filter((part) => part !== "");
  for (let length = 1; length <= parts.length; length++) {
    const prefix = sep + parts.slice(0, length).join(sep);
    const target = linkTarget(prefix);
    if (target !== undefined) return resolve(dirname(prefix), target, ...parts.slice(length));
  }
  return undefined;
}

function linkTarget(path: string): string | undefined {
  try {
    return lstatSync(path).isSymbolicLink() ? readlinkSync(path) : undefined;
  } catch {
    // A prefix that cannot be read is followed no further: the path names stdout only as spelled.
  }
  return undefined;
}
