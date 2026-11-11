const SEPARATOR = "/";

const UP = "..";

const isAbsolute = (path: string): boolean => path.startsWith(SEPARATOR);

// An absolute path's parts once "." and ".." are walked and empty parts dropped, as a path is resolved.
function partsOf(absolute: string): string[] {
  const parts: string[] = [];
  for (const part of absolute.split(SEPARATOR)) {
    if (part === UP) parts.pop();
    else if (part !== "" && part !== ".") parts.push(part);
  }
  return parts;
}

function relative(root: string, path: string): string {
  const from = partsOf(root);
  const to = partsOf(path);
  let shared = 0;
  while (shared < from.length && shared < to.length && from[shared] === to[shared]) shared++;
  return [...from.slice(shared).map(() => UP), ...to.slice(shared)].join(SEPARATOR);
}

// The root is absolute: the target's folder is.
export function relativizeToRoot(path: string, root: string | undefined): string {
  if (root === undefined || !isAbsolute(path)) return path;
  const rel = relative(root, path);
  if (rel.startsWith(UP)) return path;
  return rel === "" ? "." : rel;
}

// The target's folder: the working folder when no corpus is named, else the top of the git repository the corpus's
// folder is in, else that folder, taken from the working folder. The working folder is asked for only when it is needed.
export function targetFolderOf(workingFolder: () => string, corpusFolder?: string, repositoryTop?: string): string {
  if (corpusFolder === undefined) return workingFolder();
  if (repositoryTop !== undefined) return repositoryTop;
  return isAbsolute(corpusFolder) ? corpusFolder : `${workingFolder()}${SEPARATOR}${corpusFolder}`;
}
