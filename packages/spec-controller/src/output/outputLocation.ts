import { closeSync, constants, existsSync, fstatSync, lstatSync, openSync, readlinkSync, realpathSync, statSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

import { refusal, type Refusal } from "../runEnding/refusal.js";
import { AppError } from "../messages/messages.js";
import type { IdentifiedInput } from "@3f-consulting/spec-controller-core";

export function unwritableRefusal(format: string, path: string, err: unknown): Refusal {
  const reason = err instanceof Error ? err.message : String(err);
  return refusal(AppError.ReportNotWritten, { format, path, reason });
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
  return regularIdentity(fstatSync(fd, { bigint: true }));
}

export function stdoutIdentity(): RegularFileIdentity | undefined {
  return streamIdentity(1);
}

export function stderrIdentity(): RegularFileIdentity | undefined {
  return streamIdentity(2);
}

function identityOf(fd: number): RegularFileIdentity | undefined {
  try {
    return streamIdentity(fd);
  } finally {
    closeSync(fd);
  }
}

function regularIdentity(stats: { isFile(): boolean; dev: bigint; ino: bigint }): RegularFileIdentity | undefined {
  return stats.isFile() ? { dev: stats.dev, ino: stats.ino } : undefined;
}

const MAX_LINKS_FOLLOWED = 40;

function namesStream(path: string, spellings: readonly string[]): boolean {
  let current: string | undefined = resolve(path);
  for (let followed = 0; current !== undefined && followed <= MAX_LINKS_FOLLOWED; followed++) {
    if (spellings.includes(current)) return true;
    current = withFirstLinkFollowed(current);
  }
  return false;
}

// Standard output is named by its device or by its descriptor. A descriptor's links lead to the pipe or terminal
// itself, never through /dev/stdout, so each spelling is matched where it is met.
const STANDARD_OUTPUT_SPELLINGS: readonly string[] = ["/dev/stdout", "/dev/fd/1", "/proc/self/fd/1"];

export function namesStdout(path: string): boolean {
  return namesStream(path, STANDARD_OUTPUT_SPELLINGS);
}

// Standard error may be a socket a parent process handed over, which cannot be opened by its path, so a report bound for it is written to the stream.
export function namesStderr(path: string): boolean {
  return namesStream(path, ["/dev/stderr"]);
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

export function identifiedInputs(inputs: readonly ReadInput[]): IdentifiedInput[] {
  return inputs.map((input) => ({ ...input, identity: regularFileIdentity(input.path) }));
}
