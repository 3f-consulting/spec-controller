import { isAbsolute, relative } from "node:path";

export function relativizeToRoot(path: string, root: string | undefined): string {
  if (root === undefined || !isAbsolute(path)) return path;
  const rel = relative(root, path);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return path;
  return rel;
}
