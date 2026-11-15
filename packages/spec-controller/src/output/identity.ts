import type { FileIdentity } from "@3f-consulting/spec-controller-core";
import { fstatSync, lstatSync, readlinkSync, statSync, type BigIntStats } from "node:fs";
import { dirname, resolve } from "node:path";

// A device and inode as exactly as a stream's descriptor gives them. PROBED also answers nothing there yet as undefined.
const EXACT = { bigint: true } as const;

const regularFile = ({ dev, ino }: BigIntStats): FileIdentity => ({ is: "regular-file", device: dev, inode: ino });

export type NamedStream = Extract<FileIdentity, { readonly is: "standard-output" | "standard-error" }>;

// A standard stream redirected into a regular file is that file; otherwise it is the stream.
export function streamIdentity(fd: number, stream: NamedStream): FileIdentity {
  const stats = fstatSync(fd, EXACT);
  return stats.isFile() ? regularFile(stats) : stream;
}

const PROBED = { ...EXACT, throwIfNoEntry: false } as const;

// Each standard stream by its name.
const STREAM_NAMED = new Map<string, NamedStream["is"]>([
  ["/dev/stdout", "standard-output"],
  ["/dev/stderr", "standard-error"],
]);

// A file not made yet is made where its path, or the link it is, points.
export const whereItWillBe = (path: string): string =>
  lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink() ? resolve(dirname(path), readlinkSync(path)) : resolve(path);

// A stream named by its path, or by the link the path is.
const streamNamedBy = (path: string): NamedStream["is"] | undefined => STREAM_NAMED.get(resolve(path)) ?? STREAM_NAMED.get(whereItWillBe(path));

// A volume folds case when its folder, named in capitals, is the same folder.
function foldsCase(folder: string): boolean {
  const named = statSync(folder.toUpperCase(), PROBED);
  const asWritten = statSync(folder, PROBED);
  return named !== undefined && named.dev === asWritten?.dev && named.ino === asWritten.ino;
}

// A file not made yet is known by the path it will be made at, in one case where its volume folds case.
function notMadeYet(path: string): FileIdentity {
  const where = whereItWillBe(path);
  return { is: "absent", path: foldsCase(dirname(where)) ? where.toLowerCase() : where };
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
    // Names no file: a path the system cannot follow, such as one through a file.
  }
  return { is: "not-a-regular-file" };
}
