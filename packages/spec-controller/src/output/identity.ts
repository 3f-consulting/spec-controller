import type { FileIdentity } from "@3f-consulting/spec-controller-core";
import { fstatSync, lstatSync, readlinkSync, statSync, type BigIntStats } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const regularFile = ({ dev, ino }: BigIntStats): FileIdentity => ({ is: "regular-file", device: dev, inode: ino });

export type NamedStream = Extract<FileIdentity, { readonly is: "standard-output" | "standard-error" }>;

// A standard stream redirected into a regular file is that file; otherwise it is the stream.
export function streamIdentity(fd: number, stream: NamedStream): FileIdentity {
  const stats = fstatSync(fd, { bigint: true });
  return stats.isFile() ? regularFile(stats) : stream;
}

// How a path is probed: its device and inode as exactly as a stream's descriptor gives them, and nothing there yet an answer.
const PROBED = { bigint: true, throwIfNoEntry: false } as const;

// Each standard stream's names, as a path or a link may give them.
const STREAM_NAMES: Readonly<Record<"standard-output" | "standard-error", readonly string[]>> = {
  "standard-output": ["/dev/stdout", "/dev/fd/1", "/proc/self/fd/1"],
  "standard-error": ["/dev/stderr", "/dev/fd/2", "/proc/self/fd/2"],
};

const LINKS_FOLLOWED = 40;

function streamNamedBy(path: string): "standard-output" | "standard-error" | undefined {
  let current = resolve(path);
  for (let followed = 0; followed <= LINKS_FOLLOWED; followed++) {
    if (STREAM_NAMES["standard-output"].includes(current)) return "standard-output";
    if (STREAM_NAMES["standard-error"].includes(current)) return "standard-error";
    if (!lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) return undefined;
    current = resolve(dirname(current), readlinkSync(current));
  }
  return undefined;
}

// A file not made yet is made where its path, or the link it is, points.
export const whereItWillBe = (path: string): string =>
  lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink() ? resolve(dirname(path), readlinkSync(path)) : resolve(path);

function notMadeYet(path: string): FileIdentity {
  const where = whereItWillBe(path);
  const folder = statSync(dirname(where), PROBED);
  return { is: "absent", ...(folder?.isDirectory() ? { folder: { device: folder.dev, inode: folder.ino } } : {}), name: basename(where) };
}

// What a path names, through any link: one of the run's standard streams, a regular file, something else, or nothing
// yet. A stream's path reports another device than the stream's own descriptor does, so a stream is known by name first.
export function pathIdentity(path: string): FileIdentity {
  try {
    const stream = streamNamedBy(path);
    if (stream !== undefined) return { is: stream };
    const stats = statSync(path, PROBED);
    if (stats === undefined) return notMadeYet(path);
    if (stats.isFile()) return regularFile(stats);
  } catch {
    // A path the system cannot follow, round links that lead to themselves or into a folder it may not enter, names no file.
  }
  return { is: "not-a-regular-file" };
}
