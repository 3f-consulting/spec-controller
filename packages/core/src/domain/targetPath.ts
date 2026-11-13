export const shownFromTarget = (path: string, targetFolder: string): string => {
  const inside = targetFolder.endsWith("/") ? targetFolder : `${targetFolder}/`;
  return path.startsWith(inside) ? path.slice(inside.length) : path;
};

// Where the run started, the corpus the command line named, and the top level of the git repository the corpus is in.
export interface TargetFolderAsked {
  readonly workingFolder: string;
  readonly corpus?: string;
  readonly gitTopLevel?: string;
}

const parentOf = (path: string): string => {
  const trimmed = path.replace(/\/+$/, "");
  const at = trimmed.lastIndexOf("/");
  return at <= 0 ? "/" : trimmed.slice(0, at);
};

// The git repository's top level; outside git, the named corpus's parent, or with none named, where the run started.
export const targetFolderOf = ({ workingFolder, corpus, gitTopLevel }: TargetFolderAsked): string =>
  gitTopLevel ?? (corpus === undefined ? workingFolder : parentOf(corpus));
