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

function below(root: string, path: string): string | undefined {
  const from = partsOf(root);
  const to = partsOf(path);
  return from.every((part, at) => to[at] === part) ? to.slice(from.length).join(SEPARATOR) : undefined;
}

// The root is absolute: the target's folder is. A path not below it, or whose first part below it starts with .., is kept.
export function relativizeToRoot(path: string, root: string | undefined): string {
  if (root === undefined || !isAbsolute(path)) return path;
  const rel = below(root, path);
  if (rel === undefined || rel.startsWith(UP)) return path;
  return rel === "" ? "." : rel;
}

// The target's folder: the working folder when no corpus is named, else the top of the git repository the corpus's
// folder is in, else that folder, taken from the working folder. The working folder is asked for only when it is needed.
export function targetFolderOf(workingFolder: () => string, corpusFolder?: string, repositoryTop?: string): string {
  if (corpusFolder === undefined) return workingFolder();
  if (repositoryTop !== undefined) return repositoryTop;
  return isAbsolute(corpusFolder) ? corpusFolder : `${workingFolder()}${SEPARATOR}${corpusFolder}`;
}
