import type { CiPathReader } from "./ciSourcePaths.js";

export function readerOf(dirs: Record<string, string[]>, files: readonly string[]): CiPathReader {
  return {
    exists: (path) => path in dirs || files.includes(path),
    isDirectory: (path) => path in dirs,
    readDir: (path) => dirs[path] ?? [],
  };
}
