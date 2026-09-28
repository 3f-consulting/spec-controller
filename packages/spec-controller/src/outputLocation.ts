import { closeSync, constants, fstatSync, lstatSync, openSync, readlinkSync, realpathSync, unlinkSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const USAGE_EXIT_CODE = 2;

export function unwritableRefusal(subject: string, path: string, err: unknown): string {
  const reason = err instanceof Error ? err.message : String(err);
  return `${subject}: ${path} (${reason})`;
}

/**
 * The catch sits on the one write it guards rather than on the process, so a refusal can only ever
 * name a location this call was asked to write, and a crash anywhere else is not dressed up as one.
 */
export function writeOrRefuse(subject: string, path: string, write: () => void): void {
  try {
    write();
  } catch (err) {
    process.stderr.write(unwritableRefusal(subject, path, err) + "\n");
    process.exit(USAGE_EXIT_CODE);
  }
}

/** Refuses the run on the usage code with one line, for a refusal decided before anything is written. */
export function refuse(message: string): never {
  process.stderr.write(message + "\n");
  return process.exit(USAGE_EXIT_CODE);
}

/** The operating system's identity for a regular file; anything else has none. */
export interface RegularFileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

/** What opening a destination found: the identity of the regular file it is, and the file it had to create, if any. */
export interface ProbedDestination {
  readonly identity: RegularFileIdentity | undefined;
  readonly created: string | undefined;
}

/**
 * Throws the operating system's own error when `path` cannot be written as a file, and otherwise
 * answers which regular file it is. An existing file is opened write-only without truncation (not
 * "r+", which would also demand read permission). An absent one is created and left in place for the
 * caller to remove once every destination has been identified: two names for one absent file share
 * an identity only once one of them exists. So a missing, read-only or non-directory parent answers
 * with its real reason instead of one this module would have to invent.
 *
 * The creation is not exclusive, because the write-only open has already answered that nothing exists
 * at the end of the path, and an exclusive create would refuse a link whose target does not exist yet
 * although the write would follow it. What the caller removes is the real file created, never the
 * link that led to it.
 */
export function probeDestination(path: string): ProbedDestination {
  try {
    return { identity: identityOf(openSync(path, constants.O_WRONLY)), created: undefined };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  const identity = identityOf(openSync(path, constants.O_WRONLY | constants.O_CREAT));
  return { identity, created: realpathSync(path) };
}

/**
 * The first of `others` that is the same regular file as `file`, or undefined when none is. Every
 * file created to find out is removed again. A path that cannot be opened shares nothing here: the
 * write that would use it refuses it on its own terms.
 */
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
    return undefined;
  }
}

function sameIdentity(a: RegularFileIdentity | undefined, b: RegularFileIdentity): boolean {
  return a !== undefined && a.dev === b.dev && a.ino === b.ino;
}

/** The identity of the regular file standard output is, when it is one. */
export function stdoutIdentity(): RegularFileIdentity | undefined {
  try {
    return regularIdentity(fstatSync(1, { bigint: true }));
  } catch {
    return undefined;
  }
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

/** The spellings of file descriptor 1 itself, on macOS and on Linux. */
const STDOUT_SPELLINGS = new Set(["/dev/stdout", "/dev/fd/1", "/proc/self/fd/1", "/proc/thread-self/fd/1", `/proc/${process.pid}/fd/1`]);

/** A bound on the links followed, as the kernel sets one, so a loop of links answers rather than spins. */
const MAX_LINKS_FOLLOWED = 40;

/**
 * Whether `path` names standard output: spelled as file descriptor 1, or reaching such a spelling
 * through links, followed one at a time as `realpath` would. Asking what the path spells rather than
 * which file it opens is deliberate: when standard output and standard error share one terminal or
 * one pipe, /dev/stderr opens the very same file, and it does not name standard output.
 */
export function namesStdout(path: string): boolean {
  let current: string | undefined = resolve(path);
  for (let followed = 0; current !== undefined && followed <= MAX_LINKS_FOLLOWED; followed++) {
    if (STDOUT_SPELLINGS.has(current)) return true;
    current = withFirstLinkFollowed(current);
  }
  return false;
}

/** `path` with its first linked component replaced by the link's target, or undefined when none is a link. */
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
    return undefined;
  }
}
