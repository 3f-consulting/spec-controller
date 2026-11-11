import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readlinkSync, realpathSync, statSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

import { endRunOn, USAGE_EXIT_CODE, USAGE_REFUSAL } from "./exitCode.js";
import { errorText, standardError, type RefusalLines } from "./standardError.js";
import { refusal, type Refusal } from "./refusal.js";
import { AppError } from "./messages.js";

class UsageRefusal extends Error {
  readonly exitCode = USAGE_EXIT_CODE;
}

export function unwritableRefusal(format: string, path: string, err: unknown): Refusal {
  const reason = err instanceof Error ? err.message : String(err);
  return refusal(AppError.ReportNotWritten, { format, path, reason });
}

export function writeOrRefuse(format: string, path: string, write: () => void): void {
  try {
    write();
  } catch (err) {
    refuse(unwritableRefusal(format, path, err));
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

// A destination that does not exist yet is made to probe it, and named as made so it can be removed again.
export function probeDestination(path: string): ProbedDestination {
  const existed = existsSync(path);
  const identity = identityOf(openSync(path, constants.O_WRONLY | constants.O_CREAT));
  return { identity, created: existed ? undefined : realpathSync(path) };
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

const MAX_LINKS_FOLLOWED = 40;

function namesStream(path: string, stream: string): boolean {
  let current: string | undefined = resolve(path);
  for (let followed = 0; current !== undefined && followed <= MAX_LINKS_FOLLOWED; followed++) {
    if (current === stream) return true;
    current = withFirstLinkFollowed(current);
  }
  return false;
}

export function namesStdout(path: string): boolean {
  return namesStream(path, "/dev/stdout");
}

// Standard error may be a socket a parent process handed over, which cannot be opened by its path, so a report bound for it is written to the stream.
export function namesStderr(path: string): boolean {
  return namesStream(path, "/dev/stderr");
}

function withFirstLinkFollowed(path: string): string | undefined {
  // The path is absolute, so its first part is the empty one before the root, and its shortest prefix is its second.
  const parts = path.split(sep);
  for (let length = 2; length <= parts.length; length++) {
    const prefix = parts.slice(0, length).join(sep);
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
