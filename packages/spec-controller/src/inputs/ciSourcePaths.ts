import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface CiPathReader {
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
  readDir(path: string): string[];
}

export const NODE_CI_PATH_READER: CiPathReader = {
  exists: existsSync,
  isDirectory: (path) => statSync(path).isDirectory(),
  readDir: readdirSync,
};

const WORKFLOW_EXTENSIONS = [".yml", ".yaml"];

export function ciSourcePathsOf(
  ciPath: string,
  reader: CiPathReader = NODE_CI_PATH_READER,
): string[] {
  if (!reader.exists(ciPath)) return [];
  if (!reader.isDirectory(ciPath)) return [ciPath];
  return reader
    .readDir(ciPath)
    .filter((name) => WORKFLOW_EXTENSIONS.some((ext) => name.endsWith(ext)))
    .sort()
    .map((name) => join(ciPath, name));
}
