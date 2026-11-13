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

export const targetFolderOf = ({ workingFolder, gitTopLevel }: TargetFolderAsked): string => gitTopLevel ?? workingFolder;
