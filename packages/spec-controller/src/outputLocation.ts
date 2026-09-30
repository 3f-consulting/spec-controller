import { closeSync, constants, fstatSync, lstatSync, openSync, readlinkSync, realpathSync, statSync, unlinkSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const USAGE_EXIT_CODE = 2;

/**
 * A run refused on the usage code. Its one line is already on stderr when it is thrown; the command
 * running it settles the status (`settlingRefusal`), so the process ends by draining what was written
 * rather than being cut off mid-write.
 */
export class UsageRefusal extends Error {
  override readonly name = "UsageRefusal";
  readonly exitCode = USAGE_EXIT_CODE;
}

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
    refuse(unwritableRefusal(subject, path, err));
  }
}

/** Refuses the run on the usage code with one line on stderr, then throws for the command to settle. */
export function refuse(message: string): never {
  process.stderr.write(message + "\n");
  throw new UsageRefusal(message);
}

/**
 * Runs a command and settles a usage refusal it throws: the status becomes the refusal's code and
 * `refused` is answered. Anything else thrown is not a refusal, and propagates as it would have.
 */
export function settlingRefusal<T>(run: () => T, refused: T): T {
  try {
    return run();
  } catch (err) {
    if (!(err instanceof UsageRefusal)) throw err;
    process.exitCode = err.exitCode;
    return refused;
  }
}

/** The operating system's identity for a regular file; anything else has none. */
export interface RegularFileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

/** A file a run reads, and how a refusal names it. */
export interface ReadInput {
  readonly subject: string;
  readonly path: string;
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

/**
 * The identity of the regular file a path a run reads leads to, through any links, or undefined when
 * it leads to anything else or to nothing. The file is only looked at: an input is never opened for
 * writing, and one that is not there cannot be overwritten.
 */
export function regularFileIdentity(path: string): RegularFileIdentity | undefined {
  try {
    return regularIdentity(statSync(path, { bigint: true }));
  } catch {
    return undefined;
  }
}

/** The first of `inputs` that is the regular file at `path`, or undefined when none is, or nothing is there. */
export function inputAt(path: string, inputs: readonly ReadInput[]): ReadInput | undefined {
  const identity = regularFileIdentity(path);
  if (identity === undefined) return undefined;
  return inputs.find((input) => sameIdentity(regularFileIdentity(input.path), identity));
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
