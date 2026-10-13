import { readFileSync, readdirSync, type Dirent } from "node:fs";
import { join } from "node:path";

import {
  MissingFeatureCorpusError,
  UnreadableFeatureCorpusError,
  parseErrorsIn,
} from "./gherkinValidation.js";

const CODE_PATTERN = /^[A-Z0-9]{2,5}$/;

export interface DiscoveredFeature {
  slug: string;
  path: string;
  featureCode: string | null;
}

export function extractFeatureCode(source: string): string | null {
  const lines = source.split(/\r?\n/);
  const featureLine = lines.findIndex((line) => line.trim().startsWith("Feature:"));
  return headerTagsAbove(lines, featureLine).find((bare) => CODE_PATTERN.test(bare)) ?? null;
}

function headerTagsAbove(lines: readonly string[], featureLine: number): string[] {
  const tags: string[] = [];
  for (let j = featureLine - 1; j >= 0; j--) {
    const prev = lines[j]!.trim();
    if (prev === "") continue;
    if (!prev.startsWith("@")) break;
    tags.push(...prev.split(/\s+/).filter((t) => t.startsWith("@")).map((t) => t.slice(1)));
  }
  return tags;
}

function featuresDir(): string {
  return join(process.cwd(), "features");
}

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
    if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new MissingFeatureCorpusError(dir);
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

export function corpusFeatureFiles(dir: string): CorpusFeatureFile[] {
  return featureFilesUnder(dir, "", corpusEntries(dir))
    .sort()
    .map((relativePath) => ({ path: join(dir, relativePath), relativePath }));
}

function readFeatureSource(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    const errno = err as NodeJS.ErrnoException;
    errno.path ??= path;
    throw err;
  }
}

export function discoverFeatures(dir: string = featuresDir()): DiscoveredFeature[] {
  const files = corpusFeatureFiles(dir).map(({ path, relativePath }) => ({
    relativePath,
    path,
    source: readFeatureSource(path),
  }));

  const parseErrors = files.flatMap(({ path, source }) => parseErrorsIn(path, source));
  if (parseErrors.length > 0) throw new UnreadableFeatureCorpusError(parseErrors);

  return files.map(({ relativePath, path, source }) => ({
    slug: relativePath.slice(0, -".feature".length),
    path,
    featureCode: extractFeatureCode(source),
  }));
}
