import { readFileSync, readdirSync, type Dirent } from "node:fs";
import { join } from "node:path";

export class MissingFeatureCorpusError extends Error {}

export interface CorpusFeatureFile {
  path: string;
  relativePath: string;
}

function entriesOf(dir: string): Dirent[] {
  return readdirSync(dir, { withFileTypes: true });
}

function corpusEntries(dir: string): Dirent[] {
  try {
    return entriesOf(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new MissingFeatureCorpusError();
    throw err;
  }
}

// Dirent.isDirectory() is false for a symlink, so a symlinked directory is never entered.
function featureFilesUnder(dir: string, prefix: string, entries: Dirent[]): string[] {
  return entries.flatMap((entry) => {
    const relativePath = `${prefix}${entry.name}`;
    if (entry.name.endsWith(".feature")) return [relativePath];
    if (!entry.isDirectory()) return [];
    const subdirectory = join(dir, entry.name);
    return featureFilesUnder(subdirectory, `${relativePath}/`, entriesOf(subdirectory));
  });
}

export function corpusPathOf(dir: string, relativePath: string): string {
  return join(dir, relativePath);
}

export function corpusFeatureFiles(dir: string): CorpusFeatureFile[] {
  return featureFilesUnder(dir, "", corpusEntries(dir))
    .sort()
    .map((relativePath) => ({ path: corpusPathOf(dir, relativePath), relativePath }));
}

export interface FeatureFileSource extends CorpusFeatureFile {
  readonly source: string;
}

export function readFeatureSources(dir: string): FeatureFileSource[] {
  return corpusFeatureFiles(dir).map(({ path, relativePath }) => ({ path, relativePath, source: readFileSync(path, "utf8") }));
}
