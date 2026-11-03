import { closeSync, constants, fstatSync, lstatSync, openSync, readlinkSync, realpathSync, statSync, unlinkSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

import { endRunOn, USAGE_EXIT_CODE, USAGE_REFUSAL } from "./exitCode.js";
import { errorText, standardError } from "./standardError.js";
import type { ShownError } from "./refusal.js";

class UsageRefusal extends Error {
  override readonly name = "UsageRefusal";
  readonly exitCode = USAGE_EXIT_CODE;
}

export function unwritableRefusal(subject: string, path: string, err: unknown): string {
  const reason = err instanceof Error ? err.message : String(err);
  return `${subject}: ${path} (${reason})`;
}

export function writeOrRefuse(subject: string, path: string, write: () => void): void {
  try {
    write();
  } catch (err) {
    refuse(unwritableRefusal(subject, path, err));
  }
}

// Only balance refuses through here; allocate and the host print their own refusals.
const REFUSING_COMMAND = "balance";

export function refuse(error: ShownError): never {
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

export function firstSharingFile(file: string, others: readonly string[]): string | undefined {
  const created: string[] = [];
  try {
    const identity = identityOrNone(file, created);
    if (identity === undefined) return undefined;
    return others.find((other) => sameIdentity(identityOrNone(other, created), identity));
  } finally {
    for (const path of created) unlinkSync(path);
  }
}

function identityOrNone(path: string, created: string[]): RegularFileIdentity | undefined {
  try {
    const probed = probeDestination(path);
    if (probed.created !== undefined) created.push(probed.created);
    return probed.identity;
  } catch {
    // A path that cannot be opened for writing shares no file with the one being checked.
  }
  return undefined;
}

function sameIdentity(a: RegularFileIdentity | undefined, b: RegularFileIdentity): boolean {
  return a !== undefined && a.dev === b.dev && a.ino === b.ino;
}

export function regularFileIdentity(path: string): RegularFileIdentity | undefined {
  try {
    return regularIdentity(statSync(path, { bigint: true }));
  } catch {
    // A path that cannot be stat'd is no file, so it is no input's file either.
  }
  return undefined;
}

export function inputAt(path: string, inputs: readonly ReadInput[]): ReadInput | undefined {
  const identity = regularFileIdentity(path);
  if (identity === undefined) return undefined;
  return inputs.find((input) => sameIdentity(regularFileIdentity(input.path), identity));
}

export function stdoutIdentity(): RegularFileIdentity | undefined {
  try {
    return regularIdentity(fstatSync(1, { bigint: true }));
  } catch {
    // A closed stdout has no file for a destination to share.
  }
  return undefined;
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

const STDOUT_SPELLINGS = new Set(["/dev/stdout", "/dev/fd/1", "/proc/self/fd/1", "/proc/thread-self/fd/1", `/proc/${process.pid}/fd/1`]);

const MAX_LINKS_FOLLOWED = 40;

export function namesStdout(path: string): boolean {
  let current: string | undefined = resolve(path);
  for (let followed = 0; current !== undefined && followed <= MAX_LINKS_FOLLOWED; followed++) {
    if (STDOUT_SPELLINGS.has(current)) return true;
    current = withFirstLinkFollowed(current);
  }
  return false;
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
