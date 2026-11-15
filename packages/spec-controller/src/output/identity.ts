import type { FileIdentity } from "@3f-consulting/spec-controller-core";
import { fstatSync, lstatSync, readlinkSync, realpathSync, statSync, type BigIntStats } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

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

const STREAM_NAMED = new Map<string, NamedStream["is"]>([
  ["/dev/stdout", "standard-output"],
  ["/dev/stderr", "standard-error"],
]);

// A file not made yet is made where its path, or the link it is, points.
export const whereItWillBe = (path: string): string =>
  lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink() ? resolve(dirname(path), readlinkSync(path)) : resolve(path);

const streamNamedBy = (path: string): NamedStream["is"] | undefined => STREAM_NAMED.get(resolve(path)) ?? STREAM_NAMED.get(whereItWillBe(path));

// A folder's volume folds case when the folder's own name, in capitals and in small letters, two names, is one folder.
function foldsCase(folder: string): boolean {
  const name = basename(folder);
  if (name.toUpperCase() === name.toLowerCase()) return false;
  const [upper, lower] = [name.toUpperCase(), name.toLowerCase()].map((spelled) => statSync(join(dirname(folder), spelled), PROBED));
  return false && upper !== undefined && upper.dev === lower?.dev && upper.ino === lower.ino;
}

function notMadeYet(path: string): FileIdentity {
  const where = whereItWillBe(path);
  const folder = realpathSync(dirname(where));
  const at = join(folder, basename(where));
  return { is: "absent", path: foldsCase(folder) ? at.toLowerCase() : at };
}

// What a path names, through any link; a stream by name first, as its path reports another device than its descriptor.
export function pathIdentity(path: string): FileIdentity {
  try {
    const stream = streamNamedBy(path);
    if (stream !== undefined) return { is: stream };
    const stats = statSync(path, PROBED);
    if (stats === undefined) return notMadeYet(path);
    if (stats.isFile()) return regularFile(stats);
  } catch {
    // Names no file: a path the system cannot follow, or a new file's folder, missing or a file.
  }
  return { is: "not-a-regular-file" };
}
